import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Monorepo: trace dependencies from the repository root so the standalone build includes them.
  outputFileTracingRoot: path.resolve(process.cwd(), ".."),
  // Dev server is reached through the local reverse proxy.
  allowedDevOrigins: ["app.smoki.local"],
  transpilePackages: ["@sffl/shared"]
};

export default nextConfig;
