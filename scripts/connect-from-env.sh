#!/usr/bin/env bash
# Connect Instagram/Facebook/LinkedIn using tokens in .env (never commit real tokens).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
API="${PULSE_API_PORT:-8010}"

if [ -f .env ]; then set -a; source .env; set +a; fi

connect_one() {
  local platform="$1" account_id="$2" token="$3" name="$4"
  [ -z "$account_id" ] || [ -z "$token" ] && return 0
  curl -sf -X POST "http://127.0.0.1:${API}/api/v1/accounts" \
    -H "Content-Type: application/json" \
    -d "$(python3 - <<PY
import json
print(json.dumps({
  "platform": "$platform",
  "account_id": "$account_id",
  "account_name": "$name",
  "access_token": """$token""",
}))
PY
)" | python3 -m json.tool
  echo "✓ Connected $platform"
}

echo "→ Connecting from .env (local API only)…"

connect_one instagram "${INSTAGRAM_ACCOUNT_ID:-}" "${INSTAGRAM_ACCESS_TOKEN:-}" "${INSTAGRAM_ACCOUNT_NAME:-USC CPBH Instagram}"
connect_one facebook "${FACEBOOK_PAGE_ID:-}" "${FACEBOOK_PAGE_ACCESS_TOKEN:-}" "${FACEBOOK_PAGE_NAME:-USC CPBH Facebook}"
connect_one linkedin "${LINKEDIN_ORG_ID:-}" "${LINKEDIN_ACCESS_TOKEN:-}" "${LINKEDIN_ORG_NAME:-USC CPBH LinkedIn}"

echo ""
echo "Open http://localhost:${PULSE_WEB_PORT:-3010}/settings to verify."
