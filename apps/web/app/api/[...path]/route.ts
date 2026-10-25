import type { NextRequest } from "next/server";
import { upstreamApiBase } from "@/lib/upstream-api";

export const runtime = "nodejs";

async function fetchUpstream(url: string, init: RequestInit): Promise<Response> {
  const isMutating = init.method !== "GET" && init.method !== "HEAD";
  const attempts = process.env.RENDER ? (isMutating ? 2 : 3) : 1;
  const timeoutMs = isMutating ? 90_000 : 55_000;
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
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
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
