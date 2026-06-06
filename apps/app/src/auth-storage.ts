import * as SecureStore from "expo-secure-store";
import { invalidateMobileAccessTokenCache } from "./mobile-access-token-cache";

export type StoredAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

const AUTH_TOKENS_KEY = "mototwin-auth-tokens";

/**
 * Restrict Keychain/Keystore entry to this device only — entry is not migrated to
 * a new device on backup restore. Matches MASVS L1 «secret-on-this-device-only».
 * See MT-SEC-063 in docs/security/findings.md.
 */
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let memoryTokens: StoredAuthTokens | null = null;

export async function readAuthTokens(): Promise<StoredAuthTokens | null> {
  if (memoryTokens) {
    return memoryTokens;
  }
  try {
    const raw = await SecureStore.getItemAsync(AUTH_TOKENS_KEY, SECURE_STORE_OPTIONS);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredAuthTokens;
    if (parsed?.accessToken && parsed?.refreshToken) {
      memoryTokens = parsed;
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export async function writeAuthTokens(tokens: StoredAuthTokens): Promise<void> {
  memoryTokens = tokens;
  invalidateMobileAccessTokenCache();
  try {
    await SecureStore.setItemAsync(AUTH_TOKENS_KEY, JSON.stringify(tokens), SECURE_STORE_OPTIONS);
  } catch (error) {
    // Surface the failure: if persistence breaks the next cold start will lose
    // the session, so the caller (login flow) should at least see the warning.
    console.warn("[auth-storage] failed to persist auth tokens", error);
  }
}

export async function clearAuthTokens(): Promise<void> {
  memoryTokens = null;
  invalidateMobileAccessTokenCache();
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY, SECURE_STORE_OPTIONS);
  } catch (error) {
    // We have already cleared the in-memory cache. Persistent removal failing
    // is unusual (locked Keychain, key already missing) but worth a breadcrumb.
    console.warn("[auth-storage] failed to delete auth tokens from SecureStore", error);
  }
}

/**
 * Returns the access token only while it is still valid (with a 30s skew).
 * Returning the expired token previously caused 401 round-trips and leaked
 * stale tokens into server logs (MT-SEC-007).
 */
export async function getAccessToken(): Promise<string | null> {
  const tokens = await readAuthTokens();
  if (!tokens) {
    return null;
  }
  const expiresAt = Date.parse(tokens.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 30_000) {
    return tokens.accessToken;
  }
  return null;
}
