import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  buildNodeTreeSectionProps,
  buildRideProfileViewModel,
  buildVehicleDetailViewModel,
  buildVehicleStateViewModel,
  buildVehicleTechnicalInfoViewModel,
  canOpenNodeStatusExplanationModal,
  createServiceLogNodeFilter,
  findNodeTreeItemById,
  formatIsoCalendarDateRu,
  getStatusExplanationTriggeredByLabel,
} from "@mototwin/domain";
import type {
  NodeStatus,
  NodeTreeItem,
  NodeTreeItemProps,
  NodeTreeItemViewModel,
  VehicleDetail,
} from "@mototwin/types";
import { productSemanticColors as c, statusSemanticTokens } from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../../../src/api-base-url";

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
  onOpenStatusExplanation?: (node: NodeTreeItemViewModel) => void;
  onOpenServiceLogForNode?: (node: NodeTreeItemViewModel) => void;
};

function NodeRow({
  node,
  depth,
  expandedIds,
  onToggle,
  onAddFromLeaf,
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

        {rowNode.canAddServiceEvent ? (
          <Pressable
            onPress={() => treeItemContract.onRequestAddServiceEvent?.()}
            style={({ pressed }) => [styles.addLeafButton, pressed && styles.addLeafButtonPressed]}
            hitSlop={8}
          >
            <Text style={styles.addLeafButtonText}>+</Text>
          </Pressable>
        ) : null}
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
              onOpenStatusExplanation={onOpenStatusExplanation}
              onOpenServiceLogForNode={onOpenServiceLogForNode}
            />
          ))
        : null}
    </View>
  );
}

function StatusExplanationModal(props: {
  visible: boolean;
  node: NodeTreeItemViewModel | null;
  onClose: () => void;
}) {
  const { visible, node, onClose } = props;
  if (!visible) {
    return null;
  }
  const ex = node?.statusExplanation;
  if (!node || !ex) {
    return null;
  }

  const showKmRow =
    ex.current.odometer !== null ||
    ex.lastService?.odometer !== null ||
    ex.rule?.intervalKm !== null ||
    ex.rule?.warningKm !== null ||
    ex.usage?.elapsedKm !== null ||
    ex.usage?.remainingKm !== null;

  const showHoursRow =
    ex.current.engineHours !== null ||
    ex.lastService?.engineHours !== null ||
    ex.rule?.intervalHours !== null ||
    ex.rule?.warningHours !== null ||
    ex.usage?.elapsedHours !== null ||
    ex.usage?.remainingHours !== null;

  const showDaysRow =
    ex.rule?.intervalDays !== null ||
    ex.rule?.warningDays !== null ||
    ex.usage?.elapsedDays !== null ||
    ex.usage?.remainingDays !== null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} accessibilityLabel="Закрыть" />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Пояснение расчета: {node.name}</Text>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            {ex.reasonShort ? (
              <View style={styles.modalBlock}>
                <Text style={styles.modalKicker}>Кратко</Text>
                <Text style={styles.modalEmphasis}>{ex.reasonShort}</Text>
              </View>
            ) : null}
            {ex.reasonDetailed ? (
              <View style={styles.modalBlock}>
                <Text style={styles.modalKicker}>Подробно</Text>
                <Text style={styles.modalBody}>{ex.reasonDetailed}</Text>
              </View>
            ) : null}
            {ex.triggeredBy ? (
              <View style={styles.modalBlock}>
                <Text style={styles.modalKicker}>Сработавшее измерение</Text>
                <Text style={styles.modalBody}>
                  {getStatusExplanationTriggeredByLabel(ex.triggeredBy)}
                </Text>
              </View>
            ) : null}

            <Text style={styles.modalKicker}>Детали расчета</Text>
            {showKmRow ? (
              <View style={styles.modalTableBlock}>
                <Text style={styles.modalTableTitle}>Пробег</Text>
                <Text style={styles.modalMono}>
                  Текущее:{" "}
                  {ex.current.odometer !== null ? `${ex.current.odometer} км` : "—"}
                  {"\n"}
                  Последний сервис:{" "}
                  {ex.lastService?.odometer != null
                    ? `${ex.lastService.odometer} км`
                    : "—"}
                  {"\n"}
                  Интервал:{" "}
                  {ex.rule?.intervalKm != null ? `${ex.rule.intervalKm} км` : "—"}
                  {"\n"}
                  Warning:{" "}
                  {ex.rule?.warningKm != null ? `${ex.rule.warningKm} км` : "—"}
                  {"\n"}
                  Использовано:{" "}
                  {ex.usage?.elapsedKm != null ? `${ex.usage.elapsedKm} км` : "—"}
                  {"\n"}
                  Осталось:{" "}
                  {ex.usage?.remainingKm != null ? `${ex.usage.remainingKm} км` : "—"}
                </Text>
              </View>
            ) : null}
            {showHoursRow ? (
              <View style={styles.modalTableBlock}>
                <Text style={styles.modalTableTitle}>Моточасы</Text>
                <Text style={styles.modalMono}>
                  Текущее:{" "}
                  {ex.current.engineHours !== null ? `${ex.current.engineHours} ч` : "—"}
                  {"\n"}
                  Последний сервис:{" "}
                  {ex.lastService?.engineHours != null
                    ? `${ex.lastService.engineHours} ч`
                    : "—"}
                  {"\n"}
                  Интервал:{" "}
                  {ex.rule?.intervalHours != null ? `${ex.rule.intervalHours} ч` : "—"}
                  {"\n"}
                  Warning:{" "}
                  {ex.rule?.warningHours != null ? `${ex.rule.warningHours} ч` : "—"}
                  {"\n"}
                  Использовано:{" "}
                  {ex.usage?.elapsedHours != null ? `${ex.usage.elapsedHours} ч` : "—"}
                  {"\n"}
                  Осталось:{" "}
                  {ex.usage?.remainingHours != null ? `${ex.usage.remainingHours} ч` : "—"}
                </Text>
              </View>
            ) : null}
            {showDaysRow ? (
              <View style={styles.modalTableBlock}>
                <Text style={styles.modalTableTitle}>Время</Text>
                <Text style={styles.modalMono}>
                  Интервал:{" "}
                  {ex.rule?.intervalDays != null ? `${ex.rule.intervalDays} дн` : "—"}
                  {"\n"}
                  Warning:{" "}
                  {ex.rule?.warningDays != null ? `${ex.rule.warningDays} дн` : "—"}
                  {"\n"}
                  Использовано:{" "}
                  {ex.usage?.elapsedDays != null ? `${ex.usage.elapsedDays} дн` : "—"}
                  {"\n"}
                  Осталось:{" "}
                  {ex.usage?.remainingDays != null ? `${ex.usage.remainingDays} дн` : "—"}
                </Text>
              </View>
            ) : null}
            <View style={styles.modalTableBlock}>
              <Text style={styles.modalTableTitle}>Дата расчета</Text>
              <Text style={styles.modalMono}>
                {formatIsoCalendarDateRu(ex.current.date)}
                {"\n"}
                Последний сервис:{" "}
                {ex.lastService?.eventDate
                  ? formatIsoCalendarDateRu(ex.lastService.eventDate)
                  : "—"}
                {"\n"}
                Trigger mode: {ex.triggerMode || "—"}
              </Text>
            </View>
          </ScrollView>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.modalCloseButton, pressed && styles.modalCloseButtonPressed]}
          >
            <Text style={styles.modalCloseButtonText}>Закрыть</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
  const [isRideProfileExpanded, setIsRideProfileExpanded] = useState(false);
  const [isTechnicalExpanded, setIsTechnicalExpanded] = useState(false);
  const [statusExplanationNode, setStatusExplanationNode] =
    useState<NodeTreeItemViewModel | null>(null);

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

    try {
      const detailData = await endpoints.getVehicleDetail(vehicleId);
      setVehicle(detailData.vehicle ?? null);
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить данные мотоцикла.");
      setVehicle(null);
      setNodeTree([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    setIsNodeTreeLoading(true);
    try {
      const nodesData = await endpoints.getNodeTree(vehicleId);
      setNodeTree(nodesData.nodeTree ?? []);
      setNodeTreeError("");
    } catch (err) {
      console.error(err);
      setNodeTreeError("Не удалось загрузить дерево узлов.");
      setNodeTree([]);
    } finally {
      setIsNodeTreeLoading(false);
    }
  }, [apiBaseUrl, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const { roots: nodeTreeViewModel } = useMemo(
    () => buildNodeTreeSectionProps(nodeTree),
    [nodeTree]
  );

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
      const nodeIdsParam = filter.nodeIds.map(encodeURIComponent).join(",");
      router.push(
        `/vehicles/${vehicleId}/service-log?nodeIds=${nodeIdsParam}&nodeLabel=${encodeURIComponent(filter.displayLabel)}`
      );
    },
    [nodeTree, router, vehicleId]
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
          <Text style={styles.title}>{detailViewModel.displayName}</Text>
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
          <Pressable
            style={({ pressed }) => [styles.sectionHeaderRow, pressed && styles.sectionHeaderRowPressed]}
            onPress={() => setIsRideProfileExpanded((prev) => !prev)}
          >
            <Text style={styles.secondarySectionTitle}>Профиль эксплуатации</Text>
            <View style={styles.sectionHeaderActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.inlineActionButton,
                  pressed && styles.inlineActionButtonPressed,
                ]}
                onPress={() => router.push(`/vehicles/${vehicleId}/profile`)}
              >
                <Text style={styles.inlineActionButtonText}>Редактировать</Text>
              </Pressable>
              <Text style={styles.sectionChevron}>{isRideProfileExpanded ? "▾" : "▸"}</Text>
            </View>
          </Pressable>
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
              style={({ pressed }) => [styles.sectionHeaderRow, pressed && styles.sectionHeaderRowPressed]}
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
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: c.textPrimary,
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

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: c.overlayModal,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    maxHeight: 560,
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: c.textPrimary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalScroll: {
    maxHeight: 420,
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalBlock: {
    marginBottom: 14,
  },
  modalKicker: {
    fontSize: 11,
    fontWeight: "600",
    color: c.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  modalEmphasis: {
    fontSize: 14,
    fontWeight: "600",
    color: c.textPrimary,
  },
  modalBody: {
    fontSize: 14,
    color: c.textMeta,
    lineHeight: 20,
  },
  modalTableBlock: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: c.cardSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  modalTableTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: c.textPrimary,
    marginBottom: 6,
  },
  modalMono: {
    fontSize: 12,
    color: c.textMeta,
    lineHeight: 18,
  },
  modalCloseButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: "center",
  },
  modalCloseButtonPressed: {
    backgroundColor: c.divider,
  },
  modalCloseButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: c.textPrimary,
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
  addLeafButton: {
    marginLeft: 10,
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
