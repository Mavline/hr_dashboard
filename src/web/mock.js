window.MOCK_VIEW = {
  state: {
    source_path: "C:\\...\\HR report.xlsx",
    date_min: "2026-06-01", date_max: "2026-06-07",
    cities: ["יהוד", "אריאל", "לוד"], routes: ["פתח תקווה", "יהוד- קרית אונו", "לוד"]
  },
  totals: { cases: 53, total_late: 1117, employees: 46, routes: 3, days: 7 },
  rows: [
    { key: [12, "אלונה", "שאמלי", "יהוד", "יהוד- קרית אונו"],
      cases: 4, total_late: 118, avg_late: 29.5, employees: 1, routes: 1 },
    { key: [370, "ילנה", "בוטוב", "אריאל", "פתח תקווה"],
      cases: 3, total_late: 61, avg_late: 20.3, employees: 1, routes: 1 },
    { key: [88, "דוד", "כהן", "לוד", "לוד"],
      cases: 2, total_late: 22, avg_late: 11.0, employees: 1, routes: 1 },
    { key: [205, "מרים", "לוי", "יהוד", "פתח תקווה"],
      cases: 5, total_late: 95, avg_late: 19.0, employees: 1, routes: 1 }
  ]
};
