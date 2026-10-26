# Test Pulse on your Mac (before Render deploy)

## Start (every time)

From the repo root:

```bash
./start.sh setup   # once only
./start.sh dev
```

When you see **“API ready ✓”**, open exactly:

**http://localhost:3010/ideate**

(not `localhost:3000`, not the GitHub Pages `/pulse-cpbh` link)

## Quick checks

| Check | URL |
|--------|-----|
| Student ideation | http://localhost:3010/ideate |
| Send draft | http://localhost:3010/submit |
| API health | http://127.0.0.1:8010/health |
| Team review (needs PIN in `apps/web/.env.local`) | http://localhost:3010/team |

Team PIN for local testing — create `apps/web/.env.local`:

```
LEAD_ACCESS_PIN=your-test-code
```

Restart `./start.sh dev` after adding that file.

## “Internal Server Error” or blank page?

1. **Wrong port** — use **3010**, not 3000.
2. **Server not running** — terminal must show `Ready` and `API ready ✓`. Leave that terminal open.
3. **Stale tab** — hard refresh (Cmd+Shift+R) or use a private window.
4. **Turbopack glitch** — stop the server (Ctrl+C), then:
   ```bash
   cd apps/web && npm run dev:webpack
   ```
   (API still needs `./start.sh api` in another terminal, or run `./start.sh dev` again.)
5. **Corrupt Next cache** (common after `npm run build` while dev is running):
   ```bash
   # stop dev (Ctrl+C), then:
   ./start.sh dev clean
   ```
   Or: `rm -rf apps/web/.next && ./start.sh dev`

## Production-like test (optional)

```bash
./start.sh stable
```

Then open http://localhost:3010/ideate — same as Render’s built app, no hot reload.

## API endpoints to test

Base URLs:

| Environment | API base | Web proxy (browser) |
|-------------|----------|---------------------|
| Local | `http://127.0.0.1:8010` | `http://localhost:3010/api` |
| Render | `https://pulse-cpbh-api.onrender.com` | `https://pulse-cpbh-web.onrender.com/api` |

All JSON routes live under `/api/v1/…` on the API, or `/api/…` through the web app (same paths, no `v1` in the browser).

### Smoke tests (no auth when `AUTH_ENABLED=false` on API)

```bash
# Replace BASE with local or Render API origin (no trailing slash).

curl -s "$BASE/health"

curl -s "$BASE/api/v1/trends/scan?limit=5"

curl -s "$BASE/api/v1/notifications/email-status"

curl -s "$BASE/api/v1/posts?status=staged"
```

Wake hosted API from your laptop:

```bash
curl -s "https://pulse-cpbh-web.onrender.com/api/warm"
```

### Student flow (most important)

**UI:** `/ideate` → `/submit` → **Send to my lead**

**API:** `POST /api/v1/posts/student-draft` (multipart form). Example:

```bash
curl -sS -X POST "https://pulse-cpbh-web.onrender.com/api/posts/student-draft" \
  -F "title=Test topic" \
  -F "submitted_by=Your Name" \
  -F "caption_instagram=Caption text" \
  -F "caption_facebook=Caption text" \
  -F "caption_linkedin=Caption text" \
  -F "unified_caption=Caption text" \
  -F "deliverable=post" \
  -F "canva_link=any free text or link" \
  -F 'sources_json=[{"kind":"other","label":"My source","url":""}]' \
  -F "platforms=instagram"
```

Expect **HTTP 201** and JSON with `source_config.ticket_id`.

### Lead flow

**UI:** `/team` (PIN) → `/review` → `/calendar`

| Action | Method | Path |
|--------|--------|------|
| Email configured? | GET | `/api/v1/notifications/email-status` |
| List staged drafts | GET | `/api/v1/posts?status=staged` |
| Approve draft | POST | `/api/v1/posts/{id}/approve` |
| Schedule | POST | `/api/v1/schedule/posts/{id}/schedule` |
| Calendar list | GET | `/api/v1/schedule/schedule` |

### Other API groups (lead / studio)

| Prefix | Examples |
|--------|----------|
| `/api/v1/auth/*` | `login`, `register`, `me` (when auth on) |
| `/api/v1/dashboard` | Home stats |
| `/api/v1/ideation/*` | `captions`, `chat` |
| `/api/v1/plan/*` | Content plan CRUD |
| `/api/v1/pipeline/*` | Pipeline board |
| `/api/v1/stories/*` | Stories CRUD |
| `/api/v1/studio/create` | Studio handoff |
| `/api/v1/oauth/*` | Meta / LinkedIn connect |
| `/api/v1/accounts` | Connected accounts |
| `/api/v1/templates` | Caption templates |
| `/api/v1/media/*` | Uploaded files |

Interactive docs (local API only): `http://127.0.0.1:8010/docs`
