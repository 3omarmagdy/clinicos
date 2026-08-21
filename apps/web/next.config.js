/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@clinicos/shared-types'],
  async rewrites() {
    const apiOrigin = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
