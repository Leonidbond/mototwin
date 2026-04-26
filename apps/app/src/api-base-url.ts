import Constants from "expo-constants";

/** Hostnames that Expo/ngrok use for the Metro tunnel — they are not your Next.js server. */
const TUNNEL_PACKAGER_MARKERS = ["exp.direct", "ngrok-free.app", "ngrok.io", "ngrok.app"];

function isTunnelPackagerHost(host: string): boolean {
  const h = host.toLowerCase();
  return TUNNEL_PACKAGER_MARKERS.some((m) => h.includes(m));
}

/**
 * Returns the backend API base URL.
 *
 * Priority:
 * 1. `EXPO_PUBLIC_API_BASE_URL` in `apps/app/.env` (required for Expo Go + tunnel, see .env.example)
 * 2. From Metro's `hostUri` when using LAN (same IP for bundler and API)
 * 3. `http://localhost:3000` (simulator / web)
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  // e.g. "192.168.1.5:8081" (LAN) or "abc-123.exp.direct:8081" (tunnel)
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(":")[0] ?? "";
    if (isTunnelPackagerHost(host)) {
      if (__DEV__) {
        console.warn(
          "[mototwin] Metro tunnel host detected; do not use it for the API. " +
            "Create apps/app/.env with EXPO_PUBLIC_API_BASE_URL=http://<YOUR_MAC_LAN_IP>:3000 " +
            "(see apps/app/.env.example). Start Next at repo root: npm run dev"
        );
      }
      // Tunnel URL :3000 would always time out — fall back to loopback (works on iOS Simulator + Android emulator with host port forwarding, not on a physical device).
      return "http://127.0.0.1:3000";
    }
    return `http://${host}:3000`;
  }

  return "http://localhost:3000";
}
