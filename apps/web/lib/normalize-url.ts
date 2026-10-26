/** Accept Canva/Drive links with or without https:// — avoids browser type=url errors. */
export function normalizeOptionalUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

export function normalizeRequiredUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return normalizeOptionalUrl(t);
}

export function isLikelyUrl(raw: string): boolean {
  const t = normalizeOptionalUrl(raw);
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
