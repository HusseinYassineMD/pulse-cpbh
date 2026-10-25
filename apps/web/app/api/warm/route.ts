import { upstreamApiBase } from "@/lib/upstream-api";

export const runtime = "nodejs";

/** Wake the hosted API (Render cold start) — safe to call often from student pages. */
export async function GET() {
  const base = upstreamApiBase();
  const attempts = process.env.RENDER ? 3 : 1;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${base}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(55_000),
      });
      if (res.ok) {
        return Response.json({ ok: true, upstream: base });
      }
    } catch {
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
  }

  return Response.json(
    { ok: false, detail: "API not ready yet — try again in a few seconds.", upstream: base },
    { status: 503 }
  );
}
