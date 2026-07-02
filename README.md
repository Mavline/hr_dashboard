# Bus Delays Dashboard

Standalone, single-file dashboard to analyze company shuttle delays from
`HR report.xlsx`. Power BI–style: KPI cards, slicers, city cards with
cross-filtering, and a per-employee drill-in drawer showing real arrival
times (for payroll checks).

**The deliverable is one file — `BusDelaysDashboard.html`.** Open it in any
modern browser (Edge/Chrome), pick the Excel file once via *Change file…* —
the dashboard then reopens by itself with the saved data (localStorage).
No installation, no executable: it runs on locked-down corporate machines
where unsigned `.exe` files are blocked by policy-managed Defender.

## Tech

Vanilla HTML/CSS/JS. Excel parsing in the browser via the vendored
[SheetJS](https://sheetjs.com/) (`src/web/xlsx.full.min.js`). No framework,
no server, no build toolchain beyond PowerShell.

## Project layout

- `src/web/standalone.html` — page skeleton (references the three scripts + css)
- `src/web/engine.js` — data engine: parse + unpivot the wide HR sheet, filters, aggregation
- `src/web/web-app.js` — UI glue: rendering, cross-filter, drawer, persistence
- `src/web/styles.css` — styles (Claude/Anthropic palette)
- `src/web/xlsx.full.min.js` — vendored SheetJS
- `build.ps1` — inlines the sources into the single-file `BusDelaysDashboard.html`
- `docs/spec.md` — canonical strategic document (product decisions, data contract, control numbers)
- `memgraph/` + `.agent/memory.db` — project process memory (see `AGENTS.md`)

## Build

```powershell
pwsh ./build.ps1
```

Rebuilds `BusDelaysDashboard.html` from `src/web/`. The transform is a pure
inline (round-trip verified byte-identical), so edit the sources, rebuild,
and ship the single file.

## Verification

There is no JS test suite yet. After touching `engine.js`, verify against the
control numbers in `docs/spec.md` (routes Петах-Тиква 28/560,
Йехуд–Кирьят-Оно 14/315, Лод 11/242; 15 cities; 223 employees).

## Data privacy

`HR report.xlsx` contains personal data and is git-ignored — it is never
committed. The dashboard stores the parsed data in the browser's
localStorage on the user's machine only.

## History

The project originally shipped as a PyInstaller `.exe` (Python + pywebview).
That path was abandoned: corporate Defender with Tamper Protection blocks
unsigned executables and silently ignores local exclusions. The Python
backend and its pytest suite were removed in July 2026; everything is
recoverable from git history.
