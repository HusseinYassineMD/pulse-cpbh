#!/usr/bin/env bash
# Build Pulse static demo and push to the public GitHub Pages repo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
DEMO_REPO="${PULSE_DEMO_REPO:-HusseinYassineMD/pulse-cpbh-demo}"
BASE_PATH="/pulse-cpbh-demo"

echo "→ Building static demo (basePath=$BASE_PATH)..."
cd "$WEB"
GITHUB_PAGES=true NEXT_PUBLIC_DEMO_MODE=true NEXT_PUBLIC_BASE_PATH="$BASE_PATH" npx next build

mkdir -p out/.github/workflows
cp "$ROOT/scripts/pages-workflow.yml" out/.github/workflows/deploy.yml

echo "→ Pushing to $DEMO_REPO..."
cd out
if [ ! -d .git ]; then
  git init -b main
  git remote add origin "https://github.com/$DEMO_REPO.git"
fi
git add -A
git commit -m "Deploy Pulse demo $(date -u +%Y-%m-%dT%H:%M:%SZ)" || true
git push -u origin main --force

echo "✓ Live at https://husseinyassinemd.github.io/pulse-cpbh-demo/"
