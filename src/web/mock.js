window.MOCK_STATE = {
  source_path: "C:\\...\\HR report.xlsx",
  date_min: "2026-06-01",
  date_max: "2026-06-07",
  cities: ["אריאל", "יהוד", "לוד", "רמת גן", "פתח תקווה", "נתניה"],
  routes: ["פתח תקווה", "יהוד- קרית אונו", "לוד", "רמת גן מרכז", "נתניה דרום"],
  employees: ["אבו-עמר עלי", "בוטוב ילנה", "כהן דוד", "לוי מרים", "שאמלי אלונה", "פרץ יוסי", "גרין נועה", "רוזן משה"]
};

window.MOCK_DASHBOARD = {
  totals: { cases: 53, total_late: 1117, employees: 8, routes: 5, days: 7 },
  by_city: [
    { key: ["יהוד"],       cases: 9,  total_late: 213, avg_late: 23.7, employees: 2, routes: 2 },
    { key: ["אריאל"],      cases: 7,  total_late: 187, avg_late: 26.7, employees: 1, routes: 1 },
    { key: ["רמת גן"],     cases: 11, total_late: 172, avg_late: 15.6, employees: 2, routes: 1 },
    { key: ["לוד"],        cases: 6,  total_late: 144, avg_late: 24.0, employees: 2, routes: 2 },
    { key: ["פתח תקווה"],  cases: 12, total_late: 241, avg_late: 20.1, employees: 2, routes: 2 },
    { key: ["נתניה"],      cases: 8,  total_late: 160, avg_late: 20.0, employees: 1, routes: 1 }
  ],
  by_date: [
    { key: ["2026-06-01"], cases: 8,  total_late: 166, avg_late: 20.8, employees: 5, routes: 3 },
    { key: ["2026-06-02"], cases: 10, total_late: 210, avg_late: 21.0, employees: 6, routes: 4 }
  ],
  employees: [
    { key: [12,  "אלונה", "שאמלי",    "יהוד",       "יהוד- קרית אונו"],  cases: 4, total_late: 118, avg_late: 29.5 },
    { key: [205, "מרים",  "לוי",      "יהוד",        "פתח תקווה"],        cases: 5, total_late: 95,  avg_late: 19.0 },
    { key: [301, "יעל",   "אברהם",    "יהוד",        "יהוד- קרית אונו"],  cases: 3, total_late: 54,  avg_late: 18.0 },
    { key: [370, "ילנה",  "בוטוב",    "אריאל",      "פתח תקווה"],         cases: 3, total_late: 61,  avg_late: 20.3 },
    { key: [415, "אמיר",  "שפירא",    "אריאל",      "פתח תקווה"],         cases: 2, total_late: 48,  avg_late: 24.0 },
    { key: [88,  "דוד",   "כהן",      "לוד",         "לוד"],              cases: 2, total_late: 22,  avg_late: 11.0 },
    { key: [134, "חנה",   "מזרחי",    "לוד",         "לוד"],              cases: 3, total_late: 71,  avg_late: 23.7 },
    { key: [222, "אסף",   "ביטון",    "לוד",         "לוד"],              cases: 1, total_late: 15,  avg_late: 15.0 },
    { key: [44,  "עלי",   "אבו-עמר",  "פתח תקווה",   "פתח תקווה"],        cases: 6, total_late: 124, avg_late: 20.7 },
    { key: [77,  "נועה",  "גרין",     "פתח תקווה",   "נתניה דרום"],       cases: 6, total_late: 117, avg_late: 19.5 },
    { key: [188, "טל",    "כץ",       "פתח תקווה",   "פתח תקווה"],        cases: 4, total_late: 68,  avg_late: 17.0 },
    { key: [99,  "יוסי",  "פרץ",      "רמת גן",      "רמת גן מרכז"],      cases: 5, total_late: 87,  avg_late: 17.4 },
    { key: [250, "שרה",   "כהן",      "רמת גן",      "רמת גן מרכז"],      cases: 4, total_late: 62,  avg_late: 15.5 },
    { key: [33,  "משה",   "רוזן",     "נתניה",       "נתניה דרום"],       cases: 8, total_late: 160, avg_late: 20.0 },
    { key: [410, "רחל",   "דהן",      "נתניה",       "נתניה דרום"],       cases: 3, total_late: 55,  avg_late: 18.3 }
  ]
};
