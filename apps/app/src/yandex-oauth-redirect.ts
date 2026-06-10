import { PRODUCTION_API_BASE_URL } from "./api-base-url";

/** Must exactly match Yandex OAuth cabinet → Redirect URI for web services. */
export const YANDEX_OAUTH_CALLBACK_PATH = "/api/auth/callback/yandex";

/**
 * Yandex allows only one registered Callback URL (web Auth.js).
 * Mobile must send the same redirect_uri; the in-app browser (or our server
 * bridge at /api/auth/callback/yandex) returns the authorization code to the app.
 */
export function getYandexOAuthRedirectUri(): string {
  if (__DEV__) {
    const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
    const base = fromEnv || "http://127.0.0.1:3000";
    return `${base}${YANDEX_OAUTH_CALLBACK_PATH}`;
  }
  return `${PRODUCTION_API_BASE_URL}${YANDEX_OAUTH_CALLBACK_PATH}`;
}
