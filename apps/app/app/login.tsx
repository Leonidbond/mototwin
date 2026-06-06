import { useState } from "react";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppTextInput as TextInput } from "../components/ui/AppTextInput";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { createMobileApiClient } from "../src/create-mobile-api-client";
import { writeAuthTokens } from "../src/auth-storage";
import { writeCachedAccessToken } from "../src/mobile-access-token-cache";
import { getGoogleNativeRedirectUri } from "../src/google-oauth-redirect";
import {
  resolveNativeGoogleSignInError,
  signInWithNativeGoogle,
} from "../src/google-native-sign-in";

WebBrowser.maybeCompleteAuthSession();

/**
 * Generates a random rawNonce, passes SHA-256(rawNonce) to Apple, and returns
 * both the raw and the resulting identityToken so the backend can verify the
 * `nonce` claim (MT-SEC-003). The rawNonce must be ≥ 32 chars after hex-encoding
 * to satisfy the server-side guard.
 */
async function startAppleSignIn(): Promise<{ rawNonce: string; identityToken: string }> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const rawNonce = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });
  if (!credential.identityToken) {
    throw new Error("Apple не вернул identityToken.");
  }
  return { rawNonce, identityToken: credential.identityToken };
}

const yandexDiscovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://oauth.yandex.ru/authorize",
  tokenEndpoint: "https://oauth.yandex.ru/token",
};

const googleOAuthEnabled =
  Platform.OS === "android"
    ? Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)
    : Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
const yandexOAuthEnabled = Boolean(process.env.EXPO_PUBLIC_YANDEX_CLIENT_ID);

type OAuthSuccessInput = {
  provider: "google" | "apple" | "yandex";
  idToken?: string;
  accessToken?: string;
  rawNonce?: string;
};

function GoogleSignInButtonAuthSession(props: {
  disabled: boolean;
  loading: boolean;
  onPressStart: () => void;
  onSuccess: (input: OAuthSuccessInput) => Promise<void>;
  onError: (message: string) => void;
  onFinish: () => void;
}) {
  const googleRedirectUri =
    Platform.OS === "ios"
      ? getGoogleNativeRedirectUri(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)
      : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    scopes: ["openid", "email", "profile"],
    clientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri: googleRedirectUri,
  });

  useEffect(() => {
    if (!response) {
      return;
    }
    if (response.type === "cancel" || response.type === "dismiss") {
      props.onFinish();
      return;
    }
    if (response.type !== "success") {
      props.onError("Не удалось войти через Google.");
      props.onFinish();
      return;
    }
    const idToken =
      response.authentication?.idToken ??
      (typeof response.params.id_token === "string" ? response.params.id_token : undefined);
    if (!idToken) {
      props.onError("Google не вернул idToken.");
      props.onFinish();
      return;
    }
    void props
      .onSuccess({ provider: "google", idToken })
      .catch((err) => {
        props.onError(err instanceof Error ? err.message : "Ошибка входа через Google.");
      })
      .finally(props.onFinish);
  }, [response]);

  return (
    <Pressable
      style={styles.oauthButton}
      disabled={props.disabled || !request}
      onPress={() => {
        props.onPressStart();
        void promptAsync().catch((err) => {
          props.onError(err instanceof Error ? err.message : "Ошибка входа через Google.");
          props.onFinish();
        });
      }}
    >
      <Text style={styles.oauthButtonText}>
        {props.loading ? "Google..." : "Войти через Google"}
      </Text>
    </Pressable>
  );
}

function GoogleSignInButtonNative(props: {
  disabled: boolean;
  loading: boolean;
  onPressStart: () => void;
  onSuccess: (input: OAuthSuccessInput) => Promise<void>;
  onError: (message: string) => void;
  onFinish: () => void;
}) {
  return (
    <Pressable
      style={styles.oauthButton}
      disabled={props.disabled}
      onPress={() => {
        props.onPressStart();
        void signInWithNativeGoogle()
          .then((idToken) => props.onSuccess({ provider: "google", idToken }))
          .catch((err) => {
            const message = resolveNativeGoogleSignInError(err);
            if (message) {
              props.onError(message);
            }
          })
          .finally(props.onFinish);
      }}
    >
      <Text style={styles.oauthButtonText}>
        {props.loading ? "Google..." : "Войти через Google"}
      </Text>
    </Pressable>
  );
}

function GoogleSignInButton(props: {
  disabled: boolean;
  loading: boolean;
  onPressStart: () => void;
  onSuccess: (input: OAuthSuccessInput) => Promise<void>;
  onError: (message: string) => void;
  onFinish: () => void;
}) {
  if (Platform.OS === "android") {
    return <GoogleSignInButtonNative {...props} />;
  }
  return <GoogleSignInButtonAuthSession {...props} />;
}

function YandexSignInButton(props: {
  disabled: boolean;
  loading: boolean;
  onPressStart: () => void;
  onSuccess: (input: OAuthSuccessInput) => Promise<void>;
  onError: (message: string) => void;
  onFinish: () => void;
}) {
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
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

  useEffect(() => {
    if (!response) {
      return;
    }
    if (response.type === "cancel" || response.type === "dismiss") {
      props.onFinish();
      return;
    }
    if (response.type !== "success") {
      props.onError("Не удалось войти через Yandex.");
      props.onFinish();
      return;
    }
    const accessToken =
      typeof response.params.access_token === "string" ? response.params.access_token : undefined;
    if (!accessToken) {
      props.onError("Yandex не вернул access token.");
      props.onFinish();
      return;
    }
    void props
      .onSuccess({ provider: "yandex", accessToken })
      .catch((err) => {
        props.onError(err instanceof Error ? err.message : "Ошибка входа через Yandex.");
      })
      .finally(props.onFinish);
  }, [response]);

  return (
    <Pressable
      style={styles.oauthButton}
      disabled={props.disabled || !request}
      onPress={() => {
        props.onPressStart();
        void promptAsync().catch((err) => {
          props.onError(err instanceof Error ? err.message : "Ошибка входа через Yandex.");
          props.onFinish();
        });
      }}
    >
      <Text style={styles.oauthButtonText}>
        {props.loading ? "Yandex..." : "Войти через Yandex"}
      </Text>
    </Pressable>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | "yandex" | null>(null);

  async function onOAuthSuccess(input: OAuthSuccessInput) {
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
    const expiresAtMs = Date.parse(result.expiresAt);
    writeCachedAccessToken(
      result.accessToken,
      Number.isFinite(expiresAtMs) ? expiresAtMs : Date.now() + 15 * 60_000
    );
    router.replace("/garage");
  }

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
      router.replace("/garage");
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
        {Platform.OS === "ios" ? (
          <Pressable
            style={styles.oauthButton}
            disabled={oauthLoading != null}
            onPress={() => {
              setError("");
              setOauthLoading("apple");
              void startAppleSignIn()
                .then(({ rawNonce, identityToken }) =>
                  onOAuthSuccess({ provider: "apple", idToken: identityToken, rawNonce })
                )
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
        ) : null}
        {googleOAuthEnabled ? (
          <GoogleSignInButton
            disabled={oauthLoading != null}
            loading={oauthLoading === "google"}
            onPressStart={() => {
              setError("");
              setOauthLoading("google");
            }}
            onSuccess={onOAuthSuccess}
            onError={setError}
            onFinish={() => setOauthLoading(null)}
          />
        ) : null}
        {yandexOAuthEnabled ? (
          <YandexSignInButton
            disabled={oauthLoading != null}
            loading={oauthLoading === "yandex"}
            onPressStart={() => {
              setError("");
              setOauthLoading("yandex");
            }}
            onSuccess={onOAuthSuccess}
            onError={setError}
            onFinish={() => setOauthLoading(null)}
          />
        ) : null}
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
