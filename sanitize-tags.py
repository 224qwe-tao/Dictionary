#!/usr/bin/env python3
"""
Simple JSON tag sanitizer for public Prompt Tag dictionaries.

Usage:
  python tools/sanitize-tags.py input.json output.json

Input format:
  A JSON array of objects with at least a "tags" field.

Important:
  This is only a first-pass filter. You still need to review the output manually
  before publishing it to GitHub.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

# Keep this list conservative. Add your own local rules before publishing.
BLOCKED_PATTERNS = [
    r"\bloli\b",
    r"\bshota\b",
    r"toddler",
    r"rape",
    r"gangbang",
    r"bestiality",
    r"guro",
    r"ryona",
    r"corpse",
    r"amputee",
    r"asphyxiation",
]

compiled = [re.compile(pattern, re.IGNORECASE) for pattern in BLOCKED_PATTERNS]


def is_safe(item: dict[str, Any]) -> bool:
    text = " ".join(str(item.get(field, "")) for field in ("title", "category", "tags", "negative", "note"))
    return not any(pattern.search(text) for pattern in compiled)


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python tools/sanitize-tags.py input.json output.json", file=sys.stderr)
        return 2

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])

    data = json.loads(src.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise TypeError("Input JSON must be a list of tag objects")

    kept = []
    removed = []
    for item in data:
        if not isinstance(item, dict):
            continue
        if is_safe(item):
            item["safe"] = True
            kept.append(item)
        else:
            removed.append(item.get("id") or item.get("title") or "unknown")

    dst.write_text(json.dumps(kept, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Kept: {len(kept)}")
    print(f"Removed for review: {len(removed)}")
    if removed:
        print("Removed IDs/titles:")
        for name in removed[:100]:
            print(f"- {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
