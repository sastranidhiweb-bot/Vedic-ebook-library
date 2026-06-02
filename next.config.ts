import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/books/:path*',
        destination: `${backendUrl}/api/books/:path*`,
      },
      {
        source: '/api/auth/:path*',
        destination: `${backendUrl}/api/auth/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;