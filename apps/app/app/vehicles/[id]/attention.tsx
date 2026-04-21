import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  buildAttentionSummaryFromNodeTree,
  buildNodeTreeItemViewModel,
  canOpenNodeStatusExplanationModal,
  createServiceLogNodeFilter,
  filterAttentionItemsBySnooze,
  findNodeTreeItemById,
  formatSnoozeUntilLabel,
  getAttentionSnoozeFilterLabel,
  groupAttentionItemsByStatus,
  isNodeSnoozed,
} from "@mototwin/domain";
import type {
  AttentionItemViewModel,
  AttentionSnoozeFilter,
  NodeTreeItem,
  NodeTreeItemViewModel,
} from "@mototwin/types";
import { productSemanticColors as c, statusSemanticTokens } from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../../../src/api-base-url";
import { readNodeSnoozePreferences, writeNodeSnoozePreference } from "../../../src/ui-node-snooze-preferences";
import { buildVehicleServiceLogHref } from "./service-log";
import { buildVehicleWishlistNewHref } from "./wishlist/hrefs";
import { StatusExplanationModal } from "./status-explanation-modal";
import { ActionIconButton } from "../../components/action-icon-button";

export default function AttentionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";

  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusExplanationNode, setStatusExplanationNode] =
    useState<NodeTreeItemViewModel | null>(null);
  const [nodeSnoozeByNodeId, setNodeSnoozeByNodeId] = useState<Record<string, string | null>>({});
  const [snoozeFilter, setSnoozeFilter] = useState<AttentionSnoozeFilter>("all");

  const apiBaseUrl = getApiBaseUrl();

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
      const data = await endpoints.getNodeTree(vehicleId);
      setNodeTree(data.nodeTree ?? []);
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить дерево узлов.");
      setNodeTree([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const summary = useMemo(
    () => buildAttentionSummaryFromNodeTree(nodeTree),
    [nodeTree]
  );
  const filteredItems = useMemo(
    () =>
      filterAttentionItemsBySnooze(
        summary.items,
        snoozeFilter,
        (nodeId) => nodeSnoozeByNodeId[nodeId] ?? null
      ),
    [summary.items, snoozeFilter, nodeSnoozeByNodeId]
  );
  const filteredGroups = useMemo(
    () => groupAttentionItemsByStatus(filteredItems),
    [filteredItems]
  );
  const emptyStateText =
    snoozeFilter === "unsnoozed"
      ? "Нет активных узлов без отложенного напоминания"
      : snoozeFilter === "snoozed"
        ? "Нет отложенных узлов"
        : "Нет узлов, требующих внимания";
  useFocusEffect(
    useCallback(() => {
      if (!vehicleId || summary.items.length === 0) {
        setNodeSnoozeByNodeId({});
        return;
      }
      const nodeIds = summary.items.map((item) => item.nodeId);
      let isCancelled = false;
      void (async () => {
        const loaded = await readNodeSnoozePreferences(vehicleId, nodeIds);
        const normalized: Record<string, string | null> = {};
        for (const nodeId of nodeIds) {
          const value = loaded[nodeId] ?? null;
          if (isNodeSnoozed(value)) {
            normalized[nodeId] = value;
            continue;
          }
          normalized[nodeId] = null;
          if (value) {
            await writeNodeSnoozePreference(vehicleId, nodeId, null);
          }
        }
        if (!isCancelled) {
          setNodeSnoozeByNodeId(normalized);
        }
      })();
      return () => {
        isCancelled = true;
      };
    }, [vehicleId, summary.items])
  );

  const openServiceLogForItem = (item: AttentionItemViewModel) => {
    const raw = findNodeTreeItemById(nodeTree, item.nodeId);
    if (!raw) {
      return;
    }
    const filter = createServiceLogNodeFilter(raw);
    router.push(buildVehicleServiceLogHref(vehicleId, filter, false));
  };

  const openAddServiceForItem = (item: AttentionItemViewModel) => {
    if (!item.canAddServiceEvent) {
      return;
    }
    router.push(
      `/vehicles/${vehicleId}/service-events/new?nodeId=${encodeURIComponent(item.nodeId)}&source=attention`
    );
  };

  const openWishlistForItem = (item: AttentionItemViewModel) => {
    router.push(buildVehicleWishlistNewHref(vehicleId, item.nodeId));
  };
  const openNodeContextForItem = (item: AttentionItemViewModel) => {
    router.push(`/vehicles/${vehicleId}?nodeContextId=${encodeURIComponent(item.nodeId)}`);
  };

  const openStatusExplanationForItem = (item: AttentionItemViewModel) => {
    if (!item.canOpenStatusExplanation) {
      return;
    }
    const raw = findNodeTreeItemById(nodeTree, item.nodeId);
    if (!raw) {
      return;
    }
    const vm = buildNodeTreeItemViewModel(raw);
    if (!canOpenNodeStatusExplanationModal(vm)) {
      return;
    }
    setStatusExplanationNode(vm);
  };

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
          style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
        >
          <Text style={styles.retryText}>Повторить</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusExplanationModal
        visible={Boolean(statusExplanationNode?.statusExplanation)}
        node={statusExplanationNode}
        onClose={() => setStatusExplanationNode(null)}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.summaryLine}>
          Всего: <Text style={styles.summaryStrong}>{summary.totalCount}</Text>
          {summary.overdueCount > 0 ? (
            <Text style={styles.summaryLine}>
              {" · Просрочено: "}
              <Text style={styles.summaryStrong}>{summary.overdueCount}</Text>
            </Text>
          ) : null}
          {summary.soonCount > 0 ? (
            <Text style={styles.summaryLine}>
              {" · Скоро: "}
              <Text style={styles.summaryStrong}>{summary.soonCount}</Text>
            </Text>
          ) : null}
        </Text>

        {summary.totalCount > 0 ? (
          <View style={styles.filterRow}>
            {(["all", "unsnoozed", "snoozed"] as AttentionSnoozeFilter[]).map((filter) => {
              const isActive = snoozeFilter === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setSnoozeFilter(filter)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    isActive && styles.filterChipActive,
                    pressed && styles.filterChipPressed,
                  ]}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {getAttentionSnoozeFilterLabel(filter)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {filteredItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{emptyStateText}</Text>
          </View>
        ) : (
          <View style={styles.groups}>
            {filteredGroups.map((group) => (
              <View key={group.status} style={styles.group}>
                <Text style={styles.groupTitle}>{group.sectionTitleRu}</Text>
                {group.items.map((item) => {
                  const tok =
                    item.effectiveStatus === "OVERDUE"
                      ? statusSemanticTokens.OVERDUE
                      : statusSemanticTokens.SOON;
                  const explLabel = item.shortExplanation;
                  const snoozeLabel = formatSnoozeUntilLabel(nodeSnoozeByNodeId[item.nodeId] ?? null);
                  return (
                    <View key={item.nodeId} style={styles.card}>
                      {item.topLevelParentName ? (
                        <Text style={styles.parentHint}>
                          Раздел: {item.topLevelParentName}
                        </Text>
                      ) : null}
                      <View style={styles.cardHeader}>
                        <Text style={styles.nodeName}>{item.name}</Text>
                        <View style={[styles.badge, { borderColor: tok.border, backgroundColor: tok.background }]}>
                          <Text style={[styles.badgeText, { color: tok.foreground }]}>
                            {item.statusLabelRu}
                          </Text>
                        </View>
                      </View>
                      {explLabel && item.canOpenStatusExplanation ? (
                        <Pressable
                          onPress={() => openStatusExplanationForItem(item)}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel="Пояснение расчёта статуса"
                        >
                          <Text style={styles.shortExplLink}>{explLabel}</Text>
                        </Pressable>
                      ) : explLabel ? (
                        <Text style={styles.shortExpl}>{explLabel}</Text>
                      ) : null}
                      {snoozeLabel ? <Text style={styles.snoozeLabel}>{snoozeLabel}</Text> : null}

                      <View style={styles.actions}>
                        <ActionIconButton
                          onPress={() => openServiceLogForItem(item)}
                          accessibilityLabel="Журнал по узлу"
                          variant="subtle"
                          icon={<MaterialIcons name="history" size={16} color={c.textPrimary} />}
                        />
                        {item.canAddServiceEvent ? (
                          <ActionIconButton
                            onPress={() => openAddServiceForItem(item)}
                            accessibilityLabel="Добавить сервисное событие"
                            icon={<MaterialIcons name="build-circle" size={16} color={c.textPrimary} />}
                          />
                        ) : null}
                        <ActionIconButton
                          onPress={() => openWishlistForItem(item)}
                          accessibilityLabel="Добавить в список покупок"
                          icon={<MaterialIcons name="shopping-cart" size={16} color={c.textPrimary} />}
                        />
                        <ActionIconButton
                          onPress={() => openNodeContextForItem(item)}
                          accessibilityLabel="Открыть контекст узла"
                          variant="subtle"
                          icon={<MaterialIcons name="open-in-new" size={16} color={c.textPrimary} />}
                        />
                      </View>
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
  retryBtnPressed: { opacity: 0.9 },
  retryText: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
  summaryLine: { fontSize: 14, color: c.textSecondary, marginBottom: 12 },
  summaryStrong: { fontWeight: "700", color: c.textPrimary },
  emptyBox: {
    marginTop: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.border,
    borderRadius: 14,
    padding: 24,
    backgroundColor: c.cardMuted,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, color: c.textMuted, textAlign: "center" },
  groups: { gap: 20 },
  group: { gap: 10 },
  groupTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: c.textMuted,
    textTransform: "uppercase",
  },
  filterRow: { marginBottom: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: c.card,
  },
  filterChipActive: {
    borderColor: c.textPrimary,
    backgroundColor: c.textPrimary,
  },
  filterChipPressed: { opacity: 0.88 },
  filterChipText: { fontSize: 12, fontWeight: "600", color: c.textPrimary },
  filterChipTextActive: { color: c.textInverse },
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: c.card,
  },
  parentHint: { fontSize: 12, color: c.textMuted },
  cardHeader: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  nodeName: { fontSize: 16, fontWeight: "700", color: c.textPrimary, flex: 1, minWidth: 120 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  shortExpl: { marginTop: 8, fontSize: 14, color: c.textSecondary, lineHeight: 20 },
  snoozeLabel: { marginTop: 8, fontSize: 12, fontWeight: "600", color: c.textSecondary },
  shortExplLink: {
    marginTop: 8,
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
    textDecorationLine: "underline",
  },
  actions: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtnPressed: { opacity: 0.88 },
});
