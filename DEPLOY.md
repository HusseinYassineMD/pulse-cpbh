# Deploy Pulse for your team

## Fastest path (free, ~5 min)

1. Push this repo to GitHub (already set up if you ran the publish step).
2. Go to [Render Dashboard](https://dashboard.render.com) → sign in with GitHub.
3. **New** → **Blueprint** → select the `pulse-cpbh` repo.
4. Render reads `render.yaml` and creates **pulse-api** + **pulse-web**.
5. Wait ~5–10 min for both services to go green.
6. Open the **pulse-web** URL (e.g. `https://pulse-web-xxxx.onrender.com`) — share that with your team.

Demo data loads automatically on API startup (`seed_demo.py`).

## What your team will see

- Full Pulse UI with 15 sample CPBH posts
- Schedule calendar, stats, thumbnails
- Dry-run mode (no real social posting)

## Notes

- **Free tier** services sleep after ~15 min idle; first load may take 30–60s to wake up.
- **Live generation** (`post exercise-apoe4`) needs Post_Creator on the server — demo data works without it.
- For production: set `AUTH_ENABLED=true`, connect social tokens, `PUBLISH_DRY_RUN=false`.

## Local dev (unchanged)

```bash
./start.sh api
./start.sh web
./start.sh demo
# http://localhost:3003
```
