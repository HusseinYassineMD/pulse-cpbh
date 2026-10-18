#!/usr/bin/env bash
# One-time hosted team app on Render (no Mac tunnel).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Pulse team hosting (Render) ==="
echo ""
echo "This sets up a permanent URL. You do NOT need to keep your Mac running."
echo ""

if command -v render >/dev/null 2>&1; then
  if render whoami >/dev/null 2>&1; then
    echo "✓ Render CLI logged in"
    render blueprints validate "$ROOT/render.yaml" 2>/dev/null || true
  else
    echo "→ Optional: render login  (CLI not required — browser is enough)"
  fi
else
  echo "Tip: brew install render  (optional CLI)"
fi

echo ""
echo "→ Opening Render Blueprint (connect repo + Apply)…"
"$ROOT/scripts/open-render-blueprint.sh" || true

echo ""
echo "After all three services are Live (db + api + web):"
echo "  1. Copy the pulse-cpbh-web URL from Render"
echo "  2. Save team links in TEAM-LINK.txt (see TEAM-LINK.example.txt)"
echo "  3. GitHub → Settings → Actions → Variables → HOSTED_APP_URL = that URL"
echo ""
echo "GitHub Pages preview: https://husseinyassinemd.github.io/pulse-cpbh/"
echo ""
