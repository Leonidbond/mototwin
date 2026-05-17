import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type { NotificationItemWire } from "@mototwin/types";
import { getApiBaseUrl } from "../src/api-base-url";

function severityColor(severity: NotificationItemWire["severity"]) {
  if (severity === "CRITICAL") return c.error;
  if (severity === "WARNING") return c.warning;
  return c.info;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();
  const [items, setItems] = useState<NotificationItemWire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isConnectingPush, setIsConnectingPush] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
      const res = await endpoints.getNotifications({ limit: 100, includeResolved: true });
      setItems(res.notifications ?? []);
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить уведомления.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const unreadCount = useMemo(
    () => items.filter((item) => item.status === "NEW" || item.status === "SEEN").length,
    [items]
  );

  const connectPush = useCallback(async () => {
    try {
      setIsConnectingPush(true);
      const Notifications = await import("expo-notifications");
      const Device = await import("expo-device");
      const permission = await Notifications.getPermissionsAsync();
      let status = permission.status;
      if (status !== "granted") {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== "granted") {
        Alert.alert("Push не подключен", "Разрешите уведомления в настройках устройства.");
        return;
      }
      const tokenResult = await Notifications.getExpoPushTokenAsync();
      const token = tokenResult.data;
      const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
      await endpoints.upsertPushSubscription({
        channelType: "MOBILE_PUSH",
        provider: "EXPO",
        platform: Device.osName === "iOS" ? "IOS" : "ANDROID",
        token,
        deviceName: Device.deviceName ?? null,
        osVersion: Device.osVersion ?? null,
        appVersion: "0.1.0",
      });
      Alert.alert("Push подключен", "Устройство зарегистрировано для push-уведомлений.");
    } catch (requestError) {
      console.error(requestError);
      Alert.alert("Ошибка", "Не удалось подключить push.");
    } finally {
      setIsConnectingPush(false);
    }
  }, [apiBaseUrl]);

  const markRead = useCallback(
    async (notificationId: string) => {
      try {
        const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
        await endpoints.markNotificationRead(notificationId);
        await load();
      } catch (requestError) {
        console.error(requestError);
      }
    },
    [apiBaseUrl, load]
  );

  const dismiss = useCallback(
    async (notificationId: string) => {
      try {
        const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
        await endpoints.dismissNotification(notificationId);
        await load();
      } catch (requestError) {
        console.error(requestError);
      }
    },
    [apiBaseUrl, load]
  );

  const openAction = useCallback(
    (item: NotificationItemWire) => {
      if (item.actionUrl?.startsWith("/")) {
        router.push(item.actionUrl as never);
      }
    },
    [router]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Оповещения</Text>
            <Text style={styles.subtitle}>Непрочитанных: {unreadCount}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void connectPush()}
            style={({ pressed }) => [styles.pushButton, pressed && { opacity: 0.85 }]}
            disabled={isConnectingPush}
          >
            <MaterialIcons name="notifications-active" size={18} color={c.textPrimary} />
            <Text style={styles.pushButtonText}>
              {isConnectingPush ? "Подключение..." : "Подключить push"}
            </Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={c.textPrimary} />
            <Text style={styles.subtitle}>Загрузка...</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Все спокойно. Просроченных работ и срочных напоминаний нет.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.severity, { color: severityColor(item.severity) }]}>
                    {item.severity}
                  </Text>
                  <Text style={styles.date}>
                    {new Date(item.createdAt).toLocaleString("ru-RU")}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody}>{item.body}</Text>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => void markRead(item.id)} style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Прочитано</Text>
                  </Pressable>
                  <Pressable onPress={() => void dismiss(item.id)} style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Скрыть</Text>
                  </Pressable>
                  {item.actionUrl ? (
                    <Pressable onPress={() => openAction(item)} style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>{item.actionLabel ?? "Открыть"}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    color: c.textPrimary,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: c.textMuted,
    fontSize: 13,
  },
  pushButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: c.card,
  },
  pushButtonText: {
    color: c.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  error: {
    color: c.error,
    fontSize: 13,
  },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  severity: {
    fontSize: 12,
    fontWeight: "700",
  },
  date: {
    color: c.textMuted,
    fontSize: 11,
  },
  cardTitle: {
    color: c.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  cardBody: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: c.chipBackground,
  },
  actionButtonText: {
    color: c.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 12,
  },
  emptyText: {
    color: c.textMuted,
    fontSize: 13,
  },
});
