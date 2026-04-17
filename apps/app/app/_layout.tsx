import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: {
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
        name="vehicles/[id]/index"
        options={{
          title: "Мотоцикл",
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
  );
}
