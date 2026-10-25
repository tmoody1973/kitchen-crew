import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home folder otherwise makes Next guess the wrong project root.
  outputFileTracingRoot: __dirname,
  // Verification builds use their own folder so they never clobber a running `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
