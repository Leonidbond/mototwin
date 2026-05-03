import {
  Fragment,
  type ComponentProps,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  type GestureResponderEvent,
  findNodeHandle,
  Image,
  type ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  buildAttentionSummaryFromNodeTree,
  getCurrentExpenseMonthKey,
  getExpenseMonthKeyFromIso,
  buildExpenseSummaryFromServiceEvents,
  buildNodeTreeSectionProps,
  buildNodeContextViewModel,
  buildNodeSearchResultActions,
  buildTopNodeOverviewCards,
  buildNodeMaintenancePlanViewModel,
  buildPartWishlistItemViewModel,
  buildRideProfileViewModel,
  buildPartsCartSummary,
  buildVehicleDetailViewModel,
  buildVehicleStateViewModel,
  canOpenNodeStatusExplanationModal,
  calculateGarageScore,
  createServiceLogNodeFilter,
  calculateSnoozeUntilDate,
  findNodeTreeItemById,
  formatSnoozeUntilLabel,
  getNodeSubtreeById,
  getTopLevelNodeTreeItems,
  isNodeSnoozed,
  partWishlistStatusLabelsRu,
  searchNodeTree,
  formatIsoCalendarDateRu,
  formatExpenseAmountRu,
  filterActiveWishlistItems,
  getRecentServiceEventsForNode,
  formatNodeBadgeSingleLine,
  getNodeTightUiDisplayName,
  resolveGarageVehicleSilhouette,
  type PartsCartSummary,
} from "@mototwin/domain";
import type {
  AttentionItemViewModel,
  ExpenseItem,
  ExpenseSummaryViewModel,
  NodeSnoozeOption,
  NodeContextViewModel,
  NodeStatus,
  NodeTreeItem,
  NodeTreeItemProps,
  NodeTreeItemViewModel,
  NodeTreeSearchResultViewModel,
  NodeTreeSearchActionKey,
  PartWishlistItem,
  PartWishlistItemStatus,
  PartWishlistItemViewModel,
  PartRecommendationViewModel,
  ServiceEventItem,
  ServiceKitViewModel,
  TopNodeOverviewCard,
  TopServiceNodeItem,
  VehicleDetail,
} from "@mototwin/types";
import {
  productSemanticColors as c,
  statusSemanticTokens,
  statusTextLabelsRu,
} from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../../../src/api-base-url";
import {
  readNodeSnoozePreferences,
  writeNodeSnoozePreference,
} from "../../../src/ui-node-snooze-preferences";
import {
  consumeNodeTreeReturnState,
  writeNodeTreeReturnState,
} from "../../../src/ui-node-tree-return-state";
import { getNodeTreeIconAsset } from "../../../../../src/node-tree-icons";
import { buildVehicleServiceLogHref } from "./service-log";
import {
  buildServiceEventNewFromWishlistHref,
  buildVehicleWishlistItemHighlightHref,
  buildVehicleWishlistNewHref,
} from "./wishlist/hrefs";
import { StatusExplanationModal } from "./status-explanation-modal";
import { ActionIconButton } from "../../components/action-icon-button";
import { AppScreenHelpBar } from "../../components/app-screen-help-bar";
import { ScreenHeader } from "../../components/screen-header";
import { HelpTriggerButton } from "../../../src/components/app-help-fab";
import { GarageBottomNav } from "../../../components/garage/GarageBottomNav";
import adventureTouringSilhouette from "../../../../../images/Motocycles/adventure_touring.png";
import enduroDualSportSilhouette from "../../../../../images/Motocycles/enduro_dual_sport.png";
import nakedRoadsterSilhouette from "../../../../../images/Motocycles/naked_roadster.png";
import sportSupersportSilhouette from "../../../../../images/Motocycles/sport_supersport.png";
import cruiserSilhouette from "../../../../../images/Motocycles/cruiser.png";
import classicRetroSilhouette from "../../../../../images/Motocycles/classic_retro.png";
import scooterMaxiScooterSilhouette from "../../../../../images/Motocycles/scooter_maxi_scooter.png";
import brakesIcon from "../../../../../images/top-node-icons-dark/brakes/brakes.png";
import brakesFrontPadsIcon from "../../../../../images/top-node-icons-dark/brakes/brakes_front_pads.png";
import chainSprocketsIcon from "../../../../../images/top-node-icons-dark/chain_sprockets/chain_sprockets.png";
import engineCoolingIcon from "../../../../../images/top-node-icons-dark/engine_cooling/engine_cooling.png";
import coolantIcon from "../../../../../images/top-node-icons-dark/engine_cooling/cooling_liquid_coolant.png";
import lubricationIcon from "../../../../../images/top-node-icons-dark/lubrication/lubrication.png";
import oilIcon from "../../../../../images/top-node-icons-dark/lubrication/engine_lube_oil.png";
import suspensionIcon from "../../../../../images/top-node-icons-dark/suspension/suspension.png";
import tiresIcon from "../../../../../images/top-node-icons-dark/tires/tires.png";
import tiresRearIcon from "../../../../../images/top-node-icons-dark/tires/tires_rear.png";

function getStatusColors(status: NodeStatus | null) {
  const tokens = status ? statusSemanticTokens[status] : statusSemanticTokens.UNKNOWN;
  return { bg: tokens.background, text: tokens.foreground, border: tokens.border };
}

function getNodeAccentColor(status: NodeStatus | null) {
  const tokens = status ? statusSemanticTokens[status] : statusSemanticTokens.UNKNOWN;
  return tokens.accent;
}

type NodeContextExpenseSummary = {
  year: number;
  totalsLabel: string;
  expenseCount: number;
  hasExpenses: boolean;
};

function buildNodeExpenseSummaryFromItems(
  expenses: ExpenseItem[],
  nodeIds: Set<string>,
  year: number
): NodeContextExpenseSummary {
  const totalsByCurrency = new Map<string, number>();
  let expenseCount = 0;
  for (const expense of expenses) {
    if (!expense.nodeId || !nodeIds.has(expense.nodeId)) {
      continue;
    }
    const expenseDate = new Date(expense.expenseDate);
    const expenseYear = Number.isNaN(expenseDate.getTime())
      ? Number(expense.expenseDate.slice(0, 4))
      : expenseDate.getFullYear();
    if (expenseYear !== year) {
      continue;
    }
    expenseCount += 1;
    const currency = expense.currency.trim();
    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + expense.amount);
  }
  const rows = Array.from(totalsByCurrency.entries())
    .filter(([, amount]) => amount > 0)
    .sort(([left], [right]) => left.localeCompare(right, "en"));
  return {
    year,
    totalsLabel:
      rows.length > 0
        ? rows.map(([currency, amount]) => `${formatExpenseAmountRu(amount)} ${currency}`).join(" · ")
        : "0",
    expenseCount,
    hasExpenses: expenseCount > 0,
  };
}

const NODE_STATUS_FILTER_OPTIONS: NodeStatus[] = [
  "OVERDUE",
  "SOON",
  "RECENTLY_REPLACED",
  "OK",
];

type NodeStatusFilter = NodeStatus | "ALL";

function isNodeStatusFilter(value: unknown): value is NodeStatusFilter {
  return value === "ALL" || NODE_STATUS_FILTER_OPTIONS.includes(value as NodeStatus);
}

function findNodeViewModelPathById(
  nodes: NodeTreeItemViewModel[],
  targetNodeId: string,
  path: string[] = []
): string[] | null {
  for (const node of nodes) {
    const nextPath = [...path, node.id];
    if (node.id === targetNodeId) {
      return nextPath;
    }
    const nested = findNodeViewModelPathById(node.children, targetNodeId, nextPath);
    if (nested) {
      return nested;
    }
  }
  return null;
}

const NODE_TREE_TOP_NODES_LIMIT = 15;

function collectNodeIdsOnPathsToTargets(
  roots: NodeTreeItemViewModel[],
  targetIds: Set<string>
): Set<string> {
  const included = new Set<string>();
  const walk = (node: NodeTreeItemViewModel, ancestors: string[]) => {
    const path = [...ancestors, node.id];
    if (targetIds.has(node.id)) {
      path.forEach((id) => included.add(id));
    }
    node.children.forEach((child) => walk(child, path));
  };
  roots.forEach((root) => walk(root, []));
  return included;
}

function filterNodeTreeToNodeIdSet(
  nodes: NodeTreeItemViewModel[],
  keepIds: Set<string>
): NodeTreeItemViewModel[] {
  return nodes.flatMap((node) => {
    if (!keepIds.has(node.id)) {
      return [];
    }
    const children = filterNodeTreeToNodeIdSet(node.children, keepIds);
    return [{ ...node, children, hasChildren: children.length > 0 }];
  });
}

function collectSingleChildExpansionChain(node: NodeTreeItemViewModel): string[] {
  const expandedIds: string[] = [];
  let current: NodeTreeItemViewModel | null = node;
  while (current && current.children.length === 1) {
    expandedIds.push(current.id);
    const onlyChild: NodeTreeItemViewModel | null = current.children[0] ?? null;
    current = onlyChild && onlyChild.children.length > 0 ? onlyChild : null;
  }
  if (expandedIds.length === 0 && node.children.length > 0) {
    expandedIds.push(node.id);
  }
  return expandedIds;
}

function collectSubtreeDescendantItems(
  root: NodeTreeItemViewModel
): { id: string; name: string; depthFromSelected: number }[] {
  const out: { id: string; name: string; depthFromSelected: number }[] = [];
  const walk = (node: NodeTreeItemViewModel, depthFromSelected: number) => {
    for (const child of node.children) {
      out.push({ id: child.id, name: child.name, depthFromSelected });
      walk(child, depthFromSelected + 1);
    }
  };
  walk(root, 1);
  return out;
}

function filterNodeViewModelsByStatus(
  nodes: NodeTreeItemViewModel[],
  status: NodeStatus | null
): NodeTreeItemViewModel[] {
  if (!status) {
    return nodes;
  }

  return nodes.flatMap((node) => {
    const filteredChildren = filterNodeViewModelsByStatus(node.children, status);
    const matches = node.effectiveStatus === status;
    if (!matches && filteredChildren.length === 0) {
      return [];
    }

    return [
      {
        ...node,
        children: filteredChildren,
        hasChildren: filteredChildren.length > 0,
      },
    ];
  });
}

function collectExpandedNodeIdsWithStatusDescendants(
  nodes: NodeTreeItemViewModel[],
  status: NodeStatus
): Set<string> {
  const expandedIds = new Set<string>();

  const walk = (node: NodeTreeItemViewModel): boolean => {
    const hasMatchingChild = node.children.some((child) => walk(child));
    const matches = node.effectiveStatus === status;
    if (hasMatchingChild) {
      expandedIds.add(node.id);
    }
    return matches || hasMatchingChild;
  };

  nodes.forEach((node) => walk(node));
  return expandedIds;
}

function flattenNodeViewModelsById(nodes: NodeTreeItemViewModel[]): Map<string, NodeTreeItemViewModel> {
  const byId = new Map<string, NodeTreeItemViewModel>();
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) {
      continue;
    }
    byId.set(node.id, node);
    stack.push(...node.children);
  }
  return byId;
}

function isIssueNodeStatus(status: NodeStatus | null): status is "OVERDUE" | "SOON" {
  return status === "OVERDUE" || status === "SOON";
}

// ─── Expandable node row ──────────────────────────────────────────────────────

type NodeRowProps = {
  node: NodeTreeItemViewModel;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (node: NodeTreeItemViewModel) => void;
  onAddFromLeaf: (leafNodeId: string) => void;
  onAddToWishlist?: (nodeId: string) => void;
  onOpenContext?: (nodeId: string) => void;
  onOpenStatusExplanation?: (node: NodeTreeItemViewModel) => void;
  onOpenServiceLogForNode?: (node: NodeTreeItemViewModel) => void;
  selectedNodeId?: string | null;
  highlightedNodeId?: string | null;
  statusHighlightedNodeIds?: Set<string>;
  highlightedScrollViewRef?: RefObject<ScrollView | null>;
  highlightedScrollViewportHeight?: number;
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
  selectedNodeId,
  highlightedNodeId,
  statusHighlightedNodeIds,
  highlightedScrollViewRef,
  highlightedScrollViewportHeight,
}: NodeRowProps) {
  const rowRef = useRef<View | null>(null);
  const treeItemContract: NodeTreeItemProps = {
    item: node,
    depth,
    isExpanded: expandedIds.has(node.id),
    onToggleExpand: () => onToggle(node),
    onRequestAddServiceEvent: node.canAddServiceEvent
      ? () => onAddFromLeaf(node.id)
      : undefined,
  };
  const rowNode = treeItemContract.item;
  const hasChildren = rowNode.hasChildren;
  const isExpanded = treeItemContract.isExpanded;
  const status = rowNode.effectiveStatus as NodeStatus | null;
  const colors = getStatusColors(status);
  const label =
    rowNode.effectiveStatus === "OVERDUE"
      ? "Просрочено"
      : rowNode.effectiveStatus === "SOON"
        ? "Скоро"
        : rowNode.effectiveStatus === "RECENTLY_REPLACED"
          ? "Недавно"
          : rowNode.effectiveStatus
            ? "ОК"
            : rowNode.statusLabel;
  const accentColor = getNodeAccentColor(status);
  const isTopLevel = depth === 0;
  const badgeStyle = !isTopLevel ? styles.badgeNested : undefined;
  const badgeTextStyle = !isTopLevel ? styles.badgeTextNested : undefined;
  const childCount = rowNode.children.length;
  const statusHighlightTokens =
    statusHighlightedNodeIds?.has(rowNode.id) && isIssueNodeStatus(rowNode.effectiveStatus)
      ? statusSemanticTokens[rowNode.effectiveStatus]
      : null;
  const reasonShort = rowNode.shortExplanationLabel;
  const canOpenMaintenanceExplanation =
    canOpenNodeStatusExplanationModal(rowNode) && Boolean(onOpenStatusExplanation);
  const openMaintenanceExplanation = (event?: GestureResponderEvent) => {
    event?.stopPropagation();
    if (onOpenStatusExplanation && canOpenMaintenanceExplanation) {
      onOpenStatusExplanation(rowNode);
    }
  };
  const openContext = () => {
    onOpenContext?.(rowNode.id);
  };
  const handleRowPress = () => {
    if (hasChildren) {
      treeItemContract.onToggleExpand();
      return;
    }
    openContext();
  };
  const handleContextButtonPress = (event?: GestureResponderEvent) => {
    event?.stopPropagation();
    openContext();
  };

  useEffect(() => {
    if (
      highlightedNodeId !== rowNode.id ||
      !highlightedScrollViewRef?.current ||
      !rowRef.current
    ) {
      return;
    }
    const timeout = setTimeout(() => {
      const scrollViewHandle = highlightedScrollViewRef.current;
      const rowHandle = rowRef.current;
      const scrollViewNode = scrollViewHandle ? findNodeHandle(scrollViewHandle) : null;
      if (!scrollViewNode || !rowHandle) {
        return;
      }
      const targetScrollView = scrollViewHandle;
      rowHandle.measureLayout(
        scrollViewNode,
        (_x, y, _width, nodeHeight) => {
          const viewportHeight = highlightedScrollViewportHeight ?? 0;
          const centeredY = viewportHeight > 0 ? y - viewportHeight / 2 + nodeHeight / 2 : y;
          targetScrollView?.scrollTo({ y: Math.max(0, centeredY), animated: true });
        },
        () => {}
      );
    }, 80);
    return () => clearTimeout(timeout);
  }, [highlightedNodeId, highlightedScrollViewRef, highlightedScrollViewportHeight, rowNode.id]);

  return (
    <View style={styles.nodeContainer}>
      <Pressable
        ref={rowRef}
        onPress={handleRowPress}
        onLongPress={openContext}
        delayLongPress={260}
        accessibilityRole="button"
        accessibilityLabel={
          hasChildren
            ? `${isExpanded ? "Свернуть" : "Развернуть"} ветку ${rowNode.name}`
            : `Открыть узел ${rowNode.name}`
        }
        accessibilityHint={
          hasChildren
            ? "Долгое нажатие открывает подробности узла."
            : "Откроется панель подробностей узла."
        }
        style={({ pressed }) => [
          styles.nodeRow,
          isTopLevel && styles.nodeRowTopLevel,
          depth > 0 && styles.nodeRowNested,
          (highlightedNodeId === rowNode.id || selectedNodeId === rowNode.id) && styles.nodeRowHighlighted,
          statusHighlightTokens && {
            borderColor: statusHighlightTokens.border,
            borderWidth: 1,
          },
          accentColor !== "transparent" && { borderLeftColor: accentColor, borderLeftWidth: 3 },
          pressed && styles.nodeRowPressed,
        ]}
      >
        <View style={styles.nodeRowLeft}>
          {depth > 0 ? (
            <View style={styles.nodeGuides} pointerEvents="none">
              {Array.from({ length: depth }).map((_, guideIndex) => (
                <View key={`${rowNode.id}.guide.${guideIndex}`} style={styles.nodeGuideColumn}>
                  <View style={styles.nodeGuideVertical} />
                  {guideIndex === depth - 1 ? <View style={styles.nodeGuideElbow} /> : null}
                </View>
              ))}
            </View>
          ) : null}
          <Pressable
            style={styles.chevronWrap}
            onPress={(event) => {
              event.stopPropagation();
              if (hasChildren) {
                treeItemContract.onToggleExpand();
              }
            }}
            hitSlop={6}
            accessibilityRole={hasChildren ? "button" : undefined}
            accessibilityLabel={hasChildren ? (isExpanded ? "Свернуть ветку" : "Развернуть ветку") : undefined}
          >
            {hasChildren ? (
              <Text style={styles.chevron}>{isExpanded ? "▾" : "▸"}</Text>
            ) : (
              <View style={styles.chevronPlaceholder} />
            )}
          </Pressable>
          <View style={styles.nodeTreeIconWrap}>
            <Image
              source={getNodeTreeIconSource(rowNode)}
              style={styles.nodeTreeIconImage}
              resizeMode="contain"
              alt=""
            />
          </View>
          <View style={styles.nodeNameBlock}>
            <Text style={[styles.nodeName, depth === 0 && styles.nodeNameTop]}>
              {rowNode.name}
            </Text>
            <View style={styles.nodeMetaRow}>
              <Text style={styles.nodeCodeText}>{rowNode.code}</Text>
              {childCount > 0 ? (
                <View style={styles.nodeChildCount}>
                  <MaterialIcons name="content-copy" size={10} color={c.textMuted} />
                  <Text style={styles.nodeChildCountText}>{childCount}</Text>
                </View>
              ) : null}
            </View>
            {reasonShort &&
            canOpenMaintenanceExplanation ? (
              <Pressable
                onPress={openMaintenanceExplanation}
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
              onPress={(event) => {
                event.stopPropagation();
                onOpenServiceLogForNode(rowNode);
              }}
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
              <MaterialIcons name="menu-book" size={12} color={colors.text} />
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
          <Pressable
            onPress={handleContextButtonPress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Открыть подробности узла ${rowNode.name}`}
            style={({ pressed }) => [
              styles.nodeContextButton,
              pressed && styles.nodeContextButtonPressed,
            ]}
          >
            <MaterialIcons name="info-outline" size={18} color={c.textMeta} />
          </Pressable>
        </View>
      </Pressable>

      {hasChildren && isExpanded ? (
        <>
          {rowNode.children.map((child) => (
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
              highlightedNodeId={highlightedNodeId}
              selectedNodeId={selectedNodeId}
              statusHighlightedNodeIds={statusHighlightedNodeIds}
              highlightedScrollViewRef={highlightedScrollViewRef}
              highlightedScrollViewportHeight={highlightedScrollViewportHeight}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type VehicleDetailScreenProps = {
  forcedView?: "nodes";
};

export function VehicleDetailScreen({ forcedView }: VehicleDetailScreenProps) {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const dashboardScrollViewRef = useRef<ScrollView | null>(null);
  const subtreeScrollViewRef = useRef<ScrollView | null>(null);
  const appliedNodeTreeReturnStateRef = useRef(false);
  const params = useLocalSearchParams<{
    id?: string | string[];
    nodeContextId?: string;
    nodeId?: string;
    highlightIssueNodeIds?: string;
    returnFocus?: string;
    attentionNodeId?: string;
    view?: string | string[];
  }>();
  const vehicleId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id) && typeof params.id[0] === "string"
        ? params.id[0]
        : "";
  const viewParam = params.view;
  const queryView = Array.isArray(viewParam) ? viewParam[0] : viewParam;
  const shouldRedirectLegacyNodesView = !forcedView && queryView === "nodes";
  const resolvedView = forcedView ?? queryView;
  const isNodeTreePage = resolvedView === "nodes";
  const isLandscape = width > height;
  const isWideLayout = width >= 720 || isLandscape;
  const isTabletLayout = width >= 900;
  const contentMaxWidth = isTabletLayout ? 1080 : 760;
  const currentExpenseYear = new Date().getFullYear();
  const nodeContextIdParam =
    typeof params.nodeContextId === "string" ? params.nodeContextId : "";
  const targetNodeIdParam = typeof params.nodeId === "string" ? params.nodeId : "";
  const highlightIssueNodeIdsParam =
    typeof params.highlightIssueNodeIds === "string" ? params.highlightIssueNodeIds : "";
  const returnFocusParam = typeof params.returnFocus === "string" ? params.returnFocus : "";
  const returnAttentionNodeIdParam =
    typeof params.attentionNodeId === "string" ? params.attentionNodeId : "";

  const pushWishlistFromDashboardForScrollOnReturn = useCallback(
    (href: string) => {
      if (!isNodeTreePage) {
        scrollToPartsWishlistBlockOnNextDashboardFocusRef.current = true;
      }
      router.push(href);
    },
    [isNodeTreePage, router]
  );

  useEffect(() => {
    if (!shouldRedirectLegacyNodesView || !vehicleId) return;
    router.replace(`/vehicles/${vehicleId}/nodes`);
  }, [router, shouldRedirectLegacyNodesView, vehicleId]);

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [nodeTreeError, setNodeTreeError] = useState("");
  const [isNodeTreeLoading, setIsNodeTreeLoading] = useState(false);
  const [isTopServiceNodesLoading, setIsTopServiceNodesLoading] = useState(false);
  const [topServiceNodesError, setTopServiceNodesError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedNodeContextId, setSelectedNodeContextId] = useState<string | null>(null);
  const [nodeSearchQuery, setNodeSearchQuery] = useState("");
  const [debouncedNodeSearchQuery, setDebouncedNodeSearchQuery] = useState("");
  const [nodeStatusFilter, setNodeStatusFilter] = useState<NodeStatusFilter>("ALL");
  const [nodeTreeTopOnly, setNodeTreeTopOnly] = useState(false);
  const [isSubtreeCompositionExpanded, setIsSubtreeCompositionExpanded] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [statusHighlightedNodeIds, setStatusHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [selectedAttentionItem, setSelectedAttentionItem] =
    useState<AttentionItemViewModel | null>(null);
  const [highlightedAttentionNodeId, setHighlightedAttentionNodeId] = useState<string | null>(null);
  const attentionBlockYRef = useRef(0);
  const partsWishlistBlockYRef = useRef(0);
  /** После возврата с wishlist/new — прокрутить дашборд к блоку «Подбор деталей» (см. useEffect ниже). */
  const scrollToPartsWishlistBlockOnNextDashboardFocusRef = useRef(false);
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
  const [statusExplanationNode, setStatusExplanationNode] =
    useState<NodeTreeItemViewModel | null>(null);
  const [serviceEvents, setServiceEvents] = useState<ServiceEventItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<PartWishlistItem[]>([]);
  const [yearExpenses, setYearExpenses] = useState<ExpenseItem[]>([]);
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
    setWishlistItems([]);
    setYearExpenses([]);

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
      setWishlistItems([]);
      setYearExpenses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    setIsNodeTreeLoading(true);
    setIsTopServiceNodesLoading(true);
    const [
      nodesResult,
      eventsResult,
      topNodesResult,
      yearExpensesResult,
      wishlistResult,
    ] = await Promise.allSettled([
      endpoints.getNodeTree(vehicleId),
      endpoints.getServiceEvents(vehicleId),
      endpoints.getTopServiceNodes(),
      endpoints.getExpenses({ vehicleId, year: currentExpenseYear }),
      endpoints.getVehicleWishlist(vehicleId),
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

    if (yearExpensesResult.status === "fulfilled") {
      setYearExpenses(yearExpensesResult.value.expenses ?? []);
    } else {
      console.error(yearExpensesResult.reason);
      setYearExpenses([]);
    }

    if (wishlistResult.status === "fulfilled") {
      setWishlistItems(wishlistResult.value.items ?? []);
    } else {
      console.error(wishlistResult.reason);
      setWishlistItems([]);
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
  }, [apiBaseUrl, currentExpenseYear, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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

  const { roots: nodeTreeViewModel } = useMemo(
    () => buildNodeTreeSectionProps(nodeTree),
    [nodeTree]
  );
  const topLevelNodeViewModels = useMemo(
    () => getTopLevelNodeTreeItems(nodeTreeViewModel),
    [nodeTreeViewModel]
  );
  const selectedNodeStatusFilter = nodeStatusFilter === "ALL" ? null : nodeStatusFilter;
  useEffect(() => {
    if (!selectedNodeStatusFilter) {
      return;
    }
    const expandedNodeIds = collectExpandedNodeIdsWithStatusDescendants(
      topLevelNodeViewModels,
      selectedNodeStatusFilter
    );
    setExpandedIds((prev) => {
      const next = new Set(prev);
      expandedNodeIds.forEach((nodeId) => {
        next.add(nodeId);
      });
      return next;
    });
  }, [topLevelNodeViewModels, selectedNodeStatusFilter]);
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
  const overviewTopNodeIdsOrderedForTree = useMemo(
    () =>
      topNodeOverviewCards
        .flatMap((card) => card.nodes.map((node) => node.id))
        .filter((id) => findNodeViewModelPathById(topLevelNodeViewModels, id) != null),
    [topNodeOverviewCards, topLevelNodeViewModels]
  );
  const hasExpandedNodeTreeItems = useMemo(() => expandedIds.size > 0, [expandedIds]);
  const filteredTopLevelNodeViewModels = useMemo(
    () => {
      let visibleRoots = topLevelNodeViewModels;
      if (nodeTreeTopOnly) {
        const targetIds = new Set(
          overviewTopNodeIdsOrderedForTree.slice(0, NODE_TREE_TOP_NODES_LIMIT)
        );
        const keepIds = collectNodeIdsOnPathsToTargets(topLevelNodeViewModels, targetIds);
        visibleRoots = filterNodeTreeToNodeIdSet(topLevelNodeViewModels, keepIds);
      }
      return filterNodeViewModelsByStatus(visibleRoots, selectedNodeStatusFilter);
    },
    [
      topLevelNodeViewModels,
      selectedNodeStatusFilter,
      nodeTreeTopOnly,
      overviewTopNodeIdsOrderedForTree,
    ]
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
  useEffect(() => {
    setIsSubtreeCompositionExpanded(false);
  }, [selectedNodeContextId]);
  const isSelectedNodeContextTopLevel = useMemo(
    () =>
      selectedNodeContextId != null &&
      topLevelNodeViewModels.some((node) => node.id === selectedNodeContextId),
    [selectedNodeContextId, topLevelNodeViewModels]
  );
  const subtreeCompositionItems = useMemo(
    () => (selectedNodeContextNode ? collectSubtreeDescendantItems(selectedNodeContextNode) : []),
    [selectedNodeContextNode]
  );
  const visibleSubtreeCompositionItems = isSubtreeCompositionExpanded
    ? subtreeCompositionItems
    : subtreeCompositionItems.slice(0, 12);
  const showSubtreeCompositionSection =
    Boolean(selectedNodeContextNode) &&
    Boolean(selectedNodeContextViewModel) &&
    !selectedNodeContextViewModel?.isLeaf &&
    isSelectedNodeContextTopLevel &&
    subtreeCompositionItems.length > 0;
  const selectedNodeFilterIds = useMemo(() => {
    if (selectedNodeContextRawNode) {
      return new Set(createServiceLogNodeFilter(selectedNodeContextRawNode).nodeIds);
    }
    return selectedNodeContextId ? new Set([selectedNodeContextId]) : new Set<string>();
  }, [selectedNodeContextRawNode, selectedNodeContextId]);
  const selectedUninstalledParts = useMemo(
    () =>
      filterActiveWishlistItems(wishlistItems)
        .map(buildPartWishlistItemViewModel)
        .filter((item) => item.nodeId != null && selectedNodeFilterIds.has(item.nodeId)),
    [selectedNodeFilterIds, wishlistItems]
  );
  const selectedNodeExpenseSummary = useMemo(
    () => buildNodeExpenseSummaryFromItems(yearExpenses, selectedNodeFilterIds, currentExpenseYear),
    [currentExpenseYear, selectedNodeFilterIds, yearExpenses]
  );
  const wishlistActiveSummary = useMemo((): PartsCartSummary => {
    const active = filterActiveWishlistItems(wishlistItems).map(buildPartWishlistItemViewModel);
    return buildPartsCartSummary(active);
  }, [wishlistItems]);
  const wishlistInstalledOnlyCount = useMemo(
    () => wishlistItems.filter((it) => it.status === "INSTALLED").length,
    [wishlistItems]
  );
  const nodeSearchResults = useMemo<NodeTreeSearchResultViewModel[]>(
    () =>
      searchNodeTree(filteredTopLevelNodeViewModels, {
        query: debouncedNodeSearchQuery,
        limit: 10,
        minQueryLength: 2,
      }),
    [filteredTopLevelNodeViewModels, debouncedNodeSearchQuery]
  );
  const attentionSummary = useMemo(
    () => buildAttentionSummaryFromNodeTree(nodeTree),
    [nodeTree]
  );
  const nodeViewModelById = useMemo(
    () => flattenNodeViewModelsById(topLevelNodeViewModels),
    [topLevelNodeViewModels]
  );
  const selectedAttentionNode = selectedAttentionItem
    ? nodeViewModelById.get(selectedAttentionItem.nodeId) ?? null
    : null;
  const selectedAttentionWishlistItem = useMemo(() => {
    if (!selectedAttentionItem) {
      return null;
    }
    return (
      filterActiveWishlistItems(wishlistItems)
        .map(buildPartWishlistItemViewModel)
        .find((item) => item.nodeId === selectedAttentionItem.nodeId) ?? null
    );
  }, [selectedAttentionItem, wishlistItems]);
  useEffect(() => {
    if (isNodeTreePage || returnFocusParam !== "attention") {
      return;
    }
    const focusNodeId = returnAttentionNodeIdParam || attentionSummary.items[0]?.nodeId || null;
    const timeoutId = setTimeout(() => {
      dashboardScrollViewRef.current?.scrollTo({
        y: Math.max(0, attentionBlockYRef.current - 14),
        animated: true,
      });
      if (focusNodeId) {
        setHighlightedAttentionNodeId(focusNodeId);
      }
      router.replace(`/vehicles/${vehicleId}`);
    }, 120);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    attentionSummary.items,
    isNodeTreePage,
    returnAttentionNodeIdParam,
    returnFocusParam,
    router,
    vehicleId,
  ]);

  useEffect(() => {
    if (isLoading || isNodeTreePage || !vehicle) {
      return;
    }
    if (!scrollToPartsWishlistBlockOnNextDashboardFocusRef.current) {
      return;
    }
    const timeoutId = setTimeout(() => {
      dashboardScrollViewRef.current?.scrollTo({
        y: Math.max(0, partsWishlistBlockYRef.current - 14),
        animated: true,
      });
      scrollToPartsWishlistBlockOnNextDashboardFocusRef.current = false;
    }, 380);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isLoading, isNodeTreePage, vehicle]);

  useEffect(() => {
    if (!highlightedAttentionNodeId) {
      return;
    }
    const timeoutId = setTimeout(() => {
      setHighlightedAttentionNodeId(null);
    }, 1800);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [highlightedAttentionNodeId]);
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

  function toggleNode(node: NodeTreeItemViewModel) {
    const chainIds = collectSingleChildExpansionChain(node);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      const shouldExpand = !next.has(node.id);
      for (const id of chainIds) {
        if (shouldExpand) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      if (chainIds.length === 0) {
        if (shouldExpand) {
          next.add(node.id);
        } else {
          next.delete(node.id);
        }
      }
      return next;
    });
  }

  const persistNodeTreeReturnState = useCallback(
    (selectedNodeId: string) => {
      if (!vehicleId || !isNodeTreePage) {
        return;
      }
      appliedNodeTreeReturnStateRef.current = false;
      void writeNodeTreeReturnState(vehicleId, {
        selectedNodeId,
        nodeStatusFilter,
        nodeTreeTopOnly,
        expandedIds: Array.from(expandedIds),
      });
    },
    [expandedIds, isNodeTreePage, nodeStatusFilter, nodeTreeTopOnly, vehicleId]
  );

  const openServiceLogForTreeNode = useCallback(
    (vm: NodeTreeItemViewModel, options?: { serviceEventId?: string; returnNodeId?: string }) => {
      setHighlightedNodeId(null);
      persistNodeTreeReturnState(options?.returnNodeId ?? vm.id);
      const raw = findNodeTreeItemById(nodeTree, vm.id);
      if (!raw) {
        return;
      }
      const filter = createServiceLogNodeFilter(raw);
      router.push(
        buildVehicleServiceLogHref(vehicleId, filter, false, {
          serviceEventId: options?.serviceEventId,
          returnNodeId: options?.returnNodeId ?? vm.id,
        })
      );
    },
    [nodeTree, persistNodeTreeReturnState, router, vehicleId]
  );

  const openWishlistForTreeNode = useCallback(
    (nodeId: string) => {
      setHighlightedNodeId(null);
      persistNodeTreeReturnState(nodeId);
      router.push(buildVehicleWishlistNewHref(vehicleId, nodeId));
    },
    [persistNodeTreeReturnState, router, vehicleId]
  );
  const openAddServiceFromTreeNode = useCallback(
    (leafNodeId: string) => {
      setHighlightedNodeId(null);
      router.push(`/vehicles/${vehicleId}/service-events/new?source=tree&nodeId=${leafNodeId}`);
    },
    [router, vehicleId]
  );
  const openStatusExplanationFromTreeNode = useCallback((node: NodeTreeItemViewModel) => {
    setHighlightedNodeId(null);
    setStatusExplanationNode(null);
    requestAnimationFrame(() => {
      setStatusExplanationNode(node);
    });
  }, []);
  const openSearchResultInNodeContext = useCallback((result: NodeTreeSearchResultViewModel) => {
    setNodeSearchQuery("");
    setDebouncedNodeSearchQuery("");
    setHighlightedNodeId(result.nodeId);
    setSelectedNodeContextId(result.nodeId);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const ancestorId of result.ancestorIds) {
        next.add(ancestorId);
      }
      return next;
    });
  }, []);
  const focusNodeInTree = useCallback(
    (nodeId: string, options: { resetFilters?: boolean } = {}) => {
      const path = findNodeViewModelPathById(topLevelNodeViewModels, nodeId);
      if (!path || path.length === 0) {
        return;
      }
      setNodeSearchQuery("");
      setDebouncedNodeSearchQuery("");
      if (options.resetFilters ?? true) {
        setNodeStatusFilter("ALL");
      }
      setHighlightedNodeId(nodeId);
      setSelectedNodeContextId(nodeId);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        for (const ancestorId of path.slice(0, -1)) {
          next.add(ancestorId);
        }
        return next;
      });
    },
    [topLevelNodeViewModels]
  );
  const focusIssueNodesInTree = useCallback(
    (nodeIds: string[]) => {
      const idToNode = flattenNodeViewModelsById(topLevelNodeViewModels);
      const nextHighlightedIds = new Set<string>();
      let focusNodeId: string | null = null;
      setExpandedIds((prev) => {
        const next = new Set(prev);
        for (const nodeId of nodeIds) {
          const path = findNodeViewModelPathById(topLevelNodeViewModels, nodeId);
          if (!path || path.length === 0) {
            continue;
          }
          for (const ancestorId of path.slice(0, -1)) {
            next.add(ancestorId);
          }
          for (const pathNodeId of path) {
            const pathNode = idToNode.get(pathNodeId);
            if (pathNode && isIssueNodeStatus(pathNode.effectiveStatus)) {
              nextHighlightedIds.add(pathNode.id);
              focusNodeId ??= pathNode.id;
            }
          }
        }
        return next;
      });
      setNodeSearchQuery("");
      setDebouncedNodeSearchQuery("");
      setStatusHighlightedNodeIds(nextHighlightedIds);
      setHighlightedNodeId(focusNodeId);
      setSelectedNodeContextId(focusNodeId);
      setNodeStatusFilter("ALL");
    },
    [topLevelNodeViewModels]
  );
  const openTopOverviewNode = useCallback(
    (nodeId: string) => {
      if (isNodeTreePage) {
        setStatusHighlightedNodeIds(new Set());
        focusNodeInTree(nodeId);
        return;
      }
      router.push(`/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(nodeId)}`);
    },
    [focusNodeInTree, isNodeTreePage, router, vehicleId]
  );
  const closeAttentionActions = useCallback(() => {
    setSelectedAttentionItem(null);
  }, []);
  const openAttentionActions = useCallback((item: AttentionItemViewModel) => {
    setSelectedAttentionItem(item);
  }, []);
  const openFirstAttentionActions = useCallback(() => {
    const firstItem = attentionSummary.items[0];
    if (!firstItem) {
      Alert.alert("Требует внимания", "Критичных замечаний нет.");
      return;
    }
    setSelectedAttentionItem(firstItem);
  }, [attentionSummary.items]);
  const openSelectedAttentionNodeInTree = useCallback(() => {
    if (!selectedAttentionItem) {
      return;
    }
    closeAttentionActions();
    openTopOverviewNode(selectedAttentionItem.nodeId);
  }, [closeAttentionActions, openTopOverviewNode, selectedAttentionItem]);
  const openSelectedAttentionServiceLog = useCallback(() => {
    if (!selectedAttentionNode) {
      return;
    }
    closeAttentionActions();
    const raw = findNodeTreeItemById(nodeTree, selectedAttentionNode.id);
    if (!raw) {
      return;
    }
    const filter = createServiceLogNodeFilter(raw);
    router.push(
      buildVehicleServiceLogHref(vehicleId, filter, false, {
        returnOrigin: "attention",
        returnAttentionNodeId: selectedAttentionNode.id,
      })
    );
  }, [closeAttentionActions, nodeTree, router, selectedAttentionNode, vehicleId]);
  const openSelectedAttentionServiceEventForm = useCallback(() => {
    if (!selectedAttentionNode?.canAddServiceEvent) {
      return;
    }
    closeAttentionActions();
    router.push(
      `/vehicles/${vehicleId}/service-events/new?source=attention&nodeId=${encodeURIComponent(
        selectedAttentionNode.id
      )}`
    );
  }, [closeAttentionActions, router, selectedAttentionNode, vehicleId]);
  const openSelectedAttentionWishlistForm = useCallback(() => {
    if (!selectedAttentionItem) {
      return;
    }
    closeAttentionActions();
    pushWishlistFromDashboardForScrollOnReturn(
      buildVehicleWishlistNewHref(vehicleId, selectedAttentionItem.nodeId)
    );
  }, [closeAttentionActions, pushWishlistFromDashboardForScrollOnReturn, selectedAttentionItem, vehicleId]);
  const openSelectedAttentionWishlistItem = useCallback(() => {
    if (!selectedAttentionWishlistItem) {
      return;
    }
    closeAttentionActions();
    pushWishlistFromDashboardForScrollOnReturn(
      buildVehicleWishlistItemHighlightHref(vehicleId, selectedAttentionWishlistItem.id, {
        partsStatus: selectedAttentionWishlistItem.status,
      })
    );
  }, [
    closeAttentionActions,
    pushWishlistFromDashboardForScrollOnReturn,
    selectedAttentionWishlistItem,
    vehicleId,
  ]);
  const openTopOverviewIssueNodes = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) {
        return;
      }
      if (isNodeTreePage) {
        focusIssueNodesInTree(nodeIds);
        return;
      }
      router.push(
        `/vehicles/${vehicleId}/nodes?highlightIssueNodeIds=${encodeURIComponent(nodeIds.join(","))}`
      );
    },
    [focusIssueNodesInTree, isNodeTreePage, router, vehicleId]
  );
  useEffect(() => {
    if (!isNodeTreePage || !targetNodeIdParam || topLevelNodeViewModels.length === 0) {
      return;
    }
    setStatusHighlightedNodeIds(new Set());
    focusNodeInTree(targetNodeIdParam);
  }, [focusNodeInTree, isNodeTreePage, targetNodeIdParam, topLevelNodeViewModels.length]);
  useEffect(() => {
    if (
      !isNodeTreePage ||
      !vehicleId ||
      topLevelNodeViewModels.length === 0 ||
      appliedNodeTreeReturnStateRef.current
    ) {
      return;
    }
    appliedNodeTreeReturnStateRef.current = true;
    let isCancelled = false;
    void consumeNodeTreeReturnState(vehicleId).then((state) => {
      if (isCancelled || !state?.selectedNodeId) {
        return;
      }
      if (isNodeStatusFilter(state.nodeStatusFilter)) {
        setNodeStatusFilter(state.nodeStatusFilter);
      }
      setNodeTreeTopOnly(Boolean(state.nodeTreeTopOnly));
      setExpandedIds(new Set(Array.isArray(state.expandedIds) ? state.expandedIds : []));
      requestAnimationFrame(() => {
        focusNodeInTree(state.selectedNodeId, { resetFilters: false });
      });
    });
    return () => {
      isCancelled = true;
    };
  }, [focusNodeInTree, isNodeTreePage, topLevelNodeViewModels.length, vehicleId]);
  useEffect(() => {
    if (!isNodeTreePage || !highlightIssueNodeIdsParam || topLevelNodeViewModels.length === 0) {
      return;
    }
    const nodeIds = highlightIssueNodeIdsParam
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    focusIssueNodesInTree(nodeIds);
  }, [
    focusIssueNodesInTree,
    highlightIssueNodeIdsParam,
    isNodeTreePage,
    topLevelNodeViewModels.length,
  ]);
  const closeNodeContextModal = useCallback(() => {
    setSelectedNodeContextId(null);
    setNodeContextAddingRecommendedSkuId("");
    setNodeContextAddingKitCode("");
  }, []);
  const openSelectedNodeExpenses = useCallback(() => {
    if (!selectedNodeContextId) {
      return;
    }
    closeNodeContextModal();
    router.push(
      `/vehicles/${vehicleId}/expenses?nodeId=${encodeURIComponent(selectedNodeContextId)}&year=${currentExpenseYear}&returnNodeId=${encodeURIComponent(selectedNodeContextId)}`
    );
  }, [closeNodeContextModal, currentExpenseYear, router, selectedNodeContextId, vehicleId]);
  const openNodeContextModal = useCallback((nodeId: string) => {
    setHighlightedNodeId(null);
    setSelectedNodeContextId(nodeId);
  }, []);
  const selectCompositionNode = useCallback(
    (nodeId: string) => {
      focusNodeInTree(nodeId);
      setSelectedNodeContextId(nodeId);
      requestAnimationFrame(() => {
        subtreeScrollViewRef.current?.scrollTo({ y: 0, animated: true });
      });
    },
    [focusNodeInTree]
  );
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
  const openStatusExplanationFromSearchResult = useCallback(
    (result: NodeTreeSearchResultViewModel) => {
      const selectedNode = getNodeSubtreeById(topLevelNodeViewModels, result.nodeId);
      if (!selectedNode || !canOpenNodeStatusExplanationModal(selectedNode)) {
        return;
      }
      setNodeSearchQuery("");
      setDebouncedNodeSearchQuery("");
      setHighlightedNodeId(null);
      setStatusExplanationNode(null);
      requestAnimationFrame(() => {
        setStatusExplanationNode(selectedNode);
      });
    },
    [topLevelNodeViewModels]
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
  const openWishlistFormForRecommendedSku = useCallback(
    (rec: PartRecommendationViewModel) => {
      if (!vehicleId || !selectedNodeContextId) {
        return;
      }
      persistNodeTreeReturnState(selectedNodeContextId);
      closeNodeContextModal();
      pushWishlistFromDashboardForScrollOnReturn(
        buildVehicleWishlistNewHref(vehicleId, selectedNodeContextId, { skuId: rec.skuId })
      );
    },
    [
      closeNodeContextModal,
      persistNodeTreeReturnState,
      pushWishlistFromDashboardForScrollOnReturn,
      selectedNodeContextId,
      vehicleId,
    ]
  );
  const openWishlistFormForServiceKit = useCallback(
    (kit: ServiceKitViewModel) => {
      if (!vehicleId || !selectedNodeContextId) {
        return;
      }
      persistNodeTreeReturnState(selectedNodeContextId);
      closeNodeContextModal();
      pushWishlistFromDashboardForScrollOnReturn(
        buildVehicleWishlistNewHref(vehicleId, selectedNodeContextId, {
          kitCode: kit.code,
          focusKits: true,
        })
      );
    },
    [
      closeNodeContextModal,
      persistNodeTreeReturnState,
      pushWishlistFromDashboardForScrollOnReturn,
      selectedNodeContextId,
      vehicleId,
    ]
  );
  const openWishlistItemFromNodeContext = useCallback(
    (item: PartWishlistItemViewModel) => {
      if (!vehicleId) {
        return;
      }
      persistNodeTreeReturnState(item.nodeId ?? selectedNodeContextId ?? item.id);
      closeNodeContextModal();
      pushWishlistFromDashboardForScrollOnReturn(
        buildVehicleWishlistItemHighlightHref(vehicleId, item.id, { partsStatus: item.status })
      );
    },
    [
      closeNodeContextModal,
      persistNodeTreeReturnState,
      pushWishlistFromDashboardForScrollOnReturn,
      selectedNodeContextId,
      vehicleId,
    ]
  );
  const advanceWishlistItemStatusFromNodeContext = useCallback(
    async (item: PartWishlistItemViewModel) => {
      if (!vehicleId || !item.nodeId) {
        return;
      }
      const nextStatus: PartWishlistItemStatus =
        item.status === "NEEDED"
          ? "ORDERED"
          : item.status === "ORDERED"
            ? "BOUGHT"
            : "INSTALLED";
      if (nextStatus === "INSTALLED") {
        persistNodeTreeReturnState(item.nodeId);
        closeNodeContextModal();
        router.push(buildServiceEventNewFromWishlistHref(vehicleId, item));
        return;
      }
      try {
        const res = await createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl })).updateWishlistItem(
          vehicleId,
          item.id,
          { status: nextStatus, nodeId: item.nodeId }
        );
        setWishlistItems((prev) =>
          prev.map((candidate) => (candidate.id === item.id ? res.item : candidate))
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : "Не удалось обновить статус позиции.";
        Alert.alert("Список покупок", message);
      }
    },
    [apiBaseUrl, closeNodeContextModal, persistNodeTreeReturnState, router, vehicleId]
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
  const selectedNodeSnoozeUntil = selectedNodeContextId
    ? (nodeSnoozeByNodeId[selectedNodeContextId] ?? null)
    : null;
  const selectedNodeSnoozeLabel = formatSnoozeUntilLabel(selectedNodeSnoozeUntil);
  const canSnoozeSelectedNode =
    selectedNodeContextViewModel?.effectiveStatus === "OVERDUE" ||
    selectedNodeContextViewModel?.effectiveStatus === "SOON";
  const canOpenSelectedNodeContextExplanation = selectedNodeContextNode
    ? canOpenNodeStatusExplanationModal(selectedNodeContextNode)
    : false;
  const openSelectedNodeContextExplanation = useCallback(() => {
    if (!selectedNodeContextNode || !canOpenNodeStatusExplanationModal(selectedNodeContextNode)) {
      return;
    }
    closeNodeContextModal();
    setStatusExplanationNode(null);
    requestAnimationFrame(() => {
      setStatusExplanationNode(selectedNodeContextNode);
    });
  }, [closeNodeContextModal, selectedNodeContextNode]);
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
  const expenseSummaryMonthTotals = useMemo(() => {
    const currentMonthKey = getCurrentExpenseMonthKey();
    const byCurrency = new Map<string, { total: number; count: number }>();
    for (const expense of yearExpenses) {
      if (getExpenseMonthKeyFromIso(expense.expenseDate) !== currentMonthKey) continue;
      const currency = expense.currency.trim();
      const prev = byCurrency.get(currency) ?? { total: 0, count: 0 };
      byCurrency.set(currency, { total: prev.total + expense.amount, count: prev.count + 1 });
    }
    return Array.from(byCurrency.entries())
      .map(([currency, row]) => ({
        currency,
        totalAmount: row.total,
        paidEventCount: row.count,
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency, "en"));
  }, [yearExpenses]);
  const expenseSummary = useMemo(
    () => buildExpenseSummaryFromServiceEvents(serviceEvents),
    [serviceEvents]
  );
  const expenseSummaryForCard = useMemo(
    () => ({ ...expenseSummary, currentMonthTotalsByCurrency: expenseSummaryMonthTotals }),
    [expenseSummary, expenseSummaryMonthTotals]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <AppScreenHelpBar />
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={c.textPrimary} />
          <Text style={styles.stateText}>Загрузка мотоцикла...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <AppScreenHelpBar />
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Ошибка загрузки</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <AppScreenHelpBar />
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
  const dashboardSectionStyle = isWideLayout ? styles.dashboardSectionWide : undefined;
  const score = calculateGarageScore({
    totalCount: attentionSummary.totalCount,
    overdueCount: attentionSummary.overdueCount,
    soonCount: attentionSummary.soonCount,
  });
  const okCount = Math.max(0, 10 - attentionSummary.totalCount);
  const recentEvents = getRecentDashboardEvents(serviceEvents);
  const silhouetteSource = getVehicleSilhouetteSource(vehicle);

  if (shouldRedirectLegacyNodesView) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusExplanationModal
        visible={Boolean(statusExplanationNode?.statusExplanation)}
        node={statusExplanationNode}
        onClose={() => setStatusExplanationNode(null)}
      />
      <ScrollView
        ref={dashboardScrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
          { maxWidth: contentMaxWidth, width: "100%", alignSelf: "center" },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {isNodeTreePage ? (
          <>
            <ScreenHeader
              title="Дерево узлов"
              onBack={() => {
                if (router.canGoBack()) {
                  router.back();
                  return;
                }
                router.replace(`/vehicles/${vehicleId}`);
              }}
            />
            <View style={styles.fullTreeSection}>
              <View style={styles.nodeTreeControls}>
                <View style={styles.nodeTreeTopControlsRow}>
                  <View style={styles.nodeTreeSearchBox}>
                    <MaterialIcons name="search" size={13} color={c.textMuted} />
                    <TextInput
                      style={styles.nodeTreeSearchInputCompact}
                      value={nodeSearchQuery}
                      onChangeText={setNodeSearchQuery}
                      placeholder=""
                      placeholderTextColor={c.textSecondary}
                      returnKeyType="search"
                      accessibilityLabel="Поиск по узлам"
                    />
                    <MaterialIcons name="tune" size={13} color={c.textMuted} />
                  </View>
                  <Pressable
                    onPress={() => setExpandedIds(new Set())}
                    disabled={!hasExpandedNodeTreeItems}
                    style={({ pressed }) => [
                      styles.statusFilterChip,
                      styles.nodeTreeUtilityChip,
                      !hasExpandedNodeTreeItems && styles.nodeTreeUtilityChipDisabled,
                      pressed && hasExpandedNodeTreeItems && styles.statusFilterChipPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Свернуть раскрытые ветки дерева"
                  >
                    <Text style={styles.statusFilterChipText}>Свернуть дерево</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setNodeTreeTopOnly((prev) => !prev)}
                    disabled={isTopServiceNodesLoading || overviewTopNodeIdsOrderedForTree.length === 0}
                    style={({ pressed }) => [
                      styles.statusFilterChip,
                      styles.nodeTreeUtilityChip,
                      nodeTreeTopOnly && styles.statusFilterChipActiveNeutral,
                      (isTopServiceNodesLoading || overviewTopNodeIdsOrderedForTree.length === 0) &&
                        styles.nodeTreeUtilityChipDisabled,
                      pressed && styles.statusFilterChipPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: nodeTreeTopOnly }}
                    accessibilityLabel="Показать только ТОП-узлы дерева"
                  >
                    <Text
                      style={[
                        styles.statusFilterChipText,
                        nodeTreeTopOnly && styles.statusFilterChipTextActiveNeutral,
                      ]}
                    >
                      ТОП-узлы
                    </Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.statusFilterRow}
                >
                  <Pressable
                    onPress={() => setNodeStatusFilter("ALL")}
                    style={({ pressed }) => [
                      styles.statusFilterChip,
                      nodeStatusFilter === "ALL" && styles.statusFilterChipActiveNeutral,
                      pressed && styles.statusFilterChipPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Показать узлы со всеми статусами"
                  >
                    <Text
                      style={[
                        styles.statusFilterChipText,
                        nodeStatusFilter === "ALL" && styles.statusFilterChipTextActiveNeutral,
                      ]}
                    >
                      Все
                    </Text>
                  </Pressable>
                  {NODE_STATUS_FILTER_OPTIONS.map((status) => {
                    const tokens = statusSemanticTokens[status];
                    const isActive = nodeStatusFilter === status;
                    return (
                      <Pressable
                        key={status}
                        onPress={() => setNodeStatusFilter(status)}
                        style={({ pressed }) => [
                          styles.statusFilterChip,
                          isActive && {
                            backgroundColor: tokens.background,
                            borderColor: tokens.border,
                          },
                          pressed && styles.statusFilterChipPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Показать узлы со статусом ${statusTextLabelsRu[status]}`}
                      >
                        <Text style={[styles.statusFilterChipText, isActive && { color: tokens.foreground }]}>
                          {status === "RECENTLY_REPLACED" ? "Недавно" : statusTextLabelsRu[status]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {nodeSearchQuery.trim().length > 0 && nodeSearchQuery.trim().length < 2 ? (
                  <Text style={styles.searchHint}>Введите минимум 2 символа.</Text>
                ) : null}
                {nodeSearchQuery.trim().length >= 2 ? (
                  nodeSearchResults.length > 0 ? (
                    <View style={styles.searchResultsBox}>
                      {nodeSearchResults.map((result) => {
                        const resultNode = getNodeSubtreeById(topLevelNodeViewModels, result.nodeId);
                        const canOpenResultExplanation =
                          Boolean(result.shortExplanationLabel) &&
                          (resultNode ? canOpenNodeStatusExplanationModal(resultNode) : false);
                        return (
                        <View key={result.nodeId} style={styles.searchResultCard}>
                          <Pressable
                            onPress={() => openSearchResultInNodeContext(result)}
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
                                canOpenResultExplanation ? (
                                  <Pressable
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      openStatusExplanationFromSearchResult(result);
                                    }}
                                    hitSlop={6}
                                    accessibilityRole="button"
                                    accessibilityLabel="Пояснение расчёта статуса"
                                  >
                                    <Text style={[styles.searchResultPath, styles.searchResultLink]}>
                                      {result.shortExplanationLabel}
                                    </Text>
                                  </Pressable>
                                ) : (
                                  <Text style={styles.searchResultPath}>{result.shortExplanationLabel}</Text>
                                )
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
                        );
                      })}
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
                    {filteredTopLevelNodeViewModels.length === 0 ? (
                      <Text style={styles.searchNoResults}>Узлы с выбранным статусом не найдены</Text>
                    ) : null}
                    {filteredTopLevelNodeViewModels.map((node, index) => (
                      <View key={node.id}>
                        {index > 0 ? <View style={styles.treeDivider} /> : null}
                        <NodeRow
                          node={node}
                          depth={0}
                          expandedIds={expandedIds}
                          onToggle={toggleNode}
                          onAddFromLeaf={openAddServiceFromTreeNode}
                          onAddToWishlist={openWishlistForTreeNode}
                          onOpenContext={openNodeContextModal}
                          onOpenStatusExplanation={openStatusExplanationFromTreeNode}
                          onOpenServiceLogForNode={openServiceLogForTreeNode}
                          selectedNodeId={selectedNodeContextId}
                          highlightedNodeId={highlightedNodeId}
                          statusHighlightedNodeIds={statusHighlightedNodeIds}
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
            </View>
          </>
        ) : (
          <>
        <View style={styles.mobileBrandHeader}>
          <View>
            <Text style={styles.mobileLogo}>
              MOTO<Text style={styles.mobileLogoAccent}>TWIN</Text>
            </Text>
            <Text style={styles.mobileLogoSubtitle}>DIGITAL GARAGE</Text>
          </View>
          <View style={styles.mobileBrandHeaderActions}>
            <HelpTriggerButton size={28} />
            <ActionIconButton
              onPress={() => router.push(`/vehicles/${vehicleId}/profile`)}
              accessibilityLabel="Редактировать профиль мотоцикла"
              icon={<MaterialIcons name="more-horiz" size={18} color={c.textMeta} />}
            />
          </View>
        </View>

        <View style={[styles.dashboardTopGrid, isWideLayout && styles.dashboardTopGridWide]}>
          <View style={[styles.infoCard, styles.heroDashboardCard, isWideLayout && styles.heroDashboardCardWide]}>
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroTitleCol}>
                <Text style={styles.title}>{detailViewModel.displayName}</Text>
                <Text style={styles.brandModel}>{detailViewModel.brandModelLine}</Text>
                <Text style={styles.variantText}>
                  {[vehicle.year, stateViewModel.odometerValue, rideProfileViewModel?.usageType].filter(Boolean).join(" · ")}
                </Text>
                <Text style={styles.heroVinLine}>VIN: {detailViewModel.vinLine}</Text>
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
                  onPress={moveVehicleToTrash}
                  accessibilityLabel="Переместить мотоцикл на Свалку"
                  variant="danger"
                  disabled={isMovingToTrash}
                  icon={<MaterialIcons name="delete-outline" size={16} color={c.error} />}
                />
              </View>
            </View>

            <View style={styles.heroBikeStage}>
              <Image source={silhouetteSource} style={styles.heroBikeImage} resizeMode="contain" alt="" />
              <View style={styles.heroBikeGlow} />
            </View>

            <MobileScorePanel
              score={score}
              okCount={okCount}
              soonCount={attentionSummary.soonCount}
              overdueCount={attentionSummary.overdueCount}
              onOpenAttention={openFirstAttentionActions}
            />
          </View>

          <View style={[styles.mobileSideStack, isWideLayout && styles.mobileSideStackWide]}>
            <ReferenceAttentionBlock
              items={attentionSummary.items}
              onOpenItem={openAttentionActions}
              highlightedNodeId={highlightedAttentionNodeId}
              onLayoutY={(y) => {
                attentionBlockYRef.current = y;
              }}
            />
          </View>
        </View>

        <View style={[styles.dashboardSectionGrid, dashboardSectionStyle]}>

          <DashboardSection
            title="Состояние узлов"
            actionLabel="Все узлы"
            onActionPress={() => {
              router.push(`/vehicles/${vehicleId}/nodes`);
            }}
          >
            {isTopServiceNodesLoading ? (
              <Text style={styles.dashboardEmptyText}>Загрузка основных узлов...</Text>
            ) : topServiceNodesError ? (
              <Text style={[styles.dashboardEmptyText, { color: c.error }]}>{topServiceNodesError}</Text>
            ) : (
              <View style={styles.dashboardSystemsGrid}>
                {topNodeOverviewCards.map((card) => (
                  <TopOverviewDashboardCard
                    key={card.key}
                    card={card}
                    onOpenNode={openTopOverviewNode}
                    onOpenNodeIssues={openTopOverviewIssueNodes}
                  />
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
              recentEvents.map((event) => (
                <RecentDashboardEventRow
                  key={event.id}
                  event={event}
                  onOpen={() => {
                    router.push(
                      buildVehicleServiceLogHref(vehicleId, null, false, { serviceEventId: event.id })
                    );
                  }}
                />
              ))
            )}
          </DashboardSection>

          <ExpenseDashboardCard
            summary={expenseSummaryForCard}
            onPress={() => router.push(`/vehicles/${vehicleId}/expenses`)}
          />

          <View
            onLayout={(event) => {
              partsWishlistBlockYRef.current = event.nativeEvent.layout.y;
            }}
          >
            <PartsDashboardCard
              activeSummary={wishlistActiveSummary}
              installedOnlyCount={wishlistInstalledOnlyCount}
              onOpenWishlist={() =>
                pushWishlistFromDashboardForScrollOnReturn(`/vehicles/${vehicleId}/wishlist`)
              }
              onOpenWishlistStatus={(status) =>
                pushWishlistFromDashboardForScrollOnReturn(
                  `/vehicles/${vehicleId}/wishlist?partsStatus=${encodeURIComponent(status)}`
                )
              }
              onAddPart={() =>
                pushWishlistFromDashboardForScrollOnReturn(`/vehicles/${vehicleId}/wishlist/new`)
              }
            />
          </View>
        </View>

          </>
        )}
      </ScrollView>
      <GarageBottomNav
        activeKey={isNodeTreePage ? "nodes" : "garage"}
        onOpenGarage={() => router.push("/")}
        onOpenNodes={() => {
          if (!isNodeTreePage) {
            router.push(`/vehicles/${vehicleId}/nodes`);
          }
        }}
        onOpenJournal={() => router.push(`/vehicles/${vehicleId}/service-log`)}
        onOpenExpenses={() => router.push(`/vehicles/${vehicleId}/expenses`)}
        onOpenProfile={() => router.push("/profile")}
        hasVehicleContext
        currentVehicleId={vehicleId}
      />
      <Modal
        visible={Boolean(selectedAttentionItem)}
        animationType="slide"
        transparent
        onRequestClose={closeAttentionActions}
      >
        <View style={styles.nodeContextSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAttentionActions} />
          <View style={styles.attentionActionSheetCard}>
            {selectedAttentionItem ? (
              <>
                <View style={styles.nodeContextSheetHandle} />
                <View style={styles.attentionActionHeader}>
                  <View
                    style={[
                      styles.referenceAttentionIcon,
                      {
                        borderColor: statusSemanticTokens[selectedAttentionItem.effectiveStatus].border,
                        backgroundColor: statusSemanticTokens[selectedAttentionItem.effectiveStatus].background,
                      },
                    ]}
                  >
                    <TopNodePngIcon source={getAttentionIconSource(selectedAttentionItem.code)} size={31} />
                  </View>
                  <View style={styles.attentionActionHeaderText}>
                    <Text style={styles.subtreeModalTitle}>{selectedAttentionItem.name}</Text>
                    <Text style={styles.subtreeModalSubtitle}>
                      {selectedAttentionItem.shortExplanation ||
                        selectedAttentionItem.topLevelParentName ||
                        "Выберите быстрое действие"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={closeAttentionActions}
                    style={({ pressed }) => [
                      styles.subtreeModalCloseBtn,
                      pressed && styles.subtreeModalCloseBtnPressed,
                    ]}
                  >
                    <Text style={styles.subtreeModalCloseBtnText}>Закрыть</Text>
                  </Pressable>
                </View>

                <View style={styles.attentionActionStatusRow}>
                  <View
                    style={[
                      styles.referenceStatusBadge,
                      { backgroundColor: statusSemanticTokens[selectedAttentionItem.effectiveStatus].background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.referenceStatusBadgeText,
                        { color: statusSemanticTokens[selectedAttentionItem.effectiveStatus].foreground },
                      ]}
                    >
                      {selectedAttentionItem.statusLabelRu}
                    </Text>
                  </View>
                  {selectedAttentionWishlistItem ? (
                    <Text style={styles.attentionActionWishlistStatus}>
                      В корзине: {partWishlistStatusLabelsRu[selectedAttentionWishlistItem.status]}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.attentionActionGrid}>
                  <AttentionQuickActionButton
                    label="В дерево"
                    iconName="account-tree"
                    onPress={openSelectedAttentionNodeInTree}
                  />
                  <AttentionQuickActionButton
                    label="ТО"
                    iconName="build-circle"
                    onPress={openSelectedAttentionServiceEventForm}
                    disabled={!selectedAttentionNode?.canAddServiceEvent}
                  />
                  <AttentionQuickActionButton
                    label="Журнал"
                    iconName="history"
                    onPress={openSelectedAttentionServiceLog}
                    disabled={!selectedAttentionNode}
                  />
                  <AttentionQuickActionButton
                    label={selectedAttentionWishlistItem ? "В корзине" : "Нет в корзине"}
                    iconName="shopping-cart"
                    onPress={openSelectedAttentionWishlistItem}
                    disabled={!selectedAttentionWishlistItem}
                    variant="cart"
                  />
                  <AttentionQuickActionButton
                    label="Подбор запчасти"
                    iconName="youtube-searched-for"
                    onPress={openSelectedAttentionWishlistForm}
                    variant="primary"
                    wide
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(selectedNodeContextViewModel)}
        animationType="slide"
        transparent
        onRequestClose={closeNodeContextModal}
      >
        <View style={styles.nodeContextSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeNodeContextModal} />
          <View style={styles.nodeContextSheetCard}>
            {selectedNodeContextViewModel ? (
              <>
                <View style={styles.nodeContextSheetHandle} />
                <View style={styles.subtreeModalHeader}>
                  <View style={styles.subtreeModalHeaderTextCol}>
                    <Text style={styles.subtreeModalTitle}>{selectedNodeContextViewModel.nodeName}</Text>
                    <Text style={styles.subtreeModalSubtitle}>{selectedNodeContextViewModel.pathLabel}</Text>
                    <Text style={styles.searchResultCode}>{selectedNodeContextViewModel.nodeCode}</Text>
                    {selectedNodeContextViewModel.shortExplanationLabel ? (
                      canOpenSelectedNodeContextExplanation ? (
                        <Pressable
                          onPress={openSelectedNodeContextExplanation}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel="Пояснение расчёта статуса"
                        >
                          <Text style={[styles.subtreeModalSubtitle, styles.searchResultLink]}>
                            {selectedNodeContextViewModel.shortExplanationLabel}
                          </Text>
                        </Pressable>
                      ) : (
                        <Text style={styles.subtreeModalSubtitle}>
                          {selectedNodeContextViewModel.shortExplanationLabel}
                        </Text>
                      )
                    ) : null}
                    {selectedNodeSnoozeLabel ? (
                      <Text style={styles.snoozeLabelText}>{selectedNodeSnoozeLabel}</Text>
                    ) : null}
                  </View>
                  <View style={styles.subtreeModalHeaderActions}>
                    {selectedNodeContextViewModel.effectiveStatus ? (
                      <Pressable
                        onPress={() => {
                          if (selectedNodeContextNode) {
                            closeNodeContextModal();
                            openServiceLogForTreeNode(selectedNodeContextNode, {
                              returnNodeId: selectedNodeContextViewModel.nodeId,
                            });
                          }
                        }}
                        style={({ pressed }) => [
                          styles.badge,
                          {
                            backgroundColor: getStatusColors(selectedNodeContextViewModel.effectiveStatus).bg,
                            borderColor: getStatusColors(selectedNodeContextViewModel.effectiveStatus).border,
                          },
                          pressed && styles.badgePressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Открыть журнал по узлу ${selectedNodeContextViewModel.nodeName}`}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: getStatusColors(selectedNodeContextViewModel.effectiveStatus).text },
                          ]}
                        >
                          {selectedNodeContextViewModel.statusLabel}
                        </Text>
                      </Pressable>
                    ) : null}
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
                </View>
                <View style={styles.nodeContextSummaryRow}>
                  <Pressable
                    onPress={canOpenSelectedNodeContextExplanation ? openSelectedNodeContextExplanation : undefined}
                    disabled={!canOpenSelectedNodeContextExplanation}
                    accessibilityRole="button"
                    accessibilityLabel="Пояснение состояния обслуживания"
                    style={({ pressed }) => [
                      styles.nodeContextServiceStateCard,
                      selectedNodeContextViewModel.effectiveStatus
                        ? {
                            borderColor: getStatusColors(selectedNodeContextViewModel.effectiveStatus).border,
                            backgroundColor: getStatusColors(selectedNodeContextViewModel.effectiveStatus).bg,
                          }
                        : null,
                      pressed && canOpenSelectedNodeContextExplanation && styles.nodeContextSummaryCardPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.nodeContextSummaryLabel,
                        selectedNodeContextViewModel.effectiveStatus
                          ? { color: getStatusColors(selectedNodeContextViewModel.effectiveStatus).text }
                          : null,
                      ]}
                    >
                      Состояние обслуживания
                    </Text>
                    <Text
                      style={[
                        styles.nodeContextSummaryValue,
                        selectedNodeContextViewModel.effectiveStatus
                          ? { color: getStatusColors(selectedNodeContextViewModel.effectiveStatus).text }
                          : null,
                      ]}
                      numberOfLines={2}
                    >
                      {selectedNodeContextViewModel.shortExplanationLabel ||
                        selectedNodeContextViewModel.statusLabel ||
                        "Нет данных"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={openSelectedNodeExpenses}
                    accessibilityRole="button"
                    accessibilityLabel="Открыть расходы по узлу"
                    style={({ pressed }) => [
                      styles.nodeContextExpenseSummaryCard,
                      selectedNodeExpenseSummary.hasExpenses && styles.nodeContextExpenseSummaryCardActive,
                      pressed && styles.nodeContextSummaryCardPressed,
                    ]}
                  >
                    <Text style={styles.nodeContextSummaryLabel}>Расходы по узлу</Text>
                    <Text style={styles.nodeContextExpenseSummaryValue} numberOfLines={2}>
                      {selectedNodeExpenseSummary.totalsLabel}
                    </Text>
                    <Text style={styles.nodeContextExpenseSummaryMeta}>
                      Сезон {selectedNodeExpenseSummary.year} · {selectedNodeExpenseSummary.expenseCount}
                    </Text>
                  </Pressable>
                </View>
                <ScrollView
                  ref={subtreeScrollViewRef}
                  contentContainerStyle={styles.subtreeModalBody}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.nodeContextScrollInner}>
                    <View style={styles.nodeContextSection}>
                      <View style={styles.nodeContextSectionHeader}>
                        <Text style={styles.nodeContextSectionTitle}>Действия</Text>
                      </View>
                      <View style={styles.nodeContextSectionBody}>
                        <View style={styles.nodeContextActionsRow}>
                          {selectedNodeContextViewModel.actions.map((action) => (
                            <ActionIconButton
                              key={action.key}
                              onPress={() => handleNodeContextAction(action.key)}
                              disabled={action.key === "add_kit" && Boolean(nodeContextAddingKitCode)}
                              accessibilityLabel={action.label}
                              variant="subtle"
                              icon={
                                action.key === "journal" ? (
                                  <MaterialIcons name="menu-book" size={15} color={c.textMeta} />
                                ) : action.key === "add_service_event" ? (
                                  <MaterialIcons name="event-available" size={15} color={c.textMeta} />
                                ) : action.key === "add_wishlist" ? (
                                  <MaterialIcons name="playlist-add" size={16} color={c.textMeta} />
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
                      </View>
                    </View>

                  {selectedNodeContextViewModel.maintenancePlan &&
                  selectedNodeContextViewModel.maintenancePlan.hasMeaningfulData ? (
                    <View style={styles.nodeContextSection}>
                      <View style={styles.nodeContextSectionHeader}>
                        <Text style={styles.nodeContextSectionTitle}>План обслуживания</Text>
                      </View>
                      <View style={styles.nodeContextSectionBody}>
                      {selectedNodeContextViewModel.maintenancePlan.shortText ? (
                        canOpenSelectedNodeContextExplanation ? (
                          <Pressable
                            onPress={openSelectedNodeContextExplanation}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel="Пояснение расчёта статуса"
                          >
                            <Text style={[styles.searchResultPath, styles.searchResultLink]}>
                              {selectedNodeContextViewModel.maintenancePlan.shortText}
                            </Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.searchResultPath}>
                            {selectedNodeContextViewModel.maintenancePlan.shortText}
                          </Text>
                        )
                      ) : null}
                      {selectedNodeContextViewModel.maintenancePlan.dueLines.map((line) => (
                        canOpenSelectedNodeContextExplanation ? (
                          <Pressable
                            key={line}
                            onPress={openSelectedNodeContextExplanation}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel="Пояснение расчёта статуса"
                          >
                            <Text style={[styles.searchResultPath, styles.searchResultLink]}>
                              {line}
                            </Text>
                          </Pressable>
                        ) : (
                          <Text key={line} style={styles.searchResultPath}>
                            {line}
                          </Text>
                        )
                      ))}
                      {selectedNodeContextViewModel.maintenancePlan.lastServiceLine ? (
                        canOpenSelectedNodeContextExplanation ? (
                          <Pressable
                            onPress={openSelectedNodeContextExplanation}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel="Пояснение расчёта статуса"
                          >
                            <Text style={[styles.searchResultPath, styles.searchResultLink]}>
                              {selectedNodeContextViewModel.maintenancePlan.lastServiceLine}
                            </Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.searchResultPath}>
                            {selectedNodeContextViewModel.maintenancePlan.lastServiceLine}
                          </Text>
                        )
                      ) : null}
                      {selectedNodeContextViewModel.maintenancePlan.ruleIntervalLine ? (
                        canOpenSelectedNodeContextExplanation ? (
                          <Pressable
                            onPress={openSelectedNodeContextExplanation}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel="Пояснение расчёта статуса"
                          >
                            <Text style={[styles.searchResultPath, styles.searchResultLink]}>
                              {selectedNodeContextViewModel.maintenancePlan.ruleIntervalLine}
                            </Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.searchResultPath}>
                            {selectedNodeContextViewModel.maintenancePlan.ruleIntervalLine}
                          </Text>
                        )
                      ) : null}
                      </View>
                    </View>
                  ) : null}

                  {showSubtreeCompositionSection ? (
                    <View style={styles.nodeContextSection}>
                      <View style={styles.nodeContextSectionHeader}>
                        <Text style={styles.nodeContextSectionTitle}>Что входит в узел</Text>
                        {subtreeCompositionItems.length > 12 ? (
                          <Pressable
                            onPress={() => setIsSubtreeCompositionExpanded((prev) => !prev)}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel={
                              isSubtreeCompositionExpanded
                                ? "Свернуть состав узла"
                                : "Развернуть полный состав узла"
                            }
                          >
                            <Text style={styles.contextSectionActionText}>
                              {isSubtreeCompositionExpanded
                                ? "Свернуть"
                                : `Развернуть (${subtreeCompositionItems.length})`}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <View style={[styles.nodeContextSectionBody, styles.compositionInlineList]}>
                        {visibleSubtreeCompositionItems.map((item, index) => (
                          <Fragment key={item.id}>
                            {index > 0 ? <Text style={styles.compositionSeparator}>·</Text> : null}
                            <Pressable
                              onPress={() => selectCompositionNode(item.id)}
                              hitSlop={4}
                              accessibilityRole="button"
                              accessibilityLabel={`Открыть узел ${item.name}`}
                            >
                              <Text
                                style={[
                                  styles.compositionNodeText,
                                  item.depthFromSelected === 1 && styles.compositionNodeTextDirect,
                                ]}
                              >
                                {item.name}
                              </Text>
                            </Pressable>
                          </Fragment>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.nodeContextSection}>
                    <View style={styles.nodeContextSectionHeader}>
                      <Text style={styles.nodeContextSectionTitle}>Последние сервисные события</Text>
                      {selectedNodeContextNode ? (
                        <Pressable
                          onPress={() => {
                            closeNodeContextModal();
                            openServiceLogForTreeNode(selectedNodeContextNode, {
                              returnNodeId: selectedNodeContextViewModel.nodeId,
                            });
                          }}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel="Открыть журнал обслуживания по этому узлу"
                        >
                          <Text style={styles.nodeContextSectionHeaderActionText}>Журнал</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={styles.nodeContextSectionBody}>
                    {selectedNodeContextViewModel.recentServiceEvents.length === 0 ? (
                      <Text style={styles.searchResultPath}>По этому узлу записей пока нет.</Text>
                    ) : (
                      selectedNodeContextViewModel.recentServiceEvents.map((event) => (
                        <Pressable
                          key={event.id}
                          onPress={() => {
                            if (selectedNodeContextNode) {
                              closeNodeContextModal();
                              openServiceLogForTreeNode(selectedNodeContextNode, {
                                serviceEventId: event.id,
                                returnNodeId: event.nodeId,
                              });
                            }
                          }}
                          style={({ pressed }) => [
                            styles.searchResultRow,
                            pressed && styles.searchResultRowPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Открыть событие ${event.serviceType} в журнале`}
                        >
                          <View style={styles.searchResultTextCol}>
                            <Text style={styles.searchResultTitle}>
                              {formatIsoCalendarDateRu(event.eventDate)} · {event.serviceType}
                            </Text>
                            <Text style={styles.searchResultPath}>Пробег: {event.odometer} км</Text>
                            {event.costLabelRu ? (
                              <Text style={styles.searchResultPath}>Стоимость: {event.costLabelRu}</Text>
                            ) : null}
                          </View>
                          <MaterialIcons name="chevron-right" size={16} color={c.textMuted} />
                        </Pressable>
                      ))
                    )}
                    </View>
                  </View>

                  <View style={styles.nodeContextSection}>
                    <View style={styles.nodeContextSectionHeader}>
                      <Text style={styles.nodeContextSectionTitle}>Рекомендации SKU</Text>
                    </View>
                    <View style={styles.nodeContextSectionBody}>
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
                      <Pressable
                        key={rec.skuId}
                        onPress={() => openWishlistFormForRecommendedSku(rec)}
                        style={({ pressed }) => [
                          styles.searchResultRow,
                          pressed && styles.searchResultRowPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Открыть добавление ${rec.canonicalName}`}
                      >
                        <View style={styles.searchResultTextCol}>
                          <Text style={styles.searchResultTitle}>
                            {rec.brandName} · {rec.canonicalName}
                          </Text>
                          <Text style={styles.searchResultPath}>{rec.recommendationLabel}</Text>
                          {rec.priceAmount != null ? (
                            <Text style={styles.searchResultPath}>
                              {`${formatExpenseAmountRu(rec.priceAmount)} ${
                                rec.currency?.trim() || ""
                              }`.trim()}
                            </Text>
                          ) : null}
                        </View>
                        <ActionIconButton
                          onPress={() => void addRecommendedSkuToWishlistFromNodeContext(rec)}
                          accessibilityLabel="Добавить рекомендованный SKU в список покупок"
                          disabled={nodeContextAddingRecommendedSkuId === rec.skuId}
                          variant="subtle"
                          icon={<MaterialIcons name="shopping-cart" size={15} color={c.textMeta} />}
                        />
                      </Pressable>
                    ))}
                    </View>
                  </View>

                  <View style={styles.nodeContextSection}>
                    <View style={styles.nodeContextSectionHeader}>
                      <Text style={styles.nodeContextSectionTitle}>Комплекты обслуживания</Text>
                    </View>
                    <View style={styles.nodeContextSectionBody}>
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
                      <Pressable
                        key={kit.code}
                        onPress={() => openWishlistFormForServiceKit(kit)}
                        style={({ pressed }) => [
                          styles.searchResultRow,
                          pressed && styles.searchResultRowPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Открыть подбор комплекта ${kit.title}`}
                      >
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
                      </Pressable>
                    ))}
                    </View>
                  </View>

                  {selectedNodeContextViewModel.isLeaf ? (
                    <View style={styles.nodeContextSection}>
                      <View style={styles.nodeContextSectionHeader}>
                        <Text style={styles.nodeContextSectionTitle}>Неустановленные запчасти</Text>
                        <Pressable
                          onPress={() => {
                            closeNodeContextModal();
                            pushWishlistFromDashboardForScrollOnReturn(`/vehicles/${vehicleId}/wishlist`);
                          }}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel="Открыть список покупок"
                        >
                          <Text style={styles.nodeContextSectionHeaderActionText}>
                            {selectedUninstalledParts.length > 3
                              ? `Все (${selectedUninstalledParts.length})`
                              : "Корзина"}
                          </Text>
                        </Pressable>
                      </View>
                      <View style={styles.nodeContextSectionBody}>
                      {selectedUninstalledParts.length === 0 ? (
                        <Text style={styles.searchResultPath}>
                          Активных позиций по этому узлу пока нет.
                        </Text>
                      ) : (
                        selectedUninstalledParts.slice(0, 3).map((item) => {
                          const nextStatus: PartWishlistItemStatus =
                            item.status === "NEEDED"
                              ? "ORDERED"
                              : item.status === "ORDERED"
                                ? "BOUGHT"
                                : "INSTALLED";
                          return (
                            <Pressable
                              key={item.id}
                              onPress={() => openWishlistItemFromNodeContext(item)}
                              style={({ pressed }) => [
                                styles.searchResultRow,
                                pressed && styles.searchResultRowPressed,
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Открыть позицию ${item.title} в корзине`}
                            >
                              <View style={styles.searchResultTextCol}>
                                <Text style={styles.searchResultTitle}>{item.title}</Text>
                                <Text style={styles.searchResultPath}>
                                  {item.costLabelRu ?? "Стоимость не указана"}
                                  {item.kitOriginLabelRu ? ` · ${item.kitOriginLabelRu}` : ""}
                                </Text>
                              </View>
                              <Pressable
                                onPress={(event) => {
                                  event.stopPropagation();
                                  void advanceWishlistItemStatusFromNodeContext(item);
                                }}
                                style={({ pressed }) => [
                                  styles.wishlistStatusAdvanceBadge,
                                  pressed && styles.badgePressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Перевести в статус ${partWishlistStatusLabelsRu[nextStatus]}`}
                              >
                                <Text style={styles.wishlistStatusAdvanceText}>
                                  {partWishlistStatusLabelsRu[nextStatus]}
                                </Text>
                              </Pressable>
                            </Pressable>
                          );
                        })
                      )}
                      </View>
                    </View>
                  ) : null}
                  </View>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function VehicleDetailRoute() {
  return <VehicleDetailScreen />;
}

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

function MobileScorePanel({
  score,
  okCount,
  soonCount,
  overdueCount,
  onOpenAttention,
}: {
  score: number | null;
  okCount: number;
  soonCount: number;
  overdueCount: number;
  onOpenAttention: () => void;
}) {
  return (
    <Pressable
      onPress={onOpenAttention}
      accessibilityRole="button"
      accessibilityLabel="Garage Score и требующие внимания узлы"
      style={({ pressed }) => [styles.mobileScorePanel, pressed && styles.mobileScorePanelPressed]}
    >
      <View style={styles.mobileScoreMain}>
        <Text style={styles.mobileScoreLabel}>Garage Score</Text>
        <Text style={styles.mobileScoreValue}>
          {score ?? "—"}<Text style={styles.mobileScoreTotal}> /100</Text>
        </Text>
      </View>
      <MobileScoreStat value={okCount} label="OK" color={statusSemanticTokens.OK.accent} />
      <MobileScoreStat value={soonCount} label="Soon" color={statusSemanticTokens.SOON.accent} />
      <MobileScoreStat value={overdueCount} label="Overdue" color={statusSemanticTokens.OVERDUE.accent} />
    </Pressable>
  );
}

function MobileScoreStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.mobileScoreStat}>
      <Text style={[styles.mobileScoreStatValue, { color }]}>{value}</Text>
      <Text style={styles.mobileScoreStatLabel}>{label}</Text>
    </View>
  );
}

function ReferenceAttentionBlock({
  items,
  onOpenItem,
  highlightedNodeId,
  onLayoutY,
}: {
  items: AttentionItemViewModel[];
  onOpenItem: (item: AttentionItemViewModel) => void;
  highlightedNodeId?: string | null;
  onLayoutY?: (y: number) => void;
}) {
  return (
    <View
      style={styles.referenceBlock}
      onLayout={(event) => {
        onLayoutY?.(event.nativeEvent.layout.y);
      }}
    >
      <View style={styles.referenceSectionHeader}>
        <Text style={styles.referenceSectionTitle}>Требует внимания</Text>
        <Text style={styles.referenceSectionHint}>Нажмите на узел для действий</Text>
      </View>
      <ScrollView
        nestedScrollEnabled
        style={styles.referenceAttentionScroll}
        contentContainerStyle={styles.referenceAttentionList}
      >
        {items.length === 0 ? (
          <Text style={styles.dashboardEmptyText}>Критичных замечаний нет.</Text>
        ) : (
          items.map((item) => (
            <ReferenceAttentionRow
              key={item.nodeId}
              item={item}
              onPress={() => onOpenItem(item)}
              isHighlighted={highlightedNodeId === item.nodeId}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ReferenceAttentionRow({
  item,
  onPress,
  isHighlighted = false,
}: {
  item: AttentionItemViewModel;
  onPress: () => void;
  isHighlighted?: boolean;
}) {
  const tokens = statusSemanticTokens[item.effectiveStatus];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.referenceAttentionRow,
        { borderLeftColor: tokens.accent },
        isHighlighted && styles.referenceAttentionRowHighlighted,
        pressed && styles.referenceAttentionRowPressed,
      ]}
    >
      <View style={[styles.referenceAttentionIcon, { borderColor: tokens.border, backgroundColor: tokens.background }]}>
        <TopNodePngIcon source={getAttentionIconSource(item.code)} size={31} />
      </View>
      <View style={styles.referenceAttentionTextCol}>
        <View style={styles.referenceAttentionTitleRow}>
          <Text style={styles.referenceAttentionTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.referenceStatusBadge, { backgroundColor: tokens.background }]}>
            <Text style={[styles.referenceStatusBadgeText, { color: tokens.foreground }]}>
              {item.statusLabelRu}
            </Text>
          </View>
        </View>
        <Text style={styles.referenceAttentionMeta} numberOfLines={1}>
          {item.shortExplanation || item.topLevelParentName || "Нужен контекст узла"}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={c.textTertiary} />
    </Pressable>
  );
}

function AttentionQuickActionButton({
  label,
  iconName,
  onPress,
  disabled = false,
  variant = "default",
  wide = false,
}: {
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "cart";
  wide?: boolean;
}) {
  const iconColor = disabled
    ? c.textTertiary
    : variant === "primary"
      ? c.onPrimaryAction
      : variant === "cart"
        ? c.successText
        : c.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.attentionActionButton,
        variant === "primary" && styles.attentionActionButtonPrimary,
        variant === "cart" && styles.attentionActionButtonCart,
        wide && styles.attentionActionButtonWide,
        pressed && !disabled && styles.attentionActionButtonPressed,
        disabled && styles.attentionActionButtonDisabled,
      ]}
    >
      <MaterialIcons name={iconName} size={19} color={iconColor} />
      <Text
        style={[
          styles.attentionActionButtonText,
          variant === "primary" && styles.attentionActionButtonTextPrimary,
          variant === "cart" && styles.attentionActionButtonTextCart,
          disabled && styles.attentionActionButtonTextDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TopOverviewDashboardCard({
  card,
  onOpenNode,
  onOpenNodeIssues,
}: {
  card: TopNodeOverviewCard;
  onOpenNode: (nodeId: string) => void;
  onOpenNodeIssues: (nodeIds: string[]) => void;
}) {
  const tokens = card.status ? statusSemanticTokens[card.status] : statusSemanticTokens.UNKNOWN;
  return (
    <View style={styles.systemDashboardCard}>
      <Pressable
        style={styles.systemDashboardIcon}
        onPress={() => onOpenNodeIssues(card.nodes.map((node) => node.id))}
        accessibilityRole="button"
        accessibilityLabel={`Показать проблемные узлы группы ${card.title}`}
      >
        <TopNodePngIcon source={TOP_NODE_GROUP_ICON_SRC[card.key]} size={36} color={tokens.foreground} />
      </Pressable>
      <View style={styles.systemDashboardTextCol}>
        <Text style={styles.systemDashboardTitle} numberOfLines={1}>
          {card.title}
        </Text>
        {card.nodes.length > 0 ? (
          <View style={styles.systemDashboardNodeList}>
            {card.nodes.map((node) => {
              const nodeTokens = node.status
                ? statusSemanticTokens[node.status]
                : statusSemanticTokens.UNKNOWN;
              return (
                <Pressable
                  key={node.code}
                  onPress={(event: GestureResponderEvent) => {
                    event.stopPropagation();
                    onOpenNode(node.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Открыть узел ${node.name}`}
                  style={[
                    styles.systemDashboardNodeBadge,
                    {
                      borderColor: nodeTokens.border,
                      backgroundColor: nodeTokens.background,
                    },
                  ]}
                >
                  <Text style={[styles.systemDashboardNodeBadgeText, { color: nodeTokens.foreground }]}>
                    {formatNodeBadgeSingleLine(getNodeTightUiDisplayName(node.code, node.name))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.systemDashboardMeta} numberOfLines={1}>
            {card.details}
          </Text>
        )}
      </View>
    </View>
  );
}

function TopNodePngIcon({
  source,
  size,
  color,
}: {
  source: ImageSourcePropType;
  size: number;
  color?: string;
}) {
  return (
    <Image
      source={source}
      style={{ width: size, height: size, tintColor: color }}
      resizeMode="contain"
      alt=""
    />
  );
}

function RecentDashboardEventRow({ event, onOpen }: { event: ServiceEventItem; onOpen: () => void }) {
  const costLabel =
    event.costAmount && event.currency ? `${formatExpenseAmountRu(event.costAmount)} ${event.currency}` : "—";
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Событие ${event.serviceType}, открыть в журнале`}
      style={({ pressed }) => [styles.recentDashboardRow, pressed && styles.recentDashboardRowPressed]}
    >
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
    </Pressable>
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

const WISHLIST_DASHBOARD_ACTIVE_STATUSES = ["NEEDED", "ORDERED", "BOUGHT"] as const;
type WishlistDashboardActiveStatus = (typeof WISHLIST_DASHBOARD_ACTIVE_STATUSES)[number];
const WISHLIST_DASHBOARD_STATUS_COLORS: Record<WishlistDashboardActiveStatus, string> = {
  NEEDED: "#FF3B30",
  ORDERED: "#F5C400",
  BOUGHT: "#36A3FF",
};
const WISHLIST_DASHBOARD_STATUS_ICONS: Record<WishlistDashboardActiveStatus, string> = {
  NEEDED: "report-problem",
  ORDERED: "inventory-2",
  BOUGHT: "shopping-bag",
};

function PartsDashboardCard({
  activeSummary,
  installedOnlyCount,
  onOpenWishlist,
  onOpenWishlistStatus,
  onAddPart,
}: {
  activeSummary: PartsCartSummary;
  installedOnlyCount: number;
  onOpenWishlist: () => void;
  onOpenWishlistStatus: (status: PartWishlistItemStatus) => void;
  onAddPart: () => void;
}) {
  const activeTotal = activeSummary.all.count;
  const hasAnyWishlistRows = activeTotal > 0 || installedOnlyCount > 0;
  const statusRows = WISHLIST_DASHBOARD_ACTIVE_STATUSES.map((status) => {
    const metric =
      status === "NEEDED"
        ? activeSummary.needed
        : status === "ORDERED"
          ? activeSummary.ordered
          : activeSummary.bought;
    return { status, count: metric.count };
  });

  return (
    <DashboardSection title="Подбор деталей" actionLabel="Список" onActionPress={onOpenWishlist}>
      {!hasAnyWishlistRows ? (
        <Text style={styles.partsDashboardMeta}>
          Добавляйте детали из дерева узлов или создавайте позицию вручную.
        </Text>
      ) : (
        <View style={styles.partsDashboardFilterColumn}>
          {activeTotal === 0 && installedOnlyCount > 0 ? (
            <Text style={styles.partsDashboardMetaAboveCards}>
              Нет позиций в работе. Установлено в корзине: {installedOnlyCount}. Ниже — переход в список с
              фильтром по статусу.
            </Text>
          ) : null}
          <View style={styles.partsDashboardFilterRow}>
            {statusRows.map((row) => (
              <Pressable
                key={row.status}
                accessibilityRole="button"
                accessibilityLabel={`${partWishlistStatusLabelsRu[row.status]}, ${row.count} позиций`}
                onPress={() => onOpenWishlistStatus(row.status)}
                style={({ pressed }) => [
                  styles.partsDashboardFilterCardCell,
                  pressed && styles.partsDashboardFilterCardCellPressed,
                ]}
              >
                <View
                  style={[
                    styles.partsDashboardFilterTopAccent,
                    { backgroundColor: WISHLIST_DASHBOARD_STATUS_COLORS[row.status] },
                  ]}
                />
                <View style={styles.partsDashboardFilterCardInner}>
                  <View style={styles.partsDashboardFilterIconWrapCompact}>
                    <MaterialIcons
                      name={
                        WISHLIST_DASHBOARD_STATUS_ICONS[row.status] as ComponentProps<
                          typeof MaterialIcons
                        >["name"]
                      }
                      size={20}
                      color={WISHLIST_DASHBOARD_STATUS_COLORS[row.status]}
                    />
                  </View>
                  <Text style={styles.partsDashboardFilterCountCompact}>{row.count}</Text>
                  <Text style={styles.partsDashboardFilterLabelCompact} numberOfLines={2}>
                    {partWishlistStatusLabelsRu[row.status]}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}
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

const TOP_NODE_ICON_BY_PREFIX: Array<[string, TopNodeOverviewCard["key"]]> = [
  ["ENGINE.LUBE", "lubrication"],
  ["COOLING", "engine"],
  ["BRAKES", "brakes"],
  ["TIRES", "tires"],
  ["DRIVETRAIN", "chain"],
  ["SUSPENSION", "suspension"],
];

const TOP_NODE_GROUP_ICON_SRC: Record<TopNodeOverviewCard["key"], ImageSourcePropType> = {
  lubrication: lubricationIcon,
  engine: engineCoolingIcon,
  brakes: brakesIcon,
  tires: tiresIcon,
  chain: chainSprocketsIcon,
  suspension: suspensionIcon,
};

const TOP_NODE_LEAF_ICON_SRC: Record<string, ImageSourcePropType> = {
  "ENGINE.LUBE.OIL": oilIcon,
  "ENGINE.LUBE.FILTER": lubricationIcon,
  "COOLING.LIQUID.COOLANT": coolantIcon,
  "BRAKES.FRONT.PADS": brakesFrontPadsIcon,
  "BRAKES.REAR.PADS": brakesIcon,
  "TIRES.REAR": tiresRearIcon,
};

const SILHOUETTE_SRC = {
  adventure_touring: adventureTouringSilhouette,
  enduro_dual_sport: enduroDualSportSilhouette,
  naked_roadster: nakedRoadsterSilhouette,
  sport_supersport: sportSupersportSilhouette,
  cruiser: cruiserSilhouette,
  classic_retro: classicRetroSilhouette,
  scooter_maxi_scooter: scooterMaxiScooterSilhouette,
} as const;

function getAttentionIconSource(code: string): ImageSourcePropType {
  const direct = TOP_NODE_LEAF_ICON_SRC[code];
  if (direct) {
    return direct;
  }
  const groupKey = TOP_NODE_ICON_BY_PREFIX.find(([prefix]) => code.startsWith(prefix))?.[1] ?? "lubrication";
  return TOP_NODE_GROUP_ICON_SRC[groupKey];
}

function getNodeTreeIconSource(node: Pick<NodeTreeItemViewModel, "code" | "name">): ImageSourcePropType {
  return getNodeTreeIconAsset(node.code, node.name) as ImageSourcePropType;
}

function getVehicleSilhouetteSource(vehicle: VehicleDetail): ImageSourcePropType {
  const key = resolveGarageVehicleSilhouette({
    brand: { name: vehicle.brandName },
    model: { name: vehicle.modelName },
    modelVariant: {
      year: vehicle.year,
      versionName: vehicle.variantName,
      market: vehicle.modelVariant?.market ?? null,
      engineType: vehicle.modelVariant?.engineType ?? null,
      coolingType: vehicle.modelVariant?.coolingType ?? null,
      wheelSizes: vehicle.modelVariant?.wheelSizes ?? null,
      brakeSystem: vehicle.modelVariant?.brakeSystem ?? null,
      chainPitch: vehicle.modelVariant?.chainPitch ?? null,
      stockSprockets: vehicle.modelVariant?.stockSprockets ?? null,
    },
    rideProfile: vehicle.rideProfile,
  });
  return SILHOUETTE_SRC[key] ?? SILHOUETTE_SRC.naked_roadster;
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  scrollContentLandscape: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  dashboardTopGrid: {
    gap: 12,
    marginBottom: 12,
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
    marginBottom: 0,
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
  mobileBrandHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  mobileBrandHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mobileLogo: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 0.4,
    color: c.textPrimary,
  },
  mobileLogoAccent: {
    color: c.primaryAction,
  },
  mobileLogoSubtitle: {
    marginTop: 1,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: c.textMuted,
  },
  mobileSideStack: {
    minWidth: 0,
    gap: 12,
  },
  mobileSideStackWide: {
    flex: 1,
  },
  heroVinLine: {
    marginTop: 9,
    fontSize: 11,
    lineHeight: 14,
    color: c.textMeta,
  },
  heroBikeStage: {
    height: 170,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroBikeImage: {
    width: "108%",
    height: "100%",
    opacity: 0.96,
  },
  heroBikeGlow: {
    position: "absolute",
    bottom: 8,
    width: "72%",
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
  },
  mobileScorePanel: {
    marginHorizontal: -16,
    marginBottom: -16,
    minHeight: 60,
    flexDirection: "row",
    alignItems: "stretch",
    borderTopWidth: 1,
    borderTopColor: c.divider,
    backgroundColor: "rgba(4, 8, 13, 0.42)",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  mobileScorePanelPressed: {
    opacity: 0.92,
  },
  mobileScoreMain: {
    flex: 1.15,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  mobileScoreLabel: {
    fontSize: 10,
    color: c.textSecondary,
  },
  mobileScoreValue: {
    marginTop: 2,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
    color: c.primaryAction,
  },
  mobileScoreTotal: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textMuted,
  },
  mobileScoreStat: {
    flex: 0.72,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: c.divider,
  },
  mobileScoreStatValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
  },
  mobileScoreStatLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "700",
    color: c.textMuted,
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
  referenceBlock: {
    gap: 8,
  },
  referenceSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  referenceSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: c.textPrimary,
  },
  referenceSectionHint: {
    fontSize: 12,
    fontWeight: "800",
    color: c.textMuted,
  },
  referenceAttentionScroll: {
    maxHeight: 252,
  },
  referenceAttentionList: {
    gap: 8,
  },
  referenceAttentionRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderLeftWidth: 2,
    borderColor: c.border,
    backgroundColor: c.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  referenceAttentionRowPressed: {
    opacity: 0.9,
    backgroundColor: c.cardMuted,
  },
  referenceAttentionRowHighlighted: {
    borderColor: c.primaryAction,
    backgroundColor: c.cardMuted,
  },
  referenceAttentionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  referenceAttentionTextCol: {
    flex: 1,
    minWidth: 0,
  },
  referenceAttentionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  referenceAttentionTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: "800",
    color: c.textPrimary,
  },
  referenceAttentionMeta: {
    marginTop: 3,
    fontSize: 12,
    color: c.textMuted,
  },
  referenceStatusBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  referenceStatusBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },
  attentionActionSheetCard: {
    width: "100%",
    maxHeight: "72%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardSubtle,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
    gap: 14,
  },
  attentionActionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attentionActionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  attentionActionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  attentionActionWishlistStatus: {
    fontSize: 11,
    fontWeight: "800",
    color: c.successText,
  },
  attentionActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  attentionActionButton: {
    width: "48%",
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  attentionActionButtonWide: {
    width: "100%",
  },
  attentionActionButtonPrimary: {
    borderColor: c.primaryAction,
    backgroundColor: c.primaryAction,
  },
  attentionActionButtonCart: {
    borderColor: c.successBorder,
    backgroundColor: c.successSurface,
  },
  attentionActionButtonPressed: {
    opacity: 0.88,
  },
  attentionActionButtonDisabled: {
    opacity: 0.36,
    borderColor: c.border,
    backgroundColor: c.chipBackground,
  },
  attentionActionButtonText: {
    fontSize: 11,
    fontWeight: "900",
    color: c.textPrimary,
    textAlign: "center",
  },
  attentionActionButtonTextPrimary: {
    color: c.onPrimaryAction,
  },
  attentionActionButtonTextCart: {
    color: c.successText,
  },
  attentionActionButtonTextDisabled: {
    color: c.textTertiary,
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
    gap: 6,
  },
  systemDashboardCard: {
    width: "48%",
    minWidth: 132,
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 6,
  },
  systemDashboardIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  systemDashboardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  systemDashboardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: c.textPrimary,
  },
  systemDashboardMeta: {
    marginTop: 3,
    fontSize: 11,
    color: c.textMuted,
  },
  systemDashboardNodeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    gap: 6,
    alignItems: "center",
    alignContent: "flex-start",
  },
  systemDashboardNodeBadge: {
    flexShrink: 0,
    alignSelf: "flex-start",
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  systemDashboardNodeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    flexShrink: 0,
  },
  recentDashboardRow: {
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    gap: 3,
  },
  recentDashboardRowPressed: {
    backgroundColor: c.cardMuted,
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
  partsDashboardMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
  },
  partsDashboardMetaAboveCards: {
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
  },
  partsDashboardFilterColumn: {
    gap: 8,
  },
  partsDashboardFilterRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
    width: "100%",
  },
  partsDashboardFilterCardCell: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#111923",
    overflow: "hidden",
  },
  partsDashboardFilterCardCellPressed: {
    opacity: 0.9,
    backgroundColor: "#141d28",
  },
  partsDashboardFilterTopAccent: {
    width: "100%",
    height: 3,
  },
  partsDashboardFilterCardInner: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 4,
  },
  partsDashboardFilterIconWrapCompact: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  partsDashboardFilterCountCompact: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "800",
    color: c.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  partsDashboardFilterLabelCompact: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
    color: c.textMuted,
    textAlign: "center",
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
    overflow: "hidden",
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
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "900",
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
    marginTop: 2,
    fontSize: 15,
    fontWeight: "700",
    color: c.textSecondary,
  },
  variantText: {
    marginTop: 8,
    fontSize: 11,
    color: c.textMuted,
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
  nodeTreePageActionsRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  },
  nodeTreeControls: {
    marginTop: 4,
    gap: 6,
  },
  nodeTreeTopControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
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
    marginBottom: 6,
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
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 0,
  },
  nodeTreeSearchBox: {
    minWidth: 104,
    maxWidth: 150,
    flexGrow: 1,
    flexBasis: 124,
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 999,
    backgroundColor: c.card,
    paddingHorizontal: 9,
  },
  nodeTreeSearchInputCompact: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 12,
    color: c.textPrimary,
  },
  nodeTreeUtilityChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  nodeTreeUtilityChipDisabled: {
    opacity: 0.45,
  },
  searchHint: {
    marginBottom: 0,
    fontSize: 12,
    color: c.textMuted,
  },
  statusFilterRow: {
    gap: 6,
    paddingBottom: 2,
  },
  expenseYearRow: {
    marginTop: 0,
    gap: 8,
  },
  expenseYearChips: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  statusFilterChip: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 999,
    backgroundColor: c.cardMuted,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusFilterChipActiveNeutral: {
    backgroundColor: c.textPrimary,
    borderColor: c.textPrimary,
  },
  statusFilterChipPressed: {
    opacity: 0.86,
  },
  statusFilterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: c.textSecondary,
  },
  statusFilterChipTextActiveNeutral: {
    color: c.textInverse,
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
    padding: 10,
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
  searchResultLink: {
    color: c.textSecondary,
    textDecorationLine: "underline",
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
  contextSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  contextSectionActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: c.textSecondary,
  },
  compositionInlineList: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 5,
  },
  compositionNodeText: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
    textDecorationLine: "underline",
  },
  compositionNodeTextDirect: {
    fontWeight: "900",
    color: c.textPrimary,
  },
  compositionSeparator: {
    fontSize: 12,
    color: c.textMuted,
  },
  wishlistStatusAdvanceBadge: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 999,
    backgroundColor: c.cardMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 116,
  },
  wishlistStatusAdvanceText: {
    fontSize: 10,
    fontWeight: "800",
    color: c.textSecondary,
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
    backgroundColor: c.cardMuted,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    padding: 2,
  },
  treeDivider: {
    height: 1,
    backgroundColor: c.divider,
    marginLeft: 10,
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
    paddingVertical: 8,
    paddingRight: 8,
    minHeight: 52,
    backgroundColor: c.card,
  },
  nodeContainer: {
    marginBottom: 0,
  },
  nodeRowTopLevel: {
    backgroundColor: c.card,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  nodeRowNested: {
    backgroundColor: c.card,
  },
  nodeRowHighlighted: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.chipBackground,
    borderRadius: 12,
  },
  nodeRowPressed: {
    backgroundColor: c.divider,
  },
  nodeRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 6,
  },
  nodeGuides: {
    flexDirection: "row",
    alignSelf: "stretch",
  },
  nodeGuideColumn: {
    width: 14,
    alignSelf: "stretch",
    position: "relative",
  },
  nodeGuideVertical: {
    position: "absolute",
    left: 7,
    top: -8,
    bottom: -8,
    width: 1,
    backgroundColor: c.border,
  },
  nodeGuideElbow: {
    position: "absolute",
    left: 7,
    top: "50%",
    width: 10,
    height: 1,
    backgroundColor: c.border,
  },
  chevronWrap: {
    width: 20,
    minHeight: 20,
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
  nodeTreeIconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  nodeTreeIconImage: {
    width: 22,
    height: 22,
    opacity: 0.82,
  },
  nodeNameBlock: {
    flex: 1,
  },
  nodeName: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
    lineHeight: 16,
  },
  nodeNameTop: {
    fontSize: 14,
    fontWeight: "800",
    color: c.textPrimary,
  },
  nodeMetaRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nodeCodeText: {
    fontSize: 10,
    fontWeight: "700",
    color: c.textMuted,
    letterSpacing: 0.2,
  },
  nodeChildCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  nodeChildCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: c.textMuted,
  },
  reasonShort: {
    marginTop: 2,
    fontSize: 11,
    color: c.textTertiary,
    lineHeight: 16,
  },
  reasonShortLink: {
    color: c.textSecondary,
    textDecorationLine: "underline",
  },
  nodeExpenseCompact: {
    marginTop: 5,
    gap: 2,
  },
  nodeExpenseLine: {
    fontSize: 11,
    fontWeight: "600",
    color: c.textSecondary,
    lineHeight: 15,
  },
  nodeExpenseDetails: {
    marginVertical: 6,
    marginRight: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 12,
    gap: 8,
  },
  nodeExpenseDetailsHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  nodeExpenseDetailsTitle: {
    color: c.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  nodeExpenseDetailsText: {
    marginTop: 3,
    color: c.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  nodeExpenseLink: {
    color: c.textPrimary,
    fontSize: 11,
    fontWeight: "800",
  },
  nodeExpenseLatestList: {
    gap: 4,
  },
  nodeExpenseLatestTitle: {
    color: c.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  nodeExpenseLatestRow: {
    gap: 2,
  },
  nodeExpenseLatestText: {
    color: c.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  nodeExpenseLatestAmount: {
    color: c.textPrimary,
    fontSize: 11,
    fontWeight: "800",
  },
  subtreeModalOverlay: {
    flex: 1,
    backgroundColor: c.overlayModal,
    paddingHorizontal: 10,
    paddingVertical: 16,
    justifyContent: "center",
  },
  nodeContextSheetOverlay: {
    flex: 1,
    backgroundColor: c.overlayModal,
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingBottom: 78,
  },
  subtreeModalCard: {
    maxHeight: "86%",
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  nodeContextSheetCard: {
    maxHeight: "72%",
    backgroundColor: c.card,
    borderColor: c.borderStrong,
    borderWidth: 1,
    borderRadius: 22,
    overflow: "hidden",
  },
  nodeContextSheetHandle: {
    alignSelf: "center",
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: c.borderStrong,
    marginTop: 8,
    marginBottom: 2,
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
    borderColor: c.borderStrong,
    borderRadius: 10,
    backgroundColor: c.cardMuted,
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
  nodeContextSummaryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 2,
  },
  nodeContextServiceStateCard: {
    flex: 65,
    minHeight: 74,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.cardSubtle,
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: "center",
  },
  nodeContextExpenseSummaryCard: {
    flex: 35,
    minHeight: 74,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.cardSubtle,
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: "center",
  },
  nodeContextExpenseSummaryCardActive: {
    borderColor: c.primaryAction,
    backgroundColor: "rgba(249, 115, 22, 0.12)",
  },
  nodeContextSummaryCardPressed: {
    opacity: 0.88,
  },
  nodeContextSummaryLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: c.textMuted,
    textTransform: "uppercase",
  },
  nodeContextSummaryValue: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
    color: c.textPrimary,
  },
  nodeContextExpenseSummaryValue: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
    color: c.textPrimary,
  },
  nodeContextExpenseSummaryMeta: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 12,
    color: c.textSecondary,
  },
  subtreeModalBody: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 20,
  },
  nodeContextScrollInner: {
    gap: 8,
    paddingBottom: 4,
  },
  nodeContextSection: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 9,
    backgroundColor: c.cardSubtle,
    overflow: "hidden",
  },
  nodeContextSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    backgroundColor: c.cardMuted,
  },
  nodeContextSectionTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
  },
  nodeContextSectionHeaderActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: c.primaryAction,
  },
  nodeContextSectionBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  nodeContextActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },

  // Badge
  badge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: "center",
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  nodeContextButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeContextButtonPressed: {
    backgroundColor: c.divider,
    opacity: 0.9,
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
