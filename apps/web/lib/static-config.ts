/** Bump when bundled posts/media change — busts React Query cache on GitHub Pages. */
export const STATIC_DATA_VERSION = 7;

/**
 * Full Pulse app (API + database). Set in GitHub Actions / Pages build when you deploy Render/Fly.
 * Example: https://pulse-cpbh-web.onrender.com
 */
export const HOSTED_APP_URL = (process.env.NEXT_PUBLIC_HOSTED_APP_URL || "").replace(/\/$/, "");
