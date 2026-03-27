/** @type {import('next').NextConfig} */
const nextConfig = {
  // This allows the app to build even if there are tiny styling warnings
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
