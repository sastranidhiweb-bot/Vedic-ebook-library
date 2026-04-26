import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/books/:path*',
        destination: 'http://localhost:5000/api/books/:path*',
      },
      {
        source: '/api/auth/:path*', 
        destination: 'http://localhost:5000/api/auth/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

export default nextConfig;