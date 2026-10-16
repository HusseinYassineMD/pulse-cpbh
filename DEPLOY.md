# Deploy Pulse

## GitHub Pages (live)

**URL:** https://husseinyassinemd.github.io/pulse-cpbh/

Every push to `main` deploys automatically via GitHub Actions.

Manual deploy:

```bash
./scripts/deploy-github-pages.sh
```

Refresh bundled posts/media before deploy:

```bash
./start.sh export-pages
git add apps/web/public/data apps/web/public/media
git commit -m "Update GitHub Pages content"
git push
```

The Pages site runs in **static mode** — saved carousels, approve/unapprove, caption edits, Plan changes, and **student Submit** persist in the browser (localStorage) only. They are **not** visible to other people or devices.

### Student drafts (hosted — shared storage)

| Where students go | Where data lives |
|-------------------|------------------|
| **GitHub Pages** `/pulse-cpbh/submit/` | This browser’s localStorage (demo only) |
| **Hosted full app** `/submit/` | **PostgreSQL/SQLite** on the server (`posts`, `post_variants`, `media_assets`) + image files under `apps/api/media/posts/` |

**Hosted flow (recommended for CPBH):**

1. Deploy API + web (see below) — e.g. Render blueprint `render.yaml`.
2. Share one URL with students: `https://<your-web-host>/submit/`
3. You open **Review** on the same host: `https://<your-web-host>/review/` — all staged drafts from every student appear there.
4. Optional: set `NEXT_PUBLIC_HOSTED_APP_URL=https://<your-web-host>` in the GitHub Pages build so the preview site’s Submit page links students to the real app.

With `AUTH_ENABLED=false` (default on Render blueprint), everyone uses the same team workspace (no per-student login). Turn on `AUTH_ENABLED=true` when you want sign-in.

## Hosted full app (API + database)

**Render (repo includes `render.yaml`):**

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → connect `pulse-cpbh`.
2. After deploy, note the **web** service URL (e.g. `https://pulse-cpbh-web.onrender.com`).
3. Add a **PostgreSQL** database on Render and set `DATABASE_URL` on the **api** service (recommended; free SQLite disk can reset on redeploy).
4. Set `NEXT_PUBLIC_HOSTED_APP_URL` on the **web** service and in GitHub Actions for Pages (optional link-out).

Student submit hits `POST /api/v1/posts/student-draft` → rows in the database; images saved on the API server.

## Local dev (full API)

```bash
./start.sh setup   # first time only
./start.sh api     # terminal 1
./start.sh web     # terminal 2
```

Open **http://localhost:3010**

## Environment

- `PUBLISH_DRY_RUN=true` — simulates publishing (default)
- `AUTH_ENABLED=false` — no sign-in required (dev default)
