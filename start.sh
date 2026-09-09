#!/usr/bin/env bash
# Pulse — simple dev starter. No Docker needed.

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PULSE_WEB_PORT="${PULSE_WEB_PORT:-3010}"
PULSE_API_PORT="${PULSE_API_PORT:-8010}"

cmd="${1:-}"

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
  cd apps/api
  source .venv/bin/activate
  echo "API → http://localhost:${PULSE_API_PORT}"
  uvicorn app.main:app --reload --port "$PULSE_API_PORT"
}

web() {
  cd apps/web
  export API_URL="http://127.0.0.1:${PULSE_API_PORT}"
  if [ "${2:-}" = "clean" ]; then
    rm -rf .next node_modules/.cache
    echo "Cleared Next.js cache (.next)"
  fi
  # Kill stale dev server on this port (prevents corrupted cache / EADDRINUSE)
  if lsof -ti :"$PULSE_WEB_PORT" >/dev/null 2>&1; then
    echo "Stopping existing process on port ${PULSE_WEB_PORT}…"
    lsof -ti :"$PULSE_WEB_PORT" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
  echo "App → http://localhost:${PULSE_WEB_PORT}"
  npm run dev -- -p "$PULSE_WEB_PORT"
}

case "$cmd" in
  setup) setup ;;
  api)   api ;;
  web)   web ;;
  clear) clear_data ;;
  export-pages) export_pages ;;
  *)
    echo "Usage:"
    echo "  ./start.sh setup        — install deps (first time only)"
    echo "  ./start.sh api          — start backend"
    echo "  ./start.sh web          — start frontend"
    echo "  ./start.sh web clean    — start frontend (clear Next.js cache)"
    echo "  ./start.sh clear        — remove all posts and plan ideas"
    echo "  ./start.sh export-pages — export posts/media for GitHub Pages"
    ;;
esac
