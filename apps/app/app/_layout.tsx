import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";
import { AppHelpFab } from "../src/components/app-help-fab";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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

  if (!fontsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerTitleStyle: {
            fontFamily: "Inter_700Bold",
            fontWeight: "700",
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Garage",
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: "Профиль",
          }}
        />
        <Stack.Screen
          name="trash"
          options={{
            title: "Свалка",
          }}
        />
        <Stack.Screen
          name="vehicles/[id]/index"
          options={{
            title: "Мотоцикл",
          }}
        />
        <Stack.Screen
          name="vehicles/[id]/attention"
          options={{
            title: "Требует внимания",
          }}
        />
        <Stack.Screen
          name="vehicles/new"
          options={{
            title: "Добавить мотоцикл",
          }}
        />
        <Stack.Screen
          name="vehicles/[id]/service-log"
          options={{
            title: "Журнал обслуживания",
          }}
        />
        <Stack.Screen
          name="vehicles/[id]/wishlist/index"
          options={{
            title: "Что нужно купить",
          }}
        />
        <Stack.Screen
          name="vehicles/[id]/wishlist/new"
          options={{
            title: "Новая позиция",
          }}
        />
        <Stack.Screen
          name="vehicles/[id]/wishlist/[itemId]"
          options={{
            title: "Редактирование",
          }}
        />
        <Stack.Screen
          name="vehicles/[id]/service-events/new"
          options={{
            title: "Новое обслуживание",
          }}
        />
        <Stack.Screen
          name="vehicles/[id]/state"
          options={{
            title: "Текущее состояние",
          }}
        />
        <Stack.Screen
          name="vehicles/[id]/profile"
          options={{
            title: "Профиль мотоцикла",
          }}
        />
      </Stack>
      <AppHelpFab />
    </View>
  );
}
