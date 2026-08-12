/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@clinicos/shared-types'],
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
