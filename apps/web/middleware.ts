import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LEAD_ACCESS_COOKIE, pathRequiresLead } from "@/lib/portal-config";

function stripBasePath(pathname: string): string {
  if (pathname.startsWith("/pulse-cpbh-demo")) return pathname.slice("/pulse-cpbh-demo".length) || "/";
  if (pathname.startsWith("/pulse-cpbh")) return pathname.slice("/pulse-cpbh".length) || "/";
  return pathname;
}

export function middleware(request: NextRequest) {
  const rawPath = request.nextUrl.pathname;
  // GitHub Pages uses /pulse-cpbh — locally we run at /. Redirect so bookmarks still work.
  if (rawPath.startsWith("/pulse-cpbh") || rawPath.startsWith("/pulse-cpbh-demo")) {
    const url = request.nextUrl.clone();
    url.pathname = stripBasePath(rawPath);
    return NextResponse.redirect(url);
  }

  const pathname = stripBasePath(rawPath);

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/data") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const hasLead = request.cookies.get(LEAD_ACCESS_COOKIE)?.value === "1";

  if (pathRequiresLead(pathname) && !hasLead) {
    const url = request.nextUrl.clone();
    url.pathname = "/team";
    url.searchParams.set("blocked", "lead");
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasLead && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/ideate";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
