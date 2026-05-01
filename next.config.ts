import type { NextConfig } from "next";
import os from "node:os";
import path from "node:path";

/** Non-loopback IPv4 addresses — Next dev blocks HMR WebSocket unless Origin host is allowlisted. */
function lanIpv4HostnamesForDev(): string[] {
  const out = new Set<string>();
  const nets = os.networkInterfaces();
  for (const addrs of Object.values(nets)) {
    for (const a of addrs ?? []) {
      const isV4 = a.family === "IPv4";
      if (isV4 && !a.internal) {
        out.add(a.address);
      }
    }
  }
  return [...out];
}

const allowedDevOrigins = lanIpv4HostnamesForDev();

const nextConfig: NextConfig = {
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins,
  turbopack: {
    // Keep module resolution scoped to this workspace.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
