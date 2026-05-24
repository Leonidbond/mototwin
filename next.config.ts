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

const isProduction = process.env.NODE_ENV === "production";

/**
 * In production we never need LAN HMR origins — keep the allowlist empty so we
 * don't accidentally widen the dev-asset attack surface (MT-SEC-048).
 */
const allowedDevOrigins = isProduction ? [] : lanIpv4HostnamesForDev();

/**
 * Baseline security headers (MT-SEC-006). CSP is intentionally NOT enabled yet —
 * inline scripts/styles need a pass first (see MT-SEC-047 in
 * docs/security/findings.md). HSTS only kicks in once the upstream serves HTTPS,
 * which is the deploy team's responsibility (MT-SEC-029).
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins,
  turbopack: {
    // Keep module resolution scoped to this workspace.
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
