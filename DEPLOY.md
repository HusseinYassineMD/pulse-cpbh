# Deploy Pulse

## Local dev

```bash
./start.sh setup   # first time only
./start.sh api     # terminal 1
./start.sh web     # terminal 2
```

Open **http://localhost:3010**

## Production (Render)

1. Push to `main` on GitHub
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect repo `HusseinYassineMD/pulse-cpbh` → apply `render.yaml`
4. Wait for **pulse-api** and **pulse-web** to deploy (free tier ~2–5 min cold start)
5. Open **https://pulse-cpbh-web.onrender.com** (after blueprint deploy)

**One-click:** [Deploy on Render](https://render.com/deploy?repo=https://github.com/HusseinYassineMD/pulse-cpbh)

Re-deploys happen automatically on every push to `main` once the blueprint is linked.

## Environment

- `PUBLISH_DRY_RUN=true` — simulates publishing (default)
- `PUBLISH_DRY_RUN=false` — real posts (requires connected accounts + public API URL)
- `AUTH_ENABLED=false` — no sign-in required (dev default)

**Note:** Render free tier uses ephemeral SQLite — posts/media reset on redeploy. Re-import carousels locally or use `./start.sh clear` + import scripts for a fresh workspace.

