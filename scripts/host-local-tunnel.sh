#!/usr/bin/env bash
# Public URL to your local Pulse (shared SQLite DB). Keep this terminal open.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PULSE_WEB_PORT="${PULSE_WEB_PORT:-3010}"
PULSE_API_PORT="${PULSE_API_PORT:-8010}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Install cloudflared: brew install cloudflared"
  exit 1
fi

echo "Starting Pulse (API + web)…"
"$ROOT/start.sh" dev &
PULSE_PID=$!

cleanup() {
  kill "$PULSE_PID" 2>/dev/null || true
  pkill -f "cloudflared tunnel --url http://127.0.0.1:${PULSE_WEB_PORT}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Waiting for app on :${PULSE_WEB_PORT}…"
for i in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:${PULSE_WEB_PORT}/" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

LOG=/tmp/pulse-cf-web.log
pkill -f "cloudflared tunnel --url http://127.0.0.1:${PULSE_WEB_PORT}" 2>/dev/null || true
cloudflared tunnel --url "http://127.0.0.1:${PULSE_WEB_PORT}" >"$LOG" 2>&1 &
sleep 4
PUBLIC=$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1 || true)

if [ -z "$PUBLIC" ]; then
  echo "Tunnel failed — see $LOG"
  tail -20 "$LOG"
  wait "$PULSE_PID"
  exit 1
fi

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  TEAM APP (shared database on this computer)"
echo "  Students:  ${PUBLIC}/submit"
echo "  Review:    ${PUBLIC}/review"
echo "  Schedule:  ${PUBLIC}/calendar"
echo ""
echo "  Leave this terminal open. For 24/7 hosting use Render"
echo "  (./scripts/open-render-blueprint.sh)"
echo "══════════════════════════════════════════════════════════"
echo ""

wait "$PULSE_PID"
