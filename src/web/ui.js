const App = (() => {
  const api = () => (window.pywebview && window.pywebview.api) || null;
  const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  function filt() {
    return {
      employee: document.getElementById("f-emp").value,
      date_from: document.getElementById("f-from").value || null,
      date_to: document.getElementById("f-to").value || null,
    };
  }
  function view() { return document.getElementById("view").value; }
  function sortKey() { return document.getElementById("sort-by").value; }

  async function getView() {
    if (api()) return await api().get_view(filt(), view());
    return window.MOCK_VIEW; // макет
  }

  // Severity classification by avg_late (minutes)
  function severity(avg) {
    if (avg < 15) return "sev-ok";
    if (avg <= 25) return "sev-warn";
    return "sev-bad";
  }

  // Build card title and subtitle for each view type
  function cardMeta(v, row) {
    const k = row.key;
    if (v === "employee") {
      const title = esc(k[1]) + " " + esc(k[2]);
      const sub = esc(k[3]) + " · " + esc(k[4]);
      return { title, sub };
    }
    if (v === "route") {
      const title = esc(k[0]);
      const sub = esc(row.employees) + " employee" + (row.employees !== 1 ? "s" : "");
      return { title, sub };
    }
    if (v === "date") {
      return { title: esc(k[0]), sub: "" };
    }
    if (v === "week") {
      return { title: "Week of " + esc(k[0]), sub: "" };
    }
    if (v === "weekday") {
      return { title: esc(k[0]), sub: "" };
    }
    return { title: esc(k[0]), sub: "" };
  }

  function renderTotals(t) {
    const defs = [
      ["cases",       "Cases",        false],
      ["total_late",  "Total Late (min)", true],
      ["employees",   "Employees",    false],
      ["routes",      "Routes",       false],
      ["days",        "Days",         false],
    ];
    document.getElementById("totals-strip").innerHTML = defs.map(([k, l, hero]) =>
      '<div class="t-card' + (hero ? " hero" : "") + '">' +
        '<div class="t-val">' + esc(t[k] ?? 0) + "</div>" +
        '<div class="t-label">' + l + "</div>" +
      "</div>"
    ).join("");
  }

  function renderGrid(v, rows) {
    const sk = sortKey();
    const sorted = [...rows].sort((a, b) => (b[sk] ?? 0) - (a[sk] ?? 0));
    const maxLate = sorted.reduce((m, r) => Math.max(m, r.total_late ?? 0), 0) || 1;
    const grid = document.getElementById("cards-grid");

    if (sorted.length === 0) {
      grid.innerHTML =
        '<div class="empty-state">No delays match the current filters.</div>';
      return;
    }

    grid.innerHTML = sorted.map(row => {
      const meta = cardMeta(v, row);
      const sev = severity(row.avg_late ?? 0);
      const pct = Math.round(((row.total_late ?? 0) / maxLate) * 100);
      const titleDir = (v === "employee" || v === "route") ? " dir=\"auto\"" : "";
      const subDir = (v === "employee" || v === "route") ? " dir=\"auto\"" : "";

      const footParts = ["avg " + esc(row.avg_late) + " min"];
      if (v !== "employee") footParts.push(esc(row.employees) + " emp");
      if (v !== "route")    footParts.push(esc(row.routes) + " routes");

      return (
        '<div class="d-card">' +
          '<div class="card-head">' +
            '<span class="card-title"' + titleDir + ">" + meta.title + "</span>" +
            '<span class="cases-badge">' + esc(row.cases) + " case" + (row.cases !== 1 ? "s" : "") + "</span>" +
          "</div>" +
          (meta.sub
            ? '<div class="card-sub"' + subDir + ">" + meta.sub + "</div>"
            : '<div class="card-sub"></div>'
          ) +
          '<div class="hero-metric ' + sev + '">' +
            esc(row.total_late) +
            '<span class="hero-unit">min</span>' +
          "</div>" +
          '<div class="bar-track">' +
            '<div class="bar-fill ' + sev + '" style="width:' + pct + '%"></div>' +
          "</div>" +
          '<div class="card-foot">' + footParts.join(" · ") + "</div>" +
        "</div>"
      );
    }).join("");
  }

  async function render() {
    const data = await getView();
    if (data.state) {
      document.getElementById("path").textContent =
        data.state.source_path || "—";
    }
    renderTotals(data.totals);
    renderGrid(view(), data.rows);
  }

  function wire() {
    ["view", "f-emp", "f-from", "f-to", "sort-by"].forEach(id =>
      document.getElementById(id).addEventListener("input", render));
    document.getElementById("btn-file").onclick = async () => {
      if (api()) { await api().choose_file(); await render(); }
    };
    document.getElementById("btn-refresh").onclick = async () => {
      if (api()) { await api().refresh(); await render(); }
    };
    document.getElementById("btn-export").onclick = async () => {
      if (api()) await api().export(filt(), view(), "xlsx");
    };
  }

  return {
    init() { wire(); render(); },
    needFile() {
      document.getElementById("path").textContent =
        "No file selected — use “Change file…”";
    },
    render,
  };
})();

// Вне pywebview (открытие index.html напрямую) — сразу показать макет.
if (!(window.pywebview && window.pywebview.api)) {
  window.addEventListener("DOMContentLoaded", () => App.init());
}
