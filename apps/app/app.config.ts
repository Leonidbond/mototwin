import os from "node:os";

import type { ConfigContext, ExpoConfig } from "expo/config";

/** Interface name substrings to skip (VPN, tunnels, bridges). Do not use plain "lo" — it matches `wlo1`. */
const SKIP_IFACE_SUBSTR = [
  "utun",
  "tun",
  "tap",
  "ppp",
  "wg",
  "wireguard",
  "vboxnet",
  "vmnet",
  "bridge",
  "awdl",
  "llw",
  "docker",
  "veth",
];

function ifaceScore(name: string): number | null {
  const n = name.toLowerCase();
  if (n === "lo" || /^lo\d*$/.test(n)) return null;
  if (SKIP_IFACE_SUBSTR.some((s) => n.includes(s))) return null;
  if (n === "en0") return 50;
  if (n === "en1") return 45;
  if (n.startsWith("en")) return 35;
  if (n.startsWith("wlan") || n.startsWith("wl")) return 30;
  return 10;
}

/** LAN IPv4 from this machine when Metro evaluates config (dev host). */
function getLanIPv4ForDevMachine(): string {
  let nets: NodeJS.Dict<os.NetworkInterfaceInfo[]>;
  try {
    nets = os.networkInterfaces();
  } catch {
    return "127.0.0.1";
  }

  const candidates: { address: string; score: number }[] = [];

  for (const name of Object.keys(nets)) {
    const score = ifaceScore(name);
    if (score == null) continue;
    for (const net of nets[name] ?? []) {
      const family = net.family as string | number;
      const v4 = family === "IPv4" || family === 4;
      if (!v4 || net.internal) continue;
      const addr = net.address;
      if (addr.startsWith("127.")) continue;
      candidates.push({ address: addr, score });
    }
  }

  if (candidates.length === 0) return "127.0.0.1";
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].address;
}

function shouldEmbedDevApiBaseUrl(): boolean {
  if (process.env.EAS_BUILD === "true") return false;
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseConfig = config as ExpoConfig;
  const host = getLanIPv4ForDevMachine();
  const devApiBaseUrl = shouldEmbedDevApiBaseUrl()
    ? `http://${host}:3000`.replace(/\/$/, "")
    : undefined;

  return {
    ...baseConfig,
    extra: {
      ...baseConfig.extra,
      ...(devApiBaseUrl ? { devApiBaseUrl } : {}),
    },
  };
};
