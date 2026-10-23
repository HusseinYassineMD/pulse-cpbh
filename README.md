# Pulse

CPBH social workflow: **ideation** → **submit** → lead **review & schedule** (shared database). See [WORKFLOWS.md](./WORKFLOWS.md).

## Team app (24/7 — no Mac)

The real app for your team runs on **Render**, not on your laptop.

1. **One-time:** run `./start.sh host` and in the browser connect **HusseinYassineMD/pulse-cpbh** → **Apply** the blueprint ([details](HOST_RENDER.md)).
2. When **pulse-cpbh-web** is **Live**, share:
   - Students: `https://<your-web-host>/ideate` and `/submit`
   - Lead: `https://<your-web-host>/review` and `/calendar`
3. Optional: set GitHub Actions variable **`HOSTED_APP_URL`** to that web URL so the GitHub Pages preview points students to Render.

You can **close your Mac** after that. Render keeps API + Postgres + web running (free tier may sleep after ~15 min idle; first visit wakes in ~30–60s).

**Do not use** Cloudflare tunnel / `./start.sh tunnel` for the team unless you are actively developing on your Mac.

| URL | Purpose |
|-----|---------|
| Render web URL | **Real** submit / review / schedule |
| [GitHub Pages](https://husseinyassinemd.github.io/pulse-cpbh/) | Static preview only (no shared live DB) |

Copy [`TEAM-LINK.example.txt`](TEAM-LINK.example.txt) to `TEAM-LINK.txt` (gitignored) and fill in your Render URL.

## Local development (optional)

```bash
./start.sh setup   # first time only
./start.sh dev     # API + web on localhost:3010
```

## Legacy full UI

Set `NEXT_PUBLIC_FULL_UI=true` when building/running web to show Ideas, Pipeline, Analytics, etc.
