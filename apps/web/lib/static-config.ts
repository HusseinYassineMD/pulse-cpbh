/** Bump when bundled posts/media change — busts React Query cache on GitHub Pages. */
export const STATIC_DATA_VERSION = 8;

/**
 * Full Pulse app (API + database). Set in GitHub Actions / Pages build when you deploy Render/Fly.
 * Example: https://pulse-cpbh-web.onrender.com
 */
function normalizePublicUrl(raw: string): string {
  const s = raw.trim().replace(/\/$/, "");
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

export const HOSTED_APP_URL = normalizePublicUrl(process.env.NEXT_PUBLIC_HOSTED_APP_URL || "");
