#!/usr/bin/env bash
# Everything automatable for CPBH hosting (Render + optional local tunnel).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Pulse host setup ==="
echo ""

if ! command -v render >/dev/null 2>&1; then
  echo "Tip: brew install render  (CLI optional)"
else
  if render whoami >/dev/null 2>&1; then
    echo "✓ Render CLI logged in"
    render blueprints validate "$ROOT/render.yaml" 2>/dev/null || true
  else
    echo "→ Render CLI: run  render login  (one-time), then Blueprint Apply in browser"
  fi
fi

echo ""
echo "→ Opening Render Blueprint (connect repo + Apply)…"
"$ROOT/scripts/open-render-blueprint.sh" || true

echo ""
if command -v cloudflared >/dev/null 2>&1; then
  LOG_DIR="${TMPDIR:-/tmp}/pulse-host"
  mkdir -p "$LOG_DIR"
  echo "→ Starting team tunnel in background (shared DB on this Mac)…"
  echo "  Logs: $LOG_DIR/"
  nohup "$ROOT/scripts/host-local-tunnel.sh" >>"$LOG_DIR/nohup.log" 2>&1 &
  sleep 12
  if [ -f "$ROOT/.pulse-team-url" ]; then
    BASE=$(cat "$ROOT/.pulse-team-url")
    echo ""
    echo "✓ Team URLs ready:"
    echo "  ${BASE}/submit"
    echo "  ${BASE}/review"
  else
    echo "  Tunnel still starting — check ${TMPDIR:-/tmp}/pulse-host/nohup.log"
  fi
else
  echo "Install cloudflared for instant team URL: brew install cloudflared"
  echo "Then: ./start.sh tunnel"
fi

echo ""
echo "GitHub Pages (preview): https://husseinyassinemd.github.io/pulse-cpbh/submit/"
echo "After Render is Live, set GitHub Actions variable HOSTED_APP_URL to your Render web URL."
echo ""
