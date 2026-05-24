import { useState } from "react";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { createMobileApiClient } from "../src/create-mobile-api-client";
import { writeAuthTokens } from "../src/auth-storage";

WebBrowser.maybeCompleteAuthSession();

const yandexDiscovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://oauth.yandex.ru/authorize",
  tokenEndpoint: "https://oauth.yandex.ru/token",
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | "yandex" | null>(null);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    scopes: ["openid", "email", "profile"],
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  const [yandexRequest, yandexResponse, promptYandexAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_YANDEX_CLIENT_ID ?? "",
      responseType: AuthSession.ResponseType.Token,
      scopes: ["login:email", "login:info"],
      redirectUri: AuthSession.makeRedirectUri({
        scheme: "mototwin",
        path: "oauth/yandex",
      }),
    },
    yandexDiscovery
  );

  async function onOAuthSuccess(input: { provider: "google" | "apple" | "yandex"; idToken?: string; accessToken?: string }) {
    const api = createMobileApiClient();
    const result = await api.loginWithMobileOAuth(input);
    if (!result.accessToken || !result.refreshToken || !result.expiresAt) {
      throw new Error("Сервер не вернул токены мобильной сессии.");
    }
    await writeAuthTokens({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    });
    router.replace("/");
  }

  useEffect(() => {
    if (googleResponse?.type !== "success") {
      return;
    }
    const idToken =
      googleResponse.authentication?.idToken ??
      (typeof googleResponse.params.id_token === "string" ? googleResponse.params.id_token : undefined);
    if (!idToken) {
      setError("Google не вернул idToken.");
      setOauthLoading(null);
      return;
    }
    void onOAuthSuccess({ provider: "google", idToken })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Ошибка входа через Google.");
      })
      .finally(() => setOauthLoading(null));
  }, [googleResponse]);

  useEffect(() => {
    if (yandexResponse?.type !== "success") {
      return;
    }
    const accessToken =
      typeof yandexResponse.params.access_token === "string"
        ? yandexResponse.params.access_token
        : undefined;
    if (!accessToken) {
      setError("Yandex не вернул access token.");
      setOauthLoading(null);
      return;
    }
    void onOAuthSuccess({ provider: "yandex", accessToken })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Ошибка входа через Yandex.");
      })
      .finally(() => setOauthLoading(null));
  }, [yandexResponse]);

  async function onSubmit() {
    setError("");
    setLoading(true);
    try {
      const api = createMobileApiClient();
      const result =
        mode === "login"
          ? await api.login({ email, password })
          : await api.register({ email, password });
      if (!result.accessToken || !result.refreshToken || !result.expiresAt) {
        throw new Error("Сервер не вернул токены мобильной сессии.");
      }
      await writeAuthTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка авторизации.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>{mode === "login" ? "Вход" : "Регистрация"}</Text>
        <Text style={styles.subtitle}>Закрытая бета MotoTwin</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Пароль"
          placeholderTextColor={c.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={() => void onSubmit()} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={c.canvas} />
          ) : (
            <Text style={styles.buttonText}>{mode === "login" ? "Войти" : "Создать аккаунт"}</Text>
          )}
        </Pressable>
        <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
          <Text style={styles.link}>
            {mode === "login" ? "Нет аккаунта? Регистрация" : "Уже есть аккаунт? Войти"}
          </Text>
        </Pressable>
        <Pressable
          style={styles.oauthButton}
          disabled={oauthLoading != null || !googleRequest}
          onPress={() => {
            setError("");
            setOauthLoading("google");
            void promptGoogleAsync()
              .catch((err) => {
                setError(err instanceof Error ? err.message : "Ошибка входа через Google.");
                setOauthLoading(null);
              });
          }}
        >
          <Text style={styles.oauthButtonText}>
            {oauthLoading === "google" ? "Google..." : "Войти через Google"}
          </Text>
        </Pressable>
        <Pressable
          style={styles.oauthButton}
          disabled={oauthLoading != null || !yandexRequest}
          onPress={() => {
            setError("");
            setOauthLoading("yandex");
            void promptYandexAsync()
              .catch((err) => {
                setError(err instanceof Error ? err.message : "Ошибка входа через Yandex.");
                setOauthLoading(null);
              });
          }}
        >
          <Text style={styles.oauthButtonText}>
            {oauthLoading === "yandex" ? "Yandex..." : "Войти через Yandex"}
          </Text>
        </Pressable>
        <Pressable
          style={styles.oauthButton}
          disabled={oauthLoading != null}
          onPress={() => {
            setError("");
            setOauthLoading("apple");
            void AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
            })
              .then((credential) => {
                if (!credential.identityToken) {
                  throw new Error("Apple не вернул identityToken.");
                }
                return onOAuthSuccess({
                  provider: "apple",
                  idToken: credential.identityToken,
                });
              })
              .catch((err) => {
                if (
                  err instanceof Error &&
                  err.message.includes("ERR_REQUEST_CANCELED")
                ) {
                  return;
                }
                setError(err instanceof Error ? err.message : "Ошибка входа через Apple.");
              })
              .finally(() => setOauthLoading(null));
          }}
        >
          <Text style={styles.oauthButtonText}>
            {oauthLoading === "apple" ? "Apple..." : "Войти через Apple"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas, justifyContent: "center", padding: 24 },
  card: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  title: { color: c.textPrimary, fontSize: 24, fontWeight: "600" },
  subtitle: { color: c.textMuted, fontSize: 14, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 12,
    color: c.textPrimary,
  },
  error: { color: c.error, fontSize: 14 },
  button: {
    backgroundColor: c.primaryAction,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: c.canvas, fontWeight: "600" },
  link: { color: c.primaryAction, textAlign: "center", marginTop: 12 },
  oauthButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 4,
  },
  oauthButtonText: { color: c.textPrimary, fontWeight: "500" },
});
