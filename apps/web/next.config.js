/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const raw = process.env.API_URL || "http://127.0.0.1:8000";
const apiOrigin = raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw}`;

const nextConfig = {
  ...(isPages
    ? {
        output: "export",
        basePath,
        assetPrefix: basePath ? `${basePath}/` : undefined,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  ...(!isPages
    ? {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: `${apiOrigin}/api/v1/:path*`,
            },
          ];
        },
      }
    : {}),
};

module.exports = nextConfig;
