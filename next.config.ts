import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // package-lock.json lives above this dir; pin the workspace root explicitly.
  turbopack: { root: __dirname },
  // keep pdfjs-dist out of the server bundle so its worker module resolves
  // natively from node_modules when parsing PDFs server-side.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
