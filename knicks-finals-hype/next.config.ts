import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  outputFileTracingRoot: process.cwd(),
  trailingSlash: true,
  basePath: isGitHubPages ? "/neon-napkin" : "",
  assetPrefix: isGitHubPages ? "/neon-napkin/" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
