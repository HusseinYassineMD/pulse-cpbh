/** @type {import('next').NextConfig} */
const raw = process.env.API_URL || "http://127.0.0.1:8010";
const apiOrigin = raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw}`;

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
