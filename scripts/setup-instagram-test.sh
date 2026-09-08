#!/usr/bin/env bash
# One-command Instagram test setup for Pulse.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PULSE_API_PORT="${PULSE_API_PORT:-8010}"
PULSE_WEB_PORT="${PULSE_WEB_PORT:-3010}"

echo "→ Checking Pulse API..."
if ! curl -sf "http://127.0.0.1:${PULSE_API_PORT}/health" >/dev/null; then
  echo "Start the API first: ./start.sh api"
  exit 1
fi

if ! command -v ngrok >/dev/null 2>&1; then
  echo "Install ngrok: brew install ngrok/ngrok/ngrok"
  exit 1
fi

echo "→ Starting ngrok tunnel on port ${PULSE_API_PORT}..."
pkill -f "ngrok http ${PULSE_API_PORT}" 2>/dev/null || true
ngrok http "${PULSE_API_PORT}" --log=stdout > /tmp/pulse-ngrok.log 2>&1 &
NGROK_PID=$!
sleep 3

PUBLIC_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "
import json, sys
data = json.load(sys.stdin)
for t in data.get('tunnels', []):
    if t.get('proto') == 'https':
        print(t['public_url'])
        break
" 2>/dev/null || true)

if [ -z "$PUBLIC_URL" ]; then
  echo "Could not read ngrok URL. Check /tmp/pulse-ngrok.log"
  kill "$NGROK_PID" 2>/dev/null || true
  exit 1
fi

echo "→ Public API URL: $PUBLIC_URL"

python3 << PY
from pathlib import Path
import re
env = Path("$ROOT/.env")
text = env.read_text()
text = re.sub(r'^API_URL=.*$', f'API_URL={"$PUBLIC_URL"}', text, flags=re.M)
if 'MEDIA_PUBLISH_KEY=' not in text:
    text += '\nMEDIA_PUBLISH_KEY=pulse-test-media-key-2026\n'
env.write_text(text)
print("→ Updated .env API_URL")
PY

echo ""
echo "✓ Ready for Instagram test publish"
echo ""
echo "  Web app:     http://localhost:${PULSE_WEB_PORT}/settings"
echo "  Public API:  ${PUBLIC_URL}"
echo "  ngrok UI:    http://127.0.0.1:4040"
echo ""
echo "Next steps:"
echo "  1. Restart API so it picks up the new API_URL: ./start.sh api"
echo "  2. Open Settings and paste your Instagram token + account ID"
echo "  3. Set PUBLISH_DRY_RUN=false in .env, restart API again"
echo "  4. Publish a post to Instagram only"
echo ""
echo "ngrok PID: $NGROK_PID (log: /tmp/pulse-ngrok.log)"
