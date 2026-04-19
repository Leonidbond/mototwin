import { useCallback, useEffect, useMemo, useState } from "react";
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
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  buildAttentionActionViewModel,
  buildAttentionSummaryFromNodeTree,
  buildExpenseSummaryFromServiceEvents,
  buildNodeTreeSectionProps,
  buildRideProfileViewModel,
  buildVehicleDetailViewModel,
  buildVehicleStateViewModel,
  buildVehicleTechnicalInfoViewModel,
  canOpenNodeStatusExplanationModal,
  createServiceLogNodeFilter,
  findNodeTreeItemById,
  formatExpenseAmountRu,
  formatIsoCalendarDateRu,
} from "@mototwin/domain";
import type {
  NodeStatus,
  NodeTreeItem,
  NodeTreeItemProps,
  NodeTreeItemViewModel,
  ServiceEventItem,
  VehicleDetail,
} from "@mototwin/types";
import { productSemanticColors as c, statusSemanticTokens } from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../../../src/api-base-url";
import {
  readCollapsiblePreference,
  writeCollapsiblePreference,
} from "../../../src/ui-collapsible-preferences";
import { buildVehicleServiceLogHref } from "./service-log";
import { buildVehicleWishlistNewHref } from "./wishlist/hrefs";
import { StatusExplanationModal } from "./status-explanation-modal";

function getStatusColors(status: NodeStatus | null) {
  const tokens = status ? statusSemanticTokens[status] : statusSemanticTokens.UNKNOWN;
  return { bg: tokens.background, text: tokens.foreground, border: tokens.border };
}

function getNodeAccentColor(status: NodeStatus | null) {
  const tokens = status ? statusSemanticTokens[status] : statusSemanticTokens.UNKNOWN;
  return tokens.accent;
}

// ─── Expandable node row ──────────────────────────────────────────────────────

type NodeRowProps = {
  node: NodeTreeItemViewModel;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onAddFromLeaf: (leafNodeId: string) => void;
  onAddToWishlist?: (nodeId: string) => void;
  onOpenStatusExplanation?: (node: NodeTreeItemViewModel) => void;
  onOpenServiceLogForNode?: (node: NodeTreeItemViewModel) => void;
};

function NodeRow({
  node,
  depth,
  expandedIds,
  onToggle,
  onAddFromLeaf,
  onAddToWishlist,
  onOpenStatusExplanation,
  onOpenServiceLogForNode,
}: NodeRowProps) {
  const treeItemContract: NodeTreeItemProps = {
    item: node,
    depth,
    isExpanded: expandedIds.has(node.id),
    onToggleExpand: () => onToggle(node.id),
    onRequestAddServiceEvent: node.canAddServiceEvent
      ? () => onAddFromLeaf(node.id)
      : undefined,
  };
  const rowNode = treeItemContract.item;
  const hasChildren = rowNode.hasChildren;
  const isExpanded = treeItemContract.isExpanded;
  const status = rowNode.effectiveStatus as NodeStatus | null;
  const colors = getStatusColors(status);
  const label = rowNode.statusLabel;
  const reasonShort = rowNode.shortExplanationLabel;
  const indent = 12 + depth * 14;
  const accentColor = getNodeAccentColor(status);
  const isTopLevel = depth === 0;
  const badgeStyle = !isTopLevel ? styles.badgeNested : undefined;
  const badgeTextStyle = !isTopLevel ? styles.badgeTextNested : undefined;

  return (
    <View style={styles.nodeContainer}>
      <Pressable
        onPress={() => hasChildren && treeItemContract.onToggleExpand()}
        style={({ pressed }) => [
          styles.nodeRow,
          { paddingLeft: indent },
          isTopLevel && styles.nodeRowTopLevel,
          depth > 0 && styles.nodeRowNested,
          accentColor !== "transparent" && { borderLeftColor: accentColor, borderLeftWidth: 3 },
          pressed && hasChildren && styles.nodeRowPressed,
        ]}
      >
        <View style={styles.nodeRowLeft}>
          <View style={styles.chevronWrap}>
            {hasChildren ? (
              <Text style={styles.chevron}>{isExpanded ? "▾" : "▸"}</Text>
            ) : (
              <View style={styles.chevronPlaceholder} />
            )}
          </View>
          <View style={styles.nodeNameBlock}>
            <Text style={[styles.nodeName, depth === 0 && styles.nodeNameTop]}>
              {rowNode.name}
            </Text>
            {reasonShort &&
            canOpenNodeStatusExplanationModal(rowNode) &&
            onOpenStatusExplanation ? (
              <Pressable
                onPress={() => onOpenStatusExplanation(rowNode)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Пояснение расчёта статуса"
              >
                <Text style={[styles.reasonShort, styles.reasonShortLink]}>{reasonShort}</Text>
              </Pressable>
            ) : reasonShort ? (
              <Text style={styles.reasonShort}>{reasonShort}</Text>
            ) : null}
          </View>
        </View>

        {label ? (
          onOpenServiceLogForNode ? (
            <Pressable
              onPress={() => onOpenServiceLogForNode(rowNode)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Журнал обслуживания по узлу ${rowNode.name}`}
              style={({ pressed }) => [
                styles.badge,
                badgeStyle,
                { backgroundColor: colors.bg, borderColor: colors.border },
                pressed && styles.badgePressed,
              ]}
            >
              <Text style={[styles.badgeText, badgeTextStyle, { color: colors.text }]}>
                {label}
              </Text>
            </Pressable>
          ) : (
            <View
              style={[
                styles.badge,
                badgeStyle,
                { backgroundColor: colors.bg, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.badgeText, badgeTextStyle, { color: colors.text }]}>
                {label}
              </Text>
            </View>
          )
        ) : (
          <View style={styles.badgeEmpty} />
        )}

        <View style={styles.nodeRowActions}>
          {onAddToWishlist ? (
            <Pressable
              onPress={() => onAddToWishlist(rowNode.id)}
              style={({ pressed }) => [
                styles.wishlistTreeButton,
                pressed && styles.wishlistTreeButtonPressed,
              ]}
              hitSlop={6}
            >
              <Text style={styles.wishlistTreeButtonText}>В список</Text>
            </Pressable>
          ) : null}
          {rowNode.canAddServiceEvent ? (
            <Pressable
              onPress={() => treeItemContract.onRequestAddServiceEvent?.()}
              style={({ pressed }) => [styles.addLeafButton, pressed && styles.addLeafButtonPressed]}
              hitSlop={8}
            >
              <Text style={styles.addLeafButtonText}>+</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>

      {hasChildren && isExpanded
        ? rowNode.children.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onAddFromLeaf={onAddFromLeaf}
              onAddToWishlist={onAddToWishlist}
              onOpenStatusExplanation={onOpenStatusExplanation}
              onOpenServiceLogForNode={onOpenServiceLogForNode}
            />
          ))
        : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VehicleDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [nodeTreeError, setNodeTreeError] = useState("");
  const [isNodeTreeLoading, setIsNodeTreeLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isRideProfileExpanded, setIsRideProfileExpanded] = useState(true);
  const [isTechnicalExpanded, setIsTechnicalExpanded] = useState(true);
  const [hasLoadedCollapsePrefs, setHasLoadedCollapsePrefs] = useState(false);
  const [isExpenseExpanded, setIsExpenseExpanded] = useState(false);
  const [statusExplanationNode, setStatusExplanationNode] =
    useState<NodeTreeItemViewModel | null>(null);
  const [serviceEvents, setServiceEvents] = useState<ServiceEventItem[]>([]);
  const [serviceEventsError, setServiceEventsError] = useState("");

  const apiBaseUrl = getApiBaseUrl();

  const load = useCallback(async () => {
    if (!vehicleId) {
      setError("Не удалось определить ID мотоцикла.");
      setIsLoading(false);
      return;
    }

    const client = createApiClient({ baseUrl: apiBaseUrl });
    const endpoints = createMotoTwinEndpoints(client);

    setIsLoading(true);
    setError("");
    setNodeTreeError("");
    setServiceEvents([]);
    setServiceEventsError("");

    try {
      const detailData = await endpoints.getVehicleDetail(vehicleId);
      setVehicle(detailData.vehicle ?? null);
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить данные мотоцикла.");
      setVehicle(null);
      setNodeTree([]);
      setServiceEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    setIsNodeTreeLoading(true);
    const [nodesResult, eventsResult] = await Promise.allSettled([
      endpoints.getNodeTree(vehicleId),
      endpoints.getServiceEvents(vehicleId),
    ]);

    if (nodesResult.status === "fulfilled") {
      setNodeTree(nodesResult.value.nodeTree ?? []);
      setNodeTreeError("");
    } else {
      console.error(nodesResult.reason);
      setNodeTreeError("Не удалось загрузить дерево узлов.");
      setNodeTree([]);
    }

    if (eventsResult.status === "fulfilled") {
      setServiceEvents(eventsResult.value.serviceEvents ?? []);
      setServiceEventsError("");
    } else {
      console.error(eventsResult.reason);
      setServiceEvents([]);
      setServiceEventsError("Не удалось загрузить журнал.");
    }

    setIsNodeTreeLoading(false);
  }, [apiBaseUrl, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!vehicleId) return;
    void (async () => {
      const usage = await readCollapsiblePreference(
        `vehicleDetail.${vehicleId}.usageProfile.expanded`
      );
      const technical = await readCollapsiblePreference(
        `vehicleDetail.${vehicleId}.technicalSummary.expanded`
      );
      setIsRideProfileExpanded(usage ?? true);
      setIsTechnicalExpanded(technical ?? true);
      setHasLoadedCollapsePrefs(true);
    })();
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId || !hasLoadedCollapsePrefs) return;
    void writeCollapsiblePreference(
      `vehicleDetail.${vehicleId}.usageProfile.expanded`,
      isRideProfileExpanded
    );
  }, [vehicleId, hasLoadedCollapsePrefs, isRideProfileExpanded]);

  useEffect(() => {
    if (!vehicleId || !hasLoadedCollapsePrefs) return;
    void writeCollapsiblePreference(
      `vehicleDetail.${vehicleId}.technicalSummary.expanded`,
      isTechnicalExpanded
    );
  }, [vehicleId, hasLoadedCollapsePrefs, isTechnicalExpanded]);

  const { roots: nodeTreeViewModel } = useMemo(
    () => buildNodeTreeSectionProps(nodeTree),
    [nodeTree]
  );

  const expenseSummary = useMemo(
    () => buildExpenseSummaryFromServiceEvents(serviceEvents),
    [serviceEvents]
  );

  const attentionSummary = useMemo(
    () => buildAttentionSummaryFromNodeTree(nodeTree),
    [nodeTree]
  );

  const attentionAction = useMemo(
    () => buildAttentionActionViewModel(attentionSummary),
    [attentionSummary]
  );
  const attentionTok = statusSemanticTokens[attentionAction.semanticKey];
  const attentionBadgeBg =
    attentionAction.totalCount > 0 && attentionTok.accent !== "transparent"
      ? attentionTok.accent
      : c.divider;

  function toggleNode(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const openServiceLogForTreeNode = useCallback(
    (vm: NodeTreeItemViewModel) => {
      const raw = findNodeTreeItemById(nodeTree, vm.id);
      if (!raw) {
        return;
      }
      const filter = createServiceLogNodeFilter(raw);
      router.push(buildVehicleServiceLogHref(vehicleId, filter, false));
    },
    [nodeTree, router, vehicleId]
  );

  const openWishlistForTreeNode = useCallback(
    (nodeId: string) => {
      router.push(buildVehicleWishlistNewHref(vehicleId, nodeId));
    },
    [router, vehicleId]
  );

  const hasNickname = Boolean(vehicle?.nickname?.trim());

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={c.textPrimary} />
          <Text style={styles.stateText}>Загрузка мотоцикла...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Ошибка загрузки</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Мотоцикл не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  const detailViewModel = buildVehicleDetailViewModel(vehicle);
  const stateViewModel = buildVehicleStateViewModel({
    odometer: vehicle.odometer,
    engineHours: vehicle.engineHours,
  });
  const rideProfileViewModel = buildRideProfileViewModel(vehicle.rideProfile);
  const technicalInfoViewModel = buildVehicleTechnicalInfoViewModel({
    modelVariant: vehicle.modelVariant,
  });
  const hasTechnicalInfo = technicalInfoViewModel.items.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusExplanationModal
        visible={Boolean(statusExplanationNode?.statusExplanation)}
        node={statusExplanationNode}
        onClose={() => setStatusExplanationNode(null)}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Identity + state card */}
        <View style={styles.infoCard}>
          {hasNickname ? (
            <Text style={styles.eyebrow}>Никнейм</Text>
          ) : (
            <Text style={styles.eyebrow}>Мотоцикл</Text>
          )}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{detailViewModel.displayName}</Text>
            <Pressable
              onPress={() => router.push(`/vehicles/${vehicleId}/attention`)}
              style={({ pressed }) => [
                styles.attentionPill,
                {
                  borderColor: attentionTok.border,
                  backgroundColor: attentionTok.background,
                },
                pressed && styles.attentionPillPressed,
              ]}
            >
              <Text style={[styles.attentionPillText, { color: attentionTok.foreground }]}>
                Требует внимания
              </Text>
              <View style={[styles.attentionCountBadge, { backgroundColor: attentionBadgeBg }]}>
                <Text
                  style={[
                    styles.attentionCountText,
                    attentionAction.totalCount > 0
                      ? { color: attentionTok.foreground }
                      : styles.attentionCountTextNeutral,
                  ]}
                >
                  {attentionSummary.totalCount}
                </Text>
              </View>
            </Pressable>
          </View>
          <Text style={styles.brandModel}>
            {detailViewModel.brandModelLine}
          </Text>
          <Text style={styles.variantText}>{detailViewModel.yearVersionLine}</Text>

          <View style={styles.divider} />

          <View style={styles.stateHeaderRow}>
            <Text style={styles.stateHeading}>Текущее состояние</Text>
            <Pressable
              style={({ pressed }) => [styles.inlineActionButton, pressed && styles.inlineActionButtonPressed]}
              onPress={() => router.push(`/vehicles/${vehicleId}/state`)}
            >
              <Text style={styles.inlineActionButtonText}>Обновить</Text>
            </Pressable>
          </View>
          <View style={styles.stateMetricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Пробег</Text>
              <Text style={styles.metricValue}>{stateViewModel.odometerValue}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Моточасы</Text>
              <Text style={styles.metricValue}>{stateViewModel.engineHoursValue}</Text>
            </View>
          </View>
          <Row label="VIN" value={detailViewModel.vinLine} />
        </View>

        <View style={styles.secondarySectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Pressable
              style={({ pressed }) => [
                styles.sectionHeaderToggle,
                pressed && styles.sectionHeaderRowPressed,
              ]}
              onPress={() => setIsRideProfileExpanded((prev) => !prev)}
            >
              <Text style={styles.secondarySectionTitle}>Профиль эксплуатации</Text>
              <Text style={styles.sectionChevron}>{isRideProfileExpanded ? "▾" : "▸"}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.inlineActionButton,
                pressed && styles.inlineActionButtonPressed,
              ]}
              onPress={() => router.push(`/vehicles/${vehicleId}/profile`)}
            >
              <Text style={styles.inlineActionButtonText}>Редактировать</Text>
            </Pressable>
          </View>
          {isRideProfileExpanded ? (
            rideProfileViewModel ? (
              <View style={styles.secondarySectionGrid}>
                <SpecRow label="Сценарий" value={rideProfileViewModel.usageType} />
                <SpecRow label="Стиль" value={rideProfileViewModel.ridingStyle} />
                <SpecRow label="Нагрузка" value={rideProfileViewModel.loadType} />
                <SpecRow
                  label="Интенсивность"
                  value={rideProfileViewModel.usageIntensity}
                />
              </View>
            ) : (
              <Text style={styles.secondaryEmptyText}>Профиль эксплуатации пока не задан.</Text>
            )
          ) : null}
        </View>

        {hasTechnicalInfo ? (
          <View style={styles.secondarySectionCard}>
            <Pressable
              style={({ pressed }) => [
                styles.sectionHeaderToggle,
                pressed && styles.sectionHeaderRowPressed,
              ]}
              onPress={() => setIsTechnicalExpanded((prev) => !prev)}
            >
              <Text style={styles.secondarySectionTitle}>Техническая сводка</Text>
              <Text style={styles.sectionChevron}>{isTechnicalExpanded ? "▾" : "▸"}</Text>
            </Pressable>
            {isTechnicalExpanded ? (
              <View style={styles.secondarySectionGrid}>
                {technicalInfoViewModel.items.map((item) => (
                  <SpecRow key={item.label} label={item.label} value={item.value || "—"} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.expenseCard}>
          <Pressable
            style={({ pressed }) => [
              styles.expenseHeaderPressable,
              pressed && styles.expenseHeaderPressablePressed,
            ]}
            onPress={() => setIsExpenseExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpenseExpanded }}
          >
            <View style={styles.expenseHeaderTextCol}>
              <Text style={styles.expenseTitle}>Расходы на обслуживание</Text>
              <Text style={styles.expenseCollapsedMeta}>
                {isNodeTreeLoading
                  ? "Загрузка данных журнала…"
                  : serviceEventsError
                    ? "Не удалось загрузить расходы."
                    : expenseSummary.paidEventCount === 0
                      ? "Расходы пока не указаны"
                      : `${expenseSummary.paidEventCount} ${
                          expenseSummary.paidEventCount === 1
                            ? "запись с суммой"
                            : "записей с суммой"
                        }`}
              </Text>
            </View>
            <Text style={styles.sectionChevron}>{isExpenseExpanded ? "▾" : "▸"}</Text>
          </Pressable>
          {isExpenseExpanded ? (
            <>
              {expenseSummary.paidEventCount > 0 ? (
                <View style={styles.expenseExpandedActions}>
                  <Pressable
                    onPress={() =>
                      router.push(`/vehicles/${vehicleId}/service-log?paidOnly=1`)
                    }
                    style={({ pressed }) => [
                      styles.expenseDetailsLink,
                      pressed && styles.expenseDetailsLinkPressed,
                    ]}
                  >
                    <Text style={styles.expenseDetailsLinkText}>Детали расходов</Text>
                  </Pressable>
                </View>
              ) : null}
              <Text style={styles.expenseHint}>
                Сводка по стоимости в сервисных записях. Валюты не суммируются между собой.
              </Text>
              {serviceEventsError ? (
                <Text style={styles.expenseErrorText}>{serviceEventsError}</Text>
              ) : null}
              {isNodeTreeLoading ? (
                <Text style={styles.expenseMuted}>Загрузка данных журнала…</Text>
              ) : serviceEventsError ? null : expenseSummary.paidEventCount === 0 ? (
                <View style={styles.expenseEmptyBox}>
                  <Text style={styles.expenseEmptyTitle}>Расходы пока не указаны</Text>
                  <Text style={styles.expenseEmptyText}>
                    Добавьте сумму и валюту при создании сервисного события — здесь появятся итоги
                    по каждой валюте и за текущий месяц.
                  </Text>
                </View>
              ) : (
                <View style={styles.expenseBody}>
                  <View style={styles.expenseStatRow}>
                    <Text style={styles.expenseStatLabel}>Записей с суммой</Text>
                    <Text style={styles.expenseStatValue}>{expenseSummary.paidEventCount}</Text>
                  </View>
                  {expenseSummary.latestPaidEvent ? (
                    <View style={styles.expenseLatestBlock}>
                      <Text style={styles.expenseStatLabel}>Последняя оплаченная</Text>
                      <Text style={styles.expenseLatestMain}>
                        {formatIsoCalendarDateRu(expenseSummary.latestPaidEvent.eventDate)} ·{" "}
                        {expenseSummary.latestPaidEvent.serviceType}
                      </Text>
                      <Text style={styles.expenseLatestMeta}>
                        {formatExpenseAmountRu(expenseSummary.latestPaidEvent.totalAmount)}{" "}
                        {expenseSummary.latestPaidEvent.currency} ·{" "}
                        {expenseSummary.latestPaidEvent.nodeLabel}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.expenseSubheading}>Всего по валютам</Text>
                  {expenseSummary.totalsByCurrency.map((row) => (
                    <View key={row.currency} style={styles.expenseCurrencyRow}>
                      <Text style={styles.expenseCurrencyCode}>{row.currency}</Text>
                      <Text style={styles.expenseCurrencyAmount}>
                        {formatExpenseAmountRu(row.totalAmount)} {row.currency}
                        <Text style={styles.expenseCurrencyCount}>
                          {" "}
                          ({row.paidEventCount}{" "}
                          {row.paidEventCount === 1 ? "запись" : "записей"})
                        </Text>
                      </Text>
                    </View>
                  ))}
                  {expenseSummary.currentMonthTotalsByCurrency.length > 0 ? (
                    <View style={styles.expenseMonthBox}>
                      <Text style={styles.expenseMonthTitle}>
                        Текущий месяц ({expenseSummary.currentMonthLabel})
                      </Text>
                      {expenseSummary.currentMonthTotalsByCurrency.map((row) => (
                        <View key={row.currency} style={styles.expenseCurrencyRow}>
                          <Text style={styles.expenseCurrencyCode}>{row.currency}</Text>
                          <Text style={styles.expenseCurrencyAmount}>
                            {formatExpenseAmountRu(row.totalAmount)} {row.currency}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.expenseMuted}>
                      В {expenseSummary.currentMonthLabel} платных сервисных записей пока нет.
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : null}
        </View>

        <View style={styles.secondarySectionCard}>
          <Pressable
            style={({ pressed }) => [
              styles.sectionHeaderRow,
              pressed && styles.sectionHeaderRowPressed,
            ]}
            onPress={() => router.push(`/vehicles/${vehicleId}/wishlist`)}
          >
            <Text style={styles.secondarySectionTitle}>Что нужно купить</Text>
            <Text style={styles.sectionChevron}>›</Text>
          </Pressable>
          <Text style={styles.secondaryEmptyText}>
            Запчасти и расходники к покупке. В дереве ниже можно нажать «В список» у узла — узел
            подставится в форме.
          </Text>
        </View>

        {/* Node tree */}
        <View>
          <Text style={styles.sectionHeader}>Состояние узлов</Text>
          <Pressable
            style={({ pressed }) => [styles.sectionJournalButton, pressed && styles.sectionJournalButtonPressed]}
            onPress={() => router.push(`/vehicles/${vehicleId}/service-log`)}
          >
            <Text style={styles.sectionJournalButtonText}>Журнал обслуживания</Text>
          </Pressable>
          <Text style={styles.sectionSubheader}>
            Разверните нужный узел, чтобы проверить статус и быстро добавить обслуживание для
            leaf-элемента.
          </Text>
          {isNodeTreeLoading ? (
            <Text style={styles.treeLoadingText}>Загрузка дерева узлов...</Text>
          ) : null}
          {nodeTreeError ? (
            <View style={styles.treeErrorBox}>
              <Text style={styles.treeErrorText}>{nodeTreeError}</Text>
              <Pressable
                style={({ pressed }) => [styles.treeRetryButton, pressed && styles.treeRetryButtonPressed]}
                onPress={() => {
                  void load();
                }}
              >
                <Text style={styles.treeRetryButtonText}>Повторить</Text>
              </Pressable>
            </View>
          ) : null}
          {!isNodeTreeLoading && !nodeTreeError && nodeTree.length > 0 ? (
            <View style={styles.treeCard}>
              {nodeTreeViewModel.map((node, index) => (
                <View key={node.id}>
                  {index > 0 ? <View style={styles.treeDivider} /> : null}
                  <NodeRow
                    node={node}
                    depth={0}
                    expandedIds={expandedIds}
                    onToggle={toggleNode}
                    onAddFromLeaf={(leafNodeId) =>
                      router.push(
                        `/vehicles/${vehicleId}/service-events/new?source=tree&nodeId=${leafNodeId}`
                      )
                    }
                    onAddToWishlist={openWishlistForTreeNode}
                    onOpenStatusExplanation={setStatusExplanationNode}
                    onOpenServiceLogForNode={openServiceLogForTreeNode}
                  />
                </View>
              ))}
            </View>
          ) : null}
          {!isNodeTreeLoading && !nodeTreeError && nodeTree.length === 0 ? (
            <View style={styles.emptyNodes}>
              <Text style={styles.emptyNodesText}>Данные о состоянии узлов отсутствуют</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    color: c.textSecondary,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
    textAlign: "center",
  },
  errorText: {
    marginTop: 8,
    color: c.error,
    textAlign: "center",
    fontSize: 14,
  },

  // Info card
  infoCard: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: c.textMuted,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 22,
    fontWeight: "700",
    color: c.textPrimary,
  },
  attentionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  attentionPillPressed: {
    opacity: 0.9,
  },
  attentionPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  attentionCountBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  attentionCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  attentionCountTextNeutral: {
    color: c.textMuted,
  },
  brandModel: {
    marginTop: 4,
    fontSize: 14,
    color: c.textMuted,
  },
  variantText: {
    marginTop: 4,
    fontSize: 13,
    color: c.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: c.divider,
    marginVertical: 12,
  },
  stateHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textMeta,
    marginBottom: 8,
  },
  stateHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  inlineActionButton: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: c.card,
  },
  inlineActionButtonPressed: {
    backgroundColor: c.divider,
  },
  inlineActionButtonText: {
    fontSize: 12,
    color: c.textMeta,
    fontWeight: "600",
  },
  stateMetricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: c.textMuted,
  },
  metricValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 5,
  },
  rowLabel: {
    fontSize: 14,
    color: c.textMuted,
    flex: 1,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: c.textPrimary,
    flex: 1,
    textAlign: "right",
  },

  secondarySectionCard: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  secondarySectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionHeaderToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    marginRight: 8,
  },
  sectionHeaderRowPressed: {
    opacity: 0.92,
  },
  sectionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionChevron: {
    fontSize: 16,
    color: c.textMuted,
    width: 16,
    textAlign: "center",
  },
  secondarySectionGrid: {
    gap: 8,
  },
  secondaryEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
  },
  specRow: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    backgroundColor: c.chipBackground,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  specLabel: {
    fontSize: 12,
    color: c.textMuted,
  },
  specValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "600",
    color: c.textPrimary,
  },
  expenseCard: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  expenseHeaderPressable: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  expenseHeaderPressablePressed: {
    opacity: 0.92,
  },
  expenseHeaderTextCol: {
    flex: 1,
    minWidth: 0,
  },
  expenseCollapsedMeta: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
  },
  expenseExpandedActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  expenseDetailsLink: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.chipBackground,
  },
  expenseDetailsLinkPressed: {
    opacity: 0.92,
  },
  expenseDetailsLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textPrimary,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
  },
  expenseHint: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 16,
    color: c.textMuted,
  },
  expenseMuted: {
    marginTop: 10,
    fontSize: 13,
    color: c.textMuted,
  },
  expenseErrorText: {
    marginTop: 10,
    fontSize: 13,
    color: c.error,
  },
  expenseEmptyBox: {
    marginTop: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.cardMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  expenseEmptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: c.textPrimary,
  },
  expenseEmptyText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: c.textMuted,
  },
  expenseBody: {
    marginTop: 12,
    gap: 10,
  },
  expenseStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseStatLabel: {
    fontSize: 12,
    color: c.textMuted,
  },
  expenseStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
  },
  expenseLatestBlock: {
    marginTop: 4,
  },
  expenseLatestMain: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: c.textPrimary,
  },
  expenseLatestMeta: {
    marginTop: 4,
    fontSize: 12,
    color: c.textMuted,
  },
  expenseSubheading: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: c.textMuted,
    textTransform: "uppercase",
  },
  expenseCurrencyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 6,
  },
  expenseCurrencyCode: {
    fontSize: 14,
    color: c.textPrimary,
  },
  expenseCurrencyAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: c.textPrimary,
    textAlign: "right",
    flex: 1,
  },
  expenseCurrencyCount: {
    fontSize: 11,
    fontWeight: "400",
    color: c.textMuted,
  },
  expenseMonthBox: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: c.cardMuted,
    borderWidth: 1,
    borderColor: c.border,
  },
  expenseMonthTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: c.textSecondary,
  },
  // Section
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textMeta,
  },
  sectionJournalButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: c.primaryAction,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sectionJournalButtonPressed: {
    opacity: 0.9,
  },
  sectionJournalButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textInverse,
  },
  sectionSubheader: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
  },
  treeLoadingText: {
    marginBottom: 10,
    fontSize: 14,
    color: c.textMuted,
  },
  treeErrorBox: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.errorBorder,
    borderRadius: 12,
    backgroundColor: c.errorSurface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  treeErrorText: {
    fontSize: 14,
    color: c.error,
    lineHeight: 20,
  },
  treeRetryButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: c.card,
  },
  treeRetryButtonPressed: {
    backgroundColor: c.divider,
  },
  treeRetryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: c.textMeta,
  },

  // Tree card
  treeCard: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  treeDivider: {
    height: 1,
    backgroundColor: c.divider,
    marginLeft: 14,
  },

  // Node row
  nodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingRight: 14,
    minHeight: 52,
  },
  nodeContainer: {
    marginBottom: 2,
  },
  nodeRowTopLevel: {
    backgroundColor: c.card,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  nodeRowNested: {
    backgroundColor: c.chipBackground,
  },
  nodeRowPressed: {
    backgroundColor: c.divider,
  },
  nodeRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  chevronWrap: {
    width: 26,
    minHeight: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
  },
  chevron: {
    fontSize: 15,
    color: c.textMuted,
    width: 16,
    textAlign: "center",
  },
  chevronPlaceholder: {
    width: 16,
  },
  nodeNameBlock: {
    flex: 1,
  },
  nodeName: {
    fontSize: 14,
    color: c.textMeta,
    lineHeight: 20,
  },
  nodeNameTop: {
    fontSize: 15,
    fontWeight: "600",
    color: c.textPrimary,
  },
  reasonShort: {
    marginTop: 3,
    fontSize: 12,
    color: c.textTertiary,
    lineHeight: 16,
  },
  reasonShortLink: {
    color: c.textSecondary,
    textDecorationLine: "underline",
  },

  // Badge
  badge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: "center",
    flexShrink: 0,
  },
  badgeNested: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    opacity: 0.92,
  },
  badgePressed: {
    opacity: 0.88,
  },
  badgeEmpty: {
    width: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextNested: {
    fontSize: 10,
    fontWeight: "600",
  },
  nodeRowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    marginLeft: 6,
  },
  wishlistTreeButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.chipBackground,
  },
  wishlistTreeButtonPressed: {
    opacity: 0.88,
    backgroundColor: c.indigoSoftBg,
    borderColor: c.indigoSoftBorder,
  },
  wishlistTreeButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: c.textSecondary,
  },
  addLeafButton: {
    marginLeft: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addLeafButtonPressed: {
    backgroundColor: c.indigoSoftBg,
    borderColor: c.indigoSoftBorder,
  },
  addLeafButtonText: {
    color: c.textSecondary,
    fontSize: 16,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: -1,
  },

  // Empty
  emptyNodes: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyNodesText: {
    fontSize: 14,
    color: c.textTertiary,
  },
});
