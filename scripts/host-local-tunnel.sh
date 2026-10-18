#!/usr/bin/env bash
# Public URL → local Pulse (shared SQLite). Keeps running until Ctrl+C.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PULSE_WEB_PORT="${PULSE_WEB_PORT:-3010}"
PULSE_API_PORT="${PULSE_API_PORT:-8010}"
URL_FILE="$ROOT/.pulse-team-url"
LOG_DIR="${TMPDIR:-/tmp}/pulse-host"
mkdir -p "$LOG_DIR"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Install cloudflared: brew install cloudflared"
  exit 1
fi

kill_stale() {
  lsof -ti :"$PULSE_WEB_PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti :"$PULSE_API_PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
  pkill -f "cloudflared tunnel --url http://127.0.0.1:${PULSE_WEB_PORT}" 2>/dev/null || true
  sleep 1
}

kill_stale

echo "Starting Pulse API + web (production build, logs: $LOG_DIR)…"
"$ROOT/start.sh" stable >>"$LOG_DIR/pulse.log" 2>&1 &
DEV_PID=$!

cleanup() {
  echo ""
  echo "Stopping Pulse and tunnel…"
  kill "$DEV_PID" 2>/dev/null || true
  pkill -P "$DEV_PID" 2>/dev/null || true
  pkill -f "cloudflared tunnel --url http://127.0.0.1:${PULSE_WEB_PORT}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Waiting for API…"
for _ in $(seq 1 60); do
  curl -sf "http://127.0.0.1:${PULSE_API_PORT}/health" >/dev/null 2>&1 && break
  sleep 1
done

echo "Waiting for web…"
for _ in $(seq 1 90); do
  curl -sf "http://127.0.0.1:${PULSE_WEB_PORT}/" >/dev/null 2>&1 && break
  sleep 2
done

CF_LOG="$LOG_DIR/cloudflared.log"
cloudflared tunnel --url "http://127.0.0.1:${PULSE_WEB_PORT}" >"$CF_LOG" 2>&1 &
CF_PID=$!

PUBLIC=""
for _ in $(seq 1 30); do
  PUBLIC=$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" | head -1 || true)
  [ -n "$PUBLIC" ] && break
  sleep 1
done

if [ -z "$PUBLIC" ]; then
  echo "Tunnel failed. See $CF_LOG"
  tail -30 "$CF_LOG"
  exit 1
fi

printf '%s\n' "$PUBLIC" >"$URL_FILE"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  TEAM APP (shared database on this Mac)"
echo "  Students:  ${PUBLIC}/submit"
echo "  Review:    ${PUBLIC}/review"
echo "  Schedule:  ${PUBLIC}/calendar"
echo ""
echo "  Saved to:  .pulse-team-url"
echo "  24/7 host: ./start.sh host  (Render Blueprint in browser)"
echo "  Leave this running — Ctrl+C to stop"
echo "══════════════════════════════════════════════════════════"
echo ""

wait "$CF_PID"
