import path from 'node:path';
import type { NextConfig } from 'next';

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Hide the floating dev badge in the bottom-left so the design is uninterrupted in dev.
  devIndicators: false,
  // Anchor Turbopack to the monorepo root so it doesn't pick a stray lockfile up the tree.
  // apps/web/ -> monorepo root is two levels up.
  turbopack: {
    root: path.resolve(process.cwd(), '..', '..'),
  },
  // Allow Three.js / glTF assets to be imported and served raw.
  transpilePackages: ['three'],
  experimental: {
    optimizePackageImports: [
      '@react-three/drei',
      '@react-three/fiber',
      'framer-motion',
      'gsap',
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
