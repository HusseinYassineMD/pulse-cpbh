#!/usr/bin/env bash
# Build static Pulse site and push to public GitHub Pages repo.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO_REPO="${PULSE_DEMO_REPO:-HusseinYassineMD/pulse-cpbh-demo}"
BUILD_DIR="$ROOT/apps/web/out"
WORK_DIR=$(mktemp -d)

echo "→ Exporting latest posts/media..."
"$ROOT/start.sh" export-pages

echo "→ Building static site..."
cd "$ROOT/apps/web"
npm run build:pages

echo "→ Deploying to $DEMO_REPO..."
cp -a "$BUILD_DIR/." "$WORK_DIR/"
cd "$WORK_DIR"
git init -q
git checkout -b main 2>/dev/null || git checkout main
git add -A
git commit -q -m "Deploy Pulse static site ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
git remote add origin "https://github.com/$DEMO_REPO.git"
git push -f origin main

echo ""
echo "✓ Live at https://husseinyassinemd.github.io/pulse-cpbh-demo/"
rm -rf "$WORK_DIR"
