/** Single static post viewer — works on GitHub Pages (`/post?id=`) and local dev. */
export function postPageHref(id: string, hash?: string): string {
  const suffix = hash ? (hash.startsWith("#") ? hash : `#${hash}`) : "";
  return `/post?id=${encodeURIComponent(id)}${suffix}`;
}
