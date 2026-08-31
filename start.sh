#!/usr/bin/env bash
# Pulse — simple dev starter. No Docker needed.

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

cmd="${1:-}"

setup() {
  echo "Setting up Pulse (one-time)..."

  # .env — only create if missing, defaults are fine
  [ -f .env ] || cp .env.example .env

  # Python
  cd apps/api
  [ -d .venv ] || python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
  cd "$ROOT"

  # Node
  cd apps/web
  [ -d node_modules ] || npm install
  cd "$ROOT"

  echo ""
  echo "Done! Run:"
  echo "  ./start.sh api    (terminal 1)"
  echo "  ./start.sh web    (terminal 2)"
  echo "  open http://localhost:3003"
}

demo() {
  cd apps/api
  source .venv/bin/activate
  python scripts/seed_demo.py --force
  cd "$ROOT"
  echo ""
  echo "Demo data loaded. Refresh http://localhost:3003"
}

api() {
  cd apps/api
  source .venv/bin/activate
  echo "API → http://localhost:8000"
  uvicorn app.main:app --reload --port 8000
}

web() {
  cd apps/web
  echo "App → http://localhost:3003"
  npm run dev
}

case "$cmd" in
  setup) setup ;;
  api)   api ;;
  web)   web ;;
  demo)  demo ;;
  *)
    echo "Usage:"
    echo "  ./start.sh setup   — install deps (first time only)"
    echo "  ./start.sh api     — start backend"
    echo "  ./start.sh web     — start frontend"
    echo "  ./start.sh demo    — load demo posts for manager walkthrough"
    ;;
esac
