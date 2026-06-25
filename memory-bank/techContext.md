# Tech Context

## Stack
- Python 3.11 (also 3.13 present). Deps: `openpyxl`, `pywebview` (WebView2 on
  Windows), `pyinstaller`, `pytest`, plus `Pillow` (used once to generate the icon).
- Front-end: vanilla HTML/CSS/JS, no framework/bundler.
- Packaging: `pyinstaller --onedir --noconsole --icon bus.ico
  --add-data "src/web;web" --name BusDelaysDashboard src/main.py`
  → `dist/BusDelaysDashboard/` (self-contained; Python not needed on target;
  needs WebView2, preinstalled on Win11). Keeps `config.json` next to the exe.
  Use **--onedir, not --onefile** (onefile temp-unpack is blocked by AV and by
  non-ASCII paths).

## Environment
- Windows 11, **corporate/domain-managed machine** (`AL-NT` domain).
- Working dir during the build session: `C:\Users\pavelk\Documents\Отдел кадров`
  (Cyrillic — to be renamed to ASCII e.g. `hr_dashboard`).
- git configured (Pavel Konovalov / mavlinex@gmail.com). Remote:
  `https://github.com/Mavline/hr_dashboard` (push works).
- Node v20 present (not required at runtime; used for `node --check` on ui.js).
- Icon: `bus.ico` generated with Pillow (clay bus, multi-size).

## Hard constraints / gotchas
- **Windows Defender is policy-managed here, `IsTamperProtected: True`.** Tamper
  Protection ON means `Add-MpPreference -ExclusionPath/Process` returns "ok" but
  is SILENTLY IGNORED — the exclusion never appears in `(Get-MpPreference).ExclusionPath`
  (list shows only corporate paths). So local Defender exclusions CANNOT be set →
  unsigned PyInstaller `.exe` keeps getting "Windows cannot access… permissions"
  blocked, and this is NOT fixable locally. Real fixes: (1) user manually turns
  off Tamper Protection in Windows Security UI then add exclusion (if corp policy
  allows), (2) IT-managed exclusion / code signing, or (3) **ship a web build (no
  exe → Defender irrelevant)** — the only option achievable right now without IT.
  A Cyrillic path may compound it.
- The agent session itself CANNOT launch `.exe` ("Access is denied" in both bash
  and PowerShell, even with sandbox disabled) — that's an agent-session limit,
  NOT Defender. The user must launch/verify the exe.
- `HR report.xlsx` = PII; git-ignored, purged from history.
- Cyrillic in paths breaks: file:// URLs (needs percent-encoding), onefile unpack,
  and possibly Defender exclusions. Prefer ASCII paths.
- pytest run as `python -m pytest`; tests monkeypatch `config.CONFIG_PATH`.
