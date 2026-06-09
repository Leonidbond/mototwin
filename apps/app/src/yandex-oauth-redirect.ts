import * as AuthSession from "expo-auth-session";
import { PRODUCTION_API_BASE_URL } from "./api-base-url";

export const YANDEX_OAUTH_CALLBACK_PATH = "/oauth/yandex/callback";

/**
 * Redirect URI registered in Yandex OAuth console.
 * Release builds use HTTPS App Links (Android Verified Links / iOS Universal Links).
 * Dev builds keep the custom scheme for Expo Go / local runs.
 */
export function getYandexOAuthRedirectUri(): string {
  if (__DEV__) {
    return AuthSession.makeRedirectUri({
      scheme: "mototwin",
      path: "oauth/yandex",
    });
  }
  return `${PRODUCTION_API_BASE_URL}${YANDEX_OAUTH_CALLBACK_PATH}`;
}
