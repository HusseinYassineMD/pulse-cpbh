/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = isPages ? "/pulse-cpbh" : "";

const apiPort = process.env.PULSE_API_PORT || "8010";
const localApi = `http://127.0.0.1:${apiPort}`;
// Local dev: always localhost (ignore stale tunnel URLs in .env). Hosted build: API_URL from Render/etc.
const isDev = process.env.NODE_ENV !== "production";
const raw = isPages
  ? process.env.API_URL || localApi
  : isDev
    ? localApi
    : process.env.API_URL || localApi;
const apiOrigin = (raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw}`).replace(
  /\/api\/v1$/i,
  ""
);

const nextConfig = {
  output: isPages ? "export" : undefined,
  basePath,
  assetPrefix: isPages ? `${basePath}/` : undefined,
  trailingSlash: isPages,
  images: { unoptimized: true },
  ...(isPages
    ? {}
    : {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: `${apiOrigin}/api/v1/:path*`,
            },
          ];
        },
      }),
};

module.exports = nextConfig;
