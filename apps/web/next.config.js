/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = isPages ? "/pulse-cpbh-demo" : "";

const raw = process.env.API_URL || "http://127.0.0.1:8010";
const apiOrigin = raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw}`;

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
