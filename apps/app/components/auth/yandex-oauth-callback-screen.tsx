import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { writeAuthTokens } from "../../src/auth-storage";
import { createMobileApiClient } from "../../src/create-mobile-api-client";
import { writeCachedAccessToken } from "../../src/mobile-access-token-cache";
import { consumePendingYandexOAuth } from "../../src/yandex-oauth-pending";

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }
  return typeof value === "string" ? value.trim() : "";
}

export function YandexOAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>();
  const [message, setMessage] = useState("Завершаем вход через Yandex…");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const oauthError = readParam(params.error);
      if (oauthError) {
        const details = readParam(params.error_description);
        router.replace({
          pathname: "/login",
          params: {
            oauthError: details || oauthError || "Не удалось войти через Yandex.",
          },
        });
        return;
      }

      const code = readParam(params.code);
      if (!code) {
        router.replace({
          pathname: "/login",
          params: { oauthError: "Yandex не вернул authorization code." },
        });
        return;
      }

      const pending = await consumePendingYandexOAuth();
      if (!pending) {
        router.replace({
          pathname: "/login",
          params: {
            oauthError:
              "Сессия входа через Yandex устарела. Вернитесь на экран входа и попробуйте снова.",
          },
        });
        return;
      }

      try {
        const api = createMobileApiClient();
        const result = await api.loginWithMobileOAuth({
          provider: "yandex",
          code,
          redirectUri: pending.redirectUri,
          codeVerifier: pending.codeVerifier,
        });
        if (!result.accessToken || !result.refreshToken || !result.expiresAt) {
          throw new Error("Сервер не вернул токены мобильной сессии.");
        }
        await writeAuthTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
        });
        const expiresAtMs = Date.parse(result.expiresAt);
        writeCachedAccessToken(
          result.accessToken,
          Number.isFinite(expiresAtMs) ? expiresAtMs : Date.now() + 15 * 60_000
        );
        if (cancelled) {
          return;
        }
        router.replace("/garage");
      } catch (err) {
        if (cancelled) {
          return;
        }
        const text = err instanceof Error ? err.message : "Ошибка входа через Yandex.";
        setMessage(text);
        router.replace({
          pathname: "/login",
          params: { oauthError: text },
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.error, params.error_description, router]);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={c.textPrimary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: c.canvas,
    padding: 24,
  },
  text: {
    color: c.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
});
