# Pulse

Schedule and auto-publish CPBH social content.

## Run

```bash
./start.sh setup   # first time only
./start.sh api     # terminal 1
./start.sh web     # terminal 2
```

Open **http://localhost:3010**

## Workflow

1. **Plan** — add content ideas and target dates
2. **Home** — generate posts with the command bar (`post exercise-apoe4`)
3. **Posts** — review slides and captions
4. **Schedule** — set publish dates

## Commands

```
post exercise-apoe4      → carousel + captions
story protein-maxing     → story slide
captions apoe4           → text only
```

## Later

- Sign-in → set `AUTH_ENABLED=true`
- Live publishing → connect accounts in Settings, `PUBLISH_DRY_RUN=false`
