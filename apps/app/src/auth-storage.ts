import * as SecureStore from "expo-secure-store";

export type StoredAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

const AUTH_TOKENS_KEY = "mototwin-auth-tokens";

let memoryTokens: StoredAuthTokens | null = null;

export async function readAuthTokens(): Promise<StoredAuthTokens | null> {
  if (memoryTokens) {
    return memoryTokens;
  }
  try {
    const raw = await SecureStore.getItemAsync(AUTH_TOKENS_KEY);
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
  try {
    await SecureStore.setItemAsync(AUTH_TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    // Ignore persistence errors.
  }
}

export async function clearAuthTokens(): Promise<void> {
  memoryTokens = null;
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
  } catch {
    // Ignore.
  }
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await readAuthTokens();
  if (!tokens) {
    return null;
  }
  const expiresAt = Date.parse(tokens.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 30_000) {
    return tokens.accessToken;
  }
  return tokens.accessToken;
}
