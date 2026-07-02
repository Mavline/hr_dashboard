# Stand up the memgraph memory kit

This folder (`memgraph/`) is a self-contained, portable memory skill: the
canonical SQLite memory graph plus the CLI engine to create, read, and write it
with hybrid (semantic + keyword) recall. It ships next to
`project-memory-structure-instruction.md` — that file is the doctrine, this
folder is the tool. Nothing here is machine-specific until you run the steps
below; do them once per machine.

## Placement

Put this `memgraph/` folder at the root of the project that should have memory
(the pattern the reference projects use). The wrapper then finds the project's
DB from the git root, and a repo-local hook can point at it with a relative
path. You can also keep it elsewhere and pass absolute paths / set
`MEMGRAPH_DB` — but project-root placement is the tested default.

## Two layers, different portability

- STORAGE — `<repo>/.agent/memory.db`. Plain SQLite; commit it to git, it moves
  between machines as-is. Binary — never write it from two machines at once.
- SEARCH — this skill's `venv/` + the native `sqlite-vec` extension in
  `vendor/` + `OPENAI_API_KEY`. Per-machine, rebuilt here on each machine, never
  committed. Add `venv/`, `vendor/*`, and `.env` to `.gitignore`.

## 0. Prerequisites

Python 3, Git, and on Windows also PowerShell 7 (`pwsh`). On Windows use the
python.org build — it has loadable sqlite-extension support that the Microsoft
Store / some pyenv builds lack. Internet to PyPI + OpenAI. Run the commands
below from inside this `memgraph/` folder unless noted.

## 1. venv + dependencies  (per machine, gitignored)

macOS / Linux:

    python3 -m venv venv
    ./venv/bin/python -m pip install --upgrade pip
    ./venv/bin/python -m pip install -r requirements.txt

Windows (pwsh):

    python -m venv venv
    venv\Scripts\python.exe -m pip install --upgrade pip
    venv\Scripts\python.exe -m pip install -r requirements.txt

## 2. Vendor the native sqlite-vec extension  (per machine, gitignored)

The wrapper auto-detects `vendor/vec0.<ext>`. `loadable_path()` may return the
path WITHOUT the extension — copy the real file.

macOS:

    mkdir -p vendor
    cp "$(./venv/bin/python -c 'import sqlite_vec; print(sqlite_vec.loadable_path())')" vendor/vec0.dylib

Linux: same, but name the copy `vendor/vec0.so`.

Windows (pwsh):

    New-Item -ItemType Directory -Force vendor | Out-Null
    $base = & venv\Scripts\python.exe -c "import sqlite_vec; print(sqlite_vec.loadable_path())"
    $src  = if (Test-Path "$base") { "$base" } elseif (Test-Path "$base.dll") { "$base.dll" } else { throw "vec0 not found near $base" }
    Copy-Item $src vendor\vec0.dll

## 3. OpenAI key -> the project's .env  (gitignored)

Put the key in the TARGET PROJECT's `.env` (the repo that holds
`.agent/memory.db`), not in this folder — the wrapper auto-loads `<repo>/.env`:

    OPENAI_API_KEY=sk-...

Without the key, `recall` and every embedding-write fail fast; only
`session-context` (pure SQL) works. There is no FTS fallback on a missing key.

## 4. Create the memory DB  (bootstrap — once per project)

    ./venv/bin/python scripts/bootstrap.py --target <repo>        # macOS / Linux
    venv\Scripts\python.exe scripts\bootstrap.py --target <repo>  # Windows

`<repo>` is the project root (use `.` if this folder sits at the root and you
run from there). It applies the canonical schema (24 tables + FTS5 +
sqlite-vec@512) into `<repo>/.agent/memory.db`. Refuses to clobber an existing
DB unless you pass `--force` (which backs up the old one first).

## 5. SessionStart hook  (repo-local, so it travels)

Put the hook in the PROJECT's `.claude/settings.json` — NOT the global machine
config, or it will not move between machines. Use
`install/settings.snippet.json` as the shape and point the command at this
wrapper:

- macOS / Linux: `memgraph/memgraph session-context`
- Windows (pwsh): `pwsh -NoProfile -ExecutionPolicy Bypass -File memgraph/memgraph.ps1 session-context`
- Windows where Claude runs hooks under Git Bash (pwsh not on PATH), resolve it
  inside the command:
  `PWSH="$(command -v pwsh || echo "$LOCALAPPDATA/Microsoft/WindowsApps/pwsh.exe")"; "$PWSH" -NoProfile -ExecutionPolicy Bypass -File memgraph/memgraph.ps1 session-context`

`session-context` is pure SQL, so the hook works offline and before the key is set.

## 6. Verify  (through the wrapper — never scripts/*.py directly)

macOS / Linux (run from the project root):

    memgraph/memgraph session-context                        # pure SQL, no key
    memgraph/memgraph recall "<paraphrase of a known fact>"  # needs key; must report "vector_leg": true
    memgraph/memgraph write-claim --type observation --statement "kit live" --confidence 0.9

Windows: same commands via `pwsh memgraph/memgraph.ps1 <cmd>`. Then open a fresh
Claude session in the project and confirm the hook auto-injected the session
context. If not, run the hook command by hand and read the error (PATH, shell,
or `.claude/settings.json` validity).

## Ships vs rebuilt

Ships in the archive: `SKILL.md`, wrappers (`memgraph`, `memgraph.ps1`),
`scripts/` (engine + `bootstrap.py`), `sql/schema.sql`, `queries/`,
`references/`, `requirements.txt`, `install/`. Rebuilt per machine and
gitignored: `venv/`, `vendor/*`, and the project's `.env`.

## Uninstall

Delete this `memgraph/` folder from the project. Each project's
`.agent/memory.db` is independent and untouched.
