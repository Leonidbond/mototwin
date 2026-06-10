import { createHash } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { AuthServiceError } from "./session-service";
import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import { exchangeYandexAuthorizationCode } from "./yandex-oauth-exchange";

const googleClient = new OAuth2Client();
const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

type MobileOAuthPayload = {
  provider: "google" | "apple" | "yandex";
  idToken?: string;
  accessToken?: string;
  rawNonce?: string;
  /** Yandex authorization code (MT-SEC-010 — server-side token exchange). */
  code?: string;
  redirectUri?: string;
  codeVerifier?: string;
};

export async function resolveMobileOAuthProfile(input: MobileOAuthPayload): Promise<{
  provider: string;
  providerAccountId: string;
  email: string | null;
  displayName: string | null;
}> {
  if (input.provider === "google") {
    return verifyGoogle(input.idToken);
  }
  if (input.provider === "apple") {
    return verifyApple(input.idToken, input.rawNonce);
  }
  return resolveYandexProfile(input);
}

async function resolveYandexProfile(input: MobileOAuthPayload) {
  if (input.code?.trim() && input.redirectUri?.trim()) {
    const accessToken = await exchangeYandexAuthorizationCode({
      code: input.code,
      redirectUri: input.redirectUri,
      codeVerifier: input.codeVerifier,
    });
    return verifyYandex(accessToken);
  }
  if (input.accessToken?.trim()) {
    // Legacy implicit-grant clients — reject after MT-SEC-010 migration.
    throw new AuthServiceError(
      "INVALID_OAUTH_CODE",
      400,
      "Yandex вход требует authorization code. Обновите приложение."
    );
  }
  throw new AuthServiceError(
    "INVALID_OAUTH_CODE",
    400,
    "Yandex authorization code и redirectUri обязательны."
  );
}

function collectGoogleOAuthAudiences(): string[] {
  const raw = [
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.AUTH_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_OAUTH_CLIENT_ID,
    process.env.GOOGLE_IOS_OAUTH_CLIENT_ID,
    ...(process.env.GOOGLE_OAUTH_CLIENT_IDS?.split(",") ?? []),
  ];
  return [...new Set(raw.map((value) => value?.trim()).filter(Boolean) as string[])];
}

async function verifyGoogle(idToken?: string) {
  if (!idToken?.trim()) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 400, "Google idToken обязателен.");
  }
  const audiences = collectGoogleOAuthAudiences();
  if (audiences.length === 0) {
    throw new AuthServiceError("GOOGLE_CONFIG_MISSING", 500, "Не настроен GOOGLE_OAUTH_CLIENT_ID.");
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: idToken.trim(),
    audience: audiences.length === 1 ? audiences[0] : audiences,
  });
  const payload = ticket.getPayload();
  const sub = payload?.sub;
  if (!sub) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Google токен недействителен.");
  }
  return {
    provider: "google",
    providerAccountId: sub,
    email: payload?.email ?? null,
    displayName: payload?.name ?? null,
  };
}

async function verifyApple(identityToken?: string, rawNonce?: string) {
  if (!identityToken?.trim()) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 400, "Apple identityToken обязателен.");
  }
  const audience = process.env.APPLE_CLIENT_ID?.trim();
  if (!audience) {
    throw new AuthServiceError("APPLE_CONFIG_MISSING", 500, "Не настроен APPLE_CLIENT_ID.");
  }
  const trimmedRawNonce = rawNonce?.trim();
  if (!trimmedRawNonce || trimmedRawNonce.length < 32) {
    // MT-SEC-003: without a nonce, an attacker who captured an identity_token
    // for our audience from any other Apple Sign-In session could replay it.
    throw new AuthServiceError("INVALID_OAUTH_NONCE", 400, "Apple rawNonce обязателен (>= 32 chars).");
  }
  const { payload } = await jwtVerify(identityToken.trim(), appleJwks, {
    issuer: "https://appleid.apple.com",
    audience,
  });
  const sub = payload.sub;
  if (!sub) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Apple токен недействителен.");
  }
  const expectedNonceDigest = createHash("sha256").update(trimmedRawNonce, "utf8").digest("hex");
  const tokenNonce = typeof payload.nonce === "string" ? payload.nonce.trim().toLowerCase() : "";
  if (!tokenNonce || tokenNonce !== expectedNonceDigest) {
    throw new AuthServiceError(
      "INVALID_OAUTH_NONCE",
      401,
      "Apple identityToken не содержит ожидаемый nonce."
    );
  }
  return {
    provider: "apple",
    providerAccountId: sub,
    email: typeof payload.email === "string" ? payload.email : null,
    displayName: null,
  };
}

type YandexInfoProfile = {
  id?: string;
  client_id?: string;
  default_email?: string;
  real_name?: string;
  display_name?: string;
};

/**
 * Verifies a Yandex access_token belongs to our OAuth app before trusting profile
 * data — MT-SEC-001. Yandex documents `client_id` on login.yandex.ru/info; there
 * is no public JSON introspection endpoint at oauth.yandex.ru/introspect.
 */
async function verifyYandex(accessToken?: string) {
  if (!accessToken?.trim()) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 400, "Yandex accessToken обязателен.");
  }
  const expectedClientId =
    process.env.YANDEX_OAUTH_CLIENT_ID?.trim() ?? process.env.YANDEX_CLIENT_ID?.trim();
  if (!expectedClientId) {
    throw new AuthServiceError(
      "YANDEX_CONFIG_MISSING",
      500,
      "Не настроен YANDEX_OAUTH_CLIENT_ID для проверки токена."
    );
  }

  const trimmedToken = accessToken.trim();
  const infoResponse = await fetchWithTimeout("https://login.yandex.ru/info?format=json", {
    headers: {
      Authorization: `OAuth ${trimmedToken}`,
      Accept: "application/json",
    },
    timeoutMs: 5_000,
  });
  if (!infoResponse.ok) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Yandex токен недействителен.");
  }

  let profile: YandexInfoProfile;
  try {
    profile = (await infoResponse.json()) as YandexInfoProfile;
  } catch {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Yandex токен недействителен.");
  }

  if (!profile.id) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Не удалось получить профиль Yandex.");
  }

  const tokenClientId = typeof profile.client_id === "string" ? profile.client_id.trim() : "";
  if (!tokenClientId || tokenClientId !== expectedClientId) {
    console.warn(
      "[oauth-mobile] yandex access_token client_id mismatch",
      JSON.stringify({ expectedClientId, actualClientId: tokenClientId || null })
    );
    throw new AuthServiceError(
      "INVALID_OAUTH_TOKEN",
      401,
      "Yandex токен выпущен для другого приложения."
    );
  }

  return {
    provider: "yandex",
    providerAccountId: profile.id,
    email: profile.default_email ?? null,
    displayName: profile.real_name ?? profile.display_name ?? null,
  };
}
