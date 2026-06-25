# Project Brief — Bus Delays Dashboard

## What
Desktop/standalone dashboard that analyzes **company shuttle (развозка) delays**
from an HR Excel file (`HR report.xlsx`, Hebrew). Power BI–style, for a
non-technical HR user.

## Why (dual goal)
1. **Control of the shuttle service** — which routes/cities are late, how often,
   how big the impact (person-minutes).
2. **Payroll** — how much extra time to credit each employee for delays that were
   the shuttle's fault (employees are credited the delay minutes).

## Data priority (set by the user, important)
**Cities → Dates → Employee names.** Cities are the primary visual (cards);
dates are a filter; employee names are tertiary (drill-in detail for payroll).
Do NOT make employees the default view.

## Source data shape
`HR report.xlsx`, sheet `Sheet1`: row 1 = dates over each day's "late" column;
row 2 = Hebrew headers; rows 3+ = one employee each (223 employees, 15 cities).
A delay is recorded per employee per day; the same delay is applied to all
passengers of a route (it's the bus that was late). Only delays are filled in
(on-time arrivals are blank). The filled period is 01–02.06 (2 days), 53 delay
cases, 3 routes, 8 cities had delays (the other 7 of 15 had none).

## Repo
`https://github.com/Mavline/hr_dashboard` (branch `main`). `HR report.xlsx` is
PII → git-ignored and purged from history; never commit it.

## Key user preferences (learned the hard way)
- Build like a known tool (Power BI), don't invent UI patterns.
- Show the FULL data; the user filters — don't pre-filter (e.g. show all 15
  cities, not just the 8 with delays).
- Move away from tables toward a dashboard (drill-in drawer, not a permanent
  table) to make life easier for non-technical staff.
- Act, don't over-ask; confirm look via screenshots and iterate.
