import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  PART_WISHLIST_STATUS_ORDER,
  buildPartWishlistItemViewModel,
  getPartWishlistStatusLabelRu,
  groupPartWishlistItemsByStatus,
  filterActiveWishlistItems,
  isWishlistTransitionToInstalled,
  partWishlistStatusLabelsRu,
  WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT,
} from "@mototwin/domain";
import type { PartWishlistItemStatus, PartWishlistItemViewModel } from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../../../../src/api-base-url";
import { buildServiceEventNewFromWishlistHref, buildVehicleWishlistNewHref } from "./hrefs";

export default function VehicleWishlistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const apiBaseUrl = getApiBaseUrl();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<PartWishlistItemViewModel[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vehicleId) {
      setError("Не удалось определить ID мотоцикла.");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);
      const data = await endpoints.getVehicleWishlist(vehicleId);
      setItems((data.items ?? []).map(buildPartWishlistItemViewModel));
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить список покупок.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const activeItems = useMemo(() => filterActiveWishlistItems(items), [items]);
  const groups = useMemo(() => groupPartWishlistItemsByStatus(activeItems), [activeItems]);

  const promptStatus = (item: PartWishlistItemViewModel) => {
    const previousStatus = item.status;
    const buttons = PART_WISHLIST_STATUS_ORDER.map((status) => ({
      text: partWishlistStatusLabelsRu[status],
      onPress: () => void patchStatus(item.id, status, previousStatus),
    }));
    Alert.alert("Статус", item.title, [
      ...buttons,
      { text: "Отмена", style: "cancel" },
    ]);
  };

  async function patchStatus(
    itemId: string,
    status: PartWishlistItemStatus,
    previousStatus: PartWishlistItemStatus
  ) {
    if (!vehicleId) {
      return;
    }
    try {
      setBusyId(itemId);
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);
      const res = await endpoints.updateWishlistItem(vehicleId, itemId, { status });
      await load();
      if (isWishlistTransitionToInstalled(previousStatus, res.item.status)) {
        if (res.item.nodeId) {
          router.push(buildServiceEventNewFromWishlistHref(vehicleId, res.item));
        } else {
          Alert.alert("Список покупок", WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT);
        }
      }
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Не удалось обновить статус.";
      Alert.alert("Ошибка", message);
    } finally {
      setBusyId(null);
    }
  }

  const confirmDelete = (item: PartWishlistItemViewModel) => {
    Alert.alert("Удалить позицию?", item.title, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => void deleteItem(item.id),
      },
    ]);
  };

  async function deleteItem(itemId: string) {
    if (!vehicleId) {
      return;
    }
    try {
      setBusyId(itemId);
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);
      await endpoints.deleteWishlistItem(vehicleId, itemId);
      await load();
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Не удалось удалить.";
      Alert.alert("Ошибка", message);
    } finally {
      setBusyId(null);
    }
  }

  if (!vehicleId) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.error}>Не удалось определить ID мотоцикла.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={c.textPrimary} />
        <Text style={styles.muted}>Загрузка…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <Pressable
          onPress={() => void load()}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>Повторить</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          onPress={() => router.push(buildVehicleWishlistNewHref(vehicleId))}
          style={({ pressed }) => [styles.addPrimary, pressed && styles.addPrimaryPressed]}
        >
          <Text style={styles.addPrimaryText}>+ Добавить позицию</Text>
        </Pressable>

        {groups.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>
              {items.length === 0 ? "Список пуст" : "Список покупок пуст"}
            </Text>
            <Text style={styles.emptyText}>
              {items.length === 0
                ? "Добавьте расходники и запчасти, которые планируете купить для этого мотоцикла."
                : "Все позиции установлены."}
            </Text>
          </View>
        ) : (
          <View style={styles.groups}>
            {groups.map((group) => (
              <View key={group.status} style={styles.group}>
                <Text style={styles.groupTitle}>{group.sectionTitleRu}</Text>
                {group.items.map((item) => {
                  const isBusy = busyId === item.id;
                  return (
                    <View key={item.id} style={styles.card}>
                      <Pressable
                        onPress={() => router.push(`/vehicles/${vehicleId}/wishlist/${item.id}`)}
                        disabled={isBusy}
                      >
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        {item.node ? (
                          <Text style={styles.itemNode}>Узел: {item.node.name}</Text>
                        ) : null}
                        <Text style={styles.itemMeta}>
                          Кол-во: {item.quantity}
                          {item.comment ? ` · ${item.comment}` : ""}
                        </Text>
                      </Pressable>
                      <View style={styles.cardActions}>
                        <Pressable
                          onPress={() => promptStatus(item)}
                          disabled={isBusy}
                          style={({ pressed }) => [
                            styles.statusBtn,
                            pressed && !isBusy && styles.statusBtnPressed,
                          ]}
                        >
                          <Text style={styles.statusBtnText}>
                            {getPartWishlistStatusLabelRu(item.status)}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => confirmDelete(item)}
                          disabled={isBusy}
                          style={({ pressed }) => [
                            styles.deleteBtn,
                            pressed && !isBusy && styles.deleteBtnPressed,
                          ]}
                        >
                          <Text style={styles.deleteBtnText}>Удалить</Text>
                        </Pressable>
                      </View>
                      {isBusy ? (
                        <View style={styles.busyRow}>
                          <ActivityIndicator size="small" color={c.textMuted} />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas },
  scroll: { padding: 16, paddingBottom: 32 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: c.canvas,
  },
  muted: { marginTop: 10, fontSize: 14, color: c.textMuted },
  error: { color: c.error, fontSize: 14, textAlign: "center" },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  retryPressed: { opacity: 0.88 },
  retryText: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
  addPrimary: {
    backgroundColor: c.primaryAction,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  addPrimaryPressed: { opacity: 0.92 },
  addPrimaryText: { color: c.textInverse, fontSize: 16, fontWeight: "700" },
  emptyBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.border,
    borderRadius: 14,
    padding: 24,
    backgroundColor: c.cardMuted,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: { fontSize: 14, color: c.textMuted, textAlign: "center", lineHeight: 20 },
  groups: { gap: 20 },
  group: { gap: 10 },
  groupTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: c.textMuted,
    textTransform: "uppercase",
  },
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: c.card,
  },
  itemTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  itemNode: { marginTop: 6, fontSize: 13, color: c.textSecondary },
  itemMeta: { marginTop: 4, fontSize: 13, color: c.textMuted, lineHeight: 18 },
  cardActions: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.chipBackground,
  },
  statusBtnPressed: { opacity: 0.88 },
  statusBtnText: { fontSize: 13, fontWeight: "600", color: c.textPrimary },
  deleteBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.errorBorder,
    backgroundColor: c.errorSurface,
  },
  deleteBtnPressed: { opacity: 0.9 },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: c.error },
  busyRow: { marginTop: 8, alignItems: "flex-start" },
});
