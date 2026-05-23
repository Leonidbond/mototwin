import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { getApiBaseUrl } from "./api-base-url";
import {
  clearAuthTokens,
  getAccessToken,
  readAuthTokens,
  writeAuthTokens,
} from "./auth-storage";

export function createMobileApiClient() {
  const baseUrl = getApiBaseUrl();
  return createMobileApiClientForBaseUrl(baseUrl);
}

export function createMobileApiClientForBaseUrl(baseUrl: string) {
  const client = createApiClient({
    baseUrl,
    getAccessToken: () => getAccessToken(),
  });
  return createMotoTwinEndpoints(client);
}

export async function refreshMobileSessionIfNeeded(): Promise<boolean> {
  const tokens = await readAuthTokens();
  if (!tokens) {
    return false;
  }
  const expiresAt = Date.parse(tokens.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 60_000) {
    return true;
  }
  try {
    const api = createMobileApiClient();
    const refreshed = await api.refreshAuth({ refreshToken: tokens.refreshToken });
    await writeAuthTokens({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
    });
    return true;
  } catch {
    await clearAuthTokens();
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
