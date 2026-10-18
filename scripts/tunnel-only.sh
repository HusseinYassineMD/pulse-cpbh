#!/usr/bin/env bash
# Public URL while Pulse web is already running (./start.sh stable). Restarts tunnel if it drops.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PULSE_WEB_PORT="${PULSE_WEB_PORT:-3010}"
URL_FILE="$ROOT/.pulse-team-url"
LINK_FILE="$ROOT/TEAM-LINK.txt"
LOG_DIR="${TMPDIR:-/tmp}/pulse-host"
mkdir -p "$LOG_DIR"
CF_LOG="$LOG_DIR/cloudflared.log"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Install: brew install cloudflared"
  exit 1
fi

if ! curl -sf "http://127.0.0.1:${PULSE_WEB_PORT}/" >/dev/null 2>&1; then
  echo "Pulse web is not running on port ${PULSE_WEB_PORT}."
  echo "In another terminal run:  cd \"$ROOT\" && ./start.sh stable"
  exit 1
fi

pkill -f "cloudflared tunnel --url http://127.0.0.1:${PULSE_WEB_PORT}" 2>/dev/null || true
sleep 1

write_links() {
  local base="$1"
  {
    echo "Use THIS link only (old trycloudflare links stop working when the tunnel restarts):"
    echo ""
    echo "Submit:  ${base}/submit"
    echo "Review:  ${base}/review"
    echo ""
    echo "Updated: $(date)"
  } >"$LINK_FILE"
  printf '%s\n' "$base" >"$URL_FILE"
}

start_one_tunnel() {
  : >"$CF_LOG"
  cloudflared tunnel --url "http://127.0.0.1:${PULSE_WEB_PORT}" >>"$CF_LOG" 2>&1 &
  CF_PID=$!
  local public=""
  for _ in $(seq 1 45); do
    public=$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" | tail -1 || true)
    [ -n "$public" ] && break
    sleep 1
  done
  if [ -z "$public" ]; then
    echo "Tunnel failed — see $CF_LOG"
    kill "$CF_PID" 2>/dev/null || true
    return 1
  fi
  write_links "$public"
  echo ""
  echo "══════════════════════════════════════════════════════════"
  echo "  LIVE TEAM LINK (copy this — not an old bookmark):"
  echo "  ${public}/submit"
  echo "  Also saved: TEAM-LINK.txt and .pulse-team-url"
  echo "  Keep THIS terminal open. Ctrl+C to stop the tunnel."
  echo "══════════════════════════════════════════════════════════"
  echo ""
  wait "$CF_PID" || true
}

trap 'pkill -f "cloudflared tunnel --url http://127.0.0.1:${PULSE_WEB_PORT}" 2>/dev/null || true; exit 0' INT TERM

while true; do
  start_one_tunnel || true
  echo "Tunnel disconnected — restarting in 5s…"
  sleep 5
done
