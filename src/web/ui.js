const App = (() => {
  const api = () => (window.pywebview && window.pywebview.api) || null;
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Cached state (employees list + path)
  let _state = { employees: [], source_path: null };

  // Cross-filter: currently selected city (null = no filter)
  let selectedCity = null;

  function filt() {
    return {
      employee: document.getElementById("f-emp").value,
      date_from: document.getElementById("f-from").value || null,
      date_to: document.getElementById("f-to").value || null,
    };
  }

  function sortKey() { return document.getElementById("sort-by").value; }

  // Severity classification by avg_late (minutes)
  function severity(avg) {
    if (avg < 15) return "sev-ok";
    if (avg <= 25) return "sev-warn";
    return "sev-bad";
  }

  // Format ISO date "YYYY-MM-DD" -> "DD.MM"
  function fmtDate(iso) {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length < 3) return iso;
    return parts[2] + "." + parts[1];
  }

  // ── Render KPI strip ───────────────────────────────────────────
  function renderKPI(t) {
    const defs = [
      ["cases",      "Cases",            false],
      ["total_late", "Total Late (min)", true ],
      ["employees",  "Employees",        false],
      ["routes",     "Routes",           false],
      ["days",       "Days",             false],
    ];
    document.getElementById("totals-strip").innerHTML = defs.map(([k, label, hero]) =>
      '<div class="t-card' + (hero ? " hero" : "") + '">' +
        '<div class="t-val">' + esc(t[k] ?? 0) + "</div>" +
        '<div class="t-label">' + esc(label) + "</div>" +
      "</div>"
    ).join("");
  }

  // ── Compute best column count for even grid rows ────────────────
  function bestCols(n) {
    if (n <= 1) return 1;
    const maxC = Math.min(n, 5);            // cap at 5 per row for width
    let best = maxC, bestScore = Infinity;
    for (let c = maxC; c >= 1; c--) {
      const rows = Math.ceil(n / c);
      const last = n - (rows - 1) * c;       // cards in the last row
      const evenness = (last === c) ? 0 : (c - last);
      const score = evenness * 10 - c;       // prefer even rows, then more columns
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  // ── Render city cards grid ─────────────────────────────────────
  function renderCities(rows) {
    const sk = sortKey();
    // Backend already sorts delay cities first by desc incidents; respect that
    // but allow user to re-sort by other keys via the sort-by slicer.
    // When sorting by the default key (cases) keep backend order intact for
    // the delay-free cities (cases===0) so they stay at the bottom.
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

    // Set grid columns based on city count
    grid.style.gridTemplateColumns = "repeat(" + bestCols(sorted.length) + ", 1fr)";

    grid.innerHTML = sorted.map(row => {
      const cityName = row.key[0];
      const isDelayFree = (row.cases === 0);
      const sev = isDelayFree ? "sev-neutral" : severity(row.avg_late ?? 0);
      const pct = isDelayFree ? 0 : Math.round(((row.total_late ?? 0) / maxLate) * 100);

      let cardClass = "d-card";
      if (isDelayFree) cardClass += " card-neutral";
      if (anySelected) {
        if (cityName === selectedCity) {
          cardClass += " card-selected";
        } else {
          cardClass += " card-dim";
        }
      }

      // Badge: muted "no delays" for delay-free cities, colored cases badge otherwise
      const badge = isDelayFree
        ? '<span class="cases-badge cases-badge-neutral">no delays</span>'
        : '<span class="cases-badge">' + esc(row.cases) + " cases</span>";

      // Hero metric: grey "0 min" for delay-free, severity-colored otherwise
      const heroMetric = isDelayFree
        ? '<div class="hero-metric sev-neutral">0<span class="hero-unit">min</span></div>'
        : '<div class="hero-metric ' + sev + '">' + esc(row.total_late) + '<span class="hero-unit">min</span></div>';

      // Bar: empty for delay-free cities
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

  // ── Render drawer content (from roster + records) ─────────────
  function renderDrawer(d) {
    const drawer   = document.getElementById("emp-drawer");
    const overlay  = document.getElementById("emp-overlay");
    const cityEl   = document.getElementById("drawer-city");
    const countEl  = document.getElementById("drawer-count");
    const bodyEl   = document.getElementById("drawer-body");

    if (!selectedCity) {
      drawer.classList.remove("drawer-open");
      overlay.classList.remove("overlay-visible");
      return;
    }

    // All residents of this city from the full roster
    const roster = ((d && d.roster) || []).filter(r => r.city === selectedCity);

    // Records for this city indexed by employee_no
    const cityRecords = ((d && d.records) || []).filter(r => r.city === selectedCity);
    const recByEmp = {};
    cityRecords.forEach(r => {
      const no = r.employee_no;
      if (!recByEmp[no]) recByEmp[no] = [];
      recByEmp[no].push(r);
    });

    // Build employee list from roster (not from records)
    const empList = roster.map(person => {
      const no = person.employee_no;
      const recs = (recByEmp[no] || []).slice().sort(
        (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0
      );
      const totalLate = recs.reduce((s, r) => s + (r.late_min || 0), 0);
      return {
        empNo: no,
        first: person.first_name,
        last: person.last_name,
        route: person.route,
        records: recs,
        totalLate,
        cases: recs.length,
      };
    });

    // Sort: delayed employees first (by totalLate desc), then delay-free alphabetically
    empList.sort((a, b) => {
      if (a.cases > 0 && b.cases === 0) return -1;
      if (a.cases === 0 && b.cases > 0) return  1;
      if (a.cases > 0 && b.cases > 0) return (b.totalLate - a.totalLate);
      // both delay-free: sort by last name
      return (a.last || "").localeCompare(b.last || "");
    });

    cityEl.textContent = selectedCity;

    // Drawer header: residents count + city totals from by_city row
    const cityRow = (d && d.by_city || []).find(r => r.key[0] === selectedCity);
    const residents = empList.length;
    const residentsStr = residents + (residents === 1 ? " person" : " people");
    if (cityRow) {
      countEl.textContent =
        residentsStr + " · " + (cityRow.cases ?? 0) + " cases · " + (cityRow.total_late ?? 0) + " min";
    } else {
      countEl.textContent = residentsStr;
    }

    if (empList.length === 0) {
      bodyEl.innerHTML = '<div class="drawer-empty">No employee data for this city.</div>';
    } else {
      bodyEl.innerHTML = empList.map((emp, i) => {
        const hasDelays = emp.cases > 0;
        const sev = hasDelays ? severity(emp.totalLate / emp.cases) : "sev-neutral";
        const delay = (i * 35) + "ms";

        // Per-day rows (only for employees with delays)
        let daysSection = "";
        if (hasDelays) {
          const dayRows = emp.records.map(r =>
            '<div class="emp-day-row">' +
              '<span class="emp-day-date">' + esc(fmtDate(r.date)) + "</span>" +
              '<span class="emp-day-late">+' + esc(r.late_min) + " min</span>" +
              '<span class="emp-day-arrival">' + esc(r.arrival || "—") + "</span>" +
            "</div>"
          ).join("");
          daysSection = '<div class="emp-days">' + dayRows + "</div>";
        } else {
          daysSection =
            '<div class="emp-days emp-days-nodelay">' +
              '<span class="emp-nodelay-label">No delays in period</span>' +
            '</div>';
        }

        // Summary: total + cases (muted for delay-free)
        const summaryHtml = hasDelays
          ? '<div class="emp-card-summary">' +
              '<div class="emp-card-late ' + sev + '">' + esc(emp.totalLate) +
                '<span style="font-size:11px;font-weight:500;margin-left:2px">min</span></div>' +
              '<div class="emp-card-cases">' + esc(emp.cases) + " cases</div>" +
            "</div>"
          : '<div class="emp-card-summary">' +
              '<div class="emp-card-late emp-card-late-neutral">0' +
                '<span style="font-size:11px;font-weight:500;margin-left:2px">min</span></div>' +
              '<div class="emp-card-cases emp-card-cases-neutral">0 cases</div>' +
            "</div>";

        return (
          '<div class="emp-card' + (hasDelays ? "" : " emp-card-neutral") + '" style="animation-delay:' + delay + '">' +
            '<div class="emp-card-top">' +
              '<div class="emp-card-number' + (hasDelays ? "" : " emp-card-number-neutral") + '">' + esc(emp.empNo) + "</div>" +
              '<div class="emp-card-info">' +
                '<div class="emp-card-name" dir="auto">' + esc(emp.last) + " " + esc(emp.first) + "</div>" +
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

  // ── Close drawer helper ────────────────────────────────────────
  function closeDrawer() {
    selectedCity = null;
    render();
  }

  // ── Main render ────────────────────────────────────────────────
  async function render() {
    const d = api() ? await api().get_dashboard(filt()) : window.MOCK_DASHBOARD;
    renderKPI(d.totals);
    renderCities(d.by_city);
    renderDrawer(d);
  }

  // ── Autocomplete ───────────────────────────────────────────────
  function hideSuggest() {
    const box = document.getElementById("emp-suggest");
    box.hidden = true;
    box.innerHTML = "";
  }

  function showSuggest(matches) {
    const box = document.getElementById("emp-suggest");
    if (matches.length === 0) { hideSuggest(); return; }
    box.innerHTML = matches.map(name =>
      '<div class="suggest-item" dir="auto">' + esc(name) + "</div>"
    ).join("");
    box.hidden = false;
    box.querySelectorAll(".suggest-item").forEach(item => {
      item.addEventListener("mousedown", e => {
        // mousedown fires before blur; prevent blur hiding the list first
        e.preventDefault();
        document.getElementById("f-emp").value = item.textContent;
        hideSuggest();
        render();
      });
    });
  }

  function wireAutocomplete() {
    const inp = document.getElementById("f-emp");

    inp.addEventListener("input", () => {
      const q = inp.value.trim().toLowerCase();
      if (!q) { hideSuggest(); return; }
      const matches = _state.employees
        .filter(n => n.toLowerCase().includes(q))
        .slice(0, 8);
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

  // ── Init / wire ────────────────────────────────────────────────
  async function wire() {
    // Fetch state once and cache it
    const st = api() ? await api().get_state() : window.MOCK_STATE;
    _state = { employees: (st && st.employees) || [], source_path: (st && st.source_path) || null };

    document.getElementById("path").textContent = _state.source_path || "—";

    wireAutocomplete();

    // City card click delegation (wired once at init)
    document.getElementById("cards-grid").addEventListener("click", e => {
      const card = e.target.closest(".d-card[data-city]");
      if (!card) return;
      const city = card.dataset.city;
      selectedCity = (selectedCity === city) ? null : city;
      render();
    });

    // Drawer close: × button
    document.getElementById("drawer-close").addEventListener("click", closeDrawer);

    // Drawer close: backdrop overlay
    document.getElementById("emp-overlay").addEventListener("click", closeDrawer);

    // Drawer close: Escape key (only when autocomplete suggestion list is not open)
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && selectedCity !== null && document.getElementById("emp-suggest").hidden) {
        closeDrawer();
      }
    });

    // Sort-by: re-render (no API fetch needed — renderCities re-sorts in memory)
    document.getElementById("sort-by").addEventListener("change", render);

    // Date slicers
    document.getElementById("f-from").addEventListener("input", render);
    document.getElementById("f-to").addEventListener("input", render);

    // Clear button: reset all slicers + selectedCity, then re-render
    document.getElementById("btn-clear").addEventListener("click", () => {
      document.getElementById("f-emp").value = "";
      document.getElementById("f-from").value = "";
      document.getElementById("f-to").value = "";
      hideSuggest();
      selectedCity = null;
      render();
    });

    // Refresh
    document.getElementById("btn-refresh").addEventListener("click", async () => {
      if (api()) {
        const newState = await api().refresh();
        if (newState) {
          _state = { employees: newState.employees || [], source_path: newState.source_path || null };
          document.getElementById("path").textContent = _state.source_path || "—";
        }
      }
      await render();
    });

    // Change file
    document.getElementById("btn-file").onclick = async () => {
      if (api()) {
        const newState = await api().choose_file();
        if (newState) {
          _state = { employees: newState.employees || [], source_path: newState.source_path || null };
          document.getElementById("path").textContent = _state.source_path || "—";
        }
      }
      await render();
    };

    // Export
    document.getElementById("btn-export").addEventListener("click", async () => {
      if (api()) { await api().export(filt(), "city", "xlsx"); }
    });
  }

  return {
    async init() { await wire(); await render(); },
    needFile() {
      document.getElementById("path").textContent = 'No file selected — use "Change file…"';
    },
    render,
  };
})();

// Outside pywebview (opening index.html directly) — show mock immediately.
if (!(window.pywebview && window.pywebview.api)) {
  window.addEventListener("DOMContentLoaded", () => App.init());
}
