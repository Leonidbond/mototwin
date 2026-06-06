import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { getApiBaseUrl } from "./api-base-url";
import { clearAuthTokens, readAuthTokens, writeAuthTokens } from "./auth-storage";
import {
  invalidateMobileAccessTokenCache,
  readCachedAccessToken,
  writeCachedAccessToken,
} from "./mobile-access-token-cache";
import {
  cancelAllMobileApiRequests,
  cancelLowPriorityMobileApiRequests,
  priorityForMobileApiPath,
  scheduleMobileApiRequest,
} from "./mobile-api-scheduler";

const ACCESS_TOKEN_SKEW_MS = 30_000;
const REFRESH_AHEAD_MS = 60_000;

let refreshInFlight: Promise<boolean> | null = null;

function isNetworkOrTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Превышено время ожидания") ||
    message.includes("Network request timed out") ||
    message.includes("Network request failed") ||
    message === "Aborted"
  );
}

export function prioritizeMobileApiForNavigation(): void {
  cancelLowPriorityMobileApiRequests();
}

export function cancelInFlightMobileApiRequests(
  reason = "Запрос отменён: приложение свёрнуто."
): void {
  cancelAllMobileApiRequests(reason);
}

export { invalidateMobileAccessTokenCache } from "./mobile-access-token-cache";

export function createMobileApiClient() {
  const baseUrl = getApiBaseUrl();
  return createMobileApiClientForBaseUrl(baseUrl);
}

export async function warmMobileApiConnection(): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const client = createApiClient({
    baseUrl,
    credentials: "omit",
    getAccessToken: () => getValidAccessToken(),
    requestTimeoutMs: 7_000,
    // Bootstrap should fail fast and show a retry button. The main API client
    // keeps its fuller retry policy for user-initiated data loads.
    requestMaxAttempts: 1,
  });
  await createMotoTwinEndpoints(client).getAuthMe();
}

export function createMobileApiClientForBaseUrl(baseUrl: string) {
  const client = createApiClient({
    baseUrl,
    credentials: "omit",
    getAccessToken: () => getValidAccessToken(),
    // An intermittent TLS-handshake stall to our VPS (proven: neutral hosts
    // handshake in <50ms at the same instant) hangs a single connection
    // attempt for the full timeout. Keep the per-attempt budget short so a
    // stuck handshake is dropped quickly and retried on a fresh connection,
    // the way a browser recovers. A healthy request completes in <300ms.
    requestTimeoutMs: 7_000,
    requestExecutor: (path, fn) =>
      scheduleMobileApiRequest(fn, priorityForMobileApiPath(path), path),
  });
  return createMotoTwinEndpoints(client);
}

/** Returns a bearer token, refreshing the mobile session when the access token is near expiry. */
export async function getValidAccessToken(): Promise<string | null> {
  const cached = readCachedAccessToken(ACCESS_TOKEN_SKEW_MS);
  if (cached) {
    return cached;
  }

  const tokens = await readAuthTokens();
  if (!tokens) {
    invalidateMobileAccessTokenCache();
    return null;
  }
  const expiresAt = Date.parse(tokens.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + ACCESS_TOKEN_SKEW_MS) {
    writeCachedAccessToken(tokens.accessToken, expiresAt);
    return tokens.accessToken;
  }
  const ok = await refreshMobileSessionIfNeeded();
  if (!ok) {
    invalidateMobileAccessTokenCache();
    return null;
  }
  const refreshed = await readAuthTokens();
  if (!refreshed?.accessToken) {
    invalidateMobileAccessTokenCache();
    return null;
  }
  const refreshedExpiresAt = Date.parse(refreshed.expiresAt);
  writeCachedAccessToken(
    refreshed.accessToken,
    Number.isFinite(refreshedExpiresAt) ? refreshedExpiresAt : Date.now() + 15 * 60_000
  );
  return refreshed.accessToken;
}

export async function refreshMobileSessionIfNeeded(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = refreshMobileSession().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function refreshMobileSession(): Promise<boolean> {
  const tokens = await readAuthTokens();
  if (!tokens) {
    return false;
  }
  const expiresAt = Date.parse(tokens.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + REFRESH_AHEAD_MS) {
    return true;
  }
  try {
    const baseUrl = getApiBaseUrl();
    const refreshClient = createApiClient({
      baseUrl,
      credentials: "omit",
      requestTimeoutMs: 60_000,
    });
    const api = createMotoTwinEndpoints(refreshClient);
    const refreshed = await api.refreshAuth({ refreshToken: tokens.refreshToken });
    await writeAuthTokens({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
    });
    const refreshedExpiresAt = Date.parse(refreshed.expiresAt);
    writeCachedAccessToken(
      refreshed.accessToken,
      Number.isFinite(refreshedExpiresAt) ? refreshedExpiresAt : Date.now() + 15 * 60_000
    );
    return true;
  } catch (error) {
    if (!isNetworkOrTimeoutError(error)) {
      await clearAuthTokens();
    }
    return false;
  }
}

export async function clearMobileSession(): Promise<void> {
  const tokens = await readAuthTokens();
  const api = createMobileApiClient();
  try {
    await api.logout(tokens?.refreshToken);
  } catch {
    // Ignore logout API errors.
  }
  await clearAuthTokens();
}
