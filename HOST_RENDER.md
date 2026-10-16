# Host Pulse on Render (shared team database)

This gives you a **real URL** where student drafts are stored in **PostgreSQL** for the whole team.

## 1. Create the stack (~10 minutes)

1. Sign in at [Render](https://dashboard.render.com) (GitHub login is fine).
2. **New** → **Blueprint**.
3. Connect repo **`HusseinYassineMD/pulse-cpbh`** (this repository).
4. Render reads [`render.yaml`](render.yaml) and creates:
   - **pulse-cpbh-db** (PostgreSQL)
   - **pulse-cpbh-api** (FastAPI)
   - **pulse-cpbh-web** (Next.js)
5. Click **Apply** and wait until all three are **Live** (first deploy ~5–10 min).

## 2. Your team URLs

Open the **pulse-cpbh-web** service → copy the URL (example shape):

`https://pulse-cpbh-web.onrender.com`

| Who | Link |
|-----|------|
| Students | `https://YOUR-WEB-URL/submit` |
| Lead review | `https://YOUR-WEB-URL/review` |
| Schedule | `https://YOUR-WEB-URL/calendar` |

Replace `YOUR-WEB-URL` with the hostname Render shows (no trailing path).

**Health check (API):** `https://YOUR-API-URL/health`  
(API URL is on the **pulse-cpbh-api** service, e.g. `https://pulse-cpbh-api.onrender.com`.)

## 3. Point GitHub Pages preview at the hosted app (optional)

So the old Pages site tells students to use the real app:

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **Variables**.
2. Add variable **`HOSTED_APP_URL`** = `https://YOUR-WEB-URL` (no trailing slash).
3. Re-run the **Deploy GitHub Pages** workflow (or push any commit to `main`).

## 4. Free tier notes

- Services **sleep** after ~15 minutes idle; first visit may take **30–60 seconds** to wake.
- **Postgres** keeps drafts; uploaded **images** live on the API disk and can be lost on redeploy on free tier. Captions and metadata stay in the database.
- For production publishing later, set Meta/LinkedIn env vars on **pulse-cpbh-api** in Render (see `.env.example`).

## 5. Troubleshooting

| Problem | Fix |
|---------|-----|
| Web loads but Submit fails | Check **pulse-cpbh-api** logs; confirm `/health` returns OK. |
| 502 on web | Redeploy **pulse-cpbh-web** after API is Live. |
| Empty review after submit | Confirm you are on the **Render web URL**, not GitHub Pages. |

Local full stack (same behavior): `./start.sh dev` → http://localhost:3010
