#!/usr/bin/env bash
# Build static Pulse site and deploy to GitHub Pages (public pulse-cpbh repo).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$ROOT/apps/web/out"

echo "→ Exporting latest posts/media..."
"$ROOT/start.sh" export-pages

echo "→ Building static site..."
cd "$ROOT/apps/web"
npm run build:pages

echo "→ Pushing static files to gh-pages branch..."
WORK_DIR=$(mktemp -d)
cp -a "$BUILD_DIR/." "$WORK_DIR/"
cd "$WORK_DIR"
git init -q
git checkout -b gh-pages 2>/dev/null || git checkout gh-pages
git add -A
git commit -q -m "Deploy Pulse static site ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
git push -f "https://github.com/HusseinYassineMD/pulse-cpbh.git" gh-pages
rm -rf "$WORK_DIR"

echo ""
echo "✓ Deployed — enable Pages from gh-pages branch if needed"
echo "  https://husseinyassinemd.github.io/pulse-cpbh/"
