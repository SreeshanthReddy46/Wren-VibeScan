import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@supabase/supabase-js"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
