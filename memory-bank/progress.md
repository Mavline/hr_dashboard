# Progress

## Works (verified)
- Parsing + unpivot of the wide HR sheet; control numbers match the real file.
- Filters, aggregation (incl. `cities_full` over the full roster), export — 38
  pytest tests passing.
- Dashboard UI renders correctly: verified in Chrome via surfagent on BOTH mock
  and real data (injected real `get_dashboard` JSON) — 15 cities, 4×2/5×3 grid,
  KPI, city cards, cross-filter behavior in browser.
- The `.exe` launched successfully ONCE (early `--onedir` "razvozki" build) — user
  saw the working dashboard with real data (15 cities). So the app itself works.
- git history clean of PII; pushed to GitHub main.

## Built but NOT yet verified in the .exe by the user
(after the double-init fix + all-cities + icon/rename rebuilds, the exe stopped
launching due to Defender, so these are unconfirmed in the packaged app):
- City click → slide-in drawer with residents + per-day arrival times.
- Full-roster KPI (Employees 223 / Cities 15 / Routes all).
- Change-file dialog (was suspected broken; the double-init fix should help, but
  if the native pywebview file dialog fails in frozen mode that's a separate fix).

## Blocked / known issues
- **#1 BLOCKER: `.exe` won't launch on the corporate machine** — policy-managed
  Defender blocks the unsigned PyInstaller exe; local exclusion doesn't stick.
  Candidate fixes: ASCII path retry, IT exclusion/signing, or a web build (no exe).
- Cyrillic project path (`Отдел кадров`) — to be renamed to ASCII by the user.
- Agent session cannot launch `.exe` itself (Access denied) — user must verify.
- Minor (logged in SDD ledger, not blocking): refresh/change-file handlers don't
  reuse `loadState()` (DRY); a couple of weak/hardcoded test assertions.

## How to resume after a new session
1. Read all of `memory-bank/`.
2. Check `git log --oneline` and `.superpowers/sdd/progress.md` for exact commits.
3. Tests: `python -m pytest -v`. Build: see techContext.md command.
4. The live decision point is the Defender/exe launch (see activeContext.md
   "Next steps"). Don't re-litigate solved design; the app logic is done & tested.
