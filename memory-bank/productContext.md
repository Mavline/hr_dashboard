# Product Context

## Problem
HR keeps shuttle delays in a wide Excel table (dates spread across columns).
Reading/aggregating it manually is hard, and a plain table doesn't surface the
real questions: which cities/routes are problematic, and how much time to credit
employees. The user explicitly wants to move HR staff from spreadsheets to a
dashboard.

## How it should work (agreed UX)
- **KPI strip (top):** headline totals. Now full-roster figures: Cases,
  Total Late (min), Employees (all 223), Cities (15), Routes (all).
- **Slicers (middle, centered):** Sort by, Employee (with surname autocomplete),
  Date From/To, Clear. Filtering is the user's job.
- **City cards (primary):** one card per city (all 15), sorted by descending
  delay; delay-free cities shown neutral/muted at the bottom (0 min, "no delays").
  Grid columns computed from city count for even rows (15 → 5×3).
- **Cross-filter (Power BI style):** one shared filter → `get_dashboard` recomputes
  everything. Clicking a city HIGHLIGHTS it + dims others + opens a drill-in
  drawer (does NOT remove the other cities). Date/employee slicers winnow.
- **Drill-in drawer (right, slide-in):** the clicked city's residents from the
  full roster. Big employee number (primary id), name, route; per-day rows with
  date · +min · **real arrival time** (e.g. 07:45) for payroll verification;
  delay-free residents shown muted ("No delays in period").
- **Export:** current slice to Excel/CSV.

## Visual language
Claude/Anthropic palette: warm cream bg `#F5F4EE`, clay accent `#CC785C`,
warm-dark header `#2B2924`, severity green `#5E8C61` / amber `#C7972F` /
red `#B5482E`. English UI labels; Hebrew data values with `dir="auto"`.
"Change file" button styled as a clay accent (prominent).
