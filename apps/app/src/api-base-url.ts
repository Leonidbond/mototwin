import Constants from "expo-constants";

/**
 * Returns the backend API base URL.
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_BASE_URL env var (set in .env for prod/staging or CI)
 * 2. Derived from Metro's debuggerHost — works automatically when the dev
 *    machine's IP changes, because Metro already knows its own address.
 * 3. Fallback to localhost (web browser / unit tests).
 */
export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // Constants.expoConfig.hostUri looks like "192.168.33.191:8081"
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // older SDK field
    (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(":")[0]; // strip Metro port
    return `http://${host}:3000`;
  }

  return "http://localhost:3000";
}
