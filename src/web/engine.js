/**
 * engine.js — Browser-side port of the Python parsing + aggregation logic.
 * Depends on SheetJS (XLSX) being loaded before this script.
 *
 * Exports a global `Engine` object with:
 *   Engine.parseWorkbook(arrayBuffer)  → { records, roster }
 *   Engine.applyFilters(records, filt) → records[]
 *   Engine.totals(records)             → { cases, total_late, employees, routes, days }
 *   Engine.aggregateBy(records, view)  → rows[]
 *   Engine.citiesFull(roster, records) → rows[]
 *   Engine.buildDashboard(records, roster, filt) → dashboard dict
 *   Engine.buildState(records, roster) → state dict
 *
 * Mirror of: excel_reader.py, aggregate.py, filters.py, api.py
 */

(function (global) {
  "use strict";

  // ── Hebrew column headers (mirrors excel_reader.py META / constants) ──────
  const META = {
    "מספר עובד": "employee_no",  // מספר עובד
    "שם פרטי":              "first_name",   // שם פרטי
    "שם משפחה":        "last_name",    // שם משפחה
    "עיר":                                  "city",         // עיר
    "הסעה":                            "route",        // הסעה
  };
  const LATE_HDR    = "זמן איחור"; // זמן איחור
  const ARRIVAL_HDR = "זמן הגעה";       // זמן הגעה

  // JS Date.getDay(): 0=Sun,1=Mon,...,6=Sat  → mirror Python's "Sun..Sat"
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // ── Date / time helpers ──────────────────────────────────────────────────

  /**
   * Format a JS Date as "YYYY-MM-DD".
   */
  function isoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  /**
   * Format a JS Date or a string time value as "HH:MM".
   * SheetJS with cellDates:true can give Date objects for time cells.
   * Some cells may come through as strings like "07:30" or "7:30:00".
   */
  function fmtTime(v) {
    if (v == null) return null;
    if (v instanceof Date) {
      return String(v.getHours()).padStart(2, "0") + ":" + String(v.getMinutes()).padStart(2, "0");
    }
    if (typeof v === "string") {
      // "HH:MM:SS" or "HH:MM" → take first two parts
      const parts = v.trim().split(":");
      if (parts.length >= 2) {
        return parts[0].padStart(2, "0") + ":" + parts[1].padStart(2, "0");
      }
    }
    // Numeric fraction of a day (Excel serial time stored as number)
    if (typeof v === "number") {
      const totalMin = Math.round(v * 24 * 60);
      const h = Math.floor(totalMin / 60) % 24;
      const m = totalMin % 60;
      return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
    }
    return null;
  }

  /**
   * Coerce a SheetJS cell value to a JS Date representing a calendar date only.
   * With cellDates:true SheetJS returns Date objects for date cells.
   * Also handles strings like "2024-01-15".
   */
  function asDate(v) {
    if (v instanceof Date) return v;
    if (typeof v === "string" && v.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(v);
    }
    return null;
  }

  // ── Sheet detection (mirrors _find_sheet) ────────────────────────────────

  /**
   * Given a parsed workbook, return the sheet where row index 1 (0-based)
   * contains at least one of the META Hebrew headers.
   */
  function findSheet(workbook) {
    const metaKeys = Object.keys(META);
    for (const name of workbook.SheetNames) {
      const ws = workbook.Sheets[name];
      // sheet_to_json with header:1 → array-of-arrays
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null });
      if (rows.length >= 2) {
        const headerRow = rows[1]; // row index 1 = Excel row 2
        if (headerRow && headerRow.some(c => metaKeys.includes(c))) {
          return { ws, rows };
        }
      }
    }
    throw new Error("Лист с ожидаемыми заголовками не найден");
  }

  // ── Column index helpers ─────────────────────────────────────────────────

  /** Mirrors _meta_columns: returns { employee_no: idx, first_name: idx, ... } */
  function metaColumns(headerRow) {
    const idx = {};
    headerRow.forEach((cell, i) => {
      if (cell && META[cell]) idx[META[cell]] = i;
    });
    const missing = Object.values(META).filter(k => !(k in idx));
    if (missing.length > 0) throw new Error("Не найдены колонки: " + missing.join(", "));
    return idx;
  }

  /** Mirrors _day_columns: returns [{ date: Date, lateCol: i, arrivalCol: i|null }, ...] */
  function dayColumns(dateRow, headerRow) {
    const days = [];
    headerRow.forEach((cell, i) => {
      if (cell === LATE_HDR) {
        const rawDate = i < dateRow.length ? dateRow[i] : null;
        const d = asDate(rawDate);
        if (!d) return;
        const arr = (i + 1 < headerRow.length && headerRow[i + 1] === ARRIVAL_HDR) ? i + 1 : null;
        days.push({ date: d, lateCol: i, arrivalCol: arr });
      }
    });
    return days;
  }

  // ── Core parse ──────────────────────────────────────────────────────────

  /**
   * parseWorkbook(arrayBuffer) → { records, roster }
   *
   * Mirrors read_employees + read_records from excel_reader.py.
   * records: one per (employee × day) where late_min is a valid number.
   * roster:  one per employee row (employee_no non-empty), meta fields only.
   */
  function parseWorkbook(arrayBuffer) {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array", cellDates: true });

    const { rows } = findSheet(workbook);
    if (rows.length < 3) throw new Error("Недостаточно строк");

    const dateRow  = rows[0];   // row 1 in Excel: dates above each late column
    const header   = rows[1];   // row 2 in Excel: column headers
    const dataRows = rows.slice(2);

    const meta = metaColumns(header);
    const days = dayColumns(dateRow, header);

    const roster  = [];
    const records = [];

    for (const row of dataRows) {
      const empNo = row[meta.employee_no];
      if (empNo == null || String(empNo).trim() === "") continue;

      // Build roster entry (mirror read_employees)
      roster.push({
        employee_no: empNo,
        first_name:  row[meta.first_name]  ?? null,
        last_name:   row[meta.last_name]   ?? null,
        city:        row[meta.city]         ?? null,
        route:       row[meta.route]        ?? null,
      });

      // Build records (mirror read_records)
      for (const { date, lateCol, arrivalCol } of days) {
        const lateRaw = lateCol < row.length ? row[lateCol] : null;
        if (lateRaw == null || String(lateRaw).trim() === "") continue;

        let lateMins;
        if (typeof lateRaw === "number") {
          lateMins = lateRaw;
        } else {
          lateMins = parseFloat(String(lateRaw).replace(",", "."));
          if (isNaN(lateMins)) continue;
        }

        let arrival = null;
        if (arrivalCol != null && arrivalCol < row.length) {
          arrival = fmtTime(row[arrivalCol]);
        }

        records.push({
          employee_no: empNo,
          first_name:  row[meta.first_name]  ?? null,
          last_name:   row[meta.last_name]   ?? null,
          city:        row[meta.city]         ?? null,
          route:       row[meta.route]        ?? null,
          date:        isoDate(date),
          weekday:     WEEKDAYS[date.getDay()],
          late_min:    lateMins,
          arrival:     arrival,
        });
      }
    }

    return { records, roster };
  }

  // ── Filters (mirrors filters.py apply_filters) ───────────────────────────

  function applyFilters(records, filt) {
    if (!filt) return records;
    let res = records;

    const emp = (filt.employee || "").trim().toLowerCase();
    if (emp) {
      res = res.filter(r =>
        emp in String(r.employee_no ?? "").toLowerCase() ||
        String(r.employee_no ?? "").toLowerCase().includes(emp) ||
        (r.first_name  || "").toLowerCase().includes(emp) ||
        (r.last_name   || "").toLowerCase().includes(emp)
      );
    }

    if (filt.cities && filt.cities.length > 0) {
      const set = new Set(filt.cities);
      res = res.filter(r => set.has(r.city));
    }

    if (filt.routes && filt.routes.length > 0) {
      const set = new Set(filt.routes);
      res = res.filter(r => set.has(r.route));
    }

    if (filt.date_from) {
      res = res.filter(r => r.date >= filt.date_from);
    }

    if (filt.date_to) {
      res = res.filter(r => r.date <= filt.date_to);
    }

    if (filt.weekdays && filt.weekdays.length > 0) {
      const set = new Set(filt.weekdays);
      res = res.filter(r => set.has(r.weekday));
    }

    return res;
  }

  // ── Aggregation (mirrors aggregate.py) ──────────────────────────────────

  /** totals(records) mirrors aggregate.totals */
  function totals(records) {
    const cases      = records.length;
    const total_late = records.reduce((s, r) => s + (r.late_min || 0), 0);
    const employees  = new Set(records.map(r => r.employee_no)).size;
    const routes     = new Set(records.map(r => r.route)).size;
    const days       = new Set(records.map(r => r.date)).size;
    return { cases, total_late, employees, routes, days };
  }

  /**
   * Week start = Sunday (mirrors _week_start in aggregate.py).
   * Python: offset = (d.weekday() + 1) % 7  where Mon=0..Sun=6
   * JS:     getDay() 0=Sun..6=Sat  → offset = getDay()
   */
  function weekStart(isoDate) {
    const parts = isoDate.split("-");
    // Use UTC to avoid DST shifts
    const d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
    const offset = d.getUTCDay(); // 0=Sun → offset 0 (already Sunday)
    d.setUTCDate(d.getUTCDate() - offset);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  const KEY_FN = {
    employee: r => r.employee_no + "\x00" + r.first_name + "\x00" + r.last_name + "\x00" + r.city + "\x00" + r.route,
    route:    r => r.route,
    date:     r => r.date,
    week:     r => weekStart(r.date),
    weekday:  r => r.weekday,
    city:     r => r.city,
  };

  const KEY_VALS = {
    employee: r => [r.employee_no, r.first_name, r.last_name, r.city, r.route],
    route:    r => [r.route],
    date:     r => [r.date],
    week:     r => [weekStart(r.date)],
    weekday:  r => [r.weekday],
    city:     r => [r.city],
  };

  /** aggregateBy(records, view) mirrors aggregate.aggregate_by */
  function aggregateBy(records, view) {
    const keyFn  = KEY_FN[view]  || KEY_FN.employee;
    const valsFn = KEY_VALS[view]|| KEY_VALS.employee;
    const groups = new Map();
    for (const r of records) {
      const k = keyFn(r);
      if (!groups.has(k)) groups.set(k, { vals: valsFn(r), recs: [] });
      groups.get(k).recs.push(r);
    }
    const out = [];
    for (const { vals, recs } of groups.values()) {
      const late  = recs.map(r => r.late_min || 0);
      const total = late.reduce((s, v) => s + v, 0);
      out.push({
        key:        vals,
        cases:      recs.length,
        total_late: total,
        avg_late:   recs.length ? Math.round(total / recs.length * 10) / 10 : 0,
        employees:  new Set(recs.map(r => r.employee_no)).size,
        routes:     new Set(recs.map(r => r.route)).size,
      });
    }
    out.sort((a, b) => b.total_late - a.total_late);
    return out;
  }

  /**
   * citiesFull(roster, records) mirrors aggregate.cities_full.
   *
   * All cities from roster; delay cities sorted total_late desc then cases desc
   * then city name asc; delay-free cities last (same secondary sort).
   */
  function citiesFull(roster, records) {
    // city → set of employee_nos from full roster
    const cityEmployees = new Map();
    for (const emp of roster) {
      const city = emp.city;
      if (!city) continue;
      if (!cityEmployees.has(city)) cityEmployees.set(city, new Set());
      cityEmployees.get(city).add(emp.employee_no);
    }

    // city → records from (filtered) records
    const cityRecords = new Map();
    for (const r of records) {
      const city = r.city;
      if (!city) continue;
      if (!cityRecords.has(city)) cityRecords.set(city, []);
      cityRecords.get(city).push(r);
    }

    const out = [];
    for (const [city, empSet] of cityEmployees) {
      const recs   = cityRecords.get(city) || [];
      const cases  = recs.length;
      const total  = recs.reduce((s, r) => s + (r.late_min || 0), 0);
      out.push({
        key:        [city],
        employees:  empSet.size,
        cases,
        total_late: total,
        avg_late:   cases ? Math.round(total / cases * 10) / 10 : 0,
        routes:     new Set(recs.map(r => r.route)).size,
      });
    }

    // Sort: delay cities (cases>0) first, descending total_late, then cases, then city name;
    // delay-free cities last, sorted by city name asc (mirrors Python sort with negation).
    out.sort((a, b) => {
      const aFree = a.cases === 0;
      const bFree = b.cases === 0;
      if (!aFree && bFree)  return -1;
      if (aFree  && !bFree) return  1;
      // both same category — sort by -total_late, then -cases, then city name
      if (b.total_late !== a.total_late) return b.total_late - a.total_late;
      if (b.cases      !== a.cases)      return b.cases      - a.cases;
      return a.key[0].localeCompare(b.key[0]);
    });

    return out;
  }

  // ── Dashboard builder (mirrors api.py get_dashboard) ────────────────────

  /**
   * buildDashboard(records, roster, filt) → same shape as Api.get_dashboard.
   * `filt` is the raw filter dict (same keys as api.py: employee, date_from,
   * date_to, cities, routes, weekdays).
   */
  function buildDashboard(records, roster, filt) {
    const filtered = applyFilters(records, filt || {});
    const t = totals(filtered);
    t.employees_total = new Set(roster.map(e => e.employee_no)).size;
    t.cities_total    = new Set(roster.map(e => e.city).filter(Boolean)).size;
    t.routes_total    = new Set(roster.map(e => e.route).filter(Boolean)).size;
    return {
      totals:    t,
      by_city:   citiesFull(roster, filtered),
      by_date:   aggregateBy(filtered, "date"),
      employees: aggregateBy(filtered, "employee"),
      records:   filtered,
      roster:    roster,
    };
  }

  // ── State builder (mirrors api.py get_state) ─────────────────────────────

  /**
   * buildState(records, roster) → state dict used to populate slicers.
   */
  function buildState(records, roster) {
    const dates = Array.from(new Set(records.map(r => r.date))).sort();
    const employees = Array.from(
      new Set(
        records
          .filter(r => r.last_name || r.first_name)
          .map(r => ((r.last_name || "") + " " + (r.first_name || "")).trim())
      )
    ).sort();

    return {
      source_path: null,
      date_min:    dates[0]    || null,
      date_max:    dates[dates.length - 1] || null,
      cities:      Array.from(new Set(records.map(r => r.city).filter(Boolean))).sort(),
      routes:      Array.from(new Set(records.map(r => r.route).filter(Boolean))).sort(),
      loaded:      records.length > 0,
      employees,
    };
  }

  // ── Export ───────────────────────────────────────────────────────────────

  global.Engine = {
    parseWorkbook,
    applyFilters,
    totals,
    aggregateBy,
    citiesFull,
    buildDashboard,
    buildState,
  };

})(typeof window !== "undefined" ? window : global);
