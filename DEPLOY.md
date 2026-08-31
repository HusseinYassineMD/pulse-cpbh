# Deploy Pulse for your team

## Live demo (GitHub Pages)

**Share this URL with your team:**

https://husseinyassinemd.github.io/pulse-cpbh-demo/

- Public demo repo: [pulse-cpbh-demo](https://github.com/HusseinYassineMD/pulse-cpbh-demo)
- Private source code stays in [pulse-cpbh](https://github.com/HusseinYassineMD/pulse-cpbh)
- 15 sample CPBH posts, calendar, scheduling UI — all runs in-browser (no backend)

### Redeploy after UI changes

```bash
chmod +x scripts/deploy-pages.sh
./scripts/deploy-pages.sh
```

> **Note:** GitHub Pages is not available on private repos (free plan). The static demo lives in the separate public `pulse-cpbh-demo` repo.

---

## Full stack (optional — Render)

For the live API + database (not needed for team preview):

1. Go to [Render Dashboard](https://dashboard.render.com) → sign in with GitHub.
2. **New** → **Blueprint** → select the `pulse-cpbh` repo.
3. Render reads `render.yaml` and creates **pulse-api** + **pulse-web**.

---

## What your team will see

- Full Pulse UI with 15 sample CPBH posts
- Schedule calendar, stats, thumbnails
- Dry-run mode (no real social posting)

## Local dev

```bash
./start.sh api
./start.sh web
./start.sh demo
# http://localhost:3003
```
