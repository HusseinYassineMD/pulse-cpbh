/** Pulse API origin for server-side proxy and warm routes. */

export const RENDER_API_DEFAULT = "https://pulse-cpbh-api.onrender.com";

export function upstreamApiBase(): string {
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
  try {
    const host = new URL(raw).hostname;
    if (!host.includes(".") && process.env.RENDER) {
      raw = `https://${host}.onrender.com`;
    }
  } catch {
    /* keep raw */
  }
  if (process.env.RENDER && raw.includes("pulse-cpbh-api") && !raw.includes(".onrender.com")) {
    raw = RENDER_API_DEFAULT;
  }
  return raw.replace(/\/api\/v1$/i, "");
}
