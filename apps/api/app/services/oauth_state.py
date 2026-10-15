"""Signed OAuth state tying callbacks to a Pulse user."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from uuid import UUID

from app.config import get_settings

_MAX_AGE_SEC = 900


def make_oauth_state(user_id: UUID) -> str:
    settings = get_settings()
    payload = {"uid": str(user_id), "t": int(time.time())}
    data = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    sig = hmac.new(settings.secret_key.encode(), data.encode(), hashlib.sha256).hexdigest()[:20]
    return f"{data}.{sig}"


def parse_oauth_state(state: str) -> UUID:
    settings = get_settings()
    if "." not in state:
        raise ValueError("Invalid state")
    data, sig = state.rsplit(".", 1)
    expected = hmac.new(settings.secret_key.encode(), data.encode(), hashlib.sha256).hexdigest()[:20]
    if not hmac.compare_digest(sig, expected):
        raise ValueError("Invalid state signature")
    padded = data + "=" * (-len(data) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded.encode()))
    age = int(time.time()) - int(payload.get("t", 0))
    if age > _MAX_AGE_SEC or age < 0:
        raise ValueError("State expired")
    return UUID(payload["uid"])
