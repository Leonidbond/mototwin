import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { AppHelpProvider } from "../src/components/app-help-fab";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
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

  return (
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
  );
}
