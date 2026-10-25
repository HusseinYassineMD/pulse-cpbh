/** Lead-only app sections — hidden from students unless team PIN is set. */
export const LEAD_ROUTE_PREFIXES = [
  "/review",
  "/calendar",
  "/board",
  "/plan",
  "/pipeline",
  "/analytics",
  "/ideas",
  "/studio",
  "/posts",
  "/stories",
  "/settings",
  "/post",
] as const;

export const STUDENT_ROUTE_PREFIXES = ["/ideate", "/submit"] as const;

export const LEAD_ACCESS_COOKIE = "pulse-lead-access";

export function pathRequiresLead(pathname: string): boolean {
  if (pathname === "/team") return false;
  return LEAD_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isStudentLanding(pathname: string): boolean {
  return pathname === "/" || STUDENT_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** After team sign-in, only redirect to lead routes (open redirect guard). */
export function safeLeadReturnPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/")) return "/review";
  const path = raw.split("?")[0].split("#")[0];
  if (!pathRequiresLead(path)) return "/review";
  return path;
}
