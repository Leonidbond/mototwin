import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { getYandexOAuthRedirectUri } from "./yandex-oauth-redirect";
import { savePendingYandexOAuth } from "./yandex-oauth-pending";

const YANDEX_AUTHORIZATION_ENDPOINT = "https://oauth.yandex.ru/authorize";

export type YandexOAuthPromptResult =
  | {
      type: "success";
      code: string;
      codeVerifier: string;
      redirectUri: string;
    }
  | { type: "cancel" | "dismiss" | "locked" }
  | { type: "error"; message: string };

/** URL that ASWebAuthenticationSession / Chrome Custom Tab wait for (after server bridge). */
export function getYandexOAuthAppReturnUrl(): string {
  return AuthSession.makeRedirectUri({ scheme: "mototwin", path: "oauth/yandex" });
}

function readOAuthCode(returnUrl: string): string | null {
  const parsed = Linking.parse(returnUrl);
  const code = parsed.queryParams?.code;
  if (typeof code === "string" && code.trim()) {
    return code.trim();
  }
  if (Array.isArray(code) && typeof code[0] === "string" && code[0].trim()) {
    return code[0].trim();
  }
  const oauthError = parsed.queryParams?.error;
  if (typeof oauthError === "string" && oauthError.trim()) {
    throw new Error(oauthError.trim());
  }
  return null;
}

/**
 * Yandex OAuth (code + PKCE). redirect_uri for Yandex is the shared HTTPS callback;
 * the in-app browser session completes on mototwin://oauth/yandex after server bridge.
 */
export async function promptYandexOAuthSignIn(clientId: string): Promise<YandexOAuthPromptResult> {
  const trimmedClientId = clientId.trim();
  if (!trimmedClientId) {
    return { type: "error", message: "Не настроен EXPO_PUBLIC_YANDEX_CLIENT_ID." };
  }

  const redirectUri = getYandexOAuthRedirectUri();
  const appReturnUrl = getYandexOAuthAppReturnUrl();

  const request = new AuthSession.AuthRequest({
    clientId: trimmedClientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    scopes: ["login:email", "login:info"],
  });

  const authUrl = await request.makeAuthUrlAsync({
    authorizationEndpoint: YANDEX_AUTHORIZATION_ENDPOINT,
  });

  const codeVerifier = request.codeVerifier;
  if (!codeVerifier) {
    return { type: "error", message: "Не удалось подготовить PKCE для Yandex." };
  }

  await savePendingYandexOAuth({ codeVerifier, redirectUri });

  const browserResult = await WebBrowser.openAuthSessionAsync(authUrl, appReturnUrl, {
    preferEphemeralSession: Platform.OS === "ios",
    showInRecents: false,
  });

  if (browserResult.type === "cancel" || browserResult.type === "dismiss") {
    return { type: browserResult.type };
  }
  if (browserResult.type !== "success" || !browserResult.url) {
    return { type: "error", message: "Не удалось войти через Yandex." };
  }

  try {
    const code = readOAuthCode(browserResult.url);
    if (!code) {
      return { type: "error", message: "Yandex не вернул authorization code." };
    }
    return { type: "success", code, codeVerifier, redirectUri };
  } catch (err) {
    return {
      type: "error",
      message: err instanceof Error ? err.message : "Ошибка входа через Yandex.",
    };
  }
}
