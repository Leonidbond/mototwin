import { useState } from "react";
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
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { createMobileApiClient } from "../src/create-mobile-api-client";
import { writeAuthTokens } from "../src/auth-storage";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

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
});
