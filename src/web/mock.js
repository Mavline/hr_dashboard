window.MOCK_STATE = {
  source_path: "C:\\...\\HR report.xlsx",
  date_min: "2026-06-01",
  date_max: "2026-06-07",
  cities: ["אריאל", "יהוד", "לוד", "רמת גן", "פתח תקווה", "נתניה", "חיפה", "אשדוד", "באר שבע"],
  routes: ["פתח תקווה", "יהוד- קרית אונו", "לוד", "רמת גן מרכז", "נתניה דרום", "חיפה מרכז", "אשדוד דרום"],
  employees: ["אבו-עמר עלי", "בוטוב ילנה", "כהן דוד", "לוי מרים", "שאמלי אלונה", "פרץ יוסי", "גרין נועה", "רוזן משה",
               "כהן שרה", "דהן רחל", "שפירא אמיר", "מזרחי חנה", "ביטון אסף", "אברהם יעל", "כץ טל",
               "נחום ורד", "גולדברג איתן", "סבג ליאור", "חסון ניר", "קפלן דנה"]
};

window.MOCK_DASHBOARD = {
  totals: { cases: 59, total_late: 1048, employees: 20, routes: 7, days: 8 },
  by_city: [
    // Cities WITH delays — sorted by desc cases (backend order)
    { key: ["פתח תקווה"],  cases: 16, total_late: 309, avg_late: 19.3, employees: 3, routes: 2 },
    { key: ["יהוד"],       cases: 12, total_late: 267, avg_late: 22.3, employees: 3, routes: 2 },
    { key: ["נתניה"],      cases: 11, total_late: 215, avg_late: 19.5, employees: 2, routes: 1 },
    { key: ["רמת גן"],     cases: 9,  total_late: 149, avg_late: 16.6, employees: 2, routes: 1 },
    { key: ["לוד"],        cases: 6,  total_late: 108, avg_late: 18.0, employees: 3, routes: 1 },
    { key: ["אריאל"],      cases: 5,  total_late: 109, avg_late: 21.8, employees: 2, routes: 1 },
    // Delay-free cities (cases:0) — sorted last, employees > 0
    { key: ["חיפה"],       cases: 0,  total_late: 0,   avg_late: 0,    employees: 3, routes: 2 },
    { key: ["אשדוד"],      cases: 0,  total_late: 0,   avg_late: 0,    employees: 2, routes: 1 },
    { key: ["באר שבע"],    cases: 0,  total_late: 0,   avg_late: 0,    employees: 2, routes: 1 }
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
  ],
  // roster: full list of all 20 employees (everyone, not just those with delays)
  roster: [
    // יהוד — 3 people, all with delays
    { employee_no: 12,  first_name: "אלונה", last_name: "שאמלי",   city: "יהוד",       route: "יהוד- קרית אונו" },
    { employee_no: 205, first_name: "מרים",  last_name: "לוי",     city: "יהוד",       route: "פתח תקווה"       },
    { employee_no: 301, first_name: "יעל",   last_name: "אברהם",   city: "יהוד",       route: "יהוד- קרית אונו" },
    // אריאל — 2 people, both with delays
    { employee_no: 370, first_name: "ילנה",  last_name: "בוטוב",   city: "אריאל",      route: "פתח תקווה"       },
    { employee_no: 415, first_name: "אמיר",  last_name: "שפירא",   city: "אריאל",      route: "פתח תקווה"       },
    // לוד — 3 people, all with delays
    { employee_no: 88,  first_name: "דוד",   last_name: "כהן",     city: "לוד",        route: "לוד"             },
    { employee_no: 134, first_name: "חנה",   last_name: "מזרחי",   city: "לוד",        route: "לוד"             },
    { employee_no: 222, first_name: "אסף",   last_name: "ביטון",   city: "לוד",        route: "לוד"             },
    // פתח תקווה — 3 people, all with delays
    { employee_no: 44,  first_name: "עלי",   last_name: "אבו-עמר", city: "פתח תקווה",  route: "פתח תקווה"       },
    { employee_no: 77,  first_name: "נועה",  last_name: "גרין",    city: "פתח תקווה",  route: "נתניה דרום"      },
    { employee_no: 188, first_name: "טל",    last_name: "כץ",      city: "פתח תקווה",  route: "פתח תקווה"       },
    // רמת גן — 2 people, both with delays
    { employee_no: 99,  first_name: "יוסי",  last_name: "פרץ",     city: "רמת גן",     route: "רמת גן מרכז"     },
    { employee_no: 250, first_name: "שרה",   last_name: "כהן",     city: "רמת גן",     route: "רמת גן מרכז"     },
    // נתניה — 2 people, both with delays
    { employee_no: 33,  first_name: "משה",   last_name: "רוזן",    city: "נתניה",      route: "נתניה דרום"      },
    { employee_no: 410, first_name: "רחל",   last_name: "דהן",     city: "נתניה",      route: "נתניה דרום"      },
    // חיפה — 3 people, NO delays in period (delay-free city)
    { employee_no: 501, first_name: "ורד",   last_name: "נחום",    city: "חיפה",       route: "חיפה מרכז"       },
    { employee_no: 502, first_name: "איתן",  last_name: "גולדברג", city: "חיפה",       route: "חיפה מרכז"       },
    { employee_no: 503, first_name: "ליאור", last_name: "סבג",     city: "חיפה",       route: "חיפה מרכז"       },
    // אשדוד — 2 people, NO delays in period (delay-free city)
    { employee_no: 601, first_name: "ניר",   last_name: "חסון",    city: "אשדוד",      route: "אשדוד דרום"      },
    { employee_no: 602, first_name: "דנה",   last_name: "קפלן",    city: "אשדוד",      route: "אשדוד דרום"      },
    // באר שבע — 2 people, NO delays in period (delay-free city)
    { employee_no: 701, first_name: "גל",    last_name: "שמש",     city: "באר שבע",    route: "באר שבע צפון"    },
    { employee_no: 702, first_name: "תמר",   last_name: "אוחיון",  city: "באר שבע",    route: "באר שבע צפון"    }
  ],
  records: [
    // יהוד — emp 12 (שאמלי אלונה), 4 records
    { employee_no: 12,  first_name: "אלונה", last_name: "שאמלי",   city: "יהוד",       route: "יהוד- קרית אונו", date: "2026-06-01", weekday: "שני",    late_min: 32, arrival: "07:32" },
    { employee_no: 12,  first_name: "אלונה", last_name: "שאמלי",   city: "יהוד",       route: "יהוד- קרית אונו", date: "2026-06-02", weekday: "שלישי",  late_min: 28, arrival: "07:28" },
    { employee_no: 12,  first_name: "אלונה", last_name: "שאמלי",   city: "יהוד",       route: "יהוד- קרית אונו", date: "2026-06-03", weekday: "רביעי",  late_min: 35, arrival: "07:35" },
    { employee_no: 12,  first_name: "אלונה", last_name: "שאמלי",   city: "יהוד",       route: "יהוד- קרית אונו", date: "2026-06-05", weekday: "שישי",   late_min: 23, arrival: "07:23" },
    // יהוד — emp 205 (לוי מרים), 5 records
    { employee_no: 205, first_name: "מרים",  last_name: "לוי",     city: "יהוד",       route: "פתח תקווה",       date: "2026-06-01", weekday: "שני",    late_min: 18, arrival: "07:18" },
    { employee_no: 205, first_name: "מרים",  last_name: "לוי",     city: "יהוד",       route: "פתח תקווה",       date: "2026-06-02", weekday: "שלישי",  late_min: 21, arrival: "07:21" },
    { employee_no: 205, first_name: "מרים",  last_name: "לוי",     city: "יהוד",       route: "פתח תקווה",       date: "2026-06-03", weekday: "רביעי",  late_min: 17, arrival: "07:17" },
    { employee_no: 205, first_name: "מרים",  last_name: "לוי",     city: "יהוד",       route: "פתח תקווה",       date: "2026-06-04", weekday: "חמישי",  late_min: 20, arrival: "07:20" },
    { employee_no: 205, first_name: "מרים",  last_name: "לוי",     city: "יהוד",       route: "פתח תקווה",       date: "2026-06-06", weekday: "שבת",    late_min: 19, arrival: "07:19" },
    // יהוד — emp 301 (אברהם יעל), 3 records
    { employee_no: 301, first_name: "יעל",   last_name: "אברהם",   city: "יהוד",       route: "יהוד- קרית אונו", date: "2026-06-02", weekday: "שלישי",  late_min: 20, arrival: "07:20" },
    { employee_no: 301, first_name: "יעל",   last_name: "אברהם",   city: "יהוד",       route: "יהוד- קרית אונו", date: "2026-06-04", weekday: "חמישי",  late_min: 16, arrival: "07:16" },
    { employee_no: 301, first_name: "יעל",   last_name: "אברהם",   city: "יהוד",       route: "יהוד- קרית אונו", date: "2026-06-05", weekday: "שישי",   late_min: 18, arrival: "07:18" },
    // פתח תקווה — emp 44 (אבו-עמר עלי), 6 records
    { employee_no: 44,  first_name: "עלי",   last_name: "אבו-עמר", city: "פתח תקווה",  route: "פתח תקווה",       date: "2026-06-01", weekday: "שני",    late_min: 25, arrival: "07:25" },
    { employee_no: 44,  first_name: "עלי",   last_name: "אבו-עמר", city: "פתח תקווה",  route: "פתח תקווה",       date: "2026-06-02", weekday: "שלישי",  late_min: 18, arrival: "07:18" },
    { employee_no: 44,  first_name: "עלי",   last_name: "אבו-עמר", city: "פתח תקווה",  route: "פתח תקווה",       date: "2026-06-03", weekday: "רביעי",  late_min: 22, arrival: "07:22" },
    { employee_no: 44,  first_name: "עלי",   last_name: "אבו-עמר", city: "פתח תקווה",  route: "פתח תקווה",       date: "2026-06-04", weekday: "חמישי",  late_min: 30, arrival: "07:30" },
    { employee_no: 44,  first_name: "עלי",   last_name: "אבו-עמר", city: "פתח תקווה",  route: "פתח תקווה",       date: "2026-06-05", weekday: "שישי",   late_min: 15, arrival: "07:15" },
    { employee_no: 44,  first_name: "עלי",   last_name: "אבו-עמר", city: "פתח תקווה",  route: "פתח תקווה",       date: "2026-06-07", weekday: "ראשון",  late_min: 14, arrival: "07:14" },
    // פתח תקווה — emp 77 (גרין נועה), 6 records
    { employee_no: 77,  first_name: "נועה",  last_name: "גרין",    city: "פתח תקווה",  route: "נתניה דרום",      date: "2026-06-01", weekday: "שני",    late_min: 19, arrival: "07:19" },
    { employee_no: 77,  first_name: "נועה",  last_name: "גרין",    city: "פתח תקווה",  route: "נתניה דרום",      date: "2026-06-02", weekday: "שלישי",  late_min: 24, arrival: "07:24" },
    { employee_no: 77,  first_name: "נועה",  last_name: "גרין",    city: "פתח תקווה",  route: "נתניה דרום",      date: "2026-06-03", weekday: "רביעי",  late_min: 17, arrival: "07:17" },
    { employee_no: 77,  first_name: "נועה",  last_name: "גרין",    city: "פתח תקווה",  route: "נתניה דרום",      date: "2026-06-04", weekday: "חמישי",  late_min: 21, arrival: "07:21" },
    { employee_no: 77,  first_name: "נועה",  last_name: "גרין",    city: "פתח תקווה",  route: "נתניה דרום",      date: "2026-06-05", weekday: "שישי",   late_min: 22, arrival: "07:22" },
    { employee_no: 77,  first_name: "נועה",  last_name: "גרין",    city: "פתח תקווה",  route: "נתניה דרום",      date: "2026-06-06", weekday: "שבת",    late_min: 14, arrival: "07:14" },
    // פתח תקווה — emp 188 (כץ טל), 4 records
    { employee_no: 188, first_name: "טל",    last_name: "כץ",      city: "פתח תקווה",  route: "פתח תקווה",       date: "2026-06-01", weekday: "שני",    late_min: 20, arrival: "07:20" },
    { employee_no: 188, first_name: "טל",    last_name: "כץ",      city: "פתח תקווה",  route: "פתח תקווה",       date: "2026-06-03", weekday: "רביעי",  late_min: 16, arrival: "07:16" },
    { employee_no: 188, first_name: "טל",    last_name: "כץ",      city: "פתח תקווה",  route: "פתח תקווה",       date: "2026-06-05", weekday: "שישי",   late_min: 17, arrival: "07:17" },
    { employee_no: 188, first_name: "טל",    last_name: "כץ",      city: "פתח תקווה",  route: "פתח תקווה",       date: "2026-06-07", weekday: "ראשון",  late_min: 15, arrival: null  },
    // רמת גן — emp 99 (פרץ יוסי), 5 records
    { employee_no: 99,  first_name: "יוסי",  last_name: "פרץ",     city: "רמת גן",     route: "רמת גן מרכז",     date: "2026-06-01", weekday: "שני",    late_min: 15, arrival: "07:15" },
    { employee_no: 99,  first_name: "יוסי",  last_name: "פרץ",     city: "רמת גן",     route: "רמת גן מרכז",     date: "2026-06-02", weekday: "שלישי",  late_min: 20, arrival: "07:20" },
    { employee_no: 99,  first_name: "יוסי",  last_name: "פרץ",     city: "רמת גן",     route: "רמת גן מרכז",     date: "2026-06-03", weekday: "רביעי",  late_min: 18, arrival: "07:18" },
    { employee_no: 99,  first_name: "יוסי",  last_name: "פרץ",     city: "רמת גן",     route: "רמת גן מרכז",     date: "2026-06-04", weekday: "חמישי",  late_min: 14, arrival: "07:14" },
    { employee_no: 99,  first_name: "יוסי",  last_name: "פרץ",     city: "רמת גן",     route: "רמת גן מרכז",     date: "2026-06-06", weekday: "שבת",    late_min: 20, arrival: "07:20" },
    // רמת גן — emp 250 (כהן שרה), 4 records
    { employee_no: 250, first_name: "שרה",   last_name: "כהן",     city: "רמת גן",     route: "רמת גן מרכז",     date: "2026-06-02", weekday: "שלישי",  late_min: 17, arrival: "07:17" },
    { employee_no: 250, first_name: "שרה",   last_name: "כהן",     city: "רמת גן",     route: "רמת גן מרכז",     date: "2026-06-03", weekday: "רביעי",  late_min: 14, arrival: "07:14" },
    { employee_no: 250, first_name: "שרה",   last_name: "כהן",     city: "רמת גן",     route: "רמת גן מרכז",     date: "2026-06-05", weekday: "שישי",   late_min: 16, arrival: "07:16" },
    { employee_no: 250, first_name: "שרה",   last_name: "כהן",     city: "רמת גן",     route: "רמת גן מרכז",     date: "2026-06-07", weekday: "ראשון",  late_min: 15, arrival: null  },
    // נתניה — emp 33 (רוזן משה), 8 records
    { employee_no: 33,  first_name: "משה",   last_name: "רוזן",    city: "נתניה",      route: "נתניה דרום",      date: "2026-06-01", weekday: "שני",    late_min: 22, arrival: "07:22" },
    { employee_no: 33,  first_name: "משה",   last_name: "רוזן",    city: "נתניה",      route: "נתניה דרום",      date: "2026-06-02", weekday: "שלישי",  late_min: 19, arrival: "07:19" },
    { employee_no: 33,  first_name: "משה",   last_name: "רוזן",    city: "נתניה",      route: "נתניה דרום",      date: "2026-06-03", weekday: "רביעי",  late_min: 20, arrival: "07:20" },
    { employee_no: 33,  first_name: "משה",   last_name: "רוזן",    city: "נתניה",      route: "נתניה דרום",      date: "2026-06-04", weekday: "חמישי",  late_min: 25, arrival: "07:25" },
    { employee_no: 33,  first_name: "משה",   last_name: "רוזן",    city: "נתניה",      route: "נתניה דרום",      date: "2026-06-05", weekday: "שישי",   late_min: 18, arrival: "07:18" },
    { employee_no: 33,  first_name: "משה",   last_name: "רוזן",    city: "נתניה",      route: "נתניה דרום",      date: "2026-06-06", weekday: "שבת",    late_min: 21, arrival: "07:21" },
    { employee_no: 33,  first_name: "משה",   last_name: "רוזן",    city: "נתניה",      route: "נתניה דרום",      date: "2026-06-07", weekday: "ראשון",  late_min: 17, arrival: "07:17" },
    { employee_no: 33,  first_name: "משה",   last_name: "רוזן",    city: "נתניה",      route: "נתניה דרום",      date: "2026-06-08", weekday: "שני",    late_min: 18, arrival: "07:18" },
    // נתניה — emp 410 (דהן רחל), 3 records
    { employee_no: 410, first_name: "רחל",   last_name: "דהן",     city: "נתניה",      route: "נתניה דרום",      date: "2026-06-02", weekday: "שלישי",  late_min: 19, arrival: "07:19" },
    { employee_no: 410, first_name: "רחל",   last_name: "דהן",     city: "נתניה",      route: "נתניה דרום",      date: "2026-06-04", weekday: "חמישי",  late_min: 18, arrival: "07:18" },
    { employee_no: 410, first_name: "רחל",   last_name: "דהן",     city: "נתניה",      route: "נתניה דרום",      date: "2026-06-06", weekday: "שבת",    late_min: 18, arrival: null  },
    // אריאל — emp 370 (בוטוב ילנה), 3 records
    { employee_no: 370, first_name: "ילנה",  last_name: "בוטוב",   city: "אריאל",      route: "פתח תקווה",       date: "2026-06-01", weekday: "שני",    late_min: 22, arrival: "07:22" },
    { employee_no: 370, first_name: "ילנה",  last_name: "בוטוב",   city: "אריאל",      route: "פתח תקווה",       date: "2026-06-03", weekday: "רביעי",  late_min: 20, arrival: "07:20" },
    { employee_no: 370, first_name: "ילנה",  last_name: "בוטוב",   city: "אריאל",      route: "פתח תקווה",       date: "2026-06-05", weekday: "שישי",   late_min: 19, arrival: "07:19" },
    // אריאל — emp 415 (שפירא אמיר), 2 records
    { employee_no: 415, first_name: "אמיר",  last_name: "שפירא",   city: "אריאל",      route: "פתח תקווה",       date: "2026-06-02", weekday: "שלישי",  late_min: 25, arrival: "07:25" },
    { employee_no: 415, first_name: "אמיר",  last_name: "שפירא",   city: "אריאל",      route: "פתח תקווה",       date: "2026-06-04", weekday: "חמישי",  late_min: 23, arrival: "07:23" },
    // לוד — emp 88 (כהן דוד), 2 records
    { employee_no: 88,  first_name: "דוד",   last_name: "כהן",     city: "לוד",        route: "לוד",             date: "2026-06-01", weekday: "שני",    late_min: 12, arrival: "07:12" },
    { employee_no: 88,  first_name: "דוד",   last_name: "כהן",     city: "לוד",        route: "לוד",             date: "2026-06-03", weekday: "רביעי",  late_min: 10, arrival: "07:10" },
    // לוד — emp 134 (מזרחי חנה), 3 records
    { employee_no: 134, first_name: "חנה",   last_name: "מזרחי",   city: "לוד",        route: "לוד",             date: "2026-06-02", weekday: "שלישי",  late_min: 24, arrival: "07:24" },
    { employee_no: 134, first_name: "חנה",   last_name: "מזרחי",   city: "לוד",        route: "לוד",             date: "2026-06-04", weekday: "חמישי",  late_min: 23, arrival: "07:23" },
    { employee_no: 134, first_name: "חנה",   last_name: "מזרחי",   city: "לוד",        route: "לוד",             date: "2026-06-06", weekday: "שבת",    late_min: 24, arrival: "07:24" },
    // לוד — emp 222 (ביטון אסף), 1 record
    { employee_no: 222, first_name: "אסף",   last_name: "ביטון",   city: "לוד",        route: "לוד",             date: "2026-06-05", weekday: "שישי",   late_min: 15, arrival: "07:15" }
    // חיפה, אשדוד, באר שבע — no records (delay-free)
  ]
};
