# Bus Delays Dashboard

Desktop app to analyze company shuttle delays from `HR report.xlsx`.

A Power BI–style dashboard: KPI cards, slicers, city cards with cross-filtering,
and a per-employee drill-in panel showing real arrival times (for payroll checks).

## Tech stack
Python + `pywebview` (WebView2 on Windows), `openpyxl`; HTML/CSS/JS front-end;
packaged into a standalone executable with PyInstaller.

## Development
- `pip install -r requirements.txt`
- Tests: `python -m pytest -v`
- Run from source: `python -m src.main`

## Build the executable
```
pyinstaller --onedir --noconsole --icon bus.ico --add-data "src/web;web" --name BusDelaysDashboard src/main.py
```
On Windows Defender may flag an unsigned PyInstaller build; add the output
folder to Defender exclusions (or sign the executable) so it runs.
The resulting `dist/razvozki/` folder is self-contained — **Python is not required on
target machines** (only WebView2, preinstalled on Windows 11). The app stores
`config.json` (the saved path to the source file) next to the executable, so it
remembers the file between launches. Prefer `--onedir` (a folder) over `--onefile`:
it avoids the temp-unpack step that some antivirus tools and non-ASCII paths block.

## Data privacy
`HR report.xlsx` contains personal data and is git-ignored — it is never committed.

## Project layout
- `src/` — `config`, `excel_reader` (parse + unpivot), `filters`, `aggregate`,
  `export`, `api` (UI bridge), `main` (window); `src/web/` — the dashboard UI.
- `tests/` — pytest suite (parsing, filters, aggregation, export, API).
- `docs/superpowers/` — design spec and implementation plan.
