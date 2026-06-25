# Active Context

## Current focus
Getting the packaged `.exe` to launch on the user's **corporate Windows machine**.
Status: blocked by **policy-managed Windows Defender** — unsigned PyInstaller
`.exe` gives "Windows cannot access the specified device, path, or file. You may
not have the appropriate permissions." Local Defender exclusion does NOT stick
(not in `(Get-MpPreference).ExclusionPath` — only corporate paths are). ACL is
fine (user has FullControl); no zone/block stream. So it's Defender policy.

History note: an earlier `--onedir` build (named `razvozki`) DID launch once and
the user saw the working dashboard (15 cities) — subsequent rebuilds stopped
launching. Likely Defender cloud verdict / realtime catching each new unsigned exe.

## Recent changes (this session, newest first)
- Renamed exe → `BusDelaysDashboard`, added bus icon (`bus.ico`), README → English.
- Fixed double-init (idempotent `wire()` + `loadState()`) → city clicks & buttons.
- KPI made full-roster (Employees 223 / Cities 15 / Routes all); removed Days card.
- Show ALL 15 cities (read_employees roster + `cities_full`), delay-free neutral
  & last; drill-in drawer lists city residents (delayed first w/ arrival times).
- Employees drawer made an animated slide-in (not a permanent table).
- config.py made frozen-aware (config next to exe, not _MEIPASS).

## Next steps / open items
1. **Make the exe launch on this corporate machine.** Options: (a) rename the
   project folder to ASCII and retry; (b) ask IT to whitelist/sign; (c) ship a
   **web build** (one HTML + a JS xlsx reader) that has no exe → no Defender —
   the only truly universal fix here. User dislikes changing format but it may be
   required by corporate Defender. Re-confirm with user.
2. **User will rename** the project folder `Отдел кадров` → ASCII (e.g.
   `hr_dashboard`). The agent session is bound to the old path, so do it at the
   end / continue in a new session. After rename, config.json source_path and
   any Defender exclusion path change.
3. Verify in the .exe (user must run it): city click → drawer, full KPI,
   Change-file dialog.

## Important behavioral reminders
- Don't propose changing format unless the exe truly can't work — it DID work
  once (onedir). Keep context: the user corrected me when I forgot this.
- Act decisively, iterate via screenshots, minimize clarifying questions.
