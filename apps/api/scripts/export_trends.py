#!/usr/bin/env python3
"""Export live trend scan for GitHub Pages static fallback."""

from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.trends import scan_brain_health_trends  # noqa: E402


async def main() -> None:
    items, sources = await scan_brain_health_trends(limit=24)
    payload = {
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "sources_checked": sources,
        "items": items,
    }
    out = Path(__file__).resolve().parents[2] / "web" / "public" / "data" / "trends-snapshot.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {len(items)} trends from {len(sources)} sources → {out}")


if __name__ == "__main__":
    asyncio.run(main())
