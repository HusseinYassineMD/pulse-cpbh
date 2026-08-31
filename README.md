# Pulse

Schedule and auto-publish CPBH social content. No sign-in required for now.

## Run

```bash
./start.sh setup   # first time only
./start.sh api     # terminal 1
./start.sh web     # terminal 2
```

Open **http://localhost:3003** — lands directly on the home page.

(Port 3000 may be used by another project on your machine.)

## Demo for your manager

```bash
./start.sh demo    # loads 5 sample posts + schedule
```

Then refresh the app. You'll see:
- **Home** — stats filled in + 5 upcoming scheduled posts
- **Schedule** — 5 upcoming + 4 in history
- **Posts** — 15 CPBH-themed carousels with thumbnails, captions & mixed statuses

## Home page

Type a command → generate → schedule:

```
post exercise-apoe4      → carousel + captions
story protein-maxing     → story slide
captions apoe4           → text only
```

Then open the post → **Schedule** or **Publish now**.

## Later (when you're ready)

- Sign-in / accounts → set `AUTH_ENABLED=true`
- Live publishing → connect social tokens in Settings, `PUBLISH_DRY_RUN=false`
