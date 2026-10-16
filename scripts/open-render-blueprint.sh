#!/usr/bin/env bash
# Open Render Blueprint for this repo (one-time browser setup).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Validating render.yaml..."
if command -v render >/dev/null 2>&1; then
  render blueprints validate "$ROOT/render.yaml" || true
else
  echo "(Install Render CLI: brew install render)"
fi

REPO="HusseinYassineMD/pulse-cpbh"
URL="https://dashboard.render.com/select-repo?type=blueprint"

echo ""
echo "Next in the browser:"
echo "  1. Log in to Render (GitHub is fine)"
echo "  2. Select repository: $REPO"
echo "  3. Review pulse-cpbh-db + pulse-cpbh-api + pulse-cpbh-web"
echo "  4. Click Apply — wait until all three are Live"
echo ""
echo "Opening: $URL"

if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
else
  echo "Open this URL manually: $URL"
fi
