/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@clinicos/shared-types'],
  async rewrites() {
    const apiOrigin = process.env.NEXT_PUBLIC_API_URL;

    // A public Vercel demo has no patient API by design. Returning no rewrite
    // prevents a deployed site from accidentally trying to reach localhost.
    if (!apiOrigin) return [];

    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
