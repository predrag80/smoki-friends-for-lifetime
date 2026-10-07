import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Dev server is reached through the local reverse proxy (dev/Caddyfile).
  allowedDevOrigins: ["app.smoki.local"],
  transpilePackages: ["@sffl/shared"]
};

export default nextConfig;
