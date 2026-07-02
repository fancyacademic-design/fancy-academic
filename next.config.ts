import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // ⭐⭐ أضف هذه السطور ⭐⭐
  typescript: {
    ignoreBuildErrors: true, // يتجاهل أخطاء TypeScript
  },
  eslint: {
    ignoreDuringBuilds: true, // يتجاهل أخطاء ESLint
  },
};

export default nextConfig;