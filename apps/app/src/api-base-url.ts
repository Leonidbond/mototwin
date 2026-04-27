import Constants from "expo-constants";

/** Hostnames that Expo/ngrok use for the Metro tunnel — they are not your Next.js server. */
const TUNNEL_PACKAGER_MARKERS = ["exp.direct", "ngrok-free.app", "ngrok.io", "ngrok.app"];

function isTunnelPackagerHost(host: string): boolean {
  const h = host.toLowerCase();
  return TUNNEL_PACKAGER_MARKERS.some((m) => h.includes(m));
}

function devApiBaseFromExpoExtra(): string | undefined {
  const extra = Constants.expoConfig?.extra as { devApiBaseUrl?: string } | undefined;
  const u = extra?.devApiBaseUrl?.trim();
  return u ? u.replace(/\/$/, "") : undefined;
}

/**
 * Returns the backend API base URL.
 *
 * Priority:
 * 1. `EXPO_PUBLIC_API_BASE_URL` in `apps/app/.env` (optional override)
 * 2. Metro `hostUri` when not a tunnel (LAN — same host as bundler, port 3000)
 * 3. `expo.extra.devApiBaseUrl` from `app.config.ts` (LAN IP from dev machine interfaces at Metro start; used for tunnel)
 * 4. `http://localhost:3000` (simulator / web)
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

  const fromExtra = devApiBaseFromExpoExtra();

  if (hostUri) {
    const host = hostUri.split(":")[0] ?? "";
    if (isTunnelPackagerHost(host)) {
      if (fromExtra) return fromExtra;
      if (__DEV__) {
        console.warn(
          "[mototwin] Metro tunnel host detected; API URL must not use the tunnel. " +
            "Restart Metro so app.config can embed dev machine LAN IP (expo.extra.devApiBaseUrl), " +
            "or set EXPO_PUBLIC_API_BASE_URL (see apps/app/.env.example). Start Next: npm run dev"
        );
      }
      return "http://127.0.0.1:3000";
    }
    return `http://${host}:3000`;
  }

  if (fromExtra) return fromExtra;

  return "http://localhost:3000";
}
