#!/usr/bin/env bash
# Pulse — simple dev starter. No Docker needed.

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PULSE_WEB_PORT="${PULSE_WEB_PORT:-3010}"
PULSE_API_PORT="${PULSE_API_PORT:-8010}"
LOCAL_API_URL="http://127.0.0.1:${PULSE_API_PORT}"
cmd="${1:-}"

kill_port() {
  local port="$1"
  if lsof -ti :"$port" >/dev/null 2>&1; then
    lsof -ti :"$port" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

wait_for_api() {
  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -sf "${LOCAL_API_URL}/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

setup() {
  echo "Setting up Pulse (one-time)..."

  [ -f .env ] || cp .env.example .env

  cd apps/api
  [ -d .venv ] || python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
  cd "$ROOT"

  cd apps/web
  [ -d node_modules ] || npm install
  cd "$ROOT"

  echo ""
  echo "Done! Run:"
  echo "  ./start.sh dev    (easiest — API + web together)"
  echo "  ./start.sh api    (terminal 1)"
  echo "  ./start.sh web    (terminal 2)"
  echo "  open http://localhost:${PULSE_WEB_PORT}"
}

clear_data() {
  cd apps/api
  source .venv/bin/activate
  python scripts/clear_sample_data.py
  cd "$ROOT"
  echo ""
  echo "All sample posts and plan ideas removed."
}

export_pages() {
  cd apps/api
  source .venv/bin/activate
  python scripts/export_static_data.py
  cd "$ROOT"
  echo ""
  echo "Static data exported to apps/web/public/ (commit + push to update GitHub Pages)"
}

api() {
  export PULSE_API_PORT
  export API_URL="$LOCAL_API_URL"
  cd apps/api
  source .venv/bin/activate
  echo "API → ${LOCAL_API_URL}"
  uvicorn app.main:app --reload --port "$PULSE_API_PORT"
}

web() {
  export PULSE_API_PORT
  export API_URL="$LOCAL_API_URL"
  export NEXT_PUBLIC_STATIC_MODE="false"
  unset NEXT_PUBLIC_BASE_PATH GITHUB_PAGES

  cd apps/web

  if [ "${2:-}" = "clean" ] || { [ -d .next ] && [ -d out ]; }; then
    rm -rf .next node_modules/.cache
    echo "Cleared Next.js cache (.next + node_modules/.cache)"
  fi

  if lsof -ti :"$PULSE_WEB_PORT" >/dev/null 2>&1; then
    echo "Stopping existing process on port ${PULSE_WEB_PORT}…"
    kill_port "$PULSE_WEB_PORT"
  fi

  echo "App → http://localhost:${PULSE_WEB_PORT} (API proxy → ${LOCAL_API_URL})"
  npm run dev -- -p "$PULSE_WEB_PORT"
}

dev() {
  export PULSE_API_PORT
  export API_URL="$LOCAL_API_URL"
  export NEXT_PUBLIC_STATIC_MODE="false"

  echo "Starting Pulse locally (API + web)…"
  echo "  App  → http://localhost:${PULSE_WEB_PORT}"
  echo "  API  → ${LOCAL_API_URL}"
  echo "  Plan → http://localhost:${PULSE_WEB_PORT}/plan"
  echo ""

  if lsof -ti :"$PULSE_API_PORT" >/dev/null 2>&1; then
    echo "Restarting API on port ${PULSE_API_PORT} (picks up latest code)…"
    kill_port "$PULSE_API_PORT"
  fi

  api &
  API_PID=$!
  trap 'kill "$API_PID" 2>/dev/null || true' EXIT INT TERM

  if ! wait_for_api; then
    echo "API failed to start. Run ./start.sh api in another terminal to see errors."
    exit 1
  fi
  echo "API ready ✓"

  web
}

case "$cmd" in
  setup) setup ;;
  api)   api ;;
  web)   web "$@" ;;
  dev)   dev ;;
  clear) clear_data ;;
  export-pages) export_pages ;;
  *)
    echo "Usage:"
    echo "  ./start.sh setup        — install deps (first time only)"
    echo "  ./start.sh dev          — start API + web together (easiest)"
    echo "  ./start.sh api          — start backend only"
    echo "  ./start.sh web          — start frontend only"
    echo "  ./start.sh web clean    — start frontend (clear Next.js cache)"
    echo "  ./start.sh clear        — remove all posts and plan ideas"
    echo "  ./start.sh export-pages — export posts/media for GitHub Pages"
    ;;
esac
