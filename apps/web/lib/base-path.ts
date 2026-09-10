export function basePath(): string {
  if (typeof window !== "undefined") {
    const segments = window.location.pathname.split("/").filter(Boolean);
    if (segments[0] === "pulse-cpbh" || segments[0] === "pulse-cpbh-demo") {
      return `/${segments[0]}`;
    }
  }
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

export function isStaticMode(): boolean {
  if (process.env.NEXT_PUBLIC_STATIC_MODE === "true") return true;
  if (typeof window !== "undefined") {
    const { hostname, pathname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") return false;
    return pathname.includes("/pulse-cpbh");
  }
  return false;
}

export function withBasePath(path: string): string {
  if (!path || path.startsWith("http")) return path;
  const base = basePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (base && normalized.startsWith(`${base}/`)) return normalized;
  return `${base}${normalized}`;
}
