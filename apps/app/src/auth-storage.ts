import * as FileSystem from "expo-file-system/legacy";

export type StoredAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

const FILE_PATH =
  FileSystem.documentDirectory != null
    ? `${FileSystem.documentDirectory}mototwin-auth-tokens.json`
    : null;

let memoryTokens: StoredAuthTokens | null = null;

export async function readAuthTokens(): Promise<StoredAuthTokens | null> {
  if (memoryTokens) {
    return memoryTokens;
  }
  if (!FILE_PATH) {
    return null;
  }
  try {
    const info = await FileSystem.getInfoAsync(FILE_PATH);
    if (!info.exists) {
      return null;
    }
    const raw = await FileSystem.readAsStringAsync(FILE_PATH);
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
  if (!FILE_PATH) {
    return;
  }
  try {
    await FileSystem.writeAsStringAsync(FILE_PATH, JSON.stringify(tokens));
  } catch {
    // Ignore persistence errors.
  }
}

export async function clearAuthTokens(): Promise<void> {
  memoryTokens = null;
  if (!FILE_PATH) {
    return;
  }
  try {
    const info = await FileSystem.getInfoAsync(FILE_PATH);
    if (info.exists) {
      await FileSystem.deleteAsync(FILE_PATH, { idempotent: true });
    }
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
