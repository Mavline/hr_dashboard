# System Patterns

## Architecture
Python backend (file access, parsing, aggregation, export) + thin HTML/JS
dashboard rendered in a pywebview window. All logic is in Python (pytest-tested);
JS is the view layer and calls Python via `js_api`.

## Modules (src/)
- `config.py` — persistent source-file path in `config.json`. **Frozen-aware:**
  in a packaged `.exe` it stores config next to the executable
  (`os.path.dirname(sys.executable)`), NOT in `_MEIPASS` (temp). `CONFIG_PATH`
  is monkeypatched in tests.
- `excel_reader.py` — `read_records(path)` parses the wide sheet and **unpivots**
  dates-as-columns into one record per (employee×day) lateness:
  `{employee_no, first_name, last_name, city, route, date(ISO), weekday, late_min, arrival(HH:MM|None)}`.
  Columns found by Hebrew headers (מספר עובד, שם פרטי, שם משפחה, עיר, הסעה,
  זמן איחור=late, זמן הגעה=arrival), not by fixed letters. `read_employees(path)`
  returns the FULL roster (all 223, meta only). `UnrecognizedFormatError` on bad format.
- `filters.py` — `apply_filters(records, filt)`: keys employee(substring), cities,
  routes, date_from, date_to(inclusive ISO), weekdays.
- `aggregate.py` — `totals(records)`; `aggregate_by(records, view)` for
  employee/route/date/week/weekday; `cities_full(roster, records)` → ALL cities
  with delay metrics (0 for delay-free), sorted total_late desc, cases desc, then
  city name. Week starts **Sunday** (Israeli week; working days Sun–Fri).
- `export.py` — `write(path, rows, view, fmt)` xlsx/csv, English headers, CSV utf-8-sig.
- `api.py` — `Api` class = the js_api bridge. `load` reads records+roster;
  `get_dashboard(filt)` → `{totals(+employees_total/cities_total/routes_total),
  by_city=cities_full, by_date, employees, records, roster}`; `get_state`,
  `choose_file`, `refresh`, `export`.
- `main.py` — pywebview window loading `src/web/index.html` with `js_api=Api()`;
  on start loads saved path → `App.init()` else `App.needFile()`. `_index()`
  uses `sys._MEIPASS` when frozen.

## Front-end (src/web/)
- `index.html`, `styles.css`, `ui.js` (+ `mock.js` for standalone browser).
- `App` = IIFE with `init/needFile/render`. **Idempotent wiring:** `_wired` guard
  in `wire()`; `loadState()` runs each init (fetches state); `init = loadState→wire→render`.
  This fixes double-init in the .exe (ui.js DOMContentLoaded + main.py evaluate_js)
  which otherwise double-attaches handlers (city click toggled twice → drawer never opened).
- Single `filt()` (employee/date — NOT selectedCity). `selectedCity` drives
  highlight/dim + drawer only. `esc()` on all data inserted via innerHTML.
- `bestCols(n)` computes even grid column count.

## Testing
`tests/` pytest (38 passing). Control numbers verified vs real file:
route Петах-Тиква 28/560, Йехуд–Кирьят-Оно 14/315, Лод 11/242; cities_full → 15
cities; roster 223; partition-sum invariants.

## SDD process artifacts
`docs/superpowers/specs/2026-06-25-razvozki-svodka-design.md` (spec),
`docs/superpowers/plans/2026-06-25-razvozki-dashboard.md` (plan),
`.superpowers/sdd/progress.md` (git-ignored ledger of every task/commit).
