export function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

export function isStaticMode(): boolean {
  return process.env.NEXT_PUBLIC_STATIC_MODE === "true";
}

export function withBasePath(path: string): string {
  if (!path || path.startsWith("http")) return path;
  const base = basePath();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
