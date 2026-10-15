#!/usr/bin/env bash
# Pulse — ngrok + .env for live Instagram/Facebook/LinkedIn publishing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PULSE_API_PORT="${PULSE_API_PORT:-8010}"
PULSE_WEB_PORT="${PULSE_WEB_PORT:-3010}"
LOCAL_API="http://127.0.0.1:${PULSE_API_PORT}"

ensure_env() {
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  fi
}

patch_env() {
  local public_url="$1"
  python3 << PY
from pathlib import Path
import re

env = Path("$ROOT/.env")
text = env.read_text()

def set_key(key: str, value: str) -> None:
    global text
    line = f"{key}={value}"
    if re.search(rf"^{re.escape(key)}=", text, flags=re.M):
        text = re.sub(rf"^{re.escape(key)}=.*$", line, text, flags=re.M)
    else:
        text = text.rstrip() + "\n" + line + "\n"

set_key("PUBLISH_API_URL", "${public_url}")
set_key("API_URL", "${public_url}")
set_key("PUBLISH_DRY_RUN", "false")
set_key("WEB_URL", "http://localhost:${PULSE_WEB_PORT}")
set_key("META_REDIRECT_URI", "${LOCAL_API}/api/v1/oauth/meta/callback")
set_key("LINKEDIN_REDIRECT_URI", "${LOCAL_API}/api/v1/oauth/linkedin/callback")

if not re.search(r"^MEDIA_PUBLISH_KEY=", text, flags=re.M):
    set_key("MEDIA_PUBLISH_KEY", "pulse-test-media-key-2026")

env.write_text(text)
print("Updated .env: PUBLISH_API_URL, OAuth redirect URIs")
PY
}

wait_for_api() {
  local i
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    if curl -sf "${LOCAL_API}/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

start_public_tunnel() {
  pkill -f "ngrok http ${PULSE_API_PORT}" 2>/dev/null || true
  pkill -f "cloudflared tunnel --url http://127.0.0.1:${PULSE_API_PORT}" 2>/dev/null || true
  sleep 1

  if command -v ngrok >/dev/null 2>&1; then
    ngrok http "${PULSE_API_PORT}" --log=stdout > /tmp/pulse-ngrok.log 2>&1 &
    echo $! > /tmp/pulse-tunnel.pid
    sleep 3
    URL=$(curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "
import json, sys
data = json.load(sys.stdin)
for t in data.get('tunnels', []):
    if t.get('proto') == 'https':
        print(t['public_url'])
        break
" 2>/dev/null || true)
    if [ -n "$URL" ]; then
      echo "$URL"
      return 0
    fi
  fi

  if ! command -v cloudflared >/dev/null 2>&1; then
    echo "Install a tunnel: brew install cloudflared  OR  brew install ngrok/ngrok/ngrok"
    exit 1
  fi

  cloudflared tunnel --url "http://127.0.0.1:${PULSE_API_PORT}" > /tmp/pulse-cloudflared.log 2>&1 &
  echo $! > /tmp/pulse-tunnel.pid
  sleep 5
  grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/pulse-cloudflared.log | head -1
}

ensure_env

if ! wait_for_api; then
  echo "Starting API on port ${PULSE_API_PORT}…"
  export PULSE_API_PORT PULSE_WEB_PORT
  (cd "$ROOT" && ./start.sh api) &
  sleep 2
  wait_for_api || { echo "API failed to start. Run ./start.sh api and retry."; exit 1; }
fi

PUBLIC_URL="$(start_public_tunnel)"
if [ -z "$PUBLIC_URL" ]; then
  echo "Could not start public tunnel — see /tmp/pulse-ngrok.log or /tmp/pulse-cloudflared.log"
  exit 1
fi
echo "$PUBLIC_URL" > /tmp/pulse-public-api.url

patch_env "$PUBLIC_URL"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Pulse live publish setup"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "  Web app:        http://localhost:${PULSE_WEB_PORT}"
echo "  Settings:       http://localhost:${PULSE_WEB_PORT}/settings"
echo "  Public API:     ${PUBLIC_URL}"
echo "  ngrok dashboard http://127.0.0.1:4040"
echo ""
echo "  Add this Meta redirect URI in developers.facebook.com:"
echo "    ${LOCAL_API}/api/v1/oauth/meta/callback"
echo ""
echo "  Add this LinkedIn redirect URI in developer.linkedin.com:"
echo "    ${LOCAL_API}/api/v1/oauth/linkedin/callback"
echo ""
echo "  PUBLISH_DRY_RUN=false is set in .env — restart API after this script."
echo ""
echo "  Open Settings → Connect Instagram & Facebook / Connect LinkedIn"
echo "══════════════════════════════════════════════════════════"
