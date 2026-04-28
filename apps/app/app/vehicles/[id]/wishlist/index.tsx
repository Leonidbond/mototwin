import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  PART_WISHLIST_STATUS_ORDER,
  buildPartWishlistItemViewModel,
  getPartWishlistStatusLabelRu,
  getWishlistItemSkuDisplayLines,
  groupPartWishlistItemsByStatus,
  isWishlistTransitionToInstalled,
  partWishlistStatusLabelsRu,
  WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT,
} from "@mototwin/domain";
import type { PartWishlistItemStatus, PartWishlistItemViewModel } from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../../../../src/api-base-url";
import {
  buildServiceEventNewFromWishlistHref,
  buildVehicleServiceLogEventHref,
  buildVehicleWishlistNewHref,
} from "./hrefs";
import { ActionIconButton } from "../../../components/action-icon-button";
import { ScreenHeader } from "../../../components/screen-header";

type PartsStatusFilter = PartWishlistItemStatus | "ALL";
const INITIAL_VISIBLE_COUNT = 10;
const VISIBLE_INCREMENT = 10;

function getWishlistItemIdFromInstalledPartsJson(payload: unknown): string | null {
  let parsed = payload;
  if (typeof payload === "string") {
    try {
      parsed = JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const record = parsed as { source?: unknown; wishlistItemId?: unknown };
  if (record.source !== "wishlist" || typeof record.wishlistItemId !== "string") {
    return null;
  }
  return record.wishlistItemId.trim() || null;
}

export default function VehicleWishlistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; wishlistItemId?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const highlightedWishlistItemId =
    typeof params.wishlistItemId === "string" ? params.wishlistItemId : "";
  const apiBaseUrl = getApiBaseUrl();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<PartWishlistItemViewModel[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [serviceEventIdByWishlistItemId, setServiceEventIdByWishlistItemId] = useState<
    Map<string, string>
  >(() => new Map());
  const [statusFilter, setStatusFilter] = useState<PartsStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Partial<Record<PartWishlistItemStatus, boolean>>
  >({ INSTALLED: true });
  const [visibleCountByStatus, setVisibleCountByStatus] = useState<
    Partial<Record<PartWishlistItemStatus, number>>
  >({});
  const scrollRef = useRef<ScrollView | null>(null);
  const itemYByIdRef = useRef<Record<string, number>>({});

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
      const [wishlistData, serviceData] = await Promise.all([
        endpoints.getVehicleWishlist(vehicleId),
        endpoints.getServiceEvents(vehicleId),
      ]);
      setItems((wishlistData.items ?? []).map(buildPartWishlistItemViewModel));
      const byWishlistItemId = new Map<string, string>();
      const newestEventsFirst = [...(serviceData.serviceEvents ?? [])].sort((left, right) => {
        const leftTime = new Date(left.eventDate || left.createdAt).getTime();
        const rightTime = new Date(right.eventDate || right.createdAt).getTime();
        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
      for (const event of newestEventsFirst) {
        if (event.eventKind === "STATE_UPDATE") {
          continue;
        }
        const wishlistItemId = getWishlistItemIdFromInstalledPartsJson(event.installedPartsJson);
        if (wishlistItemId && !byWishlistItemId.has(wishlistItemId)) {
          byWishlistItemId.set(wishlistItemId, event.id);
        }
      }
      setServiceEventIdByWishlistItemId(byWishlistItemId);
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

  const statusCounts = useMemo(() => {
    const counts = new Map<PartWishlistItemStatus, number>();
    for (const status of PART_WISHLIST_STATUS_ORDER) {
      counts.set(status, 0);
    }
    for (const item of items) {
      counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
    }
    return counts;
  }, [items]);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      if (!normalizedSearchQuery) {
        return true;
      }
      const skuLines = item.sku ? getWishlistItemSkuDisplayLines(item.sku) : null;
      const haystack = [
        item.title,
        item.statusLabelRu,
        item.node?.name ?? "",
        item.costLabelRu ?? "",
        item.kitOriginLabelRu ?? "",
        item.commentBodyRu ?? "",
        skuLines?.primaryLine ?? "",
        skuLines?.secondaryLine ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearchQuery);
    });
  }, [items, normalizedSearchQuery, statusFilter]);
  const groups = useMemo(() => groupPartWishlistItemsByStatus(filteredItems), [filteredItems]);

  useEffect(() => {
    if (!highlightedWishlistItemId || items.length === 0) {
      return;
    }
    const highlightedItem = items.find((item) => item.id === highlightedWishlistItemId);
    if (!highlightedItem) {
      return;
    }
    setStatusFilter(highlightedItem.status);
    setSearchQuery("");
    setCollapsedGroups((prev) => ({ ...prev, [highlightedItem.status]: false }));
    const itemsInStatus = items.filter((item) => item.status === highlightedItem.status);
    const highlightedIndex = itemsInStatus.findIndex((item) => item.id === highlightedItem.id);
    if (highlightedIndex >= 0) {
      setVisibleCountByStatus((prev) => ({
        ...prev,
        [highlightedItem.status]: Math.max(
          prev[highlightedItem.status] ?? INITIAL_VISIBLE_COUNT,
          highlightedIndex + 1
        ),
      }));
    }
    const timeoutId = setTimeout(() => {
      const y = itemYByIdRef.current[highlightedWishlistItemId];
      if (typeof y === "number") {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
      }
    }, 120);
    return () => clearTimeout(timeoutId);
  }, [highlightedWishlistItemId, items]);

  const promptStatus = (item: PartWishlistItemViewModel) => {
    const previousStatus = item.status;
    const buttons = PART_WISHLIST_STATUS_ORDER.map((status) => ({
      text: partWishlistStatusLabelsRu[status],
      onPress: () => void patchStatus(item, status, previousStatus),
    }));
    Alert.alert("Статус", item.title, [
      ...buttons,
      { text: "Отмена", style: "cancel" },
    ]);
  };

  async function patchStatus(
    item: PartWishlistItemViewModel,
    status: PartWishlistItemStatus,
    previousStatus: PartWishlistItemStatus
  ) {
    if (!vehicleId) {
      return;
    }
    const nodeId = item.nodeId?.trim() ?? "";
    if (!nodeId) {
      Alert.alert("Список покупок", "Выберите узел мотоцикла");
      return;
    }
    if (isWishlistTransitionToInstalled(previousStatus, status)) {
      router.push(buildServiceEventNewFromWishlistHref(vehicleId, item));
      return;
    }
    try {
      setBusyId(item.id);
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);
      const res = await endpoints.updateWishlistItem(vehicleId, item.id, { status, nodeId });
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

  async function createExpenseFromWishlist(item: PartWishlistItemViewModel) {
    if (!vehicleId) {
      return;
    }
    if (item.costAmount == null || item.costAmount <= 0 || !item.currency) {
      Alert.alert("Расходы", "Укажите стоимость и валюту в карточке позиции перед переносом в расходы.");
      return;
    }
    try {
      setBusyId(item.id);
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);
      await endpoints.createExpenseFromShoppingListItem(item.id, {
        amount: item.costAmount,
        currency: item.currency,
        purchasedAt: new Date().toISOString().slice(0, 10),
        comment: item.commentBodyRu ?? item.comment ?? null,
      });
      await load();
      Alert.alert("Расходы", "Позиция отмечена купленной и добавлена в расходы.");
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Не удалось создать расход.";
      Alert.alert("Ошибка", message);
    } finally {
      setBusyId(null);
    }
  }

  function confirmCreateExpense(item: PartWishlistItemViewModel) {
    Alert.alert(
      "Добавить в расходы?",
      `${item.title}${item.costLabelRu ? `\n${item.costLabelRu}` : ""}`,
      [
        { text: "Отмена", style: "cancel" },
        { text: "Добавить", onPress: () => void createExpenseFromWishlist(item) },
      ]
    );
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
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text style={styles.error}>Не удалось определить ID мотоцикла.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color={c.textPrimary} />
        <Text style={styles.muted}>Загрузка…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Корзина замен и расходников" />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionHint}>
          Все позиции для замены: от «Нужно купить» до «Установлено». Установленные позиции
          связаны с журналом обслуживания, если сервисное событие было сохранено.
        </Text>
        <Pressable
          onPress={() => router.push(buildVehicleWishlistNewHref(vehicleId))}
          style={({ pressed }) => [styles.addPrimary, pressed && styles.addPrimaryPressed]}
        >
          <Text style={styles.addPrimaryText}>+ Добавить позицию</Text>
        </Pressable>

        {items.length > 0 ? (
          <View style={styles.filterPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                <Pressable
                  onPress={() => setStatusFilter("ALL")}
                  style={[
                    styles.filterChip,
                    statusFilter === "ALL" && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === "ALL" && styles.filterChipTextActive,
                    ]}
                  >
                    Все · {items.length}
                  </Text>
                </Pressable>
                {PART_WISHLIST_STATUS_ORDER.map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => setStatusFilter(status)}
                    style={[
                      styles.filterChip,
                      statusFilter === status && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === status && styles.filterChipTextActive,
                      ]}
                    >
                      {partWishlistStatusLabelsRu[status]} · {statusCounts.get(status) ?? 0}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={styles.searchRow}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Поиск по детали, SKU, узлу или комментарию"
                placeholderTextColor={c.textMuted}
                style={styles.searchInput}
              />
              {statusFilter !== "ALL" || searchQuery.trim() ? (
                <Pressable
                  onPress={() => {
                    setStatusFilter("ALL");
                    setSearchQuery("");
                  }}
                  style={styles.resetButton}
                >
                  <Text style={styles.resetButtonText}>Сбросить</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Список пуст</Text>
            <Text style={styles.emptyText}>
              Добавьте расходники и запчасти, которые планируете купить для этого мотоцикла.
            </Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Ничего не найдено</Text>
            <Text style={styles.emptyText}>Измените статус-фильтр или поисковый запрос.</Text>
          </View>
        ) : (
          <View style={styles.groups}>
            {groups.map((group) => {
              const isCollapsed =
                Boolean(collapsedGroups[group.status]) &&
                statusFilter === "ALL" &&
                !normalizedSearchQuery;
              const visibleCount = visibleCountByStatus[group.status] ?? INITIAL_VISIBLE_COUNT;
              const visibleItems = isCollapsed ? [] : group.items.slice(0, visibleCount);
              const hiddenCount = Math.max(0, group.items.length - visibleItems.length);
              return (
              <View key={group.status} style={styles.group}>
                <Pressable
                  onPress={() =>
                    setCollapsedGroups((prev) => ({
                      ...prev,
                      [group.status]: !prev[group.status],
                    }))
                  }
                  style={styles.groupHeader}
                >
                  <Text style={styles.groupTitle}>
                    {group.sectionTitleRu} · {group.items.length}
                  </Text>
                  <Text style={styles.groupToggle}>{isCollapsed ? "Развернуть" : "Свернуть"}</Text>
                </Pressable>
                {isCollapsed ? (
                  <Pressable
                    onPress={() =>
                      setCollapsedGroups((prev) => ({
                        ...prev,
                        [group.status]: false,
                      }))
                    }
                    style={({ pressed }) => [
                      styles.collapsedBox,
                      pressed && styles.collapsedBoxPressed,
                    ]}
                  >
                    <Text style={styles.collapsedText}>
                      Группа свернута. Позиций: {group.items.length}. Нажмите, чтобы развернуть.
                    </Text>
                  </Pressable>
                ) : null}
                {visibleItems.map((item) => {
                  const isBusy = busyId === item.id;
                  const isHighlighted = highlightedWishlistItemId === item.id;
                  const serviceEventId =
                    item.status === "INSTALLED"
                      ? serviceEventIdByWishlistItemId.get(item.id)
                      : null;
                  return (
                    <View
                      key={item.id}
                      onLayout={(event) => {
                        itemYByIdRef.current[item.id] = event.nativeEvent.layout.y;
                      }}
                      style={[styles.card, isHighlighted && styles.cardHighlighted]}
                    >
                      <Pressable
                        onPress={() => router.push(`/vehicles/${vehicleId}/wishlist/${item.id}`)}
                        disabled={isBusy}
                      >
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        {item.sku ? (
                          <View style={styles.skuBlock}>
                            <Text style={styles.skuPrimary}>
                              {getWishlistItemSkuDisplayLines(item.sku).primaryLine}
                            </Text>
                            <Text style={styles.skuSecondary}>
                              {getWishlistItemSkuDisplayLines(item.sku).secondaryLine}
                            </Text>
                          </View>
                        ) : null}
                        {item.node ? (
                          <Text style={styles.itemNode}>Узел: {item.node.name}</Text>
                        ) : null}
                        {item.costLabelRu ? (
                          <Text style={styles.itemCost}>Стоимость: {item.costLabelRu}</Text>
                        ) : null}
                        <Text style={styles.itemMeta}>Кол-во: {item.quantity}</Text>
                        {item.kitOriginLabelRu ? (
                          <Text style={styles.kitBadge}>{item.kitOriginLabelRu}</Text>
                        ) : null}
                        {item.commentBodyRu ? (
                          <Text style={styles.itemMeta}>{item.commentBodyRu}</Text>
                        ) : null}
                      </Pressable>
                      <View style={styles.cardActions}>
                        {serviceEventId ? (
                          <Pressable
                            onPress={() => router.push(buildVehicleServiceLogEventHref(vehicleId, serviceEventId))}
                            disabled={isBusy}
                            style={({ pressed }) => [
                              styles.journalBtn,
                              pressed && !isBusy && styles.statusBtnPressed,
                            ]}
                          >
                            <Text style={styles.journalBtnText}>В журнал</Text>
                          </Pressable>
                        ) : null}
                        {item.status !== "INSTALLED" ? (
                          <Pressable
                            onPress={() => confirmCreateExpense(item)}
                            disabled={isBusy}
                            style={({ pressed }) => [
                              styles.expenseBtn,
                              pressed && !isBusy && styles.statusBtnPressed,
                            ]}
                          >
                            <Text style={styles.expenseBtnText}>В расходы</Text>
                          </Pressable>
                        ) : null}
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
                        <ActionIconButton
                          onPress={() => confirmDelete(item)}
                          disabled={isBusy}
                          accessibilityLabel="Удалить позицию"
                          variant="danger"
                          icon={<MaterialIcons name="delete-outline" size={16} color={c.error} />}
                        />
                      </View>
                      {isBusy ? (
                        <View style={styles.busyRow}>
                          <ActivityIndicator size="small" color={c.textMuted} />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                {!isCollapsed && hiddenCount > 0 ? (
                  <Pressable
                    onPress={() =>
                      setVisibleCountByStatus((prev) => ({
                        ...prev,
                        [group.status]:
                          (prev[group.status] ?? INITIAL_VISIBLE_COUNT) + VISIBLE_INCREMENT,
                      }))
                    }
                    style={styles.showMoreButton}
                  >
                    <Text style={styles.showMoreText}>
                      Показать ещё {Math.min(VISIBLE_INCREMENT, hiddenCount)}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas },
  scroll: { padding: 16, paddingBottom: 32 },
  sectionHint: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 17,
    marginBottom: 14,
  },
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
  addPrimaryText: { color: c.onPrimaryAction, fontSize: 16, fontWeight: "700" },
  filterPanel: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 14,
    backgroundColor: c.cardMuted,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  filterChips: { flexDirection: "row", gap: 8, paddingRight: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: c.cardSubtle,
  },
  filterChipActive: {
    backgroundColor: c.primaryAction,
    borderColor: c.primaryAction,
  },
  filterChipText: { color: c.textPrimary, fontSize: 12, fontWeight: "700" },
  filterChipTextActive: { color: c.onPrimaryAction },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  searchInput: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 12,
    backgroundColor: c.cardSubtle,
    color: c.textPrimary,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  resetButton: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: c.cardSubtle,
  },
  resetButtonText: { color: c.textSecondary, fontSize: 12, fontWeight: "700" },
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
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: c.textMuted,
    textTransform: "uppercase",
  },
  groupToggle: { color: c.textSecondary, fontSize: 12, fontWeight: "700" },
  collapsedBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.borderStrong,
    borderRadius: 14,
    padding: 12,
    backgroundColor: c.cardMuted,
  },
  collapsedBoxPressed: { opacity: 0.88 },
  collapsedText: { color: c.textSecondary, fontSize: 13 },
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: c.card,
  },
  cardHighlighted: {
    borderColor: c.primaryAction,
    shadowColor: c.primaryAction,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  itemTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  skuBlock: {
    marginTop: 8,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
  },
  skuPrimary: { fontSize: 12, fontWeight: "600", color: c.textPrimary },
  skuSecondary: { marginTop: 2, fontSize: 11, color: c.textMuted, lineHeight: 15 },
  itemNode: { marginTop: 6, fontSize: 13, color: c.textSecondary },
  itemCost: { marginTop: 4, fontSize: 13, color: c.textSecondary },
  itemMeta: { marginTop: 4, fontSize: 13, color: c.textMuted, lineHeight: 18 },
  kitBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "600",
    color: c.serviceBadgeText,
    backgroundColor: c.serviceBadgeBg,
  },
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
  journalBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardSubtle,
  },
  journalBtnText: { fontSize: 13, fontWeight: "700", color: c.textPrimary },
  expenseBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.primaryAction,
    backgroundColor: c.cardSubtle,
  },
  expenseBtnText: { fontSize: 13, fontWeight: "800", color: c.primaryAction },
  showMoreButton: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.borderStrong,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: c.cardSubtle,
  },
  showMoreText: { color: c.textPrimary, fontSize: 13, fontWeight: "700" },
  busyRow: { marginTop: 8, alignItems: "flex-start" },
});
