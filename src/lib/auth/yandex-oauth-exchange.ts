import { AuthServiceError } from "./session-service";
import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";

type YandexTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export type YandexAuthorizationCodeInput = {
  code: string;
  redirectUri: string;
  codeVerifier?: string;
};

/**
 * Exchanges a Yandex authorization code (PKCE) for an access token on the
 * server so YANDEX_CLIENT_SECRET never ships in the mobile bundle (MT-SEC-010).
 */
export async function exchangeYandexAuthorizationCode(
  input: YandexAuthorizationCodeInput
): Promise<string> {
  const code = input.code?.trim();
  const redirectUri = input.redirectUri?.trim();
  if (!code) {
    throw new AuthServiceError("INVALID_OAUTH_CODE", 400, "Yandex authorization code обязателен.");
  }
  if (!redirectUri) {
    throw new AuthServiceError("INVALID_OAUTH_CODE", 400, "Yandex redirectUri обязателен.");
  }

  const clientId = process.env.YANDEX_OAUTH_CLIENT_ID?.trim() ?? process.env.YANDEX_CLIENT_ID?.trim();
  const clientSecret = process.env.YANDEX_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new AuthServiceError(
      "YANDEX_CONFIG_MISSING",
      500,
      "Не настроен YANDEX_OAUTH_CLIENT_ID / YANDEX_CLIENT_SECRET для обмена кода."
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const codeVerifier = input.codeVerifier?.trim();
  if (codeVerifier) {
    body.set("code_verifier", codeVerifier);
  }

  const tokenResponse = await fetchWithTimeout("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    timeoutMs: 5_000,
  });

  const payload = (await tokenResponse.json()) as YandexTokenResponse;
  if (!tokenResponse.ok || !payload.access_token?.trim()) {
    console.warn(
      "[oauth-mobile] yandex code exchange failed",
      JSON.stringify({
        status: tokenResponse.status,
        error: payload.error,
      })
    );
    throw new AuthServiceError(
      "INVALID_OAUTH_CODE",
      401,
      "Не удалось обменять Yandex authorization code."
    );
  }

  return payload.access_token.trim();
}
