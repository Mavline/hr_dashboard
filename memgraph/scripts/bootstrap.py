#!/usr/bin/env python3
"""Bootstrap an empty memory graph for a new project (or new application).

Creates `.agent/memory.db` with the canonical schema, sqlite-vec loaded,
and meta populated. Does NOT touch any source files. Suitable for projects
that have no markdown memory bank yet, or for applications that want this
as their fresh memory backend.

Usage:
    python3 bootstrap.py                          # cwd = repo root
    python3 bootstrap.py --target /path/to/repo   # explicit target
    python3 bootstrap.py --force                  # overwrite existing .agent/memory.db
"""
from __future__ import annotations

import argparse
import os
import shutil
import sqlite3
import sys
from pathlib import Path

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
SCHEMA = PLUGIN_ROOT / "sql" / "schema.sql"


def _check_sqlite_vec(conn: sqlite3.Connection) -> bool:
    try:
        import sqlite_vec  # type: ignore
        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        return True
    except Exception as e:
        print(f"ERROR: sqlite-vec is required but failed to load: {e}", file=sys.stderr)
        print("Install with:  pip install sqlite-vec", file=sys.stderr)
        return False


def _check_fts5() -> bool:
    try:
        c = sqlite3.connect(":memory:")
        c.execute("CREATE VIRTUAL TABLE t USING fts5(x, tokenize='unicode61 remove_diacritics 2')")
        c.close()
        return True
    except sqlite3.OperationalError as e:
        print(f"ERROR: FTS5 unicode61 not available in your sqlite3: {e}", file=sys.stderr)
        return False


def bootstrap(target: Path, force: bool) -> int:
    target = target.resolve()
    if not target.is_dir():
        print(f"ERROR: target is not a directory: {target}", file=sys.stderr)
        return 2

    db_dir = target / ".agent"
    db_dir.mkdir(exist_ok=True)
    db_path = db_dir / "memory.db"

    if db_path.exists():
        if not force:
            print(f"ERROR: {db_path} exists. Use --force to overwrite.", file=sys.stderr)
            return 3
        backup = db_path.with_suffix(f".db.backup-{int(__import__('time').time())}")
        shutil.move(str(db_path), str(backup))
        print(f"backup → {backup}")

    if not _check_fts5():
        return 4

    if not SCHEMA.is_file():
        print(f"ERROR: schema.sql not found at {SCHEMA}", file=sys.stderr)
        return 5

    tmp_path = db_path.with_suffix(".db.tmp")
    if tmp_path.exists():
        tmp_path.unlink()

    conn = sqlite3.connect(str(tmp_path))
    if not _check_sqlite_vec(conn):
        conn.close()
        tmp_path.unlink(missing_ok=True)
        return 6

    schema_sql = SCHEMA.read_text(encoding="utf-8")
    # The CREATE VIRTUAL TABLE memory_vec USING vec0 is in schema; works because vec is loaded.
    conn.executescript(schema_sql)
    conn.execute("ANALYZE")
    conn.commit()
    conn.close()

    os.replace(str(tmp_path), str(db_path))
    print(f"OK: created {db_path}")
    print(f"  Schema: 24 tables, FTS5 + sqlite-vec ready.")
    print(f"  Next:  set OPENAI_API_KEY, then write knowledge via skills/memgraph-ops.")
    return 0


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--target", default=".", help="target repo root (default: cwd)")
    p.add_argument("--force", action="store_true", help="overwrite existing .agent/memory.db")
    args = p.parse_args()
    sys.exit(bootstrap(Path(args.target), args.force))


if __name__ == "__main__":
    main()
