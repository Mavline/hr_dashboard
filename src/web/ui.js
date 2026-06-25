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
      cities: selectedCity ? [selectedCity] : [],
    };
  }

  function sortKey() { return document.getElementById("sort-by").value; }

  // Severity classification by avg_late (minutes)
  function severity(avg) {
    if (avg < 15) return "sev-ok";
    if (avg <= 25) return "sev-warn";
    return "sev-bad";
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

  // ── Render city cards grid ─────────────────────────────────────
  function renderCities(rows) {
    const sk = sortKey();
    const sorted = [...rows].sort((a, b) => (b[sk] ?? 0) - (a[sk] ?? 0));
    const maxLate = sorted.reduce((m, r) => Math.max(m, r.total_late ?? 0), 0) || 1;
    const grid = document.getElementById("cards-grid");
    const anySelected = selectedCity !== null;

    if (sorted.length === 0) {
      grid.innerHTML = '<div class="empty-state">No delays match the current filters.</div>';
      return;
    }

    grid.innerHTML = sorted.map(row => {
      const cityName = row.key[0];
      const sev = severity(row.avg_late ?? 0);
      const pct = Math.round(((row.total_late ?? 0) / maxLate) * 100);

      let cardClass = "d-card";
      if (anySelected) {
        if (cityName === selectedCity) {
          cardClass += " card-selected";
        } else {
          cardClass += " card-dim";
        }
      }

      return (
        '<div class="' + cardClass + '" data-city="' + esc(cityName) + '">' +
          '<div class="card-city-label">CITY</div>' +
          '<div class="card-head">' +
            '<span class="card-title" dir="auto">' + esc(cityName) + "</span>" +
            '<span class="cases-badge">' + esc(row.cases) + " cases</span>" +
          "</div>" +
          '<div class="hero-metric ' + sev + '">' +
            esc(row.total_late) +
            '<span class="hero-unit">min</span>' +
          "</div>" +
          '<div class="bar-track">' +
            '<div class="bar-fill ' + sev + '" style="width:' + pct + '%"></div>' +
          "</div>" +
          '<div class="card-foot">avg ' + esc(row.avg_late) + " min &middot; " +
            esc(row.employees) + " emp &middot; " +
            esc(row.routes) + " routes</div>" +
        "</div>"
      );
    }).join("");

  }

  // ── Render drawer content (card-rows) ─────────────────────────
  function renderDrawer(employees) {
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

    // Filter to selected city's employees only
    const rows = (employees || []).filter(r => r.key[3] === selectedCity);
    const sorted = [...rows].sort((a, b) => (b.total_late ?? 0) - (a.total_late ?? 0));

    cityEl.textContent  = selectedCity;
    countEl.textContent = sorted.length + (sorted.length === 1 ? " person" : " people");

    if (sorted.length === 0) {
      bodyEl.innerHTML = '<div class="drawer-empty">No employee data for this city.</div>';
    } else {
      bodyEl.innerHTML = sorted.map((row, i) => {
        // key: [emp_no, first, last, city, route]
        const empNo = row.key[0];
        const first = row.key[1];
        const last  = row.key[2];
        const route = row.key[4];
        const sev   = severity(row.avg_late ?? 0);
        // stagger: each card slightly delayed
        const delay = (i * 35) + "ms";

        return (
          '<div class="emp-card" style="animation-delay:' + delay + '">' +
            '<div class="emp-card-info">' +
              '<div class="emp-card-name" dir="auto">' + esc(last) + " " + esc(first) + "</div>" +
              '<div class="emp-card-sub" dir="auto">route &middot; ' + esc(route) + "</div>" +
              '<div class="emp-card-no">#' + esc(empNo) + "</div>" +
            "</div>" +
            '<div class="emp-card-meta">' +
              '<div class="emp-card-late ' + sev + '">' + esc(row.total_late) + '<span style="font-size:11px;font-weight:500;margin-left:2px">min</span></div>' +
              '<div class="emp-card-cases">' + esc(row.cases) + " cases</div>" +
            "</div>" +
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
    renderDrawer(d.employees);
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

    // Drawer close: Escape key
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && selectedCity !== null) closeDrawer();
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
