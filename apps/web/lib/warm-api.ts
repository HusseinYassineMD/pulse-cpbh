import { fetchAbortTimeout } from "./fetch-abort";
import { isStaticMode } from "./base-path";

let inFlight: Promise<boolean> | null = null;
let lastOkAt = 0;

const WARM_STALE_MS = 4 * 60 * 1000;

/** Ping team API via Next route so the server is awake before Send. */
export async function warmPulseApi(options?: { force?: boolean; maxWaitMs?: number }): Promise<boolean> {
  if (isStaticMode()) return true;

  const force = options?.force === true;
  const maxWaitMs = options?.maxWaitMs ?? 55_000;
  const now = Date.now();

  if (!force && now - lastOkAt < WARM_STALE_MS) {
    return true;
  }

  if (!force && inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const res = await fetch("/api/warm", {
        cache: "no-store",
        signal: fetchAbortTimeout(maxWaitMs),
      });
      const ok = res.ok;
      if (ok) lastOkAt = Date.now();
      return ok;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function startPulseApiKeepWarm(): () => void {
  if (isStaticMode()) return () => undefined;

  void warmPulseApi();
  const id = window.setInterval(() => {
    void warmPulseApi();
  }, WARM_STALE_MS);

  return () => window.clearInterval(id);
}
