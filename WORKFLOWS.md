# Pulse — team workflows (CPBH)

Use this for demos and onboarding. **Hosted app:** Render web URL (not GitHub Pages).

## Workflow A — Students & contributors

```mermaid
flowchart LR
  I[Ideation] --> S[Send draft]
  S --> Q[Lead review queue]
```

### 1. Ideation (`/ideate`)

- **Hot topics** — latest brain-health trends from public feeds.
- **Caption drafts** — generate Instagram / Facebook / LinkedIn text from a topic or pasted notes (copy into Send draft). Works without OpenAI; richer wording when an API key is added later.

### 2. Send draft (`/submit`)

- **Post vs story**
- **Content link** — one URL: **Canva design** or **Google Drive folder** with exports (no image upload required).
- **Source material** — links (Substack, handouts, articles, etc.)
- **Link in bio** (optional), slide numbers for dept Canva folder
- Submit receives a **ticket ID** (e.g. `CPBH-251024-A3F9`) shown on confirmation and in emails.

---

## Workflow B — Lead review & schedule (Stephanie)

```mermaid
flowchart LR
  Q[Review queue] -->|Approve + schedule| C[Calendar]
  Q -->|Delete| X[Removed]
```

### Review (`/review`)

Each open draft is an **unfinished ticket** until one of:

| Action | Result |
|--------|--------|
| **Approve & schedule** | Pick **platforms** + **date/time** → post appears on **Schedule** |
| **Delete** | Removed; reminders stop |

- **Ticket ID** on every card and email so Stephanie can reference the draft in Slack/email.
- **Emails:** immediate notice when someone submits (“Brooke submitted … — ticket CPBH-…”). **Every 12 hours** while still in the review queue until approve or delete.

### Schedule (`/calendar`)

- Approved items scheduled from Review show here.
- Stephanie can adjust timing on Calendar; publishing stays schedule-only (no student publish).

---

## Hosting checklist (before presentations)

1. Render: **pulse-cpbh-db**, **pulse-cpbh-api**, **pulse-cpbh-web** all **Live**.
2. **pulse-cpbh-web** env: `API_URL=https://pulse-cpbh-api.onrender.com`
3. **pulse-cpbh-api** env: `WEB_URL=https://pulse-cpbh-web.onrender.com`, `REVIEW_LEAD_EMAIL=` (Stephanie), `RESEND_API_KEY=` (or SMTP)
4. Smoke test: Ideate → Submit → email → Review → Approve & schedule → Calendar
5. Share links: `/ideate`, `/submit`, `/review`, `/calendar`

**Free tier:** first load after idle may take 30–60s (cold start).
