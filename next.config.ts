import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep module resolution scoped to this workspace.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
