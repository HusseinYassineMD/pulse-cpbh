import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Hosted Pulse API (Render blueprint service name). */
const RENDER_API_DEFAULT = "https://pulse-cpbh-api.onrender.com";

function upstreamBase(): string {
  let raw = (process.env.API_URL || "").trim();
  if (!raw && process.env.RENDER) {
    raw = RENDER_API_DEFAULT;
  }
  if (!raw) {
    raw = "http://127.0.0.1:8010";
  }
  raw = raw.replace(/\/$/, "");
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    raw = `https://${raw}`;
  }
  return raw.replace(/\/api\/v1$/i, "");
}

async function fetchUpstream(url: string, init: RequestInit): Promise<Response> {
  const attempts = process.env.RENDER ? 4 : 1;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 8000));
      }
    }
  }
  throw lastError;
}

async function proxy(req: NextRequest, pathSegments: string[]): Promise<Response> {
  const suffix = pathSegments.join("/");
  const incoming = new URL(req.url);
  const base = upstreamBase();
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
