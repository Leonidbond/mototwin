import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  buildAttentionSummaryFromNodeTree,
  buildExpenseSummaryFromServiceEvents,
  buildNodeTreeSectionProps,
  buildNodeContextViewModel,
  buildNodeSearchResultActions,
  buildNodeSubtreeModalViewModel,
  buildTopNodeOverviewCards,
  buildTopLevelNodeSummaryViewModel,
  buildNodeMaintenancePlanViewModel,
  buildRideProfileViewModel,
  buildVehicleDetailViewModel,
  buildVehicleStateViewModel,
  buildVehicleTechnicalInfoViewModel,
  canOpenNodeStatusExplanationModal,
  calculateGarageScore,
  createServiceLogNodeFilter,
  calculateSnoozeUntilDate,
  findNodeTreeItemById,
  formatSnoozeUntilLabel,
  getNodeSubtreeById,
  getTopLevelNodeTreeItems,
  isNodeSnoozed,
  searchNodeTree,
  formatIsoCalendarDateRu,
  formatExpenseAmountRu,
  getRecentServiceEventsForNode,
} from "@mototwin/domain";
import type {
  AttentionItemViewModel,
  ExpenseSummaryViewModel,
  NodeSnoozeOption,
  NodeContextViewModel,
  NodeStatus,
  NodeTreeItem,
  NodeTreeItemProps,
  NodeTreeItemViewModel,
  NodeSubtreeModalViewModel,
  NodeTreeSearchResultViewModel,
  NodeTreeSearchActionKey,
  PartRecommendationViewModel,
  ServiceEventItem,
  ServiceKitViewModel,
  TopNodeOverviewCard,
  TopServiceNodeItem,
  VehicleDetail,
} from "@mototwin/types";
import { productSemanticColors as c, statusSemanticTokens } from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../../../src/api-base-url";
import {
  readCollapsiblePreference,
  writeCollapsiblePreference,
} from "../../../src/ui-collapsible-preferences";
import {
  readNodeSnoozePreferences,
  writeNodeSnoozePreference,
} from "../../../src/ui-node-snooze-preferences";
import { buildVehicleServiceLogHref } from "./service-log";
import { buildVehicleWishlistNewHref } from "./wishlist/hrefs";
import { StatusExplanationModal } from "./status-explanation-modal";
import { ActionIconButton } from "../../components/action-icon-button";
import { AppHelpFab } from "../../../src/components/app-help-fab";
import { TopNodeIcon } from "../../../components/icons/top-nodes";

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
  onOpenContext?: (nodeId: string) => void;
  onOpenStatusExplanation?: (node: NodeTreeItemViewModel) => void;
  onOpenServiceLogForNode?: (node: NodeTreeItemViewModel) => void;
  isMaintenanceModeEnabled: boolean;
  highlightedNodeId?: string | null;
};

function NodeRow({
  node,
  depth,
  expandedIds,
  onToggle,
  onAddFromLeaf,
  onAddToWishlist,
  onOpenContext,
  onOpenStatusExplanation,
  onOpenServiceLogForNode,
  isMaintenanceModeEnabled,
  highlightedNodeId,
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
  const maintenancePlan = isMaintenanceModeEnabled ? buildNodeMaintenancePlanViewModel(rowNode) : null;
  const summary = maintenancePlan?.parentSummary;
  const summaryLine =
    summary && (summary.overdueCount > 0 || summary.soonCount > 0 || summary.plannedLaterCount > 0)
      ? [
          summary.overdueCount > 0 ? `Просрочено: ${summary.overdueCount}` : null,
          summary.soonCount > 0 ? `Скоро: ${summary.soonCount}` : null,
          summary.plannedLaterCount > 0 ? `Запланировано: ${summary.plannedLaterCount}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <View style={styles.nodeContainer}>
      <Pressable
        onPress={() => hasChildren && treeItemContract.onToggleExpand()}
        style={({ pressed }) => [
          styles.nodeRow,
          { paddingLeft: indent },
          isTopLevel && styles.nodeRowTopLevel,
          depth > 0 && styles.nodeRowNested,
          highlightedNodeId === rowNode.id && styles.nodeRowHighlighted,
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
            {isMaintenanceModeEnabled && maintenancePlan && !reasonShort && maintenancePlan.shortText ? (
              <Text style={styles.reasonShort}>{maintenancePlan.shortText}</Text>
            ) : null}
            {isMaintenanceModeEnabled && summaryLine ? (
              <Text style={styles.planSummaryText}>{summaryLine}</Text>
            ) : null}
            {isMaintenanceModeEnabled &&
            maintenancePlan &&
            !hasChildren &&
            maintenancePlan.hasMeaningfulData ? (
              <View style={styles.planLeafBlock}>
                {maintenancePlan.dueLines.map((line) => (
                  <Text key={line} style={styles.planLeafLine}>
                    {line}
                  </Text>
                ))}
                {maintenancePlan.lastServiceLine ? (
                  <Text style={styles.planLeafMuted}>{maintenancePlan.lastServiceLine}</Text>
                ) : null}
                {maintenancePlan.ruleIntervalLine ? (
                  <Text style={styles.planLeafMuted}>{maintenancePlan.ruleIntervalLine}</Text>
                ) : null}
              </View>
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
            <ActionIconButton
              onPress={() => onAddToWishlist(rowNode.id)}
              accessibilityLabel={`Добавить узел ${rowNode.name} в список покупок`}
              variant="subtle"
              icon={<MaterialIcons name="shopping-cart" size={15} color={c.textSecondary} />}
            />
          ) : null}
          {onOpenContext ? (
            <ActionIconButton
              onPress={() => onOpenContext(rowNode.id)}
              accessibilityLabel={`Открыть контекст узла ${rowNode.name}`}
              variant="subtle"
              icon={<MaterialIcons name="open-in-new" size={15} color={c.textSecondary} />}
            />
          ) : null}
          {rowNode.canAddServiceEvent ? (
            <ActionIconButton
              onPress={() => treeItemContract.onRequestAddServiceEvent?.()}
              accessibilityLabel={`Добавить сервисное событие для узла ${rowNode.name}`}
              icon={<MaterialIcons name="build-circle" size={16} color={c.textSecondary} />}
            />
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
              onOpenContext={onOpenContext}
              onOpenStatusExplanation={onOpenStatusExplanation}
              onOpenServiceLogForNode={onOpenServiceLogForNode}
              isMaintenanceModeEnabled={isMaintenanceModeEnabled}
              highlightedNodeId={highlightedNodeId}
            />
          ))
        : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VehicleDetailScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string; nodeContextId?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const nodeContextIdParam =
    typeof params.nodeContextId === "string" ? params.nodeContextId : "";

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [nodeTreeError, setNodeTreeError] = useState("");
  const [isNodeTreeLoading, setIsNodeTreeLoading] = useState(false);
  const [isTopServiceNodesLoading, setIsTopServiceNodesLoading] = useState(false);
  const [topServiceNodesError, setTopServiceNodesError] = useState("");
  const [isFullNodeTreeOpen, setIsFullNodeTreeOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isRideProfileExpanded, setIsRideProfileExpanded] = useState(true);
  const [isTechnicalExpanded, setIsTechnicalExpanded] = useState(true);
  const [isNodeMaintenanceModeEnabled, setIsNodeMaintenanceModeEnabled] = useState(false);
  const [selectedTopLevelNodeId, setSelectedTopLevelNodeId] = useState<string | null>(null);
  const [selectedNodeContextId, setSelectedNodeContextId] = useState<string | null>(null);
  const [nodeSearchQuery, setNodeSearchQuery] = useState("");
  const [debouncedNodeSearchQuery, setDebouncedNodeSearchQuery] = useState("");
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [nodeContextRecommendations, setNodeContextRecommendations] = useState<
    PartRecommendationViewModel[]
  >([]);
  const [nodeContextRecommendationsLoading, setNodeContextRecommendationsLoading] = useState(false);
  const [nodeContextRecommendationsError, setNodeContextRecommendationsError] = useState("");
  const [nodeContextServiceKits, setNodeContextServiceKits] = useState<ServiceKitViewModel[]>([]);
  const [nodeContextServiceKitsLoading, setNodeContextServiceKitsLoading] = useState(false);
  const [nodeContextServiceKitsError, setNodeContextServiceKitsError] = useState("");
  const [nodeContextAddingRecommendedSkuId, setNodeContextAddingRecommendedSkuId] = useState("");
  const [nodeContextAddingKitCode, setNodeContextAddingKitCode] = useState("");
  const [hasLoadedCollapsePrefs, setHasLoadedCollapsePrefs] = useState(false);
  const [statusExplanationNode, setStatusExplanationNode] =
    useState<NodeTreeItemViewModel | null>(null);
  const [serviceEvents, setServiceEvents] = useState<ServiceEventItem[]>([]);
  const [nodeSnoozeByNodeId, setNodeSnoozeByNodeId] = useState<Record<string, string | null>>({});
  const [isMovingToTrash, setIsMovingToTrash] = useState(false);

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
    setTopServiceNodesError("");
    setServiceEvents([]);

    try {
      const detailData = await endpoints.getVehicleDetail(vehicleId);
      setVehicle(detailData.vehicle ?? null);
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить данные мотоцикла.");
      setVehicle(null);
      setNodeTree([]);
      setTopServiceNodes([]);
      setServiceEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    setIsNodeTreeLoading(true);
    setIsTopServiceNodesLoading(true);
    const [nodesResult, eventsResult, topNodesResult] = await Promise.allSettled([
      endpoints.getNodeTree(vehicleId),
      endpoints.getServiceEvents(vehicleId),
      endpoints.getTopServiceNodes(),
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
    } else {
      console.error(eventsResult.reason);
      setServiceEvents([]);
    }

    if (topNodesResult.status === "fulfilled") {
      setTopServiceNodes(topNodesResult.value.nodes ?? []);
      setTopServiceNodesError("");
    } else {
      console.error(topNodesResult.reason);
      setTopServiceNodes([]);
      setTopServiceNodesError("Не удалось загрузить основные узлы.");
    }

    setIsNodeTreeLoading(false);
    setIsTopServiceNodesLoading(false);
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
      const maintenanceMode = await readCollapsiblePreference(
        `vehicleDetail.${vehicleId}.nodeMaintenanceMode.enabled`
      );
      setIsRideProfileExpanded(usage ?? true);
      setIsTechnicalExpanded(technical ?? true);
      setIsNodeMaintenanceModeEnabled(maintenanceMode ?? false);
      setHasLoadedCollapsePrefs(true);
    })();
  }, [vehicleId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedNodeSearchQuery(nodeSearchQuery);
    }, 180);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [nodeSearchQuery]);

  useEffect(() => {
    if (!nodeContextIdParam) {
      return;
    }
    setSelectedTopLevelNodeId(null);
    setHighlightedNodeId(nodeContextIdParam);
    setSelectedNodeContextId(nodeContextIdParam);
  }, [nodeContextIdParam]);

  useEffect(() => {
    if (!vehicleId || !selectedNodeContextId) {
      setNodeContextRecommendations([]);
      setNodeContextRecommendationsError("");
      setNodeContextRecommendationsLoading(false);
      return;
    }
    setNodeContextRecommendationsLoading(true);
    setNodeContextRecommendationsError("");
    void createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }))
      .getRecommendedSkusForNode(vehicleId, selectedNodeContextId)
      .then((res) => {
        setNodeContextRecommendations(res.recommendations ?? []);
      })
      .catch(() => {
        setNodeContextRecommendations([]);
        setNodeContextRecommendationsError("Не удалось загрузить рекомендации по узлу.");
      })
      .finally(() => {
        setNodeContextRecommendationsLoading(false);
      });
  }, [apiBaseUrl, vehicleId, selectedNodeContextId]);

  useEffect(() => {
    if (!vehicleId || !selectedNodeContextId) {
      setNodeContextServiceKits([]);
      setNodeContextServiceKitsError("");
      setNodeContextServiceKitsLoading(false);
      return;
    }
    setNodeContextServiceKitsLoading(true);
    setNodeContextServiceKitsError("");
    void createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }))
      .getServiceKits({ nodeId: selectedNodeContextId, vehicleId })
      .then((res) => {
        setNodeContextServiceKits(res.kits ?? []);
      })
      .catch(() => {
        setNodeContextServiceKits([]);
        setNodeContextServiceKitsError("Не удалось загрузить комплекты обслуживания.");
      })
      .finally(() => {
        setNodeContextServiceKitsLoading(false);
      });
  }, [apiBaseUrl, vehicleId, selectedNodeContextId]);

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

  useEffect(() => {
    if (!vehicleId || !hasLoadedCollapsePrefs) return;
    void writeCollapsiblePreference(
      `vehicleDetail.${vehicleId}.nodeMaintenanceMode.enabled`,
      isNodeMaintenanceModeEnabled
    );
  }, [vehicleId, hasLoadedCollapsePrefs, isNodeMaintenanceModeEnabled]);

  const { roots: nodeTreeViewModel } = useMemo(
    () => buildNodeTreeSectionProps(nodeTree),
    [nodeTree]
  );
  const topLevelNodeViewModels = useMemo(
    () => getTopLevelNodeTreeItems(nodeTreeViewModel),
    [nodeTreeViewModel]
  );
  const selectedTopLevelNode = useMemo(
    () =>
      selectedTopLevelNodeId
        ? getNodeSubtreeById(topLevelNodeViewModels, selectedTopLevelNodeId)
        : null,
    [topLevelNodeViewModels, selectedTopLevelNodeId]
  );
  const selectedNodeSubtreeModalViewModel = useMemo<NodeSubtreeModalViewModel | null>(
    () =>
      selectedTopLevelNode
        ? buildNodeSubtreeModalViewModel(selectedTopLevelNode, {
            maintenanceModeEnabled: isNodeMaintenanceModeEnabled,
          })
        : null,
    [selectedTopLevelNode, isNodeMaintenanceModeEnabled]
  );
  const selectedNodeContextNode = useMemo(
    () =>
      selectedNodeContextId
        ? getNodeSubtreeById(topLevelNodeViewModels, selectedNodeContextId)
        : null,
    [topLevelNodeViewModels, selectedNodeContextId]
  );
  const selectedNodeContextRawNode = useMemo(
    () => (selectedNodeContextId ? findNodeTreeItemById(nodeTree, selectedNodeContextId) : null),
    [nodeTree, selectedNodeContextId]
  );
  const selectedNodeContextViewModel = useMemo<NodeContextViewModel | null>(() => {
    if (!selectedNodeContextNode || !selectedNodeContextRawNode) {
      return null;
    }
    return buildNodeContextViewModel({
      node: selectedNodeContextNode,
      nodeTree: topLevelNodeViewModels,
      maintenancePlan: buildNodeMaintenancePlanViewModel(selectedNodeContextNode),
      recentServiceEvents: getRecentServiceEventsForNode(selectedNodeContextRawNode, serviceEvents),
      recommendations: nodeContextRecommendations,
      serviceKits: nodeContextServiceKits,
    });
  }, [
    selectedNodeContextNode,
    selectedNodeContextRawNode,
    topLevelNodeViewModels,
    serviceEvents,
    nodeContextRecommendations,
    nodeContextServiceKits,
  ]);
  const nodeSearchResults = useMemo<NodeTreeSearchResultViewModel[]>(
    () =>
      searchNodeTree(topLevelNodeViewModels, {
        query: debouncedNodeSearchQuery,
        limit: 10,
        minQueryLength: 2,
      }),
    [topLevelNodeViewModels, debouncedNodeSearchQuery]
  );
  const topNodeStatusByCode = useMemo(() => {
    const statusByCode = new Map<string, NodeStatus | null>();
    const stack = [...nodeTree];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        continue;
      }
      statusByCode.set(current.code, current.effectiveStatus ?? null);
      if (current.children.length > 0) {
        stack.push(...current.children);
      }
    }
    return statusByCode;
  }, [nodeTree]);
  const topNodeOverviewCards = useMemo<TopNodeOverviewCard[]>(
    () => buildTopNodeOverviewCards(topServiceNodes, topNodeStatusByCode),
    [topServiceNodes, topNodeStatusByCode]
  );

  const attentionSummary = useMemo(
    () => buildAttentionSummaryFromNodeTree(nodeTree),
    [nodeTree]
  );
  useEffect(() => {
    if (!vehicleId) {
      setNodeSnoozeByNodeId({});
      return;
    }
    const candidateNodeIds = Array.from(
      new Set([
        ...attentionSummary.items.map((item) => item.nodeId),
        ...(selectedNodeContextId ? [selectedNodeContextId] : []),
      ])
    );
    if (candidateNodeIds.length === 0) {
      setNodeSnoozeByNodeId({});
      return;
    }
    let isCancelled = false;
    void (async () => {
      const loaded = await readNodeSnoozePreferences(vehicleId, candidateNodeIds);
      const normalized: Record<string, string | null> = {};
      for (const nodeId of candidateNodeIds) {
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
  }, [vehicleId, attentionSummary.items, selectedNodeContextId]);

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
      setSelectedTopLevelNodeId(null);
      setHighlightedNodeId(null);
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
      setSelectedTopLevelNodeId(null);
      setHighlightedNodeId(null);
      router.push(buildVehicleWishlistNewHref(vehicleId, nodeId));
    },
    [router, vehicleId]
  );
  const openAddServiceFromTreeNode = useCallback(
    (leafNodeId: string) => {
      setSelectedTopLevelNodeId(null);
      setHighlightedNodeId(null);
      router.push(`/vehicles/${vehicleId}/service-events/new?source=tree&nodeId=${leafNodeId}`);
    },
    [router, vehicleId]
  );
  const openStatusExplanationFromTreeNode = useCallback((node: NodeTreeItemViewModel) => {
    setSelectedTopLevelNodeId(null);
    setHighlightedNodeId(null);
    setStatusExplanationNode(node);
  }, []);
  const openSearchResultInSubtreeModal = useCallback((result: NodeTreeSearchResultViewModel) => {
    setNodeSearchQuery("");
    setDebouncedNodeSearchQuery("");
    setHighlightedNodeId(result.nodeId);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const ancestorId of result.ancestorIds) {
        next.add(ancestorId);
      }
      return next;
    });
    setSelectedTopLevelNodeId(result.topLevelNodeId);
  }, []);
  const closeNodeContextModal = useCallback(() => {
    setSelectedNodeContextId(null);
    setNodeContextAddingRecommendedSkuId("");
    setNodeContextAddingKitCode("");
  }, []);
  const openNodeContextModal = useCallback((nodeId: string) => {
    setSelectedTopLevelNodeId(null);
    setHighlightedNodeId(null);
    setSelectedNodeContextId(nodeId);
  }, []);
  const openServiceLogFromSearchResult = useCallback(
    (result: NodeTreeSearchResultViewModel) => {
      setNodeSearchQuery("");
      setDebouncedNodeSearchQuery("");
      setHighlightedNodeId(null);
      const selectedNode = getNodeSubtreeById(topLevelNodeViewModels, result.nodeId);
      if (!selectedNode) {
        return;
      }
      openServiceLogForTreeNode(selectedNode);
    },
    [openServiceLogForTreeNode, topLevelNodeViewModels]
  );
  const openWishlistFromSearchResult = useCallback(
    (result: NodeTreeSearchResultViewModel) => {
      if (!result.isLeaf) {
        return;
      }
      setNodeSearchQuery("");
      setDebouncedNodeSearchQuery("");
      setHighlightedNodeId(null);
      openWishlistForTreeNode(result.nodeId);
    },
    [openWishlistForTreeNode]
  );
  const handleSearchResultAction = useCallback(
    (actionKey: NodeTreeSearchActionKey, result: NodeTreeSearchResultViewModel) => {
      if (actionKey === "open") {
        openNodeContextModal(result.nodeId);
        return;
      }
      if (actionKey === "service_log") {
        openServiceLogFromSearchResult(result);
        return;
      }
      if (actionKey === "buy") {
        openWishlistFromSearchResult(result);
      }
    },
    [openNodeContextModal, openServiceLogFromSearchResult, openWishlistFromSearchResult]
  );
  const addRecommendedSkuToWishlistFromNodeContext = useCallback(
    async (rec: PartRecommendationViewModel) => {
      if (!vehicleId || !selectedNodeContextId) {
        return;
      }
      try {
        setNodeContextAddingRecommendedSkuId(rec.skuId);
        await createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl })).createWishlistItem(
          vehicleId,
          {
            nodeId: selectedNodeContextId,
            skuId: rec.skuId,
            status: "NEEDED",
            quantity: 1,
          }
        );
      } catch (e) {
        console.error(e);
      } finally {
        setNodeContextAddingRecommendedSkuId("");
      }
    },
    [apiBaseUrl, vehicleId, selectedNodeContextId]
  );
  const addServiceKitFromNodeContext = useCallback(
    async (kit: ServiceKitViewModel) => {
      if (!vehicleId || !selectedNodeContextId) {
        return;
      }
      try {
        setNodeContextAddingKitCode(kit.code);
        const response = await createMotoTwinEndpoints(
          createApiClient({ baseUrl: apiBaseUrl })
        ).addServiceKitToWishlist(
          vehicleId,
          { kitCode: kit.code, contextNodeId: selectedNodeContextId }
        );
        Alert.alert(
          "Комплект добавлен",
          `Добавлено: ${response.result.createdItems.length}\nПропущено: ${response.result.skippedItems.length}`
        );
      } catch (e) {
        const message =
          e instanceof Error && e.message.trim().length > 0
            ? e.message
            : "Не удалось добавить позиции комплекта.";
        Alert.alert("Ошибка", message);
      } finally {
        setNodeContextAddingKitCode("");
      }
    },
    [apiBaseUrl, vehicleId, selectedNodeContextId]
  );
  const handleNodeContextAction = useCallback(
    (actionKey: string) => {
      if (!selectedNodeContextNode) {
        return;
      }
      if (actionKey === "journal") {
        closeNodeContextModal();
        openServiceLogForTreeNode(selectedNodeContextNode);
        return;
      }
      if (actionKey === "add_service_event" && selectedNodeContextNode.canAddServiceEvent) {
        closeNodeContextModal();
        openAddServiceFromTreeNode(selectedNodeContextNode.id);
        return;
      }
      if (actionKey === "add_wishlist" && !selectedNodeContextNode.hasChildren) {
        closeNodeContextModal();
        openWishlistForTreeNode(selectedNodeContextNode.id);
        return;
      }
      if (actionKey === "add_kit" && nodeContextServiceKits[0]) {
        void addServiceKitFromNodeContext(nodeContextServiceKits[0]);
        return;
      }
      if (actionKey === "open_status_explanation" && selectedNodeContextNode.statusExplanation) {
        closeNodeContextModal();
        setStatusExplanationNode(selectedNodeContextNode);
      }
    },
    [
      selectedNodeContextNode,
      closeNodeContextModal,
      openServiceLogForTreeNode,
      openAddServiceFromTreeNode,
      openWishlistForTreeNode,
      nodeContextServiceKits,
      addServiceKitFromNodeContext,
    ]
  );
  const setNodeSnoozeOption = useCallback(
    async (nodeId: string, option: NodeSnoozeOption) => {
      if (!vehicleId) {
        return;
      }
      const nextValue = option === "clear" ? null : calculateSnoozeUntilDate(option);
      await writeNodeSnoozePreference(vehicleId, nodeId, nextValue);
      setNodeSnoozeByNodeId((prev) => ({ ...prev, [nodeId]: nextValue }));
    },
    [vehicleId]
  );
  const getNodeModeToggleLabel = () =>
    isNodeMaintenanceModeEnabled ? "План обслуживания: вкл" : "Показывать план обслуживания";
  const selectedNodeSnoozeUntil = selectedNodeContextId
    ? (nodeSnoozeByNodeId[selectedNodeContextId] ?? null)
    : null;
  const selectedNodeSnoozeLabel = formatSnoozeUntilLabel(selectedNodeSnoozeUntil);
  const canSnoozeSelectedNode =
    selectedNodeContextViewModel?.effectiveStatus === "OVERDUE" ||
    selectedNodeContextViewModel?.effectiveStatus === "SOON";
  const moveVehicleToTrash = useCallback(() => {
    if (!vehicleId || isMovingToTrash) {
      return;
    }
    Alert.alert("Переместить мотоцикл на Свалку?", "Его можно будет восстановить в разделе Свалка.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Переместить",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              setIsMovingToTrash(true);
              await createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl })).moveVehicleToTrash(
                vehicleId
              );
              router.replace("/");
            } catch (requestError) {
              console.error(requestError);
              setError("Не удалось переместить мотоцикл на Свалку.");
            } finally {
              setIsMovingToTrash(false);
            }
          })();
        },
      },
    ]);
  }, [apiBaseUrl, isMovingToTrash, router, vehicleId]);

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
  const isLandscape = width > height;
  const isWideLayout = width >= 720 || isLandscape;
  const isTabletLayout = width >= 900;
  const contentMaxWidth = isTabletLayout ? 1080 : 760;
  const dashboardSectionStyle = isWideLayout ? styles.dashboardSectionWide : undefined;
  const score = calculateGarageScore({
    totalCount: attentionSummary.totalCount,
    overdueCount: attentionSummary.overdueCount,
    soonCount: attentionSummary.soonCount,
  });
  const expenseSummary = buildExpenseSummaryFromServiceEvents(serviceEvents);
  const recentEvents = getRecentDashboardEvents(serviceEvents);
  const readiness = buildMobileRideReadiness(attentionSummary);
  const seasonLabel = `Сезон ${new Date().getFullYear()}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusExplanationModal
        visible={Boolean(statusExplanationNode?.statusExplanation)}
        node={statusExplanationNode}
        onClose={() => setStatusExplanationNode(null)}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
          { maxWidth: contentMaxWidth, width: "100%", alignSelf: "center" },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.dashboardTopGrid, isWideLayout && styles.dashboardTopGridWide]}>
          <View style={[styles.infoCard, styles.heroDashboardCard, isWideLayout && styles.heroDashboardCardWide]}>
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroTitleCol}>
                <Text style={styles.eyebrow}>{hasNickname ? "Никнейм" : "Мотоцикл"}</Text>
                <Text style={styles.title}>{detailViewModel.displayName}</Text>
                <Text style={styles.brandModel}>{detailViewModel.brandModelLine}</Text>
                <Text style={styles.variantText}>{detailViewModel.yearVersionLine}</Text>
              </View>
              <View style={styles.titleActionsRow}>
                <Pressable
                  onPress={() => router.push(`/vehicles/${vehicleId}/state`)}
                  style={({ pressed }) => [
                    styles.primaryMileageButton,
                    pressed && styles.primaryMileageButtonPressed,
                  ]}
                >
                  <MaterialIcons name="speed" size={15} color={c.onPrimaryAction} />
                  <Text style={styles.primaryMileageButtonText}>Пробег</Text>
                </Pressable>
                <ActionIconButton
                  onPress={() => router.push(`/vehicles/${vehicleId}/profile`)}
                  accessibilityLabel="Редактировать профиль мотоцикла"
                  icon={<MaterialIcons name="edit" size={16} color={c.textMeta} />}
                />
                <ActionIconButton
                  onPress={moveVehicleToTrash}
                  accessibilityLabel="Переместить мотоцикл на Свалку"
                  variant="danger"
                  disabled={isMovingToTrash}
                  icon={<MaterialIcons name="delete-outline" size={16} color={c.error} />}
                />
              </View>
            </View>

            <View style={styles.heroMetaPanel}>
              <View style={styles.heroMetaRow}>
                <Text style={styles.heroMetaLabel}>VIN</Text>
                <Text style={styles.heroMetaValue}>{detailViewModel.vinLine}</Text>
              </View>
              <View style={styles.heroMetaRow}>
                <Text style={styles.heroMetaLabel}>Класс</Text>
                <Text style={styles.heroMetaValue}>{vehicle.modelVariant?.versionName || "Не указан"}</Text>
              </View>
            </View>

            <View style={styles.heroQuickActionsRow}>
              <DashboardActionButton
                label="Добавить ТО"
                iconName="build-circle"
                onPress={() => router.push(`/vehicles/${vehicleId}/service-events/new`)}
              />
              <DashboardActionButton
                label="Расход"
                iconName="account-balance-wallet"
                onPress={() => router.push(`/vehicles/${vehicleId}/service-log?expandExpenses=1&paidOnly=1`)}
              />
              <DashboardActionButton
                label="Деталь"
                iconName="shopping-cart"
                onPress={() => router.push(`/vehicles/${vehicleId}/wishlist/new`)}
              />
            </View>
          </View>

          <View style={styles.kpiStackMobile}>
            <KpiCard label="Garage Score" value={score === null ? "—" : String(score)} detail={buildScoreDetail(attentionSummary)} tone={getScoreTone(score)} />
            <KpiCard label="Текущий пробег" value={stateViewModel.odometerValue} detail={stateViewModel.engineHoursValue === "—" ? "Моточасы не указаны" : `Моточасы: ${stateViewModel.engineHoursValue}`} />
            <KpiCard label="Ride readiness" value={readiness.title} detail={readiness.details} tone={readiness.tone} />
            <KpiCard label={seasonLabel} value={score === null ? "Нет данных" : `${score}%`} detail="Оценка готовности по текущим узлам" />
          </View>
        </View>

        <View style={[styles.dashboardSectionGrid, dashboardSectionStyle]}>
          <DashboardSection
            title="Требует внимания"
            actionLabel="Все задачи"
            onActionPress={() => router.push(`/vehicles/${vehicleId}/attention`)}
          >
            {attentionSummary.items.length === 0 ? (
              <Text style={styles.dashboardEmptyText}>Критичных замечаний нет. Основные узлы сейчас в нормальном состоянии.</Text>
            ) : (
              attentionSummary.items.slice(0, 3).map((item) => (
                <AttentionDashboardRow
                  key={item.nodeId}
                  item={item}
                  onOpen={() => openNodeContextModal(item.nodeId)}
                  onLog={() =>
                    router.push(
                      buildVehicleServiceLogHref(
                        vehicleId,
                        { nodeIds: [item.nodeId], displayLabel: item.name },
                        false
                      )
                    )
                  }
                  onService={item.canAddServiceEvent ? () => openAddServiceFromTreeNode(item.nodeId) : undefined}
                />
              ))
            )}
          </DashboardSection>

          <DashboardSection
            title="Состояние узлов"
            actionLabel={isFullNodeTreeOpen ? "Скрыть" : "Все узлы"}
            onActionPress={() => setIsFullNodeTreeOpen((prev) => !prev)}
          >
            {isTopServiceNodesLoading ? (
              <Text style={styles.dashboardEmptyText}>Загрузка основных узлов...</Text>
            ) : topServiceNodesError ? (
              <Text style={[styles.dashboardEmptyText, { color: c.error }]}>{topServiceNodesError}</Text>
            ) : (
              <View style={styles.dashboardSystemsGrid}>
                {topNodeOverviewCards.map((card) => (
                  <TopOverviewDashboardCard key={card.key} card={card} />
                ))}
              </View>
            )}
          </DashboardSection>
        </View>

        <View style={[styles.dashboardLowerGrid, isWideLayout && styles.dashboardLowerGridWide]}>
          <DashboardSection
            title="Последние события"
            actionLabel="Журнал"
            onActionPress={() => router.push(`/vehicles/${vehicleId}/service-log`)}
          >
            {recentEvents.length === 0 ? (
              <Text style={styles.dashboardEmptyText}>После первого ТО или расхода здесь появятся последние события.</Text>
            ) : (
              recentEvents.map((event) => <RecentDashboardEventRow key={event.id} event={event} />)
            )}
          </DashboardSection>

          <ExpenseDashboardCard
            summary={expenseSummary}
            onPress={() => router.push(`/vehicles/${vehicleId}/service-log?expandExpenses=1&paidOnly=1`)}
          />

          <PartsDashboardCard
            onOpenWishlist={() => router.push(`/vehicles/${vehicleId}/wishlist`)}
            onAddPart={() => router.push(`/vehicles/${vehicleId}/wishlist/new`)}
          />
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

        {/* Node tree */}
        {isFullNodeTreeOpen ? (
        <View style={styles.fullTreeSection}>
          <Text style={styles.sectionHeader}>Все узлы мотоцикла</Text>
          <View style={styles.sectionActionsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.maintenanceModeToggle,
                isFullNodeTreeOpen && styles.maintenanceModeToggleActive,
                pressed && styles.maintenanceModeTogglePressed,
              ]}
              onPress={() => setIsFullNodeTreeOpen((prev) => !prev)}
            >
              <Text
                style={[
                  styles.maintenanceModeToggleText,
                  isFullNodeTreeOpen && styles.maintenanceModeToggleTextActive,
                ]}
              >
                {isFullNodeTreeOpen ? "Скрыть дерево" : "Все узлы →"}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.sectionJournalButton,
                pressed && styles.sectionJournalButtonPressed,
              ]}
              onPress={() => router.push(`/vehicles/${vehicleId}/service-log`)}
              accessibilityRole="button"
              accessibilityLabel="Журнал обслуживания"
            >
              <Text style={styles.sectionJournalButtonText}>Журнал обслуживания</Text>
            </Pressable>
          </View>
          <Text style={styles.sectionSubheader}>
            Детальная структура узлов, поиск, контекст и действия обслуживания.
          </Text>
          <>
          <Text style={styles.searchLabel}>Поиск по узлам</Text>
          <TextInput
            style={styles.searchInput}
            value={nodeSearchQuery}
            onChangeText={setNodeSearchQuery}
            placeholder="Поиск по узлам"
            placeholderTextColor={c.textSecondary}
            returnKeyType="search"
          />
          {nodeSearchQuery.trim().length > 0 && nodeSearchQuery.trim().length < 2 ? (
            <Text style={styles.searchHint}>Введите минимум 2 символа.</Text>
          ) : null}
          {nodeSearchQuery.trim().length >= 2 ? (
            nodeSearchResults.length > 0 ? (
              <View style={styles.searchResultsBox}>
                {nodeSearchResults.map((result) => (
                  <View key={result.nodeId} style={styles.searchResultCard}>
                    <Pressable
                      onPress={() => openSearchResultInSubtreeModal(result)}
                      style={({ pressed }) => [
                        styles.searchResultRow,
                        pressed && styles.searchResultRowPressed,
                      ]}
                    >
                      <View style={styles.searchResultTextCol}>
                        <Text style={styles.searchResultTitle}>{result.nodeName}</Text>
                        <Text style={styles.searchResultPath}>{result.pathLabel}</Text>
                        <Text style={styles.searchResultCode}>{result.nodeCode}</Text>
                        {result.shortExplanationLabel ? (
                          <Text style={styles.searchResultPath}>{result.shortExplanationLabel}</Text>
                        ) : null}
                      </View>
                      {result.effectiveStatus ? (
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: getStatusColors(result.effectiveStatus).bg,
                              borderColor: getStatusColors(result.effectiveStatus).border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              { color: getStatusColors(result.effectiveStatus).text },
                            ]}
                          >
                            {result.statusLabel}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                    <View style={styles.searchActionsRow}>
                      {buildNodeSearchResultActions(result).map((action) => (
                        <ActionIconButton
                          key={`${result.nodeId}.${action.key}`}
                          onPress={() => handleSearchResultAction(action.key, result)}
                          accessibilityLabel={`${action.label}: ${result.nodeName}`}
                          variant="subtle"
                          icon={
                            action.key === "open" ? (
                              <MaterialIcons name="open-in-new" size={15} color={c.textMeta} />
                            ) : action.key === "service_log" ? (
                              <MaterialIcons name="history" size={15} color={c.textMeta} />
                            ) : (
                              <MaterialIcons name="shopping-cart" size={15} color={c.textMeta} />
                            )
                          }
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.searchNoResults}>Узлы не найдены</Text>
            )
          ) : null}
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
              {topLevelNodeViewModels.map((node, index) => {
                const summary = buildTopLevelNodeSummaryViewModel(node, {
                  maintenanceModeEnabled: isNodeMaintenanceModeEnabled,
                });
                return (
                <View key={node.id}>
                  {index > 0 ? <View style={styles.treeDivider} /> : null}
                  <Pressable
                    onPress={() => {
                      setHighlightedNodeId(null);
                      setSelectedTopLevelNodeId(node.id);
                    }}
                    style={({ pressed }) => [styles.topLevelNodeRow, pressed && styles.topLevelNodeRowPressed]}
                  >
                    <View style={styles.topLevelNodeRowLeft}>
                      <Text style={styles.topLevelNodeName}>{summary.nodeName}</Text>
                      {summary.shortExplanationLabel ? (
                        <Text style={styles.reasonShort}>{summary.shortExplanationLabel}</Text>
                      ) : null}
                      {summary.maintenanceSummaryLine ? (
                        <Text style={styles.planSummaryText}>{summary.maintenanceSummaryLine}</Text>
                      ) : null}
                    </View>
                    <View style={styles.topLevelNodeRowRight}>
                      {summary.effectiveStatus ? (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: getStatusColors(summary.effectiveStatus).bg, borderColor: getStatusColors(summary.effectiveStatus).border },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              { color: getStatusColors(summary.effectiveStatus).text },
                            ]}
                          >
                            {summary.statusLabel}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.sectionChevron}>›</Text>
                    </View>
                  </Pressable>
                </View>
              );
              })}
            </View>
          ) : null}
          {!isNodeTreeLoading && !nodeTreeError && nodeTree.length === 0 ? (
            <View style={styles.emptyNodes}>
              <Text style={styles.emptyNodesText}>Данные о состоянии узлов отсутствуют</Text>
            </View>
          ) : null}
          </>
        </View>
        ) : null}
      </ScrollView>
      <Modal
        visible={Boolean(selectedNodeContextViewModel)}
        animationType="slide"
        transparent
        onRequestClose={closeNodeContextModal}
      >
        <View style={styles.subtreeModalOverlay}>
          <View style={styles.subtreeModalCard}>
            {selectedNodeContextViewModel ? (
              <>
                <View style={styles.subtreeModalHeader}>
                  <View style={styles.subtreeModalHeaderTextCol}>
                    <Text style={styles.subtreeModalTitle}>{selectedNodeContextViewModel.nodeName}</Text>
                    <Text style={styles.subtreeModalSubtitle}>{selectedNodeContextViewModel.pathLabel}</Text>
                    <Text style={styles.searchResultCode}>{selectedNodeContextViewModel.nodeCode}</Text>
                    {selectedNodeSnoozeLabel ? (
                      <Text style={styles.snoozeLabelText}>{selectedNodeSnoozeLabel}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={closeNodeContextModal}
                    style={({ pressed }) => [
                      styles.subtreeModalCloseBtn,
                      pressed && styles.subtreeModalCloseBtnPressed,
                    ]}
                  >
                    <Text style={styles.subtreeModalCloseBtnText}>Закрыть</Text>
                  </Pressable>
                </View>
                <ScrollView contentContainerStyle={styles.subtreeModalBody} keyboardShouldPersistTaps="handled">
                  <View style={styles.searchActionsRow}>
                    {selectedNodeContextViewModel.actions.map((action) => (
                      <ActionIconButton
                        key={action.key}
                        onPress={() => handleNodeContextAction(action.key)}
                        disabled={action.key === "add_kit" && Boolean(nodeContextAddingKitCode)}
                        accessibilityLabel={action.label}
                        variant="subtle"
                        icon={
                          action.key === "journal" ? (
                            <MaterialIcons name="history" size={15} color={c.textMeta} />
                          ) : action.key === "add_service_event" ? (
                            <MaterialIcons name="build-circle" size={15} color={c.textMeta} />
                          ) : action.key === "add_wishlist" ? (
                            <MaterialIcons name="shopping-cart" size={15} color={c.textMeta} />
                          ) : action.key === "add_kit" ? (
                            <MaterialIcons name="inventory-2" size={15} color={c.textMeta} />
                          ) : (
                            <MaterialIcons name="help-outline" size={15} color={c.textMeta} />
                          )
                        }
                      />
                    ))}
                    {canSnoozeSelectedNode ? (
                      <>
                        <ActionIconButton
                          onPress={() =>
                            void setNodeSnoozeOption(selectedNodeContextViewModel.nodeId, "7d")
                          }
                          accessibilityLabel="Отложить напоминание на 7 дней"
                          variant="subtle"
                          icon={<MaterialIcons name="snooze" size={15} color={c.textMeta} />}
                        />
                        <Pressable
                          onPress={() =>
                            void setNodeSnoozeOption(selectedNodeContextViewModel.nodeId, "30d")
                          }
                          style={({ pressed }) => [
                            styles.searchActionBtn,
                            pressed && styles.searchActionBtnPressed,
                          ]}
                        >
                          <Text style={styles.searchActionBtnText}>Отложить на 30 дней</Text>
                        </Pressable>
                        {selectedNodeSnoozeLabel ? (
                          <Pressable
                            onPress={() =>
                              void setNodeSnoozeOption(selectedNodeContextViewModel.nodeId, "clear")
                            }
                            style={({ pressed }) => [
                              styles.searchActionBtn,
                              pressed && styles.searchActionBtnPressed,
                            ]}
                          >
                            <Text style={styles.searchActionBtnText}>Снять отложенное</Text>
                          </Pressable>
                        ) : null}
                      </>
                    ) : null}
                  </View>

                  {selectedNodeContextViewModel.maintenancePlan &&
                  selectedNodeContextViewModel.maintenancePlan.hasMeaningfulData ? (
                    <View style={styles.searchResultCard}>
                      <Text style={styles.searchResultTitle}>План обслуживания</Text>
                      {selectedNodeContextViewModel.maintenancePlan.dueLines.map((line) => (
                        <Text key={line} style={styles.searchResultPath}>
                          {line}
                        </Text>
                      ))}
                      {selectedNodeContextViewModel.maintenancePlan.lastServiceLine ? (
                        <Text style={styles.searchResultPath}>
                          {selectedNodeContextViewModel.maintenancePlan.lastServiceLine}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.searchResultCard}>
                    <Text style={styles.searchResultTitle}>Последние сервисные события</Text>
                    {selectedNodeContextViewModel.recentServiceEvents.length === 0 ? (
                      <Text style={styles.searchResultPath}>По этому узлу записей пока нет.</Text>
                    ) : (
                      selectedNodeContextViewModel.recentServiceEvents.map((event) => (
                        <View key={event.id} style={styles.searchResultRow}>
                          <View style={styles.searchResultTextCol}>
                            <Text style={styles.searchResultTitle}>
                              {formatIsoCalendarDateRu(event.eventDate)} · {event.serviceType}
                            </Text>
                            <Text style={styles.searchResultPath}>Пробег: {event.odometer} км</Text>
                            {event.costLabelRu ? (
                              <Text style={styles.searchResultPath}>Стоимость: {event.costLabelRu}</Text>
                            ) : null}
                          </View>
                        </View>
                      ))
                    )}
                  </View>

                  <View style={styles.searchResultCard}>
                    <Text style={styles.searchResultTitle}>Рекомендации SKU</Text>
                    {nodeContextRecommendationsError ? (
                      <Text style={[styles.searchResultPath, { color: c.error }]}>
                        {nodeContextRecommendationsError}
                      </Text>
                    ) : null}
                    {nodeContextRecommendationsLoading ? (
                      <Text style={styles.searchResultPath}>Загрузка рекомендаций...</Text>
                    ) : null}
                    {!nodeContextRecommendationsLoading && nodeContextRecommendations.length === 0 ? (
                      <Text style={styles.searchResultPath}>
                        Для этого узла пока нет рекомендаций из каталога.
                      </Text>
                    ) : null}
                    {nodeContextRecommendations.slice(0, 5).map((rec) => (
                      <View key={rec.skuId} style={styles.searchResultRow}>
                        <View style={styles.searchResultTextCol}>
                          <Text style={styles.searchResultTitle}>
                            {rec.brandName} · {rec.canonicalName}
                          </Text>
                          <Text style={styles.searchResultPath}>{rec.recommendationLabel}</Text>
                        </View>
                        <ActionIconButton
                          onPress={() => void addRecommendedSkuToWishlistFromNodeContext(rec)}
                          accessibilityLabel="Добавить рекомендованный SKU в список покупок"
                          disabled={nodeContextAddingRecommendedSkuId === rec.skuId}
                          variant="subtle"
                          icon={<MaterialIcons name="shopping-cart" size={15} color={c.textMeta} />}
                        />
                      </View>
                    ))}
                  </View>

                  <View style={styles.searchResultCard}>
                    <Text style={styles.searchResultTitle}>Комплекты обслуживания</Text>
                    {nodeContextServiceKitsError ? (
                      <Text style={[styles.searchResultPath, { color: c.error }]}>
                        {nodeContextServiceKitsError}
                      </Text>
                    ) : null}
                    {nodeContextServiceKitsLoading ? (
                      <Text style={styles.searchResultPath}>Загрузка комплектов...</Text>
                    ) : null}
                    {!nodeContextServiceKitsLoading && nodeContextServiceKits.length === 0 ? (
                      <Text style={styles.searchResultPath}>Для этого узла комплекты не найдены.</Text>
                    ) : null}
                    {nodeContextServiceKits.slice(0, 3).map((kit) => (
                      <View key={kit.code} style={styles.searchResultRow}>
                        <View style={styles.searchResultTextCol}>
                          <Text style={styles.searchResultTitle}>{kit.title}</Text>
                          <Text style={styles.searchResultPath}>{kit.description}</Text>
                        </View>
                        <ActionIconButton
                          onPress={() => void addServiceKitFromNodeContext(kit)}
                          accessibilityLabel="Добавить комплект обслуживания в список покупок"
                          disabled={nodeContextAddingKitCode === kit.code}
                          variant="subtle"
                          icon={<MaterialIcons name="inventory-2" size={15} color={c.textMeta} />}
                        />
                      </View>
                    ))}
                  </View>
                </ScrollView>
                <AppHelpFab />
              </>
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(selectedNodeSubtreeModalViewModel)}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setSelectedTopLevelNodeId(null);
          setHighlightedNodeId(null);
        }}
      >
        <View style={styles.subtreeModalOverlay}>
          <View style={styles.subtreeModalCard}>
            {selectedNodeSubtreeModalViewModel ? (
              <>
                <View style={styles.subtreeModalHeader}>
                  <View
                    style={[
                      styles.subtreeModalHeaderTextCol,
                      highlightedNodeId === selectedNodeSubtreeModalViewModel.rootNodeId &&
                        styles.subtreeModalHeaderTextColHighlighted,
                    ]}
                  >
                    <Text style={styles.subtreeModalTitle}>
                      {selectedNodeSubtreeModalViewModel.rootNodeName}
                    </Text>
                    {selectedNodeSubtreeModalViewModel.shortExplanationLabel ? (
                      <Text style={styles.subtreeModalSubtitle}>
                        {selectedNodeSubtreeModalViewModel.shortExplanationLabel}
                      </Text>
                    ) : null}
                    {selectedNodeSubtreeModalViewModel.maintenanceSummaryLine ? (
                      <Text style={styles.planSummaryText}>
                        {selectedNodeSubtreeModalViewModel.maintenanceSummaryLine}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.subtreeModalHeaderActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.maintenanceModeToggle,
                        isNodeMaintenanceModeEnabled && styles.maintenanceModeToggleActive,
                        pressed && styles.maintenanceModeTogglePressed,
                      ]}
                      onPress={() => setIsNodeMaintenanceModeEnabled((prev) => !prev)}
                    >
                      <Text
                        style={[
                          styles.maintenanceModeToggleText,
                          isNodeMaintenanceModeEnabled && styles.maintenanceModeToggleTextActive,
                        ]}
                      >
                        {getNodeModeToggleLabel()}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setSelectedTopLevelNodeId(null);
                        setHighlightedNodeId(null);
                      }}
                      style={({ pressed }) => [
                        styles.subtreeModalCloseBtn,
                        pressed && styles.subtreeModalCloseBtnPressed,
                      ]}
                    >
                      <Text style={styles.subtreeModalCloseBtnText}>Закрыть</Text>
                    </Pressable>
                  </View>
                </View>

                <ScrollView contentContainerStyle={styles.subtreeModalBody} keyboardShouldPersistTaps="handled">
                  {selectedNodeSubtreeModalViewModel.isLeafRoot ? (
                    selectedTopLevelNode ? (
                      <NodeRow
                        node={selectedTopLevelNode}
                        depth={0}
                        expandedIds={expandedIds}
                        onToggle={toggleNode}
                        onAddFromLeaf={openAddServiceFromTreeNode}
                        onAddToWishlist={openWishlistForTreeNode}
                        onOpenContext={openNodeContextModal}
                        onOpenStatusExplanation={openStatusExplanationFromTreeNode}
                        onOpenServiceLogForNode={openServiceLogForTreeNode}
                        isMaintenanceModeEnabled={isNodeMaintenanceModeEnabled}
                        highlightedNodeId={highlightedNodeId}
                      />
                    ) : null
                  ) : (
                    selectedNodeSubtreeModalViewModel.childNodes.map((child) => (
                      <NodeRow
                        key={child.id}
                        node={child}
                        depth={0}
                        expandedIds={expandedIds}
                        onToggle={toggleNode}
                        onAddFromLeaf={openAddServiceFromTreeNode}
                        onAddToWishlist={openWishlistForTreeNode}
                        onOpenContext={openNodeContextModal}
                        onOpenStatusExplanation={openStatusExplanationFromTreeNode}
                        onOpenServiceLogForNode={openServiceLogForTreeNode}
                        isMaintenanceModeEnabled={isNodeMaintenanceModeEnabled}
                        highlightedNodeId={highlightedNodeId}
                      />
                    ))
                  )}
                </ScrollView>
                <AppHelpFab />
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type DashboardTone = NodeStatus | "UNKNOWN";

function DashboardSection({
  title,
  actionLabel,
  onActionPress,
  children,
}: {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.dashboardCard}>
      <View style={styles.dashboardSectionHeader}>
        <Text style={styles.dashboardSectionTitle}>{title}</Text>
        {actionLabel && onActionPress ? (
          <Pressable
            onPress={onActionPress}
            style={({ pressed }) => [styles.dashboardHeaderAction, pressed && styles.dashboardHeaderActionPressed]}
          >
            <Text style={styles.dashboardHeaderActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.dashboardSectionBody}>{children}</View>
    </View>
  );
}

function DashboardActionButton({
  label,
  iconName,
  onPress,
}: {
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.heroQuickActionBtn, pressed && styles.heroQuickActionBtnPressed]}
    >
      <MaterialIcons name={iconName} size={15} color={c.textPrimary} />
      <Text style={styles.heroQuickActionText}>{label}</Text>
    </Pressable>
  );
}

function KpiCard({
  label,
  value,
  detail,
  tone = "UNKNOWN",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: DashboardTone;
}) {
  const tokens = statusSemanticTokens[tone];
  return (
    <View style={styles.kpiCardMobile}>
      <View style={[styles.kpiAccentDot, { backgroundColor: tokens.accent }]} />
      <View style={styles.kpiTextCol}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.kpiDetail} numberOfLines={2}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

function AttentionDashboardRow({
  item,
  onOpen,
  onLog,
  onService,
}: {
  item: AttentionItemViewModel;
  onOpen: () => void;
  onLog: () => void;
  onService?: () => void;
}) {
  const tokens = statusSemanticTokens[item.effectiveStatus];
  return (
    <View style={styles.attentionDashboardRow}>
      <View
        style={[
          styles.attentionDashboardIcon,
          { borderColor: tokens.border, backgroundColor: tokens.background },
        ]}
      >
        <TopNodeIcon iconKey={getTopNodeIconKeyFromCode(item.code)} size={28} color={tokens.accent} />
      </View>
      <View style={styles.attentionDashboardTextCol}>
        <View style={styles.attentionDashboardTitleRow}>
          <Text style={styles.attentionDashboardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.attentionStatusBadge, { borderColor: tokens.border, backgroundColor: tokens.background }]}>
            <Text style={[styles.attentionStatusBadgeText, { color: tokens.foreground }]}>{item.statusLabelRu}</Text>
          </View>
        </View>
        <Text style={styles.attentionDashboardMeta} numberOfLines={1}>
          {item.shortExplanation || item.topLevelParentName || "Нужен контекст узла"}
        </Text>
        <View style={styles.attentionDashboardActions}>
          {onService ? (
            <Pressable onPress={onService} style={({ pressed }) => [styles.compactActionPrimary, pressed && styles.compactActionPressed]}>
              <Text style={styles.compactActionPrimaryText}>ТО</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onOpen} style={({ pressed }) => [styles.compactActionNeutral, pressed && styles.compactActionPressed]}>
            <Text style={styles.compactActionNeutralText}>Узел</Text>
          </Pressable>
          <Pressable onPress={onLog} style={({ pressed }) => [styles.compactActionNeutral, pressed && styles.compactActionPressed]}>
            <Text style={styles.compactActionNeutralText}>Журнал</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function TopOverviewDashboardCard({ card }: { card: TopNodeOverviewCard }) {
  const tokens = card.status ? statusSemanticTokens[card.status] : statusSemanticTokens.UNKNOWN;
  return (
    <View style={styles.systemDashboardCard}>
      <View style={[styles.systemDashboardIcon, { borderColor: tokens.border, backgroundColor: tokens.background }]}>
        <TopNodeIcon iconKey={card.key} size={30} color={tokens.accent} />
      </View>
      <View style={styles.systemDashboardTextCol}>
        <Text style={styles.systemDashboardTitle} numberOfLines={1}>
          {card.title}
        </Text>
        <Text style={[styles.systemDashboardStatus, { color: tokens.foreground }]}>{card.statusLabel}</Text>
        <Text style={styles.systemDashboardMeta} numberOfLines={1}>
          {card.details}
        </Text>
      </View>
    </View>
  );
}

function RecentDashboardEventRow({ event }: { event: ServiceEventItem }) {
  const costLabel =
    event.costAmount && event.currency ? `${formatExpenseAmountRu(event.costAmount)} ${event.currency}` : "—";
  return (
    <View style={styles.recentDashboardRow}>
      <View style={styles.recentDashboardTopRow}>
        <Text style={styles.recentDashboardDate}>{formatIsoCalendarDateRu(event.eventDate)}</Text>
        <Text style={styles.recentDashboardCost}>{costLabel}</Text>
      </View>
      <Text style={styles.recentDashboardTitle} numberOfLines={1}>
        {event.serviceType}
      </Text>
      <Text style={styles.recentDashboardMeta} numberOfLines={1}>
        {event.node?.name || "Без привязки к узлу"}
      </Text>
    </View>
  );
}

function ExpenseDashboardCard({
  summary,
  onPress,
}: {
  summary: ExpenseSummaryViewModel;
  onPress: () => void;
}) {
  const currentMonth = formatExpenseTotals(summary.currentMonthTotalsByCurrency);
  const total = formatExpenseTotals(summary.totalsByCurrency);
  return (
    <DashboardSection title={`Расходы за ${capitalizeFirst(summary.currentMonthLabel)}`} actionLabel="Детали" onActionPress={onPress}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.expenseDashboardPressable, pressed && styles.dashboardHeaderActionPressed]}>
        <View style={styles.expenseDashboardIcon}>
          <MaterialIcons name="account-balance-wallet" size={24} color={c.primaryAction} />
        </View>
        <View style={styles.expenseDashboardTextCol}>
          <Text style={styles.expenseDashboardValue}>{currentMonth}</Text>
          <Text style={styles.expenseDashboardMeta}>
            Всего: {total} · {summary.paidEventCount} {pluralizeRu(summary.paidEventCount, ["запись", "записи", "записей"])}
          </Text>
          {summary.latestPaidEvent ? (
            <Text style={styles.expenseDashboardLatest} numberOfLines={1}>
              Последнее: {summary.latestPaidEvent.serviceType}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </DashboardSection>
  );
}

function PartsDashboardCard({
  onOpenWishlist,
  onAddPart,
}: {
  onOpenWishlist: () => void;
  onAddPart: () => void;
}) {
  return (
    <DashboardSection title="Что нужно купить" actionLabel="Список" onActionPress={onOpenWishlist}>
      <View style={styles.partsDashboardBody}>
        <View style={styles.partsDashboardIcon}>
          <MaterialIcons name="shopping-cart" size={24} color={c.primaryAction} />
        </View>
        <View style={styles.partsDashboardTextCol}>
          <Text style={styles.partsDashboardTitle}>Запчасти и расходники</Text>
          <Text style={styles.partsDashboardMeta}>
            Добавляйте детали из дерева узлов или создавайте позицию вручную.
          </Text>
        </View>
      </View>
      <Pressable onPress={onAddPart} style={({ pressed }) => [styles.partsDashboardButton, pressed && styles.partsDashboardButtonPressed]}>
        <Text style={styles.partsDashboardButtonText}>Добавить деталь</Text>
      </Pressable>
    </DashboardSection>
  );
}

function getRecentDashboardEvents(events: ServiceEventItem[]) {
  return [...events]
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
    .slice(0, 3);
}

function buildMobileRideReadiness(summary: {
  overdueCount: number;
  soonCount: number;
  totalCount: number;
}): { title: string; details: string; tone: DashboardTone } {
  if (summary.overdueCount > 0) {
    return {
      title: "Не готов",
      details: `${summary.overdueCount} ${pluralizeRu(summary.overdueCount, ["просроченный узел", "просроченных узла", "просроченных узлов"])}`,
      tone: "OVERDUE",
    };
  }
  if (summary.soonCount > 0) {
    return {
      title: "Скоро ТО",
      details: `${summary.soonCount} ${pluralizeRu(summary.soonCount, ["узел скоро потребует ТО", "узла скоро потребуют ТО", "узлов скоро потребуют ТО"])}`,
      tone: "SOON",
    };
  }
  if (summary.totalCount === 0) {
    return { title: "Готов", details: "Критичных замечаний нет", tone: "OK" };
  }
  return { title: "Проверить", details: "Есть замечания без критичного статуса", tone: "UNKNOWN" };
}

function buildScoreDetail(summary: { overdueCount: number; soonCount: number; totalCount: number }) {
  if (summary.totalCount === 0) {
    return "Нет активных задач";
  }
  return `${summary.overdueCount} просрочено · ${summary.soonCount} скоро`;
}

function getScoreTone(score: number | null): DashboardTone {
  if (score === null) {
    return "UNKNOWN";
  }
  if (score < 60) {
    return "OVERDUE";
  }
  if (score < 85) {
    return "SOON";
  }
  return "OK";
}

const TOP_NODE_ICON_BY_PREFIX: Array<[string, TopNodeOverviewCard["key"]]> = [
  ["ENGINE.LUBE", "lubrication"],
  ["COOLING", "engine"],
  ["BRAKES", "brakes"],
  ["TIRES", "tires"],
  ["DRIVETRAIN", "chain"],
  ["SUSPENSION", "suspension"],
];

function getTopNodeIconKeyFromCode(code: string): TopNodeOverviewCard["key"] {
  return TOP_NODE_ICON_BY_PREFIX.find(([prefix]) => code.startsWith(prefix))?.[1] ?? "lubrication";
}

function formatExpenseTotals(rows: ExpenseSummaryViewModel["totalsByCurrency"]) {
  if (rows.length === 0) {
    return "0";
  }
  return rows.map((row) => `${formatExpenseAmountRu(row.totalAmount)} ${row.currency}`).join(" · ");
}

function pluralizeRu(value: number, variants: [string, string, string]) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return variants[0];
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return variants[1];
  }
  return variants[2];
}

function capitalizeFirst(value: string) {
  return value.length ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
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
  scrollContentLandscape: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  dashboardTopGrid: {
    gap: 12,
  },
  dashboardTopGridWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  dashboardSectionGrid: {
    gap: 12,
    marginBottom: 12,
  },
  dashboardSectionWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  dashboardLowerGrid: {
    gap: 12,
    marginBottom: 12,
  },
  dashboardLowerGridWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  heroDashboardCard: {
    marginBottom: 12,
  },
  heroDashboardCardWide: {
    flex: 1.22,
    marginBottom: 0,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  heroMetaPanel: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  heroMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  heroMetaLabel: {
    fontSize: 12,
    color: c.textMuted,
  },
  heroMetaValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "700",
    color: c.textPrimary,
  },
  primaryMileageButton: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.6)",
    backgroundColor: c.primaryAction,
  },
  primaryMileageButtonPressed: {
    opacity: 0.9,
  },
  primaryMileageButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: c.onPrimaryAction,
  },
  kpiStackMobile: {
    gap: 8,
    marginBottom: 12,
  },
  kpiCardMobile: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  kpiAccentDot: {
    width: 9,
    height: 38,
    borderRadius: 999,
  },
  kpiTextCol: {
    flex: 1,
    minWidth: 0,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    color: c.textMuted,
  },
  kpiValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "800",
    color: c.textPrimary,
  },
  kpiDetail: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: c.textSecondary,
  },
  dashboardCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 12,
  },
  dashboardSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  dashboardSectionTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "800",
    color: c.textPrimary,
  },
  dashboardHeaderAction: {
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.chipBackground,
  },
  dashboardHeaderActionPressed: {
    opacity: 0.9,
  },
  dashboardHeaderActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: c.textPrimary,
  },
  dashboardSectionBody: {
    gap: 8,
  },
  dashboardEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
  },
  attentionDashboardRow: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 9,
  },
  attentionDashboardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  attentionDashboardTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  attentionDashboardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  attentionDashboardTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: "800",
    color: c.textPrimary,
  },
  attentionDashboardMeta: {
    fontSize: 12,
    color: c.textMuted,
  },
  attentionStatusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  attentionStatusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  attentionDashboardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactActionPrimary: {
    minHeight: 26,
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: c.primaryAction,
  },
  compactActionNeutral: {
    minHeight: 26,
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  compactActionPressed: {
    opacity: 0.88,
  },
  compactActionPrimaryText: {
    fontSize: 11,
    fontWeight: "800",
    color: c.onPrimaryAction,
  },
  compactActionNeutralText: {
    fontSize: 11,
    fontWeight: "800",
    color: c.textSecondary,
  },
  dashboardSystemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  systemDashboardCard: {
    width: "48%",
    minWidth: 136,
    minHeight: 74,
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 9,
  },
  systemDashboardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  systemDashboardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  systemDashboardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: c.textPrimary,
  },
  systemDashboardStatus: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "800",
  },
  systemDashboardMeta: {
    marginTop: 3,
    fontSize: 11,
    color: c.textMuted,
  },
  recentDashboardRow: {
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    gap: 3,
  },
  recentDashboardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  recentDashboardDate: {
    fontSize: 11,
    color: c.textMeta,
  },
  recentDashboardCost: {
    fontSize: 12,
    fontWeight: "800",
    color: c.textPrimary,
  },
  recentDashboardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: c.textPrimary,
  },
  recentDashboardMeta: {
    fontSize: 12,
    color: c.textMuted,
  },
  expenseDashboardPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 10,
  },
  expenseDashboardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(249, 115, 22, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.35)",
  },
  expenseDashboardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  expenseDashboardValue: {
    fontSize: 20,
    fontWeight: "800",
    color: c.textPrimary,
  },
  expenseDashboardMeta: {
    marginTop: 4,
    fontSize: 12,
    color: c.textMuted,
  },
  expenseDashboardLatest: {
    marginTop: 4,
    fontSize: 12,
    color: c.textSecondary,
  },
  partsDashboardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  partsDashboardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(249, 115, 22, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.35)",
  },
  partsDashboardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  partsDashboardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: c.textPrimary,
  },
  partsDashboardMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
  },
  partsDashboardButton: {
    marginTop: 10,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: c.primaryAction,
  },
  partsDashboardButtonPressed: {
    opacity: 0.9,
  },
  partsDashboardButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: c.onPrimaryAction,
  },
  fullTreeSection: {
    marginTop: 2,
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
  titleActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  heroQuickActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  heroQuickActionBtn: {
    flex: 1,
    minHeight: 34,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  heroQuickActionBtnPressed: {
    backgroundColor: c.divider,
  },
  heroQuickActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textMeta,
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
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
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
  stateTextActionButton: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: c.card,
  },
  stateTextActionButtonPressed: {
    backgroundColor: c.divider,
  },
  stateTextActionButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textMeta,
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
  sectionActionsRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  maintenanceModeToggle: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: c.card,
  },
  maintenanceModeToggleActive: {
    backgroundColor: c.textPrimary,
    borderColor: c.textPrimary,
  },
  maintenanceModeTogglePressed: {
    opacity: 0.9,
  },
  maintenanceModeToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textMeta,
  },
  maintenanceModeToggleTextActive: {
    color: c.textInverse,
  },
  sectionJournalButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionJournalButtonPressed: {
    opacity: 0.9,
  },
  sectionJournalButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textMeta,
  },
  sectionSubheader: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
  },
  topOverviewGrid: {
    marginTop: 6,
    marginBottom: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  topOverviewCard: {
    minWidth: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.chipBackground,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  topOverviewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topOverviewTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
    flexShrink: 1,
  },
  topOverviewMeta: {
    fontSize: 11,
    color: c.textMuted,
  },
  topOverviewUnknownBadge: {
    borderColor: c.borderStrong,
    backgroundColor: c.card,
  },
  topOverviewUnknownBadgeText: {
    color: c.textMuted,
  },
  searchLabel: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "700",
    color: c.textMuted,
    textTransform: "uppercase",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    backgroundColor: c.card,
    color: c.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 6,
  },
  searchHint: {
    marginBottom: 8,
    fontSize: 12,
    color: c.textMuted,
  },
  searchResultsBox: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.chipBackground,
    padding: 6,
    gap: 6,
    marginBottom: 10,
  },
  searchResultRow: {
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: c.card,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  searchResultCard: {
    borderRadius: 10,
    backgroundColor: c.card,
  },
  searchResultRowPressed: {
    borderColor: c.borderStrong,
  },
  searchResultTextCol: {
    flex: 1,
    minWidth: 0,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: c.textPrimary,
  },
  searchResultPath: {
    marginTop: 2,
    fontSize: 12,
    color: c.textMuted,
  },
  searchResultCode: {
    marginTop: 2,
    fontSize: 11,
    color: c.textTertiary,
  },
  searchActionsRow: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingBottom: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  searchActionBtn: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: c.card,
  },
  searchActionBtnPressed: {
    backgroundColor: c.divider,
  },
  searchActionBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: c.textMeta,
  },
  searchNoResults: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: c.textSecondary,
    fontSize: 13,
    backgroundColor: c.card,
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
  topLevelNodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  topLevelNodeRowPressed: {
    backgroundColor: c.divider,
  },
  topLevelNodeRowLeft: {
    flex: 1,
    marginRight: 8,
  },
  topLevelNodeName: {
    fontSize: 15,
    fontWeight: "600",
    color: c.textPrimary,
    lineHeight: 20,
  },
  topLevelNodeRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  nodeRowHighlighted: {
    borderWidth: 1,
    borderColor: "#F59E0B",
    backgroundColor: "#FFF7ED",
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
  planSummaryText: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "600",
    color: c.textSecondary,
    lineHeight: 16,
  },
  planLeafBlock: {
    marginTop: 4,
    gap: 2,
  },
  planLeafLine: {
    fontSize: 11,
    color: c.textMeta,
    lineHeight: 15,
  },
  planLeafMuted: {
    fontSize: 11,
    color: c.textMuted,
    lineHeight: 15,
  },
  subtreeModalOverlay: {
    flex: 1,
    backgroundColor: c.overlayModal,
    paddingHorizontal: 10,
    paddingVertical: 16,
    justifyContent: "center",
  },
  subtreeModalCard: {
    maxHeight: "86%",
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  subtreeModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  subtreeModalHeaderTextCol: {
    flex: 1,
    minWidth: 0,
  },
  subtreeModalHeaderTextColHighlighted: {
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  subtreeModalHeaderActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  subtreeModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: c.textPrimary,
  },
  subtreeModalSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: c.textMuted,
  },
  snoozeLabelText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: c.textSecondary,
  },
  subtreeModalCloseBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: c.card,
  },
  subtreeModalCloseBtnPressed: {
    backgroundColor: c.divider,
  },
  subtreeModalCloseBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textMeta,
  },
  subtreeModalBody: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: 88,
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
