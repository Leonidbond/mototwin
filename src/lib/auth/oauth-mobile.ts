import { createHash } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { AuthServiceError } from "./session-service";
import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";

const googleClient = new OAuth2Client();
const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

type MobileOAuthPayload = {
  provider: "google" | "apple" | "yandex";
  idToken?: string;
  accessToken?: string;
  rawNonce?: string;
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
  return verifyYandex(input.accessToken);
}

async function verifyGoogle(idToken?: string) {
  if (!idToken?.trim()) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 400, "Google idToken обязателен.");
  }
  const audience = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  if (!audience) {
    throw new AuthServiceError("GOOGLE_CONFIG_MISSING", 500, "Не настроен GOOGLE_OAUTH_CLIENT_ID.");
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: idToken.trim(),
    audience,
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

type YandexIntrospectResponse = {
  active?: boolean;
  client_id?: string;
  scope?: string;
  user_id?: string;
  expires_in?: number;
};

/**
 * Verifies a Yandex access_token actually belongs to our mobile client_id
 * before trusting any profile data — MT-SEC-001 in docs/security/findings.md.
 *
 * Yandex exposes RFC 7662-style token introspection at
 * https://oauth.yandex.ru/introspect (HTTP Basic with the *web* OAuth app
 * credentials). The response carries the access-token's actual `client_id`
 * which we compare against `YANDEX_OAUTH_CLIENT_ID` (the mobile app).
 *
 * Yandex's /info endpoint does NOT echo client_id, so without this check any
 * Yandex access_token issued for any 3rd-party app could impersonate a
 * MotoTwin user as long as the e-mails matched.
 */
async function verifyYandex(accessToken?: string) {
  if (!accessToken?.trim()) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 400, "Yandex accessToken обязателен.");
  }
  const expectedClientId = process.env.YANDEX_OAUTH_CLIENT_ID?.trim();
  const introspectClientId = process.env.YANDEX_CLIENT_ID?.trim();
  const introspectClientSecret = process.env.YANDEX_CLIENT_SECRET?.trim();
  if (!expectedClientId || !introspectClientId || !introspectClientSecret) {
    throw new AuthServiceError(
      "YANDEX_CONFIG_MISSING",
      500,
      "Не настроен YANDEX_OAUTH_CLIENT_ID / YANDEX_CLIENT_ID / YANDEX_CLIENT_SECRET для проверки токена."
    );
  }

  const trimmedToken = accessToken.trim();
  const basic = Buffer.from(`${introspectClientId}:${introspectClientSecret}`).toString("base64");

  const introspectResponse = await fetchWithTimeout("https://oauth.yandex.ru/introspect", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ access_token: trimmedToken }).toString(),
    timeoutMs: 5_000,
  });
  if (!introspectResponse.ok) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Yandex токен недействителен.");
  }
  const introspect = (await introspectResponse.json()) as YandexIntrospectResponse;
  if (!introspect.active) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Yandex токен отозван или истёк.");
  }
  if (introspect.client_id !== expectedClientId) {
    // Hide the actual mismatched client_id from the response to avoid leaking
    // 3rd-party app IDs to attackers; log it on the server for forensic trails.
    console.warn(
      "[oauth-mobile] yandex access_token client_id mismatch",
      JSON.stringify({ expectedClientId, actualClientId: introspect.client_id })
    );
    throw new AuthServiceError(
      "INVALID_OAUTH_TOKEN",
      401,
      "Yandex токен выпущен для другого приложения."
    );
  }

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
  const profile = (await infoResponse.json()) as {
    id?: string;
    default_email?: string;
    real_name?: string;
    display_name?: string;
  };
  if (!profile.id) {
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Не удалось получить профиль Yandex.");
  }
  if (introspect.user_id && introspect.user_id !== profile.id) {
    // Defense in depth: introspect.user_id must match /info id for the same token.
    throw new AuthServiceError("INVALID_OAUTH_TOKEN", 401, "Yandex токен не соответствует профилю.");
  }
  return {
    provider: "yandex",
    providerAccountId: profile.id,
    email: profile.default_email ?? null,
    displayName: profile.real_name ?? profile.display_name ?? null,
  };
}
