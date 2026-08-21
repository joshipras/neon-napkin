import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    optimizePackageImports: ["qrcode"]
  }
};

export default nextConfig;
