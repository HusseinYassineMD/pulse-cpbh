import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LEAD_ACCESS_COOKIE } from "@/lib/portal-config";

function leadPin(): string {
  return (process.env.LEAD_ACCESS_PIN || "").trim();
}

export async function POST(req: NextRequest) {
  const configured = leadPin();
  if (!configured) {
    return NextResponse.json(
      { detail: "Team access is not configured. Set LEAD_ACCESS_PIN on the web service in Render." },
      { status: 503 }
    );
  }

  let body: { pin?: string };
  try {
    body = (await req.json()) as { pin?: string };
  } catch {
    return NextResponse.json({ detail: "Invalid request" }, { status: 400 });
  }

  const pin = (body.pin || "").trim();
  if (!pin || pin !== configured) {
    return NextResponse.json({ detail: "Incorrect team code" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // Session cookie — access ends when the browser session closes (no maxAge).
  res.cookies.set(LEAD_ACCESS_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LEAD_ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
