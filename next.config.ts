import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // package-lock.json lives above this dir; pin the workspace root explicitly.
  turbopack: { root: __dirname },
};

export default nextConfig;
