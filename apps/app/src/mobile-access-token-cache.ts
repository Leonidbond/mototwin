let cachedAccessToken: { value: string; expiresAtMs: number } | null = null;

export function readCachedAccessToken(minTtlMs: number): string | null {
  if (!cachedAccessToken) {
    return null;
  }
  if (cachedAccessToken.expiresAtMs <= Date.now() + minTtlMs) {
    return null;
  }
  return cachedAccessToken.value;
}

export function writeCachedAccessToken(value: string, expiresAtMs: number): void {
  cachedAccessToken = { value, expiresAtMs };
}

export function invalidateMobileAccessTokenCache(): void {
  cachedAccessToken = null;
}
