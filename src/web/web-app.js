/**
 * web-app.js — Controller for the standalone browser version of the Bus Delays Dashboard.
 * Depends on: xlsx.full.min.js (SheetJS), engine.js, styles.css.
 *
 * Replaces pywebview/api.py glue with browser-side logic:
 *   - File drop-zone / file-picker loads xlsx via FileReader.arrayBuffer()
 *   - Engine.parseWorkbook() produces records + roster
 *   - All render logic mirrors ui.js (same DOM IDs, same visual behaviour)
 *   - Export uses SheetJS XLSX.writeFile()
 */

(function () {
  "use strict";

  // ── In-memory data ───────────────────────────────────────────────────────
  let records = [];
  let roster  = [];
  let state   = { employees: [], cities: [], routes: [], date_min: null, date_max: null };
  let selectedCity = null;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function fmtDate(iso) {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length < 3) return iso;
    return parts[2] + "." + parts[1];
  }

  function severity(avg) {
    if (avg < 15)   return "sev-ok";
    if (avg <= 25)  return "sev-warn";
    return "sev-bad";
  }

  function bestCols(n) {
    if (n <= 1) return 1;
    const maxC = Math.min(n, 5);
    let best = maxC, bestScore = Infinity;
    for (let c = maxC; c >= 1; c--) {
      const rows = Math.ceil(n / c);
      const last = n - (rows - 1) * c;
      const evenness = (last === c) ? 0 : (c - last);
      const score = evenness * 10 - c;
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  function sortKey() {
    const el = document.getElementById("sort-by");
    return el ? el.value : "total_late";
  }

  function filt() {
    return {
      employee:  document.getElementById("f-emp")  ? document.getElementById("f-emp").value  : "",
      date_from: document.getElementById("f-from") ? (document.getElementById("f-from").value || null) : null,
      date_to:   document.getElementById("f-to")   ? (document.getElementById("f-to").value   || null) : null,
    };
  }

  // ── KPI strip ────────────────────────────────────────────────────────────
  function renderKPI(t) {
    const defs = [
      ["cases",           "Cases",            false],
      ["total_late",      "Total Late (min)", true ],
      ["employees_total", "Employees",        false],
      ["cities_total",    "Cities",           false],
      ["routes_total",    "Routes",           false],
    ];
    document.getElementById("totals-strip").innerHTML = defs.map(([k, label, hero]) =>
      '<div class="t-card' + (hero ? " hero" : "") + '">' +
        '<div class="t-val">'   + esc(t[k] ?? 0) + "</div>" +
        '<div class="t-label">' + esc(label)      + "</div>" +
      "</div>"
    ).join("");
  }

  // ── City cards grid ──────────────────────────────────────────────────────
  function renderCities(rows) {
    const sk = sortKey();
    const sorted = [...rows].sort((a, b) => {
      const av = a[sk] ?? 0;
      const bv = b[sk] ?? 0;
      return bv - av;
    });
    const maxLate = sorted.reduce((m, r) => Math.max(m, r.total_late ?? 0), 0) || 1;
    const grid = document.getElementById("cards-grid");
    const anySelected = selectedCity !== null;

    if (sorted.length === 0) {
      grid.innerHTML = '<div class="empty-state">No cities to display.</div>';
      return;
    }

    grid.style.gridTemplateColumns = "repeat(" + bestCols(sorted.length) + ", 1fr)";

    grid.innerHTML = sorted.map(row => {
      const cityName    = row.key[0];
      const isDelayFree = (row.cases === 0);
      const sev         = isDelayFree ? "sev-neutral" : severity(row.avg_late ?? 0);
      const pct         = isDelayFree ? 0 : Math.round(((row.total_late ?? 0) / maxLate) * 100);

      let cardClass = "d-card";
      if (isDelayFree) cardClass += " card-neutral";
      if (anySelected) {
        cardClass += (cityName === selectedCity) ? " card-selected" : " card-dim";
      }

      const badge = isDelayFree
        ? '<span class="cases-badge cases-badge-neutral">no delays</span>'
        : '<span class="cases-badge">' + esc(row.cases) + " cases</span>";

      const heroMetric = isDelayFree
        ? '<div class="hero-metric sev-neutral">0<span class="hero-unit">min</span></div>'
        : '<div class="hero-metric ' + sev + '">' + esc(row.total_late) + '<span class="hero-unit">min</span></div>';

      const bar = isDelayFree
        ? '<div class="bar-track"><div class="bar-fill bar-fill-neutral" style="width:0%"></div></div>'
        : '<div class="bar-track"><div class="bar-fill ' + sev + '" style="width:' + pct + '%"></div></div>';

      return (
        '<div class="' + cardClass + '" data-city="' + esc(cityName) + '">' +
          '<div class="card-city-label">CITY</div>' +
          '<div class="card-head">' +
            '<span class="card-title" dir="auto">' + esc(cityName) + "</span>" +
            badge +
          "</div>" +
          heroMetric +
          bar +
          '<div class="card-foot">avg ' + esc(isDelayFree ? 0 : row.avg_late) + " min &middot; " +
            esc(row.employees) + " emp &middot; " +
            esc(row.routes) + " routes</div>" +
        "</div>"
      );
    }).join("");
  }

  // ── Drawer ───────────────────────────────────────────────────────────────
  function renderDrawer(d) {
    const drawer  = document.getElementById("emp-drawer");
    const overlay = document.getElementById("emp-overlay");
    const cityEl  = document.getElementById("drawer-city");
    const countEl = document.getElementById("drawer-count");
    const bodyEl  = document.getElementById("drawer-body");

    if (!selectedCity) {
      drawer.classList.remove("drawer-open");
      overlay.classList.remove("overlay-visible");
      return;
    }

    const rosterSlice  = ((d && d.roster)  || []).filter(r => r.city === selectedCity);
    const cityRecords  = ((d && d.records) || []).filter(r => r.city === selectedCity);
    const recByEmp = {};
    cityRecords.forEach(r => {
      const no = r.employee_no;
      if (!recByEmp[no]) recByEmp[no] = [];
      recByEmp[no].push(r);
    });

    const empList = rosterSlice.map(person => {
      const no   = person.employee_no;
      const recs = (recByEmp[no] || []).slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
      const totalLate = recs.reduce((s, r) => s + (r.late_min || 0), 0);
      return { empNo: no, first: person.first_name, last: person.last_name, route: person.route, records: recs, totalLate, cases: recs.length };
    });

    empList.sort((a, b) => {
      if (a.cases > 0 && b.cases === 0) return -1;
      if (a.cases === 0 && b.cases > 0) return  1;
      if (a.cases > 0 && b.cases > 0)   return b.totalLate - a.totalLate;
      return (a.last || "").localeCompare(b.last || "");
    });

    cityEl.textContent = selectedCity;

    const cityRow    = (d && d.by_city || []).find(r => r.key[0] === selectedCity);
    const residents  = empList.length;
    const resStr     = residents + (residents === 1 ? " person" : " people");
    if (cityRow) {
      countEl.textContent = resStr + " · " + (cityRow.cases ?? 0) + " cases · " + (cityRow.total_late ?? 0) + " min";
    } else {
      countEl.textContent = resStr;
    }

    if (empList.length === 0) {
      bodyEl.innerHTML = '<div class="drawer-empty">No employee data for this city.</div>';
    } else {
      bodyEl.innerHTML = empList.map((emp, i) => {
        const hasDelays = emp.cases > 0;
        const sev       = hasDelays ? severity(emp.totalLate / emp.cases) : "sev-neutral";
        const delay     = (i * 35) + "ms";

        let daysSection = "";
        if (hasDelays) {
          const dayRows = emp.records.map(r =>
            '<div class="emp-day-row">' +
              '<span class="emp-day-date">'    + esc(fmtDate(r.date))     + "</span>" +
              '<span class="emp-day-late">+'   + esc(r.late_min)          + " min</span>" +
              '<span class="emp-day-arrival">' + esc(r.arrival || "—") + "</span>" +
            "</div>"
          ).join("");
          daysSection = '<div class="emp-days">' + dayRows + "</div>";
        } else {
          daysSection = '<div class="emp-days emp-days-nodelay"><span class="emp-nodelay-label">No delays in period</span></div>';
        }

        const summaryHtml = hasDelays
          ? '<div class="emp-card-summary">' +
              '<div class="emp-card-late ' + sev + '">' + esc(emp.totalLate) + '<span style="font-size:11px;font-weight:500;margin-left:2px">min</span></div>' +
              '<div class="emp-card-cases">' + esc(emp.cases) + " cases</div>" +
            "</div>"
          : '<div class="emp-card-summary">' +
              '<div class="emp-card-late emp-card-late-neutral">0<span style="font-size:11px;font-weight:500;margin-left:2px">min</span></div>' +
              '<div class="emp-card-cases emp-card-cases-neutral">0 cases</div>' +
            "</div>";

        return (
          '<div class="emp-card' + (hasDelays ? "" : " emp-card-neutral") + '" style="animation-delay:' + delay + '">' +
            '<div class="emp-card-top">' +
              '<div class="emp-card-number' + (hasDelays ? "" : " emp-card-number-neutral") + '">' + esc(emp.empNo) + "</div>" +
              '<div class="emp-card-info">' +
                '<div class="emp-card-name" dir="auto">'  + esc(emp.last) + " " + esc(emp.first) + "</div>" +
                '<div class="emp-card-route" dir="auto">' + esc(emp.route) + "</div>" +
              "</div>" +
              summaryHtml +
            "</div>" +
            daysSection +
          "</div>"
        );
      }).join("");
    }

    drawer.classList.add("drawer-open");
    overlay.classList.add("overlay-visible");
  }

  function closeDrawer() {
    selectedCity = null;
    render();
  }

  // ── Main render ──────────────────────────────────────────────────────────
  function render() {
    const d = Engine.buildDashboard(records, roster, filt());
    renderKPI(d.totals);
    renderCities(d.by_city);
    renderDrawer(d);
  }

  // ── Autocomplete ─────────────────────────────────────────────────────────
  let _acWired = false;

  function hideSuggest() {
    const box = document.getElementById("emp-suggest");
    if (box) { box.hidden = true; box.innerHTML = ""; }
  }

  function showSuggest(matches) {
    const box = document.getElementById("emp-suggest");
    if (!box) return;
    if (matches.length === 0) { hideSuggest(); return; }
    box.innerHTML = matches.map(name =>
      '<div class="suggest-item" dir="auto">' + esc(name) + "</div>"
    ).join("");
    box.hidden = false;
    box.querySelectorAll(".suggest-item").forEach(item => {
      item.addEventListener("mousedown", e => {
        e.preventDefault();
        document.getElementById("f-emp").value = item.textContent;
        hideSuggest();
        render();
      });
    });
  }

  function wireAutocomplete() {
    if (_acWired) return;
    _acWired = true;
    const inp = document.getElementById("f-emp");
    if (!inp) return;

    inp.addEventListener("input", () => {
      const q = inp.value.trim().toLowerCase();
      if (!q) { hideSuggest(); render(); return; }
      const matches = (state.employees || []).filter(n => n.toLowerCase().includes(q)).slice(0, 8);
      showSuggest(matches);
      render();
    });

    inp.addEventListener("keydown", e => {
      if (e.key === "Escape") hideSuggest();
    });

    document.addEventListener("click", e => {
      if (!e.target.closest(".emp-wrap")) hideSuggest();
    });
  }

  // ── File loading ─────────────────────────────────────────────────────────

  function loadFile(file) {
    if (!file) return;
    localStorage.setItem("lastFileName", file.name);
    document.getElementById("path").textContent = file.name;

    file.arrayBuffer().then(buf => {
      try {
        const parsed = Engine.parseWorkbook(buf);
        records = parsed.records;
        roster  = parsed.roster;
        state   = Engine.buildState(records, roster);
        showDashboard();
        render();
      } catch (err) {
        alert("Error reading file: " + (err.message || err));
      }
    }).catch(err => {
      alert("Could not read file: " + (err.message || err));
    });
  }

  function showDashboard() {
    const dz = document.getElementById("dropzone-wrapper");
    const db = document.getElementById("dashboard-wrapper");
    if (dz) dz.hidden = true;
    if (db) db.hidden = false;
    wireOnce();
  }

  // ── Wire event handlers once ─────────────────────────────────────────────
  let _wired = false;

  function wireOnce() {
    if (_wired) return;
    _wired = true;

    wireAutocomplete();

    // City card click
    document.getElementById("cards-grid").addEventListener("click", e => {
      const card = e.target.closest(".d-card[data-city]");
      if (!card) return;
      const city = card.dataset.city;
      selectedCity = (selectedCity === city) ? null : city;
      render();
    });

    // Drawer close
    document.getElementById("drawer-close").addEventListener("click", closeDrawer);
    document.getElementById("emp-overlay").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && selectedCity !== null && document.getElementById("emp-suggest").hidden) {
        closeDrawer();
      }
    });

    // Slicers
    document.getElementById("sort-by").addEventListener("change", render);
    document.getElementById("f-from").addEventListener("input", render);
    document.getElementById("f-to").addEventListener("input", render);

    // Clear
    document.getElementById("btn-clear").addEventListener("click", () => {
      document.getElementById("f-emp").value  = "";
      document.getElementById("f-from").value = "";
      document.getElementById("f-to").value   = "";
      hideSuggest();
      selectedCity = null;
      render();
    });

    // Refresh — re-use in-memory data (can't re-open file silently in browser)
    document.getElementById("btn-refresh").addEventListener("click", () => {
      render();
    });

    // Change file — hidden input trigger
    document.getElementById("btn-file").addEventListener("click", () => {
      document.getElementById("hidden-file-input").click();
    });

    // Export
    document.getElementById("btn-export").addEventListener("click", () => {
      const d = Engine.buildDashboard(records, roster, filt());
      const rows = d.by_city.map(r => ({
        City:       r.key[0],
        Employees:  r.employees,
        Cases:      r.cases,
        "Total Late (min)": r.total_late,
        "Avg Late (min)":   r.avg_late,
        Routes:     r.routes,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Summary");
      XLSX.writeFile(wb, "bus-delays-summary.xlsx");
    });
  }

  // ── Drop-zone wiring ─────────────────────────────────────────────────────
  function wireLanding() {
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("dropzone-file-input");
    const hiddenInput = document.getElementById("hidden-file-input");

    if (dropzone) {
      dropzone.addEventListener("click", () => fileInput.click());
      dropzone.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("dz-over"); });
      dropzone.addEventListener("dragleave",  () => dropzone.classList.remove("dz-over"));
      dropzone.addEventListener("drop", e => {
        e.preventDefault();
        dropzone.classList.remove("dz-over");
        const file = e.dataTransfer.files[0];
        if (file) loadFile(file);
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", () => {
        if (fileInput.files[0]) loadFile(fileInput.files[0]);
        fileInput.value = "";
      });
    }

    if (hiddenInput) {
      hiddenInput.addEventListener("change", () => {
        if (hiddenInput.files[0]) loadFile(hiddenInput.files[0]);
        hiddenInput.value = "";
      });
    }

    // Show last file name hint (browser security: can't auto-load it)
    const lastName = localStorage.getItem("lastFileName");
    if (lastName) {
      const hint = document.getElementById("dz-last-hint");
      if (hint) hint.textContent = "Last used: " + lastName + " (re-select to reload)";
    }
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    wireLanding();
  });

})();
