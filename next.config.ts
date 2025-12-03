import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize package imports to reduce chunk size
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', 'lucide-react'],
  },
};

export default nextConfig;

