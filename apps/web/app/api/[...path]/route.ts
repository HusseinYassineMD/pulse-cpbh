import type { NextRequest } from "next/server";
import { upstreamApiBase } from "@/lib/upstream-api";

export const runtime = "nodejs";

async function fetchUpstream(url: string, init: RequestInit): Promise<Response> {
  const isMutating = init.method !== "GET" && init.method !== "HEAD";
  // A cold Render API can take ~30–60s to wake. Stay under Render's 100s request cap.
  const attempts = process.env.RENDER ? 1 : isMutating ? 2 : 3;
  const timeoutMs = process.env.RENDER ? 90_000 : isMutating ? 120_000 : 55_000;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
  throw lastError;
}

async function proxy(req: NextRequest, pathSegments: string[]): Promise<Response> {
  const suffix = pathSegments.join("/");
  const incoming = new URL(req.url);
  const base = upstreamApiBase();
  const target = `${base}/api/v1/${suffix}${incoming.search}`;

  const headers = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const accept = req.headers.get("accept");
  if (accept) headers.set("accept", accept);

  let body: ArrayBuffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  try {
    const res = await fetchUpstream(target, {
      method: req.method,
      headers,
      body,
    });
    // Node already unzipped the body. Passing the compressed Content-Length
    // makes the browser stop halfway through the JSON, so the ticket ID never arrives.
    const payload = await res.arrayBuffer();
    const outHeaders = new Headers(res.headers);
    outHeaders.delete("content-encoding");
    outHeaders.delete("content-length");
    outHeaders.delete("transfer-encoding");
    // 204/304 cannot carry a body. An empty buffer still counts as one, and Remove then fails.
    const nullBody = res.status === 204 || res.status === 205 || res.status === 304;
    return new Response(nullBody ? null : payload, {
      status: res.status,
      statusText: res.statusText,
      headers: outHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed";
    return Response.json(
      {
        detail: `Could not reach Pulse API (${message}). Set API_URL=https://pulse-cpbh-api.onrender.com on pulse-cpbh-web and redeploy.`,
        upstream: base,
      },
      { status: 502 }
    );
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
