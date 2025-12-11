import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize package imports to reduce chunk size
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', 'lucide-react'],
  },
  // Explicitly ensure environment variables are available
  env: {
    // These will be available as process.env.NEXT_PUBLIC_* in both server and client
    // Next.js automatically handles NEXT_PUBLIC_ prefix, but this ensures they're loaded
  },
};

export default nextConfig;

