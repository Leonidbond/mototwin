import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { AppHelpProvider } from "../src/components/app-help-fab";
import { readAuthTokens } from "../src/auth-storage";
import { refreshMobileSessionIfNeeded, warmMobileApiConnection } from "../src/create-mobile-api-client";

void SplashScreen.preventAutoHideAsync();

/** Публичные маршруты без сессии (как `/` на web). */
function isPublicMobileRoute(segments: readonly string[]): boolean {
  const first = segments[0];
  return first === "index" || first === "login";
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [authChecked, setAuthChecked] = useState(false);
  const [bootError, setBootError] = useState("");
  const [bootAttempt, setBootAttempt] = useState(0);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const fontsReady = fontsLoaded || fontError != null;

  useEffect(() => {
    if (fontError) {
      console.warn("[fonts] Inter failed to load", fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  useEffect(() => {
    let cancelled = false;
    setBootError("");
    setAuthChecked(false);
    void (async () => {
      const tokens = await readAuthTokens();
      if (cancelled) return;
      const onLogin = segments[0] === "login";
      const isPublic = isPublicMobileRoute(segments);

      if (!tokens) {
        if (!isPublic) {
          router.replace("/login");
        }
        setAuthChecked(true);
        return;
      }

      if (onLogin) {
        router.replace("/garage");
      }
      const refreshOk = await refreshMobileSessionIfNeeded();
      if (cancelled) return;
      if (!refreshOk) {
        const stillHasTokens = Boolean(await readAuthTokens());
        if (!stillHasTokens) {
          router.replace("/login");
          setAuthChecked(true);
          return;
        }
        setBootError("Не удалось проверить сессию. Проверьте сеть и нажмите «Повторить».");
        return;
      }

      try {
        await warmMobileApiConnection();
        if (cancelled) return;
        if (segments[0] === "index") {
          router.replace("/garage");
        }
        setAuthChecked(true);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes("требуется вход")) {
          router.replace("/login");
          setAuthChecked(true);
          return;
        }
        setBootError("Не удалось соединиться с сервером. Проверьте сеть и нажмите «Повторить».");
      }
    })();
    return () => {
      cancelled = true;
    };
    // Auth gate runs once on cold start; route changes should not re-block the UI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, bootAttempt]);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;
    void import("expo-notifications")
      .then((Notifications) => {
        if (cancelled) return;
        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const maybePath = (response.notification.request.content.data?.actionUrl ??
            response.notification.request.content.data?.url) as string | undefined;
          if (typeof maybePath === "string" && maybePath.startsWith("/")) {
            router.push(maybePath as never);
          }
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [router]);

  if (!fontsReady) {
    return null;
  }

  if (bootError) {
    return (
      <View style={styles.bootState}>
        <Text style={styles.bootTitle}>Сервер временно недоступен</Text>
        <Text style={styles.bootText}>{bootError}</Text>
        <Pressable style={styles.bootButton} onPress={() => setBootAttempt((attempt) => attempt + 1)}>
          <Text style={styles.bootButtonText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  if (!authChecked) {
    return (
      <View style={styles.bootState}>
        <ActivityIndicator size="large" color={c.textPrimary} />
        <Text style={styles.bootText}>Подключаемся к серверу...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppHelpProvider>
        <View style={{ flex: 1, backgroundColor: c.canvas }}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: c.canvas },
            }}
          />
        </View>
      </AppHelpProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: c.canvas,
  },
  bootTitle: {
    color: c.error,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  bootText: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 320,
    textAlign: "center",
  },
  bootButton: {
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: c.primaryAction,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  bootButtonText: {
    color: c.canvas,
    fontSize: 15,
    fontWeight: "700",
  },
});
