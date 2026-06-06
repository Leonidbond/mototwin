import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

/** Release keystore SHA-1 — add to Google Cloud Android OAuth client (package ru.mototwin.app). */
export const ANDROID_OAUTH_RELEASE_SHA1 =
  "4E:6C:7C:70:18:59:AB:89:66:92:DE:49:47:7D:1A:17:13:E2:B9:31";

const ANDROID_OAUTH_PACKAGE = "ru.mototwin.app";

let configured = false;

export function ensureGoogleSignInConfigured(): void {
  if (configured) {
    return;
  }
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!webClientId) {
    throw new Error("Не настроен EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
  }
  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  });
  configured = true;
}

export async function signInWithNativeGoogle(): Promise<string> {
  ensureGoogleSignInConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    throw new Error("GOOGLE_SIGN_IN_CANCELLED");
  }
  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error("Google не вернул idToken.");
  }
  return idToken;
}

function isDeveloperError(error: unknown): boolean {
  if (!isErrorWithCode(error)) {
    return false;
  }
  if (error.code === "10" || error.code === 10) {
    return true;
  }
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("developer_error") || message.includes("developer error");
}

export function resolveNativeGoogleSignInError(error: unknown): string {
  if (error instanceof Error && error.message === "GOOGLE_SIGN_IN_CANCELLED") {
    return "";
  }
  if (isDeveloperError(error)) {
    return (
      "Google DEVELOPER_ERROR: в Google Cloud Console → Credentials → Android OAuth client " +
      `укажите package ${ANDROID_OAUTH_PACKAGE} и SHA-1 ${ANDROID_OAUTH_RELEASE_SHA1}. ` +
      "Подождите 5–10 минут после сохранения."
    );
  }
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.IN_PROGRESS) {
      return "Вход через Google уже выполняется.";
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return "Google Play Services недоступны или устарели.";
    }
  }
  return error instanceof Error ? error.message : "Ошибка входа через Google.";
}
