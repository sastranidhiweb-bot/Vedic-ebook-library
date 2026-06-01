import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',   // Static export for Zoho Catalyst Slate hosting
  reactCompiler: true,
  images: {
    unoptimized: true, // Required for static export (no image optimization server)
  },
};

export default nextConfig;