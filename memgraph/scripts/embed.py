#!/usr/bin/env python3
"""Embed stdin text into a 512-dim OpenAI vector and print JSON to stdout.

Usage:
    echo "some text" | python3 embed.py
    python3 embed.py --file path/to/text.txt
    python3 embed.py --text "inline string"

Contract:
- Uses OPENAI_API_KEY from environment; fails with exit 2 if unset.
- Always emits text-embedding-3-small with dimensions=512 (matches .agent/memory.db meta).
- Emits ONE JSON array of 512 floats to stdout on success.
- Emits single-line human log to stderr (tokens, duration_ms).
- Exit 0 on success, 1 on API error, 2 on usage error.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import List

MODEL = "text-embedding-3-small"
DIMENSIONS = 512


def read_input(args: argparse.Namespace) -> str:
    if args.text is not None:
        return args.text
    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            return f.read()
    if sys.stdin.isatty():
        print("embed.py: no input (pass --text, --file, or pipe stdin)", file=sys.stderr)
        sys.exit(2)
    return sys.stdin.read()


def embed(text: str) -> List[float]:
    # Import lazily so --help works without the dependency.
    try:
        from openai import OpenAI  # type: ignore
    except ImportError:
        print("embed.py: missing dependency 'openai' (pip install openai)", file=sys.stderr)
        sys.exit(2)

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("embed.py: OPENAI_API_KEY is not set", file=sys.stderr)
        sys.exit(2)

    client = OpenAI(api_key=api_key)
    text = text.strip()
    if not text:
        print("embed.py: input is empty after strip()", file=sys.stderr)
        sys.exit(2)

    t0 = time.time()
    resp = client.embeddings.create(
        model=MODEL,
        dimensions=DIMENSIONS,
        input=text,
    )
    dt_ms = int((time.time() - t0) * 1000)

    vec = resp.data[0].embedding
    if len(vec) != DIMENSIONS:
        print(
            f"embed.py: expected {DIMENSIONS} dims, got {len(vec)}",
            file=sys.stderr,
        )
        sys.exit(1)

    usage = getattr(resp, "usage", None)
    tokens = getattr(usage, "total_tokens", None) if usage else None
    print(
        f"embed.py: model={MODEL} dims={DIMENSIONS} tokens={tokens} ms={dt_ms}",
        file=sys.stderr,
    )
    return list(vec)


def main() -> None:
    ap = argparse.ArgumentParser(description="Embed text to 512-dim JSON vector (OpenAI).")
    ap.add_argument("--text", help="Inline text (otherwise reads stdin or --file).")
    ap.add_argument("--file", help="Read text from file instead of stdin.")
    args = ap.parse_args()

    text = read_input(args)
    vec = embed(text)
    json.dump(vec, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
