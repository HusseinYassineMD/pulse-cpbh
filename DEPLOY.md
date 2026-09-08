# Deploy Pulse

## GitHub Pages (live demo)

**URL:** https://husseinyassinemd.github.io/pulse-cpbh/

Every push to `main` deploys automatically via GitHub Actions.

To refresh bundled posts/media before deploy:

```bash
./start.sh export-pages
git add apps/web/public/data apps/web/public/media
git commit -m "Update GitHub Pages content"
git push
```

The Pages site runs in **static mode** — your saved carousels, approve/unapprove, caption edits, and Plan changes persist in the browser (localStorage). Post generation and scheduling need the local app.

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
