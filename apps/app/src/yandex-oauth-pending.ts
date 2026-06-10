import * as SecureStore from "expo-secure-store";

const PENDING_KEY = "mototwin-yandex-oauth-pending";
const MAX_AGE_MS = 10 * 60_000;

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export type PendingYandexOAuth = {
  codeVerifier: string;
  redirectUri: string;
  createdAtMs: number;
};

export async function savePendingYandexOAuth(input: {
  codeVerifier: string;
  redirectUri: string;
}): Promise<void> {
  const codeVerifier = input.codeVerifier.trim();
  const redirectUri = input.redirectUri.trim();
  if (!codeVerifier || !redirectUri) {
    return;
  }
  const payload: PendingYandexOAuth = {
    codeVerifier,
    redirectUri,
    createdAtMs: Date.now(),
  };
  await SecureStore.setItemAsync(PENDING_KEY, JSON.stringify(payload), SECURE_STORE_OPTIONS);
}

export async function consumePendingYandexOAuth(): Promise<PendingYandexOAuth | null> {
  try {
    const raw = await SecureStore.getItemAsync(PENDING_KEY, SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(PENDING_KEY, SECURE_STORE_OPTIONS);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PendingYandexOAuth;
    if (!parsed?.codeVerifier?.trim() || !parsed?.redirectUri?.trim()) {
      return null;
    }
    if (Date.now() - (parsed.createdAtMs ?? 0) > MAX_AGE_MS) {
      return null;
    }
    return {
      codeVerifier: parsed.codeVerifier.trim(),
      redirectUri: parsed.redirectUri.trim(),
      createdAtMs: parsed.createdAtMs,
    };
  } catch {
    return null;
  }
}
