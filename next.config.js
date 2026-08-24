/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Allow build to proceed even with type errors
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
