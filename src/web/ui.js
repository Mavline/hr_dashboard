const App = (() => {
  const api = () => (window.pywebview && window.pywebview.api) || null;
  let sortCol = "total_late", sortDir = -1;

  function filt() {
    return {
      employee: document.getElementById("f-emp").value,
      date_from: document.getElementById("f-from").value || null,
      date_to: document.getElementById("f-to").value || null,
    };
  }
  function view() { return document.getElementById("view").value; }

  async function getView() {
    if (api()) return await api().get_view(filt(), view());
    return window.MOCK_VIEW; // макет
  }

  function keyHeaders(v) {
    return ({
      employee: ["Employee No", "First Name", "Last Name", "City", "Route"],
      route: ["Route"], date: ["Date"], week: ["Week (Sun)"], weekday: ["Weekday"],
    })[v];
  }
  const METRICS = ["cases", "total_late", "avg_late", "employees", "routes"];
  const METRIC_LABELS = ["Cases", "Total Late (min)", "Avg Late (min)",
                         "Employees", "Routes"];

  function renderCards(t) {
    const defs = [["cases","Cases"],["total_late","Total Late (min)"],
      ["employees","Employees"],["routes","Routes"],["days","Days"]];
    document.getElementById("cards").innerHTML = defs.map(([k,l]) =>
      `<div class="card"><div class="v">${t[k] ?? 0}</div><div class="l">${l}</div></div>`
    ).join("");
  }

  function renderTable(v, rows) {
    const kh = keyHeaders(v);
    const thead = document.querySelector("#grid thead");
    const tbody = document.querySelector("#grid tbody");
    thead.innerHTML = "<tr>" +
      kh.map(h => `<th>${h}</th>`).join("") +
      METRIC_LABELS.map((l,i) => `<th data-col="${METRICS[i]}">${l}</th>`).join("") +
      "</tr>";
    const sorted = [...rows].sort((a,b) =>
      (a[sortCol] > b[sortCol] ? 1 : -1) * sortDir);
    tbody.innerHTML = sorted.map(r =>
      "<tr>" + r.key.map(c => `<td>${c ?? ""}</td>`).join("") +
      METRICS.map(m => `<td>${r[m]}</td>`).join("") + "</tr>"
    ).join("");
    thead.querySelectorAll("th[data-col]").forEach(th =>
      th.onclick = () => {
        const c = th.dataset.col;
        sortDir = (sortCol === c) ? -sortDir : -1; sortCol = c;
        renderTable(v, rows);
      });
  }

  async function render() {
    const data = await getView();
    if (data.state) document.getElementById("path").textContent =
      data.state.source_path || "—";
    renderCards(data.totals);
    renderTable(view(), data.rows);
  }

  function wire() {
    ["view","f-emp","f-from","f-to"].forEach(id =>
      document.getElementById(id).addEventListener("input", render));
    document.getElementById("btn-file").onclick = async () => {
      if (api()) { await api().choose_file(); render(); }
    };
    document.getElementById("btn-refresh").onclick = async () => {
      if (api()) { await api().refresh(); render(); }
    };
    document.getElementById("btn-export").onclick = async () => {
      if (api()) await api().export(filt(), view(), "xlsx");
    };
  }

  return {
    init() { wire(); render(); },
    needFile() { document.getElementById("path").textContent =
      'No file selected — use "Change file…"'; },
    render,
  };
})();

// Вне pywebview (открытие index.html напрямую) — сразу показать макет.
if (!(window.pywebview && window.pywebview.api)) {
  window.addEventListener("DOMContentLoaded", () => App.init());
}
