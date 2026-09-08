#!/usr/bin/env bash
# Connect Instagram using credentials in .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${INSTAGRAM_ACCOUNT_ID:?Set INSTAGRAM_ACCOUNT_ID in .env}"
: "${INSTAGRAM_ACCESS_TOKEN:?Set INSTAGRAM_ACCESS_TOKEN in .env}"
NAME="${INSTAGRAM_ACCOUNT_NAME:-Test Instagram}"

API="${PULSE_API_PORT:-8010}"

curl -sf -X POST "http://127.0.0.1:${API}/api/v1/accounts" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
import json, os
print(json.dumps({
  "platform": "instagram",
  "account_id": os.environ["INSTAGRAM_ACCOUNT_ID"],
  "account_name": os.environ.get("INSTAGRAM_ACCOUNT_NAME", "Test Instagram"),
  "access_token": os.environ["INSTAGRAM_ACCESS_TOKEN"],
}))
PY
)" | python3 -m json.tool

echo ""
echo "✓ Instagram connected. Open http://localhost:${PULSE_WEB_PORT:-3010}/settings to verify."
