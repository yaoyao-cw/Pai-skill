#!/usr/bin/env python3
"""Safe example consumer hook: inspect input shape but accept nothing by default."""
import json, sys
from pathlib import Path

inbox = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
items = inbox.get("items", [])
print(json.dumps({"receipts": [], "observed_items": len(items)}, ensure_ascii=False))
