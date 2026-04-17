import { useCallback, useState } from "react";
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
import type { NodeTreeItem, VehicleDetail } from "@mototwin/types";
import { getNodeStatusLabel } from "@mototwin/domain";
import { getApiBaseUrl } from "../../../src/api-base-url";

type NodeStatus = "OK" | "SOON" | "OVERDUE" | "RECENTLY_REPLACED";

const STATUS_COLORS: Record<NodeStatus, { bg: string; text: string }> = {
  OK: { bg: "#D1FAE5", text: "#065F46" },
  SOON: { bg: "#FEF3C7", text: "#92400E" },
  OVERDUE: { bg: "#FEE2E2", text: "#991B1B" },
  RECENTLY_REPLACED: { bg: "#DBEAFE", text: "#1E40AF" },
};

function getStatusColors(status: NodeStatus | null) {
  if (!status) return { bg: "#F3F4F6", text: "#9CA3AF" };
  return STATUS_COLORS[status] ?? { bg: "#F3F4F6", text: "#9CA3AF" };
}

function getNodeAccentColor(status: NodeStatus | null) {
  if (status === "OVERDUE") return "#FECACA";
  if (status === "SOON") return "#FDE68A";
  return "transparent";
}

function formatUsageType(value: string) {
  switch (value) {
    case "CITY":
      return "Город";
    case "HIGHWAY":
      return "Трасса";
    case "MIXED":
      return "Смешанный";
    case "OFFROAD":
      return "Off-road";
    default:
      return value;
  }
}

function formatRidingStyle(value: string) {
  switch (value) {
    case "CALM":
      return "Спокойный";
    case "ACTIVE":
      return "Активный";
    case "AGGRESSIVE":
      return "Агрессивный";
    default:
      return value;
  }
}

function formatLoadType(value: string) {
  switch (value) {
    case "SOLO":
      return "Один";
    case "PASSENGER":
      return "С пассажиром";
    case "LUGGAGE":
      return "С багажом";
    case "PASSENGER_LUGGAGE":
      return "Пассажир и багаж";
    default:
      return value;
  }
}

function formatUsageIntensity(value: string) {
  switch (value) {
    case "LOW":
      return "Низкая";
    case "MEDIUM":
      return "Средняя";
    case "HIGH":
      return "Высокая";
    default:
      return value;
  }
}

// ─── Expandable node row ──────────────────────────────────────────────────────

type NodeRowProps = {
  node: NodeTreeItem;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onAddFromLeaf: (leafNodeId: string) => void;
};

function NodeRow({
  node,
  depth,
  expandedIds,
  onToggle,
  onAddFromLeaf,
}: NodeRowProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isLeaf = !hasChildren;
  const status = node.effectiveStatus as NodeStatus | null;
  const colors = getStatusColors(status);
  const label = status ? getNodeStatusLabel(status) : null;
  const reasonShort = isLeaf ? (node.statusExplanation?.reasonShort ?? null) : null;
  const indent = 12 + depth * 14;
  const accentColor = getNodeAccentColor(status);
  const isTopLevel = depth === 0;
  const badgeStyle = !isTopLevel ? styles.badgeNested : undefined;
  const badgeTextStyle = !isTopLevel ? styles.badgeTextNested : undefined;

  return (
    <View style={styles.nodeContainer}>
      <Pressable
        onPress={() => hasChildren && onToggle(node.id)}
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
              {node.name}
            </Text>
            {reasonShort ? (
              <Text style={styles.reasonShort}>{reasonShort}</Text>
            ) : null}
          </View>
        </View>

        {label ? (
          <View style={[styles.badge, badgeStyle, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, badgeTextStyle, { color: colors.text }]}>{label}</Text>
          </View>
        ) : (
          <View style={styles.badgeEmpty} />
        )}

        {!hasChildren ? (
          <Pressable
            onPress={() => onAddFromLeaf(node.id)}
            style={({ pressed }) => [styles.addLeafButton, pressed && styles.addLeafButtonPressed]}
            hitSlop={8}
          >
            <Text style={styles.addLeafButtonText}>+</Text>
          </Pressable>
        ) : null}
      </Pressable>

      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onAddFromLeaf={onAddFromLeaf}
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isRideProfileExpanded, setIsRideProfileExpanded] = useState(false);
  const [isTechnicalExpanded, setIsTechnicalExpanded] = useState(false);

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

        const [detailData, nodesData] = await Promise.all([
          endpoints.getVehicleDetail(vehicleId),
          endpoints.getVehicleNodeTree(vehicleId),
        ]);

        setVehicle(detailData.vehicle ?? null);
        setNodeTree(nodesData.nodeTree ?? []);
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить данные мотоцикла.");
      } finally {
        setIsLoading(false);
      }
    }, [apiBaseUrl, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
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

  const hasNickname = Boolean(vehicle?.nickname?.trim());
  const title =
    vehicle?.nickname?.trim() ||
    `${vehicle?.brandName ?? ""} ${vehicle?.modelName ?? ""}`.trim();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#111827" />
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

  const rideProfile = vehicle.rideProfile;
  const technicalInfo = [
    { label: "Рынок", value: vehicle.modelVariant?.market || null },
    { label: "Двигатель", value: vehicle.modelVariant?.engineType || null },
    { label: "Охлаждение", value: vehicle.modelVariant?.coolingType || null },
    { label: "Колеса", value: vehicle.modelVariant?.wheelSizes || null },
    { label: "Тормоза", value: vehicle.modelVariant?.brakeSystem || null },
    { label: "Шаг цепи", value: vehicle.modelVariant?.chainPitch || null },
    { label: "Стоковые звезды", value: vehicle.modelVariant?.stockSprockets || null },
  ].filter((item) => Boolean(item.value));
  const hasTechnicalInfo = technicalInfo.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Identity + state card */}
        <View style={styles.infoCard}>
          {hasNickname ? (
            <Text style={styles.eyebrow}>Никнейм</Text>
          ) : (
            <Text style={styles.eyebrow}>Мотоцикл</Text>
          )}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.brandModel}>
            {vehicle.brandName} · {vehicle.modelName}
          </Text>
          <Text style={styles.variantText}>
            {(vehicle.modelVariant?.year ?? vehicle.year) || "—"} ·{" "}
            {vehicle.modelVariant?.versionName || vehicle.variantName || "—"}
          </Text>

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
              <Text style={styles.metricValue}>{vehicle.odometer} км</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Моточасы</Text>
              <Text style={styles.metricValue}>
                {vehicle.engineHours != null ? `${vehicle.engineHours} ч` : "—"}
              </Text>
            </View>
          </View>
          <Row label="VIN" value={vehicle.vin ?? "—"} />
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
            rideProfile ? (
              <View style={styles.secondarySectionGrid}>
                <SpecRow label="Сценарий" value={formatUsageType(rideProfile.usageType)} />
                <SpecRow label="Стиль" value={formatRidingStyle(rideProfile.ridingStyle)} />
                <SpecRow label="Нагрузка" value={formatLoadType(rideProfile.loadType)} />
                <SpecRow
                  label="Интенсивность"
                  value={formatUsageIntensity(rideProfile.usageIntensity)}
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
                {technicalInfo.map((item) => (
                  <SpecRow key={item.label} label={item.label} value={item.value || "—"} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Node tree */}
        {nodeTree.length > 0 ? (
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
            <View style={styles.treeCard}>
              {nodeTree.map((node, index) => (
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
                  />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyNodes}>
            <Text style={styles.emptyNodesText}>Данные о состоянии узлов отсутствуют</Text>
          </View>
        )}
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
    backgroundColor: "#F7F7F7",
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
    color: "#4B5563",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  errorText: {
    marginTop: 8,
    color: "#B91C1C",
    textAlign: "center",
    fontSize: 14,
  },

  // Info card
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
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
    color: "#6B7280",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  brandModel: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
  },
  variantText: {
    marginTop: 4,
    fontSize: 13,
    color: "#4B5563",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  stateHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
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
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FFFFFF",
  },
  inlineActionButtonPressed: {
    backgroundColor: "#F3F4F6",
  },
  inlineActionButtonText: {
    fontSize: 12,
    color: "#374151",
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
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  metricValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 5,
  },
  rowLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "right",
  },

  secondarySectionCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  secondarySectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
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
    color: "#6B7280",
    width: 16,
    textAlign: "center",
  },
  secondarySectionGrid: {
    gap: 8,
  },
  secondaryEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  },
  specRow: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#FCFCFD",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  specLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  specValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  // Section
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  sectionJournalButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#111827",
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
    color: "#FFFFFF",
  },
  sectionSubheader: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  },

  // Tree card
  treeCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  treeDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
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
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  nodeRowNested: {
    backgroundColor: "#FCFCFD",
  },
  nodeRowPressed: {
    backgroundColor: "#F3F4F6",
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
    color: "#6B7280",
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
    color: "#374151",
    lineHeight: 20,
  },
  nodeNameTop: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  reasonShort: {
    marginTop: 3,
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 16,
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addLeafButtonPressed: {
    backgroundColor: "#EEF2FF",
    borderColor: "#A5B4FC",
  },
  addLeafButtonText: {
    color: "#4B5563",
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
    color: "#9CA3AF",
  },
});
