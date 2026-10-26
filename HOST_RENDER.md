# Host Pulse on Render (shared team database)

## Before you submit / demo (5 minutes)

1. **Render → pulse-cpbh-web → Manual Deploy** (latest `main`).
2. **Render → pulse-cpbh-api → Manual Deploy** (latest `main`).
3. **Web env:** `LEAD_ACCESS_PIN` = your team code (e.g. `102026`). Save → redeploy web if you changed it.
4. **API env:** `REVIEW_LEAD_EMAIL` = `ajagadis@usc.edu`, `RESEND_API_KEY` = `re_…` from Resend (optional for demo — drafts still save without it).
5. **Smoke test:**
   - Open `https://pulse-cpbh-web.onrender.com/ideate` → **Send draft** → fill name, caption, visuals note, one source → **Send** → see **Sent!** + ticket (e.g. `CPBH-…`).
   - Open `/team` → PIN → **Review** → your draft is listed.

Student app URL for the write-up: **`https://pulse-cpbh-web.onrender.com/ideate`**

---

Use this instead of running Pulse on your Mac or Cloudflare tunnel. After setup, **you can shut down your laptop** — the team uses Render’s URL.

Student drafts live in **PostgreSQL** for everyone on the same links.

## 1. Create the stack (~10 minutes)

1. Sign in at [Render](https://dashboard.render.com) (GitHub login is fine).
2. **New** → **Blueprint**.
3. Connect repo **`HusseinYassineMD/pulse-cpbh`** (this repository).
4. Render reads [`render.yaml`](render.yaml) and creates:
   - **pulse-cpbh-db** (PostgreSQL)
   - **pulse-cpbh-api** (FastAPI)
   - **pulse-cpbh-web** (Next.js)
5. Click **Apply** and wait until all three are **Live** (first deploy ~5–10 min).

### Blueprint page keeps loading?

- Use **Chrome/Safari private window**, or turn off ad blockers for `dashboard.render.com`.
- Or skip GitHub connect: scroll to **Public Git Repository**, paste  
  `https://github.com/HusseinYassineMD/pulse-cpbh`, click **Continue**.
- After **api** and **web** are Live: open **pulse-cpbh-api** → **Environment** → add **`WEB_URL`** = your **pulse-cpbh-web** URL (`https://…onrender.com`, no trailing slash) → Save (redeploys API).

## 2. Your team URLs

Open the **pulse-cpbh-web** service → copy the URL (example shape):

`https://pulse-cpbh-web.onrender.com`

| Who | Link |
|-----|------|
| Students | `https://YOUR-WEB-URL/ideate` (Ideation → Send draft) |
| Lead review | `https://YOUR-WEB-URL/team` then enter **LEAD_ACCESS_PIN** → Review |
| Schedule | `https://YOUR-WEB-URL/calendar` |

Replace `YOUR-WEB-URL` with the hostname Render shows (no trailing path).

**Health check (API):** `https://YOUR-API-URL/health`  
(API URL is on the **pulse-cpbh-api** service, e.g. `https://pulse-cpbh-api.onrender.com`.)

## 3. Point GitHub Pages preview at the hosted app (optional)

So the old Pages site tells students to use the real app:

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **Variables**.
2. Add variable **`HOSTED_APP_URL`** = `https://YOUR-WEB-URL` (no trailing slash).
3. Re-run the **Deploy GitHub Pages** workflow (or push any commit to `main`).

## 4. Lead sign-in (web service)

In **Render → pulse-cpbh-web → Environment**, set:

| Variable | What to put |
|----------|-------------|
| **`LEAD_ACCESS_PIN`** | Your private team code (e.g. `102026`). **Required** — without it, sign-in always shows “not configured”. Save → redeploy **web**. |

## 5. Email Tiffany (lead) when students submit (required for notifications)

Pulse does **not** store the lead email in GitHub. You add it only in **Render → pulse-cpbh-api → Environment**.

| Variable | What to put |
|----------|-------------|
| **`REVIEW_LEAD_EMAIL`** | Lead inbox for new drafts (blueprint: `ajagadis@usc.edu`) |
| **`RESEND_API_KEY`** | From [resend.com](https://resend.com) → API Keys (free tier is enough to start) |
| **`WEB_URL`** | Should be `https://pulse-cpbh-web.onrender.com` (blueprint links web host; confirm after deploy) |

**How mail works:**

1. Student submits on `/submit` → draft saved in **Postgres** (works even without email).
2. API tries **Resend** first; if no key, tries **SMTP**; if neither is set, **no email is sent** (draft still appears on `/review`).
3. **Reminders** every 12 hours while the draft is still in review — same recipient, same Resend/SMTP requirement.

Until `REVIEW_LEAD_EMAIL` and `RESEND_API_KEY` are set on the **API** service, Tiffany will **not** get mail — use the **Review** page on the team URL instead.

Optional fallback: set **`PLAN_TEAM=Tiffany:email@…,...`** on the API if you skip `REVIEW_LEAD_EMAIL` (first roster email is used).

**Test reminders faster:** set **`REVIEW_REMINDER_HOURS=1`** on the API, submit a draft, wait ~1 hour (API must be awake), then set back to **`12`** for production.

## 6. Free tier notes

- Services **sleep** after ~15 minutes idle. **`pulse-cpbh-keep-warm`** (cron in `render.yaml`) pings API + web every 14 minutes so student **Send** stays snappy. Student pages also pre-connect in the background while they work.
- If Submit still hangs once, students can tap **Send** again — the form keeps their answers.
- **Postgres** keeps drafts; uploaded **images** live on the API disk and can be lost on redeploy on free tier. Captions and metadata stay in the database.
- For production publishing later, set Meta/LinkedIn env vars on **pulse-cpbh-api** in Render (see `.env.example`).

## 6. Troubleshooting

| Problem | Fix |
|---------|-----|
| Web loads but Submit fails | Check **pulse-cpbh-api** logs; confirm `/health` returns OK. |
| 502 on web | Redeploy **pulse-cpbh-web** after API is Live. |
| Empty review after submit | Confirm you are on the **Render web URL**, not GitHub Pages. |
| Web `/api/…` returns 502 | Wake **pulse-cpbh-api** (open `/health`), confirm **pulse-cpbh-web** has `API_URL=https://pulse-cpbh-api.onrender.com`, redeploy web. |
| `/ideate` 404 | Redeploy **pulse-cpbh-web** from latest `main` commit. |
| No emails to lead | Set **REVIEW_LEAD_EMAIL** + **RESEND_API_KEY** on **pulse-cpbh-api**, Save (redeploy). Check API logs for “skipping student draft notification”. |

Local full stack (same behavior): `./start.sh dev` → http://localhost:3010
