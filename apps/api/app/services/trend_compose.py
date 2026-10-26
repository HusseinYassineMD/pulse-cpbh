"""Pick N trend headlines — newest on first load, shuffled batch on refresh."""

from __future__ import annotations

import random
from datetime import datetime, timezone


def _published_key(item: dict) -> datetime:
    raw = item.get("published_at")
    if not raw:
        return datetime.min.replace(tzinfo=timezone.utc)
    if isinstance(raw, datetime):
        return raw if raw.tzinfo else raw.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


def compose_trend_list(items: list[dict], limit: int, *, shuffle_tail: bool = False) -> list[dict]:
    seen: set[str] = set()
    unique: list[dict] = []
    for item in items:
        key = str(item.get("title") or "").lower().strip()
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(item)

    cap = max(limit, 1)
    if shuffle_tail:
        random.shuffle(unique)
        return unique[:cap]

    unique.sort(key=_published_key, reverse=True)
    return unique[:cap]
