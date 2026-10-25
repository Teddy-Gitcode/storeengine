import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // A verification build must not write into the `.next/` a running `next dev`
  // is serving from — both processes write there and the dev server's runtime
  // chunks get clobbered ("a[d] is not a function" on every page). Set
  // NEXT_DIST_DIR=.next-check to build somewhere else.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Server actions refuse bodies over 1 MB by default, and forms that carry a
  // photo (staff avatars allow 3.1 MB) failed before reaching the API.
  experimental: {
    serverActions: { bodySizeLimit: '4mb' },
  },
};

export default nextConfig;
