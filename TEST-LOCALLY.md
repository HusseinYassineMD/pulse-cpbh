# Test Pulse on your Mac (before Render deploy)

## Start (every time)

From the repo root:

```bash
./start.sh setup   # once only
./start.sh dev
```

When you see **“API ready ✓”**, open exactly:

**http://localhost:3010/ideate**

(not `localhost:3000`, not the GitHub Pages `/pulse-cpbh` link)

## Quick checks

| Check | URL |
|--------|-----|
| Student ideation | http://localhost:3010/ideate |
| Send draft | http://localhost:3010/submit |
| API health | http://127.0.0.1:8010/health |
| Team review (needs PIN in `apps/web/.env.local`) | http://localhost:3010/team |

Team PIN for local testing — create `apps/web/.env.local`:

```
LEAD_ACCESS_PIN=your-test-code
```

Restart `./start.sh dev` after adding that file.

## “Internal Server Error” or blank page?

1. **Wrong port** — use **3010**, not 3000.
2. **Server not running** — terminal must show `Ready` and `API ready ✓`. Leave that terminal open.
3. **Stale tab** — hard refresh (Cmd+Shift+R) or use a private window.
4. **Turbopack glitch** — stop the server (Ctrl+C), then:
   ```bash
   cd apps/web && npm run dev:webpack
   ```
   (API still needs `./start.sh api` in another terminal, or run `./start.sh dev` again.)
5. **Corrupt Next cache** (common after `npm run build` while dev is running):
   ```bash
   # stop dev (Ctrl+C), then:
   ./start.sh dev clean
   ```
   Or: `rm -rf apps/web/.next && ./start.sh dev`

## Production-like test (optional)

```bash
./start.sh stable
```

Then open http://localhost:3010/ideate — same as Render’s built app, no hot reload.
