"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  buildNodeTreeSectionProps,
  canOpenNodeStatusExplanationModal,
  buildRideProfileViewModel,
  buildVehicleHeaderProps,
  buildVehicleStateViewModel,
  buildVehicleTechnicalInfoViewModel,
  vehicleDetailFromApiRecord,
  createInitialAddServiceEventFormValues,
  createInitialAddServiceEventFromNode,
  createInitialAddServiceEventFromWishlistItem,
  createInitialEditServiceEventValues,
  buildInitialVehicleProfileFormValues,
  createInitialVehicleStateFormValues,
  createServiceLogNodeFilter,
  findNodePathById,
  findNodeTreeItemById,
  getNodeSubtreeById,
  getTopLevelNodeTreeItems,
  buildNodeSearchResultActions,
  buildNodeContextViewModel,
  searchNodeTree,
  formatIsoCalendarDateRu,
  getRecentServiceEventsForNode,
  getAvailableChildrenForSelectedPath,
  getNodeSelectLevels,
  getSelectedNodeFromPath,
  getStatusExplanationTriggeredByLabel,
  normalizeAddServiceEventPayload,
  normalizeEditServiceEventPayload,
  normalizeVehicleProfileFormValues,
  normalizeVehicleStatePayload,
  RIDE_LOAD_TYPE_OPTIONS,
  RIDE_RIDING_STYLE_OPTIONS,
  RIDE_USAGE_INTENSITY_OPTIONS,
  RIDE_USAGE_TYPE_OPTIONS,
  validateAddServiceEventFormValues,
  validateVehicleProfileFormValues,
  validateVehicleStateFormValues,
  buildExpenseSummaryFromServiceEvents,
  formatExpenseAmountRu,
  buildAttentionActionViewModel,
  buildAttentionSummaryFromNodeTree,
  calculateSnoozeUntilDate,
  filterAttentionItemsBySnooze,
  buildNodeSubtreeModalViewModel,
  buildTopLevelNodeSummaryViewModel,
  buildNodeTreeItemViewModel,
  buildNodeMaintenancePlanViewModel,
  formatSnoozeUntilLabel,
  getAttentionSnoozeFilterLabel,
  getDefaultCurrencyFromSettings,
  groupAttentionItemsByStatus,
  buildPartWishlistItemViewModel,
  createInitialPartWishlistFormValues,
  flattenNodeTreeToSelectOptions,
  groupPartWishlistItemsByStatus,
  filterActiveWishlistItems,
  normalizeCreatePartWishlistPayload,
  normalizeUpdatePartWishlistPayload,
  partWishlistFormValuesFromItem,
  partWishlistStatusLabelsRu,
  PART_WISHLIST_STATUS_ORDER,
  validatePartWishlistFormValues,
  isWishlistTransitionToInstalled,
  WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT,
  applyPartSkuViewModelToPartWishlistFormValues,
  buildPartRecommendationGroupsForDisplay,
  clearPartWishlistFormSkuSelection,
  buildServiceKitPreview,
  buildTopNodeOverviewCards,
  getServiceKitPreviewItemStatusLabel,
  formatPartSkuSearchResultMetaLineRu,
  getPartRecommendationGroupTitle,
  getPartRecommendationWarningLabel,
  getPartSkuViewModelDisplayLines,
  getWishlistItemSkuDisplayLines,
  isNodeSnoozed,
  normalizeUserLocalSettings,
  DEFAULT_USER_LOCAL_SETTINGS,
  USER_LOCAL_SETTINGS_STORAGE_KEY,
} from "@mototwin/domain";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { productSemanticColors, statusSemanticTokens, statusTextLabelsRu } from "@mototwin/design-tokens";
import { ACTION_SVG_BODIES, type ActionIconKey } from "@mototwin/icons";
import { TopNodeIcon } from "@/components/icons/top-nodes";
import { GarageSidebar } from "@/app/garage/_components/GarageSidebar";
import { VehicleDashboard } from "./_components/VehicleDashboard";
import type {
  AttentionItemViewModel,
  AttentionSnoozeFilter,
  NodeSnoozeOption,
  EditVehicleProfileFormValues,
  NodeStatus,
  NodeTreeItem,
  NodeTreeItemViewModel,
  NodeMaintenancePlanSummaryViewModel,
  NodeSubtreeModalViewModel,
  NodeTreeSearchResultViewModel,
  NodeTreeSearchActionKey,
  NodeContextViewModel,
  SelectedNodePath,
  ServiceEventItem,
  VehicleDetail,
  VehicleDetailApiRecord,
  AddServiceEventFormValues,
  PartRecommendationViewModel,
  PartRecommendationGroup,
  ServiceKitViewModel,
  ServiceKitPreviewViewModel,
  PartWishlistItemStatus,
  PartWishlistFormValues,
  PartWishlistItem,
  PartSkuViewModel,
  TopNodeOverviewCard,
  TopServiceNodeItem,
} from "@mototwin/types";

const vehicleDetailApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

function normalizePartNumberForLookup(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
const SIDEBAR_COLLAPSED_KEY = "vehicle.detail.sidebar.collapsed";

type VehiclePageProps = {
  params: Promise<{
    id: string;
  }>;
  pageView?: "dashboard" | "nodeTree" | "partsSelection";
};

type OverlayReturnTarget =
  | { type: "attention" }
  | { type: "nodeContext"; nodeId: string }
  | { type: "topLevelNode"; nodeId: string; highlightedNodeId: string | null };

type ServiceLogActionNotice = {
  tone: "success" | "error";
  title: string;
  details?: string;
};

type PartsStatusFilter = PartWishlistItemStatus | "ALL";

const NODE_STATUS_FILTER_OPTIONS: NodeStatus[] = [
  "OVERDUE",
  "SOON",
  "RECENTLY_REPLACED",
  "OK",
];
const PARTS_SELECTION_INITIAL_VISIBLE_COUNT = 10;
const PARTS_SELECTION_VISIBLE_INCREMENT = 10;

type NodeStatusFilter = NodeStatus | "ALL";

function buildNodeSnoozeStorageKey(vehicleId: string, nodeId: string): string {
  return `mototwin.nodeSnooze.${vehicleId}.${nodeId}`;
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

function countNodeStatuses(nodes: NodeTreeItemViewModel[]): Record<NodeStatus, number> {
  const counts: Record<NodeStatus, number> = {
    OVERDUE: 0,
    SOON: 0,
    RECENTLY_REPLACED: 0,
    OK: 0,
  };

  const walk = (node: NodeTreeItemViewModel) => {
    if (node.effectiveStatus) {
      counts[node.effectiveStatus] += 1;
    }
    node.children.forEach(walk);
  };

  nodes.forEach(walk);
  return counts;
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

export function VehicleDetailClient({ params, pageView = "dashboard" }: VehiclePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceEvents, setServiceEvents] = useState<ServiceEventItem[]>([]);
  const [isServiceEventsLoading, setIsServiceEventsLoading] = useState(false);
  const [serviceEventsError, setServiceEventsError] = useState("");
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);
  const [isNodeTreeLoading, setIsNodeTreeLoading] = useState(false);
  const [nodeTreeError, setNodeTreeError] = useState("");
  const [isTopServiceNodesLoading, setIsTopServiceNodesLoading] = useState(false);
  const [topServiceNodesError, setTopServiceNodesError] = useState("");
  const [isFullNodeTreeOpen, setIsFullNodeTreeOpen] = useState(false);
  const [isExpenseDetailsModalOpen, setIsExpenseDetailsModalOpen] = useState(false);
  const [isAddServiceEventModalOpen, setIsAddServiceEventModalOpen] = useState(false);
  const [isCreatingServiceEvent, setIsCreatingServiceEvent] = useState(false);
  const [editingServiceEventId, setEditingServiceEventId] = useState<string | null>(null);
  const [serviceEventFormError, setServiceEventFormError] = useState("");
  const [serviceLogActionNotice, setServiceLogActionNotice] =
    useState<ServiceLogActionNotice | null>(null);
  const [selectedNodePath, setSelectedNodePath] = useState<SelectedNodePath>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [nodeStatusFilter, setNodeStatusFilter] = useState<NodeStatusFilter>("ALL");
  const [selectedStatusExplanationNode, setSelectedStatusExplanationNode] =
    useState<NodeTreeItemViewModel | null>(null);
  const [isUsageProfileSectionExpanded, setIsUsageProfileSectionExpanded] = useState(true);
  const [isTechnicalSummarySectionExpanded, setIsTechnicalSummarySectionExpanded] = useState(true);
  const [isNodeMaintenanceModeEnabled, setIsNodeMaintenanceModeEnabled] = useState(false);
  const [selectedTopLevelNodeId, setSelectedTopLevelNodeId] = useState<string | null>(null);
  const [nodeSearchQuery, setNodeSearchQuery] = useState("");
  const [debouncedNodeSearchQuery, setDebouncedNodeSearchQuery] = useState("");
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [statusHighlightedNodeIds, setStatusHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [selectedNodeContextId, setSelectedNodeContextId] = useState<string | null>(null);
  const overlayReturnStackRef = useRef<OverlayReturnTarget[]>([]);
  const serviceEventCommentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
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
  const [nodeSnoozeByNodeId, setNodeSnoozeByNodeId] = useState<Record<string, string | null>>({});
  const [hasLoadedDetailCollapsePrefs, setHasLoadedDetailCollapsePrefs] = useState(false);
  const [isAttentionModalOpen, setIsAttentionModalOpen] = useState(false);
  const [attentionSnoozeFilter, setAttentionSnoozeFilter] = useState<AttentionSnoozeFilter>("all");
  const [wishlistItems, setWishlistItems] = useState<PartWishlistItem[]>([]);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState("");
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [wishlistEditingId, setWishlistEditingId] = useState<string | null>(null);
  const [wishlistForm, setWishlistForm] = useState<PartWishlistFormValues>(() =>
    createInitialPartWishlistFormValues()
  );
  const [wishlistFormError, setWishlistFormError] = useState("");
  const [wishlistNotice, setWishlistNotice] = useState("");
  const [isWishlistSaving, setIsWishlistSaving] = useState(false);
  const [wishlistStatusUpdatingId, setWishlistStatusUpdatingId] = useState("");
  const [wishlistDeletingId, setWishlistDeletingId] = useState("");
  const [pendingWishlistInstallItemId, setPendingWishlistInstallItemId] = useState<string | null>(
    null
  );
  const [partsStatusFilter, setPartsStatusFilter] = useState<PartsStatusFilter>("ALL");
  const [partsSearchQuery, setPartsSearchQuery] = useState("");
  const [collapsedPartsStatusGroups, setCollapsedPartsStatusGroups] = useState<
    Partial<Record<PartWishlistItemStatus, boolean>>
  >({ INSTALLED: true });
  const [partsVisibleCountByStatus, setPartsVisibleCountByStatus] = useState<
    Partial<Record<PartWishlistItemStatus, number>>
  >({});
  const [wishlistSkuQuery, setWishlistSkuQuery] = useState("");
  const [wishlistSkuDebouncedQuery, setWishlistSkuDebouncedQuery] = useState("");
  const [wishlistSkuResults, setWishlistSkuResults] = useState<PartSkuViewModel[]>([]);
  const [wishlistSkuLoading, setWishlistSkuLoading] = useState(false);
  const [wishlistSkuFetchError, setWishlistSkuFetchError] = useState("");
  const [wishlistSkuPickedPreview, setWishlistSkuPickedPreview] = useState<PartSkuViewModel | null>(
    null
  );
  const [wishlistRecommendations, setWishlistRecommendations] = useState<
    PartRecommendationViewModel[]
  >([]);
  const [wishlistRecommendationsLoading, setWishlistRecommendationsLoading] = useState(false);
  const [wishlistRecommendationsError, setWishlistRecommendationsError] = useState("");
  const [wishlistAddingRecommendedSkuId, setWishlistAddingRecommendedSkuId] = useState("");
  const [wishlistServiceKits, setWishlistServiceKits] = useState<ServiceKitViewModel[]>([]);
  const [wishlistServiceKitsLoading, setWishlistServiceKitsLoading] = useState(false);
  const [wishlistServiceKitsError, setWishlistServiceKitsError] = useState("");
  const [wishlistAddingKitCode, setWishlistAddingKitCode] = useState("");
  const wishlistSkuSearchGen = useRef(0);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFormError, setProfileFormError] = useState("");
  const [profileFormSuccess, setProfileFormSuccess] = useState("");
  const [isMovingToTrash, setIsMovingToTrash] = useState(false);
  const [moveToTrashError, setMoveToTrashError] = useState("");
  const [profileForm, setProfileForm] = useState<EditVehicleProfileFormValues>(() =>
    buildInitialVehicleProfileFormValues()
  );
  const [isEditingVehicleState, setIsEditingVehicleState] = useState(false);
  const [vehicleStateOdometer, setVehicleStateOdometer] = useState("");
  const [vehicleStateEngineHours, setVehicleStateEngineHours] = useState("");
  const [vehicleStateError, setVehicleStateError] = useState("");
  const [isSavingVehicleState, setIsSavingVehicleState] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [isAdvancedDetailsOpen, setIsAdvancedDetailsOpen] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [odometer, setOdometer] = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [currency, setCurrency] = useState(
    () => createInitialAddServiceEventFormValues().currency
  );
  const [comment, setComment] = useState("");
  const [partSku, setPartSku] = useState("");
  const [partName, setPartName] = useState("");
  const [installedPartsJson, setInstalledPartsJson] = useState("");
  const [serviceEventSkuLookup, setServiceEventSkuLookup] = useState("");
  const [serviceEventSkuResults, setServiceEventSkuResults] = useState<PartSkuViewModel[]>([]);
  const [serviceEventSkuLoading, setServiceEventSkuLoading] = useState(false);
  const [serviceEventSkuError, setServiceEventSkuError] = useState("");
  const serviceEventSkuSearchGen = useRef(0);
  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
        setSidebarCollapsed(true);
      }
    } catch {
      // Ignore local storage failures.
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Ignore local storage failures.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!profileFormSuccess) {
      return;
    }
    const timer = window.setTimeout(() => setProfileFormSuccess(""), 2200);
    return () => window.clearTimeout(timer);
  }, [profileFormSuccess]);
  const todayDate = getTodayDateString();
  const nodeSelectLevels = useMemo(() => {
    return getNodeSelectLevels(nodeTree, selectedNodePath);
  }, [nodeTree, selectedNodePath]);

  const selectedFinalNode = useMemo(() => {
    return getSelectedNodeFromPath(nodeTree, selectedNodePath);
  }, [nodeTree, selectedNodePath]);

  const selectedPathChildren = useMemo(() => {
    return getAvailableChildrenForSelectedPath(nodeTree, selectedNodePath);
  }, [nodeTree, selectedNodePath]);

  const isLeafNodeSelected = Boolean(
    selectedFinalNode && selectedPathChildren.length === 0
  );


  const { roots: nodeTreeViewModel } = useMemo(
    () => buildNodeTreeSectionProps(nodeTree),
    [nodeTree]
  );
  const topLevelNodeViewModels = useMemo(
    () => getTopLevelNodeTreeItems(nodeTreeViewModel),
    [nodeTreeViewModel]
  );
  const selectedNodeStatusFilter = nodeStatusFilter === "ALL" ? null : nodeStatusFilter;
  const nodeStatusCounts = useMemo(
    () => countNodeStatuses(topLevelNodeViewModels),
    [topLevelNodeViewModels]
  );
  const filteredTopLevelNodeViewModels = useMemo(
    () => filterNodeViewModelsByStatus(topLevelNodeViewModels, selectedNodeStatusFilter),
    [topLevelNodeViewModels, selectedNodeStatusFilter]
  );
  const selectedTopLevelNode = useMemo(
    () =>
      selectedTopLevelNodeId
        ? getNodeSubtreeById(topLevelNodeViewModels, selectedTopLevelNodeId)
        : null,
    [topLevelNodeViewModels, selectedTopLevelNodeId]
  );
  const selectedTopLevelNodeForDisplay = useMemo(
    () =>
      selectedTopLevelNodeId
        ? getNodeSubtreeById(filteredTopLevelNodeViewModels, selectedTopLevelNodeId)
        : null,
    [filteredTopLevelNodeViewModels, selectedTopLevelNodeId]
  );
  const selectedNodeSubtreeModalViewModel = useMemo<NodeSubtreeModalViewModel | null>(
    () =>
      selectedTopLevelNodeForDisplay
        ? buildNodeSubtreeModalViewModel(selectedTopLevelNodeForDisplay, {
            maintenanceModeEnabled: isNodeMaintenanceModeEnabled,
          })
        : null,
    [selectedTopLevelNodeForDisplay, isNodeMaintenanceModeEnabled]
  );
  const selectedNodeContextNode = useMemo(
    () =>
      selectedNodeContextId
        ? getNodeSubtreeById(topLevelNodeViewModels, selectedNodeContextId)
        : null,
    [topLevelNodeViewModels, selectedNodeContextId]
  );
  const selectedNodeContextRawNode = useMemo(
    () =>
      selectedNodeContextId
        ? findNodeTreeItemById(nodeTree, selectedNodeContextId)
        : null,
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
      searchNodeTree(filteredTopLevelNodeViewModels, {
        query: debouncedNodeSearchQuery,
        limit: 10,
        minQueryLength: 2,
      }),
    [filteredTopLevelNodeViewModels, debouncedNodeSearchQuery]
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
  const targetNodeIdFromSearchParams = searchParams.get("nodeId");
  const highlightIssueNodeIdsFromSearchParams = searchParams.get("highlightIssueNodeIds");
  const highlightedWishlistItemIdFromSearchParams = searchParams.get("wishlistItemId");
  const focusNodeInTree = useCallback(
    (nodeId: string) => {
      const path = findNodeViewModelPathById(topLevelNodeViewModels, nodeId);
      if (!path || path.length === 0) {
        return;
      }
      setNodeSearchQuery("");
      setDebouncedNodeSearchQuery("");
      setNodeStatusFilter("ALL");
      setHighlightedNodeId(nodeId);
      setExpandedNodes((prev) => {
        const next = { ...prev };
        for (const ancestorId of path.slice(0, -1)) {
          next[ancestorId] = true;
        }
        return next;
      });
      setSelectedTopLevelNodeId(path[0] ?? null);
    },
    [topLevelNodeViewModels]
  );
  const focusIssueNodesInTree = useCallback(
    (nodeIds: string[]) => {
      const idToNode = flattenNodeViewModelsById(topLevelNodeViewModels);
      const nextHighlightedIds = new Set<string>();
      const nextExpandedNodes: Record<string, boolean> = {};
      let focusNodeId: string | null = null;
      let focusTopLevelNodeId: string | null = null;

      for (const nodeId of nodeIds) {
        const path = findNodeViewModelPathById(topLevelNodeViewModels, nodeId);
        if (!path || path.length === 0) {
          continue;
        }
        for (const ancestorId of path.slice(0, -1)) {
          nextExpandedNodes[ancestorId] = true;
        }
        for (const pathNodeId of path) {
          const pathNode = idToNode.get(pathNodeId);
          if (pathNode && isIssueNodeStatus(pathNode.effectiveStatus)) {
            nextHighlightedIds.add(pathNode.id);
            focusNodeId ??= pathNode.id;
            focusTopLevelNodeId ??= path[0] ?? null;
          }
        }
      }

      setNodeSearchQuery("");
      setDebouncedNodeSearchQuery("");
      setNodeStatusFilter("ALL");
      setStatusHighlightedNodeIds(nextHighlightedIds);
      setHighlightedNodeId(focusNodeId);
      setExpandedNodes((prev) => ({ ...prev, ...nextExpandedNodes }));
      setSelectedTopLevelNodeId(focusTopLevelNodeId);
    },
    [topLevelNodeViewModels]
  );

  const expenseSummary = useMemo(
    () => buildExpenseSummaryFromServiceEvents(serviceEvents),
    [serviceEvents]
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
    const next: Record<string, string | null> = {};
    try {
      for (const nodeId of candidateNodeIds) {
        const key = buildNodeSnoozeStorageKey(vehicleId, nodeId);
        const raw = localStorage.getItem(key);
        if (isNodeSnoozed(raw)) {
          next[nodeId] = raw;
          continue;
        }
        next[nodeId] = null;
        if (raw) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Ignore local-only storage failures.
    }
    setNodeSnoozeByNodeId(next);
  }, [vehicleId, attentionSummary.items, selectedNodeContextId]);

  const attentionAction = useMemo(
    () => buildAttentionActionViewModel(attentionSummary),
    [attentionSummary]
  );
  const filteredAttentionItems = useMemo(
    () =>
      filterAttentionItemsBySnooze(
        attentionSummary.items,
        attentionSnoozeFilter,
        (nodeId) => nodeSnoozeByNodeId[nodeId] ?? null
      ),
    [attentionSummary.items, attentionSnoozeFilter, nodeSnoozeByNodeId]
  );
  const filteredAttentionGroups = useMemo(
    () => groupAttentionItemsByStatus(filteredAttentionItems),
    [filteredAttentionItems]
  );
  const attentionEmptyStateLabel =
    attentionSnoozeFilter === "unsnoozed"
      ? "Нет активных узлов без отложенного напоминания"
      : attentionSnoozeFilter === "snoozed"
        ? "Нет отложенных узлов"
        : "Нет узлов, требующих внимания";
  const attentionTok = statusSemanticTokens[attentionAction.semanticKey];
  const attentionBadgeBg =
    attentionAction.totalCount > 0 && attentionTok.accent !== "transparent"
      ? attentionTok.accent
      : productSemanticColors.divider;

  const wishlistViewModels = useMemo(
    () => wishlistItems.map(buildPartWishlistItemViewModel),
    [wishlistItems]
  );
  const wishlistActiveViewModels = useMemo(
    () => filterActiveWishlistItems(wishlistViewModels),
    [wishlistViewModels]
  );
  const wishlistGroups = useMemo(
    () => groupPartWishlistItemsByStatus(wishlistActiveViewModels),
    [wishlistActiveViewModels]
  );
  const partsStatusCounts = useMemo(() => {
    const counts = new Map<PartWishlistItemStatus, number>();
    for (const status of PART_WISHLIST_STATUS_ORDER) {
      counts.set(status, 0);
    }
    for (const item of wishlistViewModels) {
      counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
    }
    return counts;
  }, [wishlistViewModels]);
  const normalizedPartsSearchQuery = partsSearchQuery.trim().toLowerCase();
  const filteredPartsWishlistViewModels = useMemo(() => {
    return wishlistViewModels.filter((item) => {
      if (partsStatusFilter !== "ALL" && item.status !== partsStatusFilter) {
        return false;
      }
      if (!normalizedPartsSearchQuery) {
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
      return haystack.includes(normalizedPartsSearchQuery);
    });
  }, [normalizedPartsSearchQuery, partsStatusFilter, wishlistViewModels]);
  const filteredPartsWishlistGroups = useMemo(
    () => groupPartWishlistItemsByStatus(filteredPartsWishlistViewModels),
    [filteredPartsWishlistViewModels]
  );
  const installedWishlistServiceEventIdByItemId = useMemo(() => {
    const byWishlistItemId = new Map<string, string>();
    const newestEventsFirst = [...serviceEvents].sort((left, right) => {
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
    return byWishlistItemId;
  }, [serviceEvents]);
  const serviceKitNodesByCode = useMemo(() => {
    const out = new Map<string, { id: string; name: string; hasChildren: boolean }>();
    const stack = [...nodeTree];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) {
        continue;
      }
      out.set(node.code, { id: node.id, name: node.name, hasChildren: node.children.length > 0 });
      for (const child of node.children) {
        stack.push(child);
      }
    }
    return out;
  }, [nodeTree]);
  const serviceKitPreviewByCode = useMemo(() => {
    const out = new Map<string, ServiceKitPreviewViewModel>();
    for (const kit of wishlistServiceKits) {
      out.set(
        kit.code,
        buildServiceKitPreview({
          kit,
          nodesByCode: serviceKitNodesByCode,
          activeWishlistItems: wishlistItems,
        })
      );
    }
    return out;
  }, [serviceKitNodesByCode, wishlistItems, wishlistServiceKits]);
  const wishlistNodeOptions = useMemo(
    () => flattenNodeTreeToSelectOptions(nodeTree),
    [nodeTree]
  );

  const wishlistEditingSourceItem = useMemo(
    () => (wishlistEditingId ? wishlistItems.find((w) => w.id === wishlistEditingId) : undefined),
    [wishlistEditingId, wishlistItems]
  );

  const wishlistRecommendationGroups = useMemo(
    (): PartRecommendationGroup[] =>
      buildPartRecommendationGroupsForDisplay(wishlistRecommendations),
    [wishlistRecommendations]
  );
  const wishlistNodeRequiredError = wishlistFormError.includes("Выберите узел мотоцикла");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedNodeSearchQuery(nodeSearchQuery);
    }, 180);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [nodeSearchQuery]);

  useEffect(() => {
    if (!selectedNodeStatusFilter) {
      return;
    }
    const expandedIds = collectExpandedNodeIdsWithStatusDescendants(
      topLevelNodeViewModels,
      selectedNodeStatusFilter
    );
    setExpandedNodes((prev) => {
      const next = { ...prev };
      expandedIds.forEach((nodeId) => {
        next[nodeId] = true;
      });
      return next;
    });
  }, [topLevelNodeViewModels, selectedNodeStatusFilter]);

  useEffect(() => {
    if (!vehicleId || !selectedNodeContextId) {
      setNodeContextRecommendations([]);
      setNodeContextRecommendationsError("");
      setNodeContextRecommendationsLoading(false);
      return;
    }
    setNodeContextRecommendationsLoading(true);
    setNodeContextRecommendationsError("");
    void vehicleDetailApi
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
  }, [vehicleId, selectedNodeContextId]);

  useEffect(() => {
    if (!vehicleId || !selectedNodeContextId) {
      setNodeContextServiceKits([]);
      setNodeContextServiceKitsError("");
      setNodeContextServiceKitsLoading(false);
      return;
    }
    setNodeContextServiceKitsLoading(true);
    setNodeContextServiceKitsError("");
    void vehicleDetailApi
      .getServiceKits({
        vehicleId,
        nodeId: selectedNodeContextId,
      })
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
  }, [vehicleId, selectedNodeContextId]);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }
    try {
      const usageRaw = localStorage.getItem(`vehicleDetail.${vehicleId}.usageProfile.expanded`);
      const techRaw = localStorage.getItem(`vehicleDetail.${vehicleId}.technicalSummary.expanded`);
      const maintenanceModeRaw = localStorage.getItem(
        `vehicleDetail.${vehicleId}.nodeMaintenanceMode.enabled`
      );
      if (usageRaw === "true" || usageRaw === "false") {
        setIsUsageProfileSectionExpanded(usageRaw === "true");
      } else {
        setIsUsageProfileSectionExpanded(true);
      }
      if (techRaw === "true" || techRaw === "false") {
        setIsTechnicalSummarySectionExpanded(techRaw === "true");
      } else {
        setIsTechnicalSummarySectionExpanded(true);
      }
      if (maintenanceModeRaw === "true" || maintenanceModeRaw === "false") {
        setIsNodeMaintenanceModeEnabled(maintenanceModeRaw === "true");
      } else {
        setIsNodeMaintenanceModeEnabled(false);
      }
    } catch {
      setIsUsageProfileSectionExpanded(true);
      setIsTechnicalSummarySectionExpanded(true);
      setIsNodeMaintenanceModeEnabled(false);
    } finally {
      setHasLoadedDetailCollapsePrefs(true);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId || !hasLoadedDetailCollapsePrefs) {
      return;
    }
    try {
      localStorage.setItem(
        `vehicleDetail.${vehicleId}.usageProfile.expanded`,
        String(isUsageProfileSectionExpanded)
      );
    } catch {
      // Ignore localStorage failures for local UI prefs.
    }
  }, [vehicleId, hasLoadedDetailCollapsePrefs, isUsageProfileSectionExpanded]);

  useEffect(() => {
    if (!vehicleId || !hasLoadedDetailCollapsePrefs) {
      return;
    }
    try {
      localStorage.setItem(
        `vehicleDetail.${vehicleId}.technicalSummary.expanded`,
        String(isTechnicalSummarySectionExpanded)
      );
    } catch {
      // Ignore localStorage failures for local UI prefs.
    }
  }, [vehicleId, hasLoadedDetailCollapsePrefs, isTechnicalSummarySectionExpanded]);

  useEffect(() => {
    if (!vehicleId || !hasLoadedDetailCollapsePrefs) {
      return;
    }
    try {
      localStorage.setItem(
        `vehicleDetail.${vehicleId}.nodeMaintenanceMode.enabled`,
        String(isNodeMaintenanceModeEnabled)
      );
    } catch {
      // Ignore localStorage failures for local UI prefs.
    }
  }, [vehicleId, hasLoadedDetailCollapsePrefs, isNodeMaintenanceModeEnabled]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setWishlistSkuDebouncedQuery(wishlistSkuQuery.trim());
    }, 350);
    return () => window.clearTimeout(id);
  }, [wishlistSkuQuery]);

  useEffect(() => {
    if (!isWishlistModalOpen) {
      return;
    }
    const q = wishlistSkuDebouncedQuery;
    const nodeFilter = wishlistForm.nodeId.trim();
    const canFetch = q.length >= 2 || (q.length === 0 && nodeFilter.length > 0);
    if (!canFetch) {
      setWishlistSkuResults([]);
      setWishlistSkuFetchError("");
      setWishlistSkuLoading(false);
      return;
    }
    const gen = wishlistSkuSearchGen.current + 1;
    wishlistSkuSearchGen.current = gen;
    setWishlistSkuLoading(true);
    setWishlistSkuFetchError("");
    void vehicleDetailApi
      .getPartSkus({
        search: q.length >= 2 ? q : undefined,
        nodeId: nodeFilter || undefined,
      })
      .then((res) => {
        if (wishlistSkuSearchGen.current !== gen) {
          return;
        }
        setWishlistSkuResults(res.skus ?? []);
      })
      .catch(() => {
        if (wishlistSkuSearchGen.current !== gen) {
          return;
        }
        setWishlistSkuResults([]);
        setWishlistSkuFetchError("Не удалось выполнить поиск в каталоге.");
      })
      .finally(() => {
        if (wishlistSkuSearchGen.current !== gen) {
          return;
        }
        setWishlistSkuLoading(false);
      });
  }, [isWishlistModalOpen, wishlistSkuDebouncedQuery, wishlistForm.nodeId]);

  useEffect(() => {
    if (!isWishlistModalOpen || !vehicleId) {
      return;
    }
    const nodeId = wishlistForm.nodeId.trim();
    if (!nodeId) {
      setWishlistRecommendations([]);
      setWishlistRecommendationsError("");
      setWishlistRecommendationsLoading(false);
      return;
    }
    setWishlistRecommendationsLoading(true);
    setWishlistRecommendationsError("");
    void vehicleDetailApi
      .getRecommendedSkusForNode(vehicleId, nodeId)
      .then((res) => {
        setWishlistRecommendations(res.recommendations ?? []);
      })
      .catch(() => {
        setWishlistRecommendations([]);
        setWishlistRecommendationsError("Не удалось загрузить рекомендации по узлу.");
      })
      .finally(() => {
        setWishlistRecommendationsLoading(false);
      });
  }, [isWishlistModalOpen, vehicleId, wishlistForm.nodeId]);

  useEffect(() => {
    if (!isWishlistModalOpen || !vehicleId) {
      return;
    }
    const nodeId = wishlistForm.nodeId.trim();
    if (!nodeId) {
      setWishlistServiceKits([]);
      setWishlistServiceKitsError("");
      setWishlistServiceKitsLoading(false);
      return;
    }
    setWishlistServiceKitsLoading(true);
    setWishlistServiceKitsError("");
    void vehicleDetailApi
      .getServiceKits({ nodeId, vehicleId })
      .then((res) => {
        setWishlistServiceKits(res.kits ?? []);
      })
      .catch(() => {
        setWishlistServiceKits([]);
        setWishlistServiceKitsError("Не удалось загрузить комплекты обслуживания.");
      })
      .finally(() => {
        setWishlistServiceKitsLoading(false);
      });
  }, [isWishlistModalOpen, vehicleId, wishlistForm.nodeId]);


  useEffect(() => {
    if (!serviceLogActionNotice) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setServiceLogActionNotice(null);
    }, 4500);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [serviceLogActionNotice]);

  const openServiceLogModalFull = () => {
    router.push(`/vehicles/${vehicleId}/service-log`);
  };

  const openServiceLogFilteredByNode = (node: NodeTreeItemViewModel) => {
    const raw = findNodeTreeItemById(nodeTree, node.id);
    if (!raw) {
      return;
    }
    const filter = createServiceLogNodeFilter(raw);
    const q = new URLSearchParams();
    q.set("nodeIds", filter.nodeIds.join(","));
    q.set("nodeLabel", filter.displayLabel);
    router.push(`/vehicles/${vehicleId}/service-log?${q.toString()}`);
  };

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const resolvedParams = await params;
        setVehicleId(resolvedParams.id);
        setIsLoading(true);
        setError("");

        const data = await vehicleDetailApi.getVehicleDetail(resolvedParams.id);
        const raw = data.vehicle as unknown as VehicleDetailApiRecord | null;
        setVehicle(raw ? vehicleDetailFromApiRecord(raw) : null);
      } catch (requestError) {
        console.error(requestError);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Произошла ошибка при загрузке мотоцикла."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicle();
  }, [params]);

  useEffect(() => {
    const shouldOpen = searchParams.get("openServiceEventModal");
    if (shouldOpen !== "1") {
      return;
    }
    const editServiceEventId = searchParams.get("editServiceEventId");
    if (editServiceEventId) {
      const serviceEvent = serviceEvents.find((candidate) => candidate.id === editServiceEventId);
      if (!serviceEvent || serviceEvent.eventKind === "STATE_UPDATE") {
        return;
      }
      const nodePath = findNodePathById(nodeTree, serviceEvent.nodeId);
      if (!nodePath) {
        setServiceEventFormError("Не удалось определить путь узла.");
        return;
      }
      setServiceEventFormError("");
      setEditingServiceEventId(serviceEvent.id);
      setPendingWishlistInstallItemId(null);
      applyAddServiceEventFormValues(createInitialEditServiceEventValues(serviceEvent));
      setSelectedNodePath(nodePath);
      setIsAddServiceEventModalOpen(true);
      return;
    }
    setEditingServiceEventId(null);
    setPendingWishlistInstallItemId(null);
    setSelectedNodePath([]);
    const empty = createInitialAddServiceEventFormValues();
    empty.currency = readDefaultCurrencySetting();
    applyAddServiceEventFormValues(empty);
    setServiceEventFormError("");
    setIsAddServiceEventModalOpen(true);
  }, [searchParams, serviceEvents, nodeTree]);

  useEffect(() => {
    if (pageView !== "nodeTree" || !targetNodeIdFromSearchParams || topLevelNodeViewModels.length === 0) {
      return;
    }
    setStatusHighlightedNodeIds(new Set());
    focusNodeInTree(targetNodeIdFromSearchParams);
  }, [focusNodeInTree, pageView, targetNodeIdFromSearchParams, topLevelNodeViewModels.length]);

  useEffect(() => {
    if (
      pageView !== "nodeTree" ||
      !highlightIssueNodeIdsFromSearchParams ||
      topLevelNodeViewModels.length === 0
    ) {
      return;
    }
    const nodeIds = highlightIssueNodeIdsFromSearchParams
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    focusIssueNodesInTree(nodeIds);
  }, [
    focusIssueNodesInTree,
    highlightIssueNodeIdsFromSearchParams,
    pageView,
    topLevelNodeViewModels.length,
  ]);

  useEffect(() => {
    if (!highlightedNodeId || !selectedNodeSubtreeModalViewModel) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const escapedNodeId =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? CSS.escape(highlightedNodeId)
          : highlightedNodeId.replace(/["\\]/g, "\\$&");
      const target = document.querySelector<HTMLElement>(`[data-node-tree-id="${escapedNodeId}"]`);
      target?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [highlightedNodeId, selectedNodeSubtreeModalViewModel]);

  useEffect(() => {
    if (pageView !== "partsSelection" || !highlightedWishlistItemIdFromSearchParams) {
      return;
    }
    const highlightedItem = wishlistViewModels.find(
      (item) => item.id === highlightedWishlistItemIdFromSearchParams
    );
    if (highlightedItem) {
      setPartsStatusFilter(highlightedItem.status);
      setPartsSearchQuery("");
      setCollapsedPartsStatusGroups((prev) => ({ ...prev, [highlightedItem.status]: false }));
      const itemsInStatus = wishlistViewModels.filter((item) => item.status === highlightedItem.status);
      const highlightedIndex = itemsInStatus.findIndex((item) => item.id === highlightedItem.id);
      if (highlightedIndex >= 0) {
        setPartsVisibleCountByStatus((prev) => ({
          ...prev,
          [highlightedItem.status]: Math.max(
            prev[highlightedItem.status] ?? PARTS_SELECTION_INITIAL_VISIBLE_COUNT,
            highlightedIndex + 1
          ),
        }));
      }
    }
    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector(
        `[data-wishlist-item-id="${CSS.escape(highlightedWishlistItemIdFromSearchParams)}"]`
      );
      target?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [highlightedWishlistItemIdFromSearchParams, pageView, wishlistViewModels]);

  useEffect(() => {
    if (!isAddServiceEventModalOpen || !serviceEventCommentTextareaRef.current) {
      return;
    }
    const textarea = serviceEventCommentTextareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 80)}px`;
  }, [comment, isAddServiceEventModalOpen]);

  useEffect(() => {
    if (!isAddServiceEventModalOpen) {
      setServiceEventSkuLookup("");
      setServiceEventSkuResults([]);
      setServiceEventSkuError("");
      setServiceEventSkuLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setServiceEventSkuLookup(partSku.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [isAddServiceEventModalOpen, partSku]);

  useEffect(() => {
    if (!isAddServiceEventModalOpen) {
      return;
    }
    const query = serviceEventSkuLookup;
    if (query.length < 2) {
      setServiceEventSkuResults([]);
      setServiceEventSkuError("");
      setServiceEventSkuLoading(false);
      return;
    }
    const gen = serviceEventSkuSearchGen.current + 1;
    serviceEventSkuSearchGen.current = gen;
    setServiceEventSkuLoading(true);
    setServiceEventSkuError("");
    void vehicleDetailApi
      .getPartSkus({
        search: query,
        nodeId: selectedFinalNode?.id || undefined,
      })
      .then((res) => {
        if (serviceEventSkuSearchGen.current !== gen) {
          return;
        }
        const list = res.skus ?? [];
        const normalizedQuery = normalizePartNumberForLookup(query);
        const exact = list.find((sku) =>
          sku.partNumbers.some(
            (partNumber) =>
              normalizePartNumberForLookup(partNumber.number) === normalizedQuery
          )
        );
        const ordered = exact
          ? [exact, ...list.filter((candidate) => candidate.id !== exact.id)]
          : list;
        setServiceEventSkuResults(ordered.slice(0, 6));
      })
      .catch(() => {
        if (serviceEventSkuSearchGen.current !== gen) {
          return;
        }
        setServiceEventSkuResults([]);
        setServiceEventSkuError("Не удалось выполнить поиск в каталоге.");
      })
      .finally(() => {
        if (serviceEventSkuSearchGen.current !== gen) {
          return;
        }
        setServiceEventSkuLoading(false);
      });
  }, [isAddServiceEventModalOpen, selectedFinalNode?.id, serviceEventSkuLookup]);

  const loadServiceEvents = useCallback(async () => {
    if (!vehicleId) {
      return;
    }

    try {
      setIsServiceEventsLoading(true);
      setServiceEventsError("");
      const data = await vehicleDetailApi.getServiceEvents(vehicleId);
      setServiceEvents(data.serviceEvents ?? []);
    } catch (serviceError) {
      console.error(serviceError);
      setServiceEventsError(
        serviceError instanceof Error
          ? serviceError.message
          : "Произошла ошибка при загрузке журнала."
      );
    } finally {
      setIsServiceEventsLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }
    void loadServiceEvents();
  }, [vehicleId, loadServiceEvents]);

  const loadNodeTree = useCallback(async () => {
    if (!vehicleId) {
      return;
    }

    try {
      setIsNodeTreeLoading(true);
      setNodeTreeError("");
      const data = await vehicleDetailApi.getNodeTree(vehicleId);
      setNodeTree(data.nodeTree ?? []);
    } catch (nodeTreeLoadError) {
      console.error(nodeTreeLoadError);
      setNodeTreeError(
        nodeTreeLoadError instanceof Error
          ? nodeTreeLoadError.message
          : "Произошла ошибка при загрузке дерева узлов."
      );
    } finally {
      setIsNodeTreeLoading(false);
    }
  }, [vehicleId]);

  const loadTopServiceNodes = useCallback(async () => {
    try {
      setIsTopServiceNodesLoading(true);
      setTopServiceNodesError("");
      const data = await vehicleDetailApi.getTopServiceNodes();
      setTopServiceNodes(data.nodes ?? []);
    } catch (topNodesLoadError) {
      console.error(topNodesLoadError);
      setTopServiceNodesError(
        topNodesLoadError instanceof Error
          ? topNodesLoadError.message
          : "Не удалось загрузить основные узлы."
      );
      setTopServiceNodes([]);
    } finally {
      setIsTopServiceNodesLoading(false);
    }
  }, []);

  const loadWishlist = useCallback(async () => {
    if (!vehicleId) {
      return;
    }

    try {
      setIsWishlistLoading(true);
      setWishlistError("");
      const data = await vehicleDetailApi.getVehicleWishlist(vehicleId);
      setWishlistItems(data.items ?? []);
    } catch (e) {
      console.error(e);
      setWishlistError(
        e instanceof Error ? e.message : "Не удалось загрузить список покупок."
      );
    } finally {
      setIsWishlistLoading(false);
    }
  }, [vehicleId]);

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const applyAddServiceEventFormValues = (values: AddServiceEventFormValues) => {
    setServiceType(values.serviceType);
    setEventDate(values.eventDate);
    setOdometer(values.odometer);
    setEngineHours(values.engineHours);
    setCostAmount(values.costAmount);
    setCurrency(values.currency);
    setComment(values.comment);
    setPartSku(values.partSku);
    setPartName(values.partName);
    setInstalledPartsJson(values.installedPartsJson);
  };

  const readDefaultCurrencySetting = () => {
    try {
      const raw = localStorage.getItem(USER_LOCAL_SETTINGS_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_USER_LOCAL_SETTINGS.defaultCurrency;
      }
      const settings = normalizeUserLocalSettings(JSON.parse(raw));
      return getDefaultCurrencyFromSettings(settings);
    } catch {
      return DEFAULT_USER_LOCAL_SETTINGS.defaultCurrency;
    }
  };
  const navigateBackWithFallback = (fallbackHref: string) => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  const openAddServiceEventFromLeafNode = (leafNodeId: string) => {
    if (!vehicle) {
      setServiceEventFormError("Не удалось загрузить данные мотоцикла.");
      return;
    }
    const nodePath = findNodePathById(nodeTree, leafNodeId);
    const leafNode = findNodeTreeItemById(nodeTree, leafNodeId);

    if (!nodePath || !leafNode) {
      setServiceEventFormError("Не удалось определить путь узла.");
      return;
    }

    const values = createInitialAddServiceEventFromNode({
      nodeId: leafNode.id,
      nodeCode: leafNode.code,
      nodeName: leafNode.name,
      vehicle: {
        odometer: vehicle.odometer,
        engineHours: vehicle.engineHours,
      },
      currentDateYmd: todayDate,
    });
    values.currency = readDefaultCurrencySetting();

    setServiceEventFormError("");
    setEditingServiceEventId(null);
    setPendingWishlistInstallItemId(null);
    applyAddServiceEventFormValues(values);
    setSelectedNodePath(nodePath);
    setIsAddServiceEventModalOpen(true);
  };

  const openAddServiceEventPrefilledFromWishlist = (
    item: PartWishlistItem,
    options: { pendingInstall?: boolean } = {}
  ) => {
    if (!vehicle) {
      setServiceEventFormError("Не удалось загрузить данные мотоцикла.");
      return false;
    }
    if (!item.nodeId) {
      return false;
    }
    const nodePath = findNodePathById(nodeTree, item.nodeId);
    if (!nodePath) {
      setServiceEventFormError("Не удалось определить путь узла для позиции списка.");
      return false;
    }
    setServiceEventFormError("");
    setEditingServiceEventId(null);
    const values = createInitialAddServiceEventFromWishlistItem(
      item,
      { odometer: vehicle.odometer, engineHours: vehicle.engineHours },
      { todayDateYmd: todayDate }
    );
    applyAddServiceEventFormValues(values);
    setSelectedNodePath(nodePath);
    setPendingWishlistInstallItemId(options.pendingInstall ? item.id : null);
    setIsAddServiceEventModalOpen(true);
    return true;
  };

  const openServiceLogForAttentionItem = (item: AttentionItemViewModel) => {
    const raw = findNodeTreeItemById(nodeTree, item.nodeId);
    if (!raw) {
      return;
    }
    setIsAttentionModalOpen(false);
    const filter = createServiceLogNodeFilter(raw);
    const q = new URLSearchParams();
    q.set("nodeIds", filter.nodeIds.join(","));
    q.set("nodeLabel", filter.displayLabel);
    router.push(`/vehicles/${vehicleId}/service-log?${q.toString()}`);
  };

  const openAddServiceFromAttentionItem = (item: AttentionItemViewModel) => {
    if (!item.canAddServiceEvent) {
      return;
    }
    pushOverlayReturnTarget({ type: "attention" });
    setIsAttentionModalOpen(false);
    openAddServiceEventFromLeafNode(item.nodeId);
  };

  const openStatusExplanationForAttentionItem = (item: AttentionItemViewModel) => {
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
    pushOverlayReturnTarget({ type: "attention" });
    setIsAttentionModalOpen(false);
    openStatusExplanationModal(vm);
  };

  const openWishlistModalForCreate = (presetNodeId?: string) => {
    setWishlistNotice("");
    setWishlistEditingId(null);
    wishlistSkuSearchGen.current += 1;
    setWishlistSkuQuery("");
    setWishlistSkuDebouncedQuery("");
    setWishlistSkuResults([]);
    setWishlistSkuFetchError("");
    setWishlistSkuPickedPreview(null);
    setWishlistRecommendations([]);
    setWishlistRecommendationsError("");
    setWishlistAddingRecommendedSkuId("");
    setWishlistServiceKits([]);
    setWishlistServiceKitsError("");
    setWishlistAddingKitCode("");
    const initialWishlistForm = createInitialPartWishlistFormValues({
      nodeId: presetNodeId ?? "",
      status: "NEEDED",
    });
    setWishlistForm({ ...initialWishlistForm, currency: readDefaultCurrencySetting() });
    setWishlistFormError("");
    setIsWishlistModalOpen(true);
  };

  const openWishlistModalForEdit = (item: PartWishlistItem) => {
    setWishlistNotice("");
    setWishlistEditingId(item.id);
    wishlistSkuSearchGen.current += 1;
    setWishlistSkuQuery("");
    setWishlistSkuDebouncedQuery("");
    setWishlistSkuResults([]);
    setWishlistSkuFetchError("");
    setWishlistSkuPickedPreview(null);
    setWishlistRecommendations([]);
    setWishlistRecommendationsError("");
    setWishlistAddingRecommendedSkuId("");
    setWishlistServiceKits([]);
    setWishlistServiceKitsError("");
    setWishlistAddingKitCode("");
    setWishlistForm(partWishlistFormValuesFromItem(item));
    setWishlistFormError("");
    setIsWishlistModalOpen(true);
  };

  const closeWishlistModal = (options: { restorePrevious?: boolean } = {}) => {
    setIsWishlistModalOpen(false);
    setWishlistEditingId(null);
    setWishlistFormError("");
    wishlistSkuSearchGen.current += 1;
    setWishlistSkuQuery("");
    setWishlistSkuDebouncedQuery("");
    setWishlistSkuResults([]);
    setWishlistSkuFetchError("");
    setWishlistSkuPickedPreview(null);
    setWishlistRecommendations([]);
    setWishlistRecommendationsError("");
    setWishlistAddingRecommendedSkuId("");
    setWishlistServiceKits([]);
    setWishlistServiceKitsError("");
    setWishlistAddingKitCode("");
    if (options.restorePrevious ?? true) {
      restorePreviousOverlay();
    }
  };

  const submitWishlistForm = async () => {
    if (!vehicleId) {
      return;
    }
    const validation = validatePartWishlistFormValues(wishlistForm);
    if (validation.errors.length > 0) {
      setWishlistFormError(validation.errors.join(" "));
      return;
    }
    setIsWishlistSaving(true);
    setWishlistFormError("");
    try {
      const prevForTransition = wishlistEditingId
        ? wishlistItems.find((w) => w.id === wishlistEditingId)?.status ?? "NEEDED"
        : "NEEDED";
      let savedItem: PartWishlistItem | null = null;

      if (wishlistEditingId) {
        const res = await vehicleDetailApi.updateWishlistItem(
          vehicleId,
          wishlistEditingId,
          normalizeUpdatePartWishlistPayload(wishlistForm)
        );
        savedItem = res.item;
      } else {
        const res = await vehicleDetailApi.createWishlistItem(
          vehicleId,
          normalizeCreatePartWishlistPayload(wishlistForm)
        );
        savedItem = res.item;
      }

      await Promise.all([loadWishlist(), loadServiceEvents(), loadNodeTree(), loadTopServiceNodes()]);
      closeWishlistModal({ restorePrevious: false });

      if (
        savedItem &&
        vehicle &&
        isWishlistTransitionToInstalled(prevForTransition, savedItem.status)
      ) {
        if (savedItem.nodeId) {
          openAddServiceEventPrefilledFromWishlist(savedItem);
        } else {
          setWishlistNotice(WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT);
        }
      }
    } catch (e) {
      setWishlistFormError(
        e instanceof Error ? e.message : "Не удалось сохранить позицию."
      );
    } finally {
      setIsWishlistSaving(false);
    }
  };

  const addRecommendedSkuToWishlist = async (rec: PartRecommendationViewModel) => {
    if (!vehicleId || wishlistEditingId) {
      const skuFromRecommendation: PartSkuViewModel = {
        id: rec.skuId,
        seedKey: null,
        primaryNodeId: rec.primaryNode?.id ?? null,
        brandName: rec.brandName,
        canonicalName: rec.canonicalName,
        partType: rec.partType,
        description: null,
        category: null,
        priceAmount: rec.priceAmount,
        currency: rec.currency,
        sourceUrl: null,
        isOem: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        primaryNode: rec.primaryNode,
        nodeLinks: [],
        fitments: [],
        offers: [],
        partNumbers: rec.partNumbers.map((number, idx) => ({
          id: `${rec.skuId}-${idx}`,
          skuId: rec.skuId,
          number,
          normalizedNumber: number,
          numberType: "MANUFACTURER",
          brandName: rec.brandName,
          createdAt: new Date().toISOString(),
        })),
      };
      setWishlistSkuPickedPreview(null);
      setWishlistForm((f) => applyPartSkuViewModelToPartWishlistFormValues(f, skuFromRecommendation));
      return;
    }
    try {
      setWishlistAddingRecommendedSkuId(rec.skuId);
      const payload = normalizeCreatePartWishlistPayload({
        ...createInitialPartWishlistFormValues({
          nodeId: wishlistForm.nodeId,
          status: "NEEDED",
        }),
        skuId: rec.skuId,
      });
      await vehicleDetailApi.createWishlistItem(vehicleId, payload);
      await Promise.all([loadWishlist(), loadNodeTree()]);
      setWishlistNotice("Рекомендованный SKU добавлен в список покупок.");
      closeWishlistModal({ restorePrevious: false });
    } catch (e) {
      setWishlistFormError(
        e instanceof Error ? e.message : "Не удалось добавить рекомендованный SKU."
      );
    } finally {
      setWishlistAddingRecommendedSkuId("");
    }
  };

  const addServiceKitToWishlist = async (kit: ServiceKitViewModel) => {
    if (!vehicleId || wishlistEditingId) {
      return;
    }
    const contextNodeId = wishlistForm.nodeId.trim();
    if (!contextNodeId) {
      setWishlistFormError("Выберите узел мотоцикла");
      return;
    }
    try {
      setWishlistAddingKitCode(kit.code);
      const res = await vehicleDetailApi.addServiceKitToWishlist(vehicleId, {
        kitCode: kit.code,
        contextNodeId,
      });
      await Promise.all([loadWishlist(), loadNodeTree()]);
      setWishlistNotice(
        `Комплект добавлен: ${res.result.createdItems.length} создано, ${res.result.skippedItems.length} пропущено.`
      );
      closeWishlistModal({ restorePrevious: false });
    } catch (e) {
      setWishlistFormError(
        e instanceof Error ? e.message : "Не удалось добавить комплект обслуживания."
      );
    } finally {
      setWishlistAddingKitCode("");
    }
  };

  const deleteWishlistItemById = async (itemId: string) => {
    if (!vehicleId) {
      return;
    }
    if (!window.confirm("Удалить позицию из списка покупок?")) {
      return;
    }
    try {
      setWishlistNotice("");
      setWishlistDeletingId(itemId);
      await vehicleDetailApi.deleteWishlistItem(vehicleId, itemId);
      await loadWishlist();
      setWishlistNotice("Позиция удалена из списка покупок.");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Не удалось удалить позицию.";
      setWishlistNotice(`Ошибка: ${msg}`);
    } finally {
      setWishlistDeletingId("");
    }
  };

  const patchWishlistItemStatus = async (
    itemId: string,
    status: PartWishlistItem["status"],
    previousStatus: PartWishlistItem["status"]
  ) => {
    if (!vehicleId) {
      return;
    }
    if (status === previousStatus) {
      return;
    }
    try {
      setWishlistNotice("");
      const sourceItem = wishlistItems.find((w) => w.id === itemId);
      if (!sourceItem) {
        setWishlistNotice("Ошибка: позиция списка не найдена.");
        return;
      }
      const sourceNodeId = sourceItem?.nodeId?.trim() ?? "";
      const shouldDeferInstalledStatus =
        status === "INSTALLED" && isWishlistTransitionToInstalled(previousStatus, status);
      if (!sourceNodeId) {
        openWishlistModalForEdit(sourceItem);
        setWishlistForm((prev) => ({ ...prev, status }));
        setWishlistFormError(
          status === "INSTALLED"
            ? "Чтобы отметить позицию установленной, выберите конечный узел мотоцикла."
            : "Чтобы менять статус позиции из блока покупок, выберите конечный узел мотоцикла."
        );
        return;
      }
      if (shouldDeferInstalledStatus) {
        const didOpenServiceEventModal = openAddServiceEventPrefilledFromWishlist(sourceItem, {
          pendingInstall: true,
        });
        if (didOpenServiceEventModal) {
          setWishlistNotice(
            "Статус «Установлено» применится после сохранения сервисного события."
          );
        }
        return;
      }
      setWishlistStatusUpdatingId(itemId);
      const res = await vehicleDetailApi.updateWishlistItem(vehicleId, itemId, {
        status,
        nodeId: sourceNodeId,
      });
      await Promise.all([loadWishlist(), loadServiceEvents(), loadNodeTree(), loadTopServiceNodes()]);
      const becameInstalled =
        res.item.status === "INSTALLED" &&
        isWishlistTransitionToInstalled(previousStatus, res.item.status);
      if (becameInstalled && vehicle) {
        if (res.item.nodeId) {
          openAddServiceEventPrefilledFromWishlist(res.item);
        } else {
          setWishlistNotice(WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT);
        }
      }
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Не удалось обновить статус.";
      setWishlistNotice(`Ошибка: ${msg}`);
    } finally {
      setWishlistStatusUpdatingId("");
    }
  };

  const pushOverlayReturnTarget = (target: OverlayReturnTarget) => {
    overlayReturnStackRef.current = [...overlayReturnStackRef.current, target];
  };
  const restoreOverlayReturnTarget = (target: OverlayReturnTarget) => {
    if (target.type === "attention") {
      setIsAttentionModalOpen(true);
      return;
    }
    if (target.type === "nodeContext") {
      setSelectedNodeContextId(target.nodeId);
      return;
    }
    setHighlightedNodeId(target.highlightedNodeId);
    setSelectedTopLevelNodeId(target.nodeId);
  };
  const restorePreviousOverlay = () => {
    const target = overlayReturnStackRef.current.at(-1);
    if (!target) {
      return;
    }
    overlayReturnStackRef.current = overlayReturnStackRef.current.slice(0, -1);
    window.requestAnimationFrame(() => restoreOverlayReturnTarget(target));
  };
  const getCurrentOverlayReturnTarget = (): OverlayReturnTarget | null => {
    if (selectedNodeContextId) {
      return { type: "nodeContext", nodeId: selectedNodeContextId };
    }
    if (selectedTopLevelNodeId) {
      return {
        type: "topLevelNode",
        nodeId: selectedTopLevelNodeId,
        highlightedNodeId,
      };
    }
    if (isAttentionModalOpen) {
      return { type: "attention" };
    }
    return null;
  };
  const clearTopLevelNodeSubtreeModal = () => {
    setSelectedTopLevelNodeId(null);
    setHighlightedNodeId(null);
  };
  const closeTopLevelNodeSubtreeModal = (options: { restorePrevious?: boolean } = {}) => {
    clearTopLevelNodeSubtreeModal();
    if (options.restorePrevious ?? true) {
      restorePreviousOverlay();
    }
  };
  const clearNodeContextModal = () => {
    setSelectedNodeContextId(null);
    setNodeContextAddingRecommendedSkuId("");
    setNodeContextAddingKitCode("");
  };
  const closeNodeContextModal = (options: { restorePrevious?: boolean } = {}) => {
    clearNodeContextModal();
    if (options.restorePrevious ?? true) {
      restorePreviousOverlay();
    }
  };
  const closeStatusExplanationModal = (options: { restorePrevious?: boolean } = {}) => {
    setSelectedStatusExplanationNode(null);
    if (options.restorePrevious ?? true) {
      restorePreviousOverlay();
    }
  };
  const openWishlistFromAttentionItem = (item: AttentionItemViewModel) => {
    pushOverlayReturnTarget({ type: "attention" });
    setIsAttentionModalOpen(false);
    openWishlistModalForCreate(item.nodeId);
  };
  const openNodeContextFromAttentionItem = (item: AttentionItemViewModel) => {
    openNodeContextModal(item.nodeId, { type: "attention" });
  };
  const openTopOverviewNode = (nodeId: string) => {
    if (pageView === "nodeTree") {
      setStatusHighlightedNodeIds(new Set());
      focusNodeInTree(nodeId);
      return;
    }
    router.push(`/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(nodeId)}`);
  };
  const openTopOverviewIssueNodes = (nodeIds: string[]) => {
    if (nodeIds.length === 0) {
      return;
    }
    if (pageView === "nodeTree") {
      focusIssueNodesInTree(nodeIds);
      return;
    }
    router.push(
      `/vehicles/${vehicleId}/nodes?highlightIssueNodeIds=${encodeURIComponent(nodeIds.join(","))}`
    );
  };
  const openNodeContextModal = (nodeId: string, returnTarget?: OverlayReturnTarget | null) => {
    const target = returnTarget ?? getCurrentOverlayReturnTarget();
    if (target) {
      pushOverlayReturnTarget(target);
    }
    setIsAttentionModalOpen(false);
    clearTopLevelNodeSubtreeModal();
    setSelectedNodeContextId(nodeId);
  };
  const openTopLevelNodeSubtreeModal = (nodeId: string) => {
    overlayReturnStackRef.current = [];
    setHighlightedNodeId(null);
    setSelectedTopLevelNodeId(nodeId);
  };
  const openSearchResultInSubtreeModal = (result: NodeTreeSearchResultViewModel) => {
    setNodeSearchQuery("");
    setDebouncedNodeSearchQuery("");
    setHighlightedNodeId(result.nodeId);
    setExpandedNodes((prev) => {
      const next = { ...prev };
      for (const ancestorId of result.ancestorIds) {
        next[ancestorId] = true;
      }
      return next;
    });
    setSelectedTopLevelNodeId(result.topLevelNodeId);
  };
  const openServiceLogFromSearchResult = (result: NodeTreeSearchResultViewModel) => {
    setNodeSearchQuery("");
    setDebouncedNodeSearchQuery("");
    setHighlightedNodeId(null);
    const selectedNode = getNodeSubtreeById(topLevelNodeViewModels, result.nodeId);
    if (!selectedNode) {
      return;
    }
    openServiceLogFilteredByNode(selectedNode);
  };
  function openStatusExplanationModal(node: NodeTreeItemViewModel) {
    setSelectedStatusExplanationNode(null);
    window.requestAnimationFrame(() => {
      setSelectedStatusExplanationNode(node);
    });
  }
  const openStatusExplanationFromSearchResult = (result: NodeTreeSearchResultViewModel) => {
    const selectedNode = getNodeSubtreeById(topLevelNodeViewModels, result.nodeId);
    if (!selectedNode || !canOpenNodeStatusExplanationModal(selectedNode)) {
      return;
    }
    setNodeSearchQuery("");
    setDebouncedNodeSearchQuery("");
    setHighlightedNodeId(null);
    openStatusExplanationModal(selectedNode);
  };
  const addRecommendedSkuToWishlistFromNodeContext = async (rec: PartRecommendationViewModel) => {
    if (!vehicleId || !selectedNodeContextId) {
      return;
    }
    try {
      setNodeContextAddingRecommendedSkuId(rec.skuId);
      const payload = normalizeCreatePartWishlistPayload({
        ...createInitialPartWishlistFormValues({
          nodeId: selectedNodeContextId,
          status: "NEEDED",
        }),
        skuId: rec.skuId,
      });
      await vehicleDetailApi.createWishlistItem(vehicleId, payload);
      await Promise.all([loadWishlist(), loadNodeTree()]);
      setWishlistNotice("Рекомендованный SKU добавлен в список покупок.");
    } catch (e) {
      setNodeContextRecommendationsError(
        e instanceof Error ? e.message : "Не удалось добавить рекомендованный SKU."
      );
    } finally {
      setNodeContextAddingRecommendedSkuId("");
    }
  };
  const addServiceKitToWishlistFromNodeContext = async (kit: ServiceKitViewModel) => {
    if (!vehicleId || !selectedNodeContextId) {
      return;
    }
    try {
      setNodeContextAddingKitCode(kit.code);
      const res = await vehicleDetailApi.addServiceKitToWishlist(vehicleId, {
        kitCode: kit.code,
        contextNodeId: selectedNodeContextId,
      });
      await Promise.all([loadWishlist(), loadNodeTree()]);
      setWishlistNotice(
        `Комплект добавлен: ${res.result.createdItems.length} создано, ${res.result.skippedItems.length} пропущено.`
      );
      window.alert(
        `Комплект добавлен.\nДобавлено: ${res.result.createdItems.length}\nПропущено: ${res.result.skippedItems.length}`
      );
    } catch (e) {
      const message =
        e instanceof Error && e.message.trim().length > 0
          ? e.message
          : "Не удалось добавить комплект обслуживания.";
      setNodeContextServiceKitsError(
        message
      );
      window.alert(message);
    } finally {
      setNodeContextAddingKitCode("");
    }
  };
  const handleNodeContextAction = (actionKey: string) => {
    if (!selectedNodeContextNode) {
      return;
    }
    if (actionKey === "journal") {
      closeNodeContextModal({ restorePrevious: false });
      openServiceLogFilteredByNode(selectedNodeContextNode);
      return;
    }
    if (actionKey === "add_service_event" && selectedNodeContextNode.canAddServiceEvent) {
      pushOverlayReturnTarget({ type: "nodeContext", nodeId: selectedNodeContextNode.id });
      closeNodeContextModal({ restorePrevious: false });
      openAddServiceEventFromLeafNode(selectedNodeContextNode.id);
      return;
    }
    if (actionKey === "add_wishlist" && !selectedNodeContextNode.hasChildren) {
      pushOverlayReturnTarget({ type: "nodeContext", nodeId: selectedNodeContextNode.id });
      closeNodeContextModal({ restorePrevious: false });
      openWishlistModalForCreate(selectedNodeContextNode.id);
      return;
    }
    if (actionKey === "add_kit" && nodeContextServiceKits[0]) {
      void addServiceKitToWishlistFromNodeContext(nodeContextServiceKits[0]);
      return;
    }
    if (actionKey === "open_status_explanation" && selectedNodeContextNode.statusExplanation) {
      pushOverlayReturnTarget({ type: "nodeContext", nodeId: selectedNodeContextNode.id });
      closeNodeContextModal({ restorePrevious: false });
      openStatusExplanationModal(selectedNodeContextNode);
    }
  };
  const openWishlistFromSearchResult = (result: NodeTreeSearchResultViewModel) => {
    if (!result.isLeaf) {
      return;
    }
    setNodeSearchQuery("");
    setDebouncedNodeSearchQuery("");
    setHighlightedNodeId(null);
    openWishlistModalForCreate(result.nodeId);
  };
  const handleSearchResultAction = (
    actionKey: NodeTreeSearchActionKey,
    result: NodeTreeSearchResultViewModel
  ) => {
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
  };
  const openServiceLogFromTreeContext = (node: NodeTreeItemViewModel) => {
    closeTopLevelNodeSubtreeModal();
    openServiceLogFilteredByNode(node);
  };
  const openAddServiceEventFromTreeContext = (leafNodeId: string) => {
    const target = getCurrentOverlayReturnTarget();
    if (target) {
      pushOverlayReturnTarget(target);
    }
    closeTopLevelNodeSubtreeModal({ restorePrevious: false });
    openAddServiceEventFromLeafNode(leafNodeId);
  };
  const openWishlistFromTreeContext = (nodeId: string) => {
    const target = getCurrentOverlayReturnTarget();
    if (target) {
      pushOverlayReturnTarget(target);
    }
    closeTopLevelNodeSubtreeModal({ restorePrevious: false });
    openWishlistModalForCreate(nodeId);
  };
  const openStatusExplanationFromTreeContext = (node: NodeTreeItemViewModel) => {
    openStatusExplanationModal(node);
  };
  const getNodeModeToggleLabel = () =>
    isNodeMaintenanceModeEnabled ? "План обслуживания: вкл" : "Показывать план обслуживания";
  const setNodeSnoozeOption = useCallback(
    (nodeId: string, option: NodeSnoozeOption) => {
      if (!vehicleId) {
        return;
      }
      try {
        const key = buildNodeSnoozeStorageKey(vehicleId, nodeId);
        const nextValue = option === "clear" ? null : calculateSnoozeUntilDate(option);
        if (nextValue) {
          localStorage.setItem(key, nextValue);
        } else {
          localStorage.removeItem(key);
        }
        setNodeSnoozeByNodeId((prev) => ({ ...prev, [nodeId]: nextValue }));
      } catch {
        // Ignore local-only storage failures.
      }
    },
    [vehicleId]
  );
  const selectedNodeSnoozeUntil =
    selectedNodeContextId ? (nodeSnoozeByNodeId[selectedNodeContextId] ?? null) : null;
  const selectedNodeSnoozeLabel = formatSnoozeUntilLabel(selectedNodeSnoozeUntil);
  const canSnoozeSelectedNode =
    selectedNodeContextViewModel?.effectiveStatus === "OVERDUE" ||
    selectedNodeContextViewModel?.effectiveStatus === "SOON";

  const formatNodeMaintenanceSummaryLine = (
    summary: NodeMaintenancePlanSummaryViewModel | null
  ): string | null => {
    if (!summary) {
      return null;
    }
    const parts: string[] = [];
    if (summary.overdueCount > 0) {
      parts.push(`Просрочено: ${summary.overdueCount}`);
    }
    if (summary.soonCount > 0) {
      parts.push(`Скоро: ${summary.soonCount}`);
    }
    if (summary.plannedLaterCount > 0) {
      parts.push(`Запланировано: ${summary.plannedLaterCount}`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  };

  const renderChildTreeNode = (node: NodeTreeItemViewModel, depth: number): ReactNode => {
    const hasChildren = node.hasChildren;
    const isExpanded = Boolean(expandedNodes[node.id]);
    const maintenancePlan = isNodeMaintenanceModeEnabled
      ? buildNodeMaintenancePlanViewModel(node)
      : null;
    const parentMaintenanceSummary = formatNodeMaintenanceSummaryLine(maintenancePlan?.parentSummary ?? null);
    const shouldUseMaintenanceShortExplanation =
      isNodeMaintenanceModeEnabled &&
      node.effectiveStatus === "OVERDUE" &&
      !node.shortExplanationLabel &&
      Boolean(maintenancePlan?.shortText);
    const overdueDueLineFallback =
      isNodeMaintenanceModeEnabled && node.effectiveStatus === "OVERDUE"
        ? (maintenancePlan?.dueLines[0] ?? null)
        : null;
    const overdueDetailedFallback =
      isNodeMaintenanceModeEnabled && node.effectiveStatus === "OVERDUE"
        ? (node.statusExplanation?.reasonDetailed?.trim() || null)
        : null;
    const shortExplanationLabel =
      node.shortExplanationLabel ??
      (shouldUseMaintenanceShortExplanation ? maintenancePlan?.shortText ?? null : null) ??
      overdueDetailedFallback ??
      overdueDueLineFallback;
    const canOpenStatusExplanation = canOpenNodeStatusExplanationModal(node);
    const statusHighlightTokens =
      statusHighlightedNodeIds.has(node.id) && isIssueNodeStatus(node.effectiveStatus)
        ? statusSemanticTokens[node.effectiveStatus]
        : null;
    const renderMaintenanceTableCell = (
      line: string,
      options: { key?: string; muted?: boolean } = {}
    ) => {
      const contentStyle = {
        color: options.muted
          ? productSemanticColors.textSecondary
          : productSemanticColors.textPrimary,
      };
      return (
        <td
          key={options.key ?? line}
          className="whitespace-nowrap px-2 py-0.5 align-top first:pl-0"
        >
          {canOpenStatusExplanation ? (
            <button
              type="button"
              onClick={() => openStatusExplanationFromTreeContext(node)}
              className="block text-left text-xs underline decoration-dotted underline-offset-2 transition hover:text-slate-100"
              style={contentStyle}
              title={line}
            >
              {line}
            </button>
          ) : (
            <span className="block text-xs" style={contentStyle} title={line}>
              {line}
            </span>
          )}
        </td>
      );
    };

    return (
      <div key={node.id} className="space-y-2.5">
        <div
          data-node-tree-id={node.id}
          className={`rounded-xl border bg-slate-900 px-4 py-3.5 ${
            statusHighlightTokens
              ? "ring-2"
              : highlightedNodeId === node.id
              ? "ring-2"
              : "border-slate-700"
          }`}
          style={{
            marginLeft: `${depth * 16}px`,
            backgroundColor: productSemanticColors.cardMuted,
            borderColor:
              statusHighlightTokens
                ? statusHighlightTokens.border
                : highlightedNodeId === node.id
                ? statusSemanticTokens.SOON.border
                : productSemanticColors.borderStrong,
            boxShadow: statusHighlightTokens
              ? `0 0 0 2px ${statusHighlightTokens.accent}`
              : highlightedNodeId === node.id
              ? `0 0 0 2px ${statusSemanticTokens.SOON.accent}`
              : undefined,
            color: productSemanticColors.textPrimary,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleNodeExpansion(node.id)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-600 text-slate-200 transition hover:bg-slate-800"
                    style={{
                      backgroundColor: productSemanticColors.cardSubtle,
                      borderColor: productSemanticColors.borderStrong,
                      color: productSemanticColors.textPrimary,
                    }}
                    title={isExpanded ? "Свернуть ветку" : "Развернуть ветку"}
                    aria-label={isExpanded ? "Свернуть ветку" : "Развернуть ветку"}
                  >
                    {isExpanded ? "−" : "+"}
                  </button>
                ) : (
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center text-slate-500"
                    style={{ color: productSemanticColors.textMuted }}
                  >
                    •
                  </span>
                )}
                <span
                  className="truncate text-sm font-medium text-slate-100"
                  style={{ color: productSemanticColors.textPrimary }}
                >
                  {node.name}
                </span>
              </div>
              {shortExplanationLabel && canOpenStatusExplanation ? (
                <button
                  type="button"
                  onClick={() => openStatusExplanationFromTreeContext(node)}
                  className="mt-1.5 pl-8 text-left text-xs text-slate-300 underline decoration-dotted underline-offset-2 transition hover:text-slate-100"
                  style={{ color: productSemanticColors.textSecondary }}
                >
                  {shortExplanationLabel}
                </button>
              ) : null}
              {shortExplanationLabel && !canOpenStatusExplanation ? (
                <p className="mt-1.5 pl-8 text-xs text-slate-300" style={{ color: productSemanticColors.textSecondary }}>
                  {shortExplanationLabel}
                </p>
              ) : null}
              {isNodeMaintenanceModeEnabled &&
              maintenancePlan &&
              !shortExplanationLabel &&
              maintenancePlan.shortText ? (
                canOpenStatusExplanation ? (
                  <button
                    type="button"
                    onClick={() => openStatusExplanationFromTreeContext(node)}
                    className="mt-1.5 pl-8 text-left text-xs text-slate-300 underline decoration-dotted underline-offset-2 transition hover:text-slate-100"
                    style={{ color: productSemanticColors.textSecondary }}
                  >
                    {maintenancePlan.shortText}
                  </button>
                ) : (
                  <p className="mt-1.5 pl-8 text-xs text-slate-300" style={{ color: productSemanticColors.textSecondary }}>
                    {maintenancePlan.shortText}
                  </p>
                )
              ) : null}
              {isNodeMaintenanceModeEnabled && parentMaintenanceSummary ? (
                <p
                  className="mt-1.5 pl-8 text-xs font-medium text-slate-200"
                  style={{ color: productSemanticColors.textPrimary }}
                >
                  {parentMaintenanceSummary}
                </p>
              ) : null}
              {isNodeMaintenanceModeEnabled &&
              maintenancePlan &&
              !hasChildren &&
              maintenancePlan.hasMeaningfulData ? (
                <div className="mt-1.5 overflow-x-auto pl-8">
                  <table className="w-auto border-collapse">
                    <tbody>
                      <tr>
                        {maintenancePlan.dueLines.map((line) =>
                          renderMaintenanceTableCell(line)
                        )}
                        {maintenancePlan.lastServiceLine
                          ? renderMaintenanceTableCell(maintenancePlan.lastServiceLine, {
                              key: "last-service",
                              muted: true,
                            })
                          : null}
                        {maintenancePlan.ruleIntervalLine
                          ? renderMaintenanceTableCell(maintenancePlan.ruleIntervalLine, {
                              key: "rule-interval",
                              muted: true,
                            })
                          : null}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {node.effectiveStatus ? (
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => openServiceLogFromTreeContext(node)}
                    className="inline-flex h-7 cursor-pointer items-center rounded-full border px-2.5 text-xs font-medium transition hover:ring-2 hover:ring-slate-500 focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-400"
                    style={getStatusBadgeStyle(node.effectiveStatus)}
                    title="Журнал"
                    aria-label={`Открыть журнал обслуживания по узлу «${node.name}»`}
                  >
                    <ActionIcon iconKey="openServiceLog" className="mr-1 h-3.5 w-3.5" />
                    {node.statusLabel}
                  </button>
                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    Журнал
                  </span>
                </div>
              ) : null}
              <div className="group relative">
                <button
                  type="button"
                  onClick={() => openWishlistFromTreeContext(node.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-slate-100 transition hover:bg-slate-700"
                  style={{
                    backgroundColor: productSemanticColors.cardSubtle,
                    borderColor: productSemanticColors.borderStrong,
                    color: productSemanticColors.textPrimary,
                  }}
                  title="Добавить в список покупок"
                  aria-label="Добавить в список покупок"
                >
                  <ActionIcon iconKey="addToShoppingList" />
                </button>
                <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  Добавить в список покупок
                </span>
              </div>
              <div className="group relative">
                <button
                  type="button"
                  onClick={() => openNodeContextModal(node.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-slate-100 transition hover:bg-slate-700"
                  style={{
                    backgroundColor: productSemanticColors.cardSubtle,
                    borderColor: productSemanticColors.borderStrong,
                    color: productSemanticColors.textPrimary,
                  }}
                  title="Открыть контекст узла"
                  aria-label="Открыть контекст узла"
                >
                  <OpenContextIcon />
                </button>
                <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  Открыть контекст узла
                </span>
              </div>
              {node.canAddServiceEvent ? (
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => openAddServiceEventFromTreeContext(node.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 text-slate-100 transition hover:bg-slate-700"
                    style={{
                      backgroundColor: productSemanticColors.cardSubtle,
                      borderColor: productSemanticColors.borderStrong,
                      color: productSemanticColors.textPrimary,
                    }}
                    aria-label="Добавить сервисное событие"
                    title="Добавить сервисное событие"
                  >
                    <ActionIcon iconKey="addServiceEvent" />
                  </button>
                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    Добавить сервисное событие
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded ? (
          <div className="space-y-2">
            {node.children.map((child) => renderChildTreeNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  useEffect(() => {
    if (!vehicleId) {
      return;
    }

    void loadNodeTree();
    void loadTopServiceNodes();
    void loadWishlist();
  }, [vehicleId, loadNodeTree, loadTopServiceNodes, loadWishlist]);

  const openVehicleStateEditor = () => {
    if (!vehicle) {
      return;
    }

    const initial = createInitialVehicleStateFormValues(
      vehicle.odometer,
      vehicle.engineHours
    );
    setVehicleStateOdometer(initial.odometer);
    setVehicleStateEngineHours(initial.engineHours);
    setVehicleStateError("");
    setIsEditingVehicleState(true);
  };

  const openEditProfileModal = () => {
    if (!vehicle) {
      return;
    }

    setProfileForm(
      buildInitialVehicleProfileFormValues({
        nickname: vehicle.nickname || "",
        vin: vehicle.vin || "",
        usageType: (vehicle.rideProfile?.usageType || "MIXED") as EditVehicleProfileFormValues["usageType"],
        ridingStyle: (vehicle.rideProfile?.ridingStyle ||
          "ACTIVE") as EditVehicleProfileFormValues["ridingStyle"],
        loadType: (vehicle.rideProfile?.loadType || "SOLO") as EditVehicleProfileFormValues["loadType"],
        usageIntensity: (vehicle.rideProfile?.usageIntensity ||
          "MEDIUM") as EditVehicleProfileFormValues["usageIntensity"],
      })
    );
    setProfileFormError("");
    setProfileFormSuccess("");
    setIsEditProfileModalOpen(true);
  };

  const saveVehicleProfile = async () => {
    if (!vehicleId) {
      setProfileFormError("Не удалось определить мотоцикл.");
      return;
    }
    const validation = validateVehicleProfileFormValues(profileForm);
    if (validation.errors.length > 0) {
      setProfileFormError(validation.errors[0]);
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileFormError("");
      setProfileFormSuccess("");

      const data = await vehicleDetailApi.updateVehicleProfile(
        vehicleId,
        normalizeVehicleProfileFormValues(profileForm)
      );

      const updated = data.vehicle as unknown as VehicleDetailApiRecord;
      setVehicle(vehicleDetailFromApiRecord(updated));
      setIsEditProfileModalOpen(false);
      setProfileFormSuccess("Мотоцикл обновлен");
    } catch (saveError) {
      console.error(saveError);
      setProfileFormError(
        saveError instanceof Error
          ? saveError.message
          : "Произошла ошибка при сохранении профиля."
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const moveVehicleToTrash = async () => {
    if (!vehicleId) {
      setMoveToTrashError("Не удалось определить мотоцикл.");
      return;
    }
    const confirmed = window.confirm(
      "Переместить мотоцикл на Свалку?\n\nОн исчезнет из гаража, но его можно будет восстановить на странице «Свалка»."
    );
    if (!confirmed) {
      return;
    }
    try {
      setIsMovingToTrash(true);
      setMoveToTrashError("");
      await vehicleDetailApi.moveVehicleToTrash(vehicleId);
      window.location.assign("/garage");
    } catch (requestError) {
      console.error(requestError);
      setMoveToTrashError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось переместить мотоцикл на Свалку."
      );
    } finally {
      setIsMovingToTrash(false);
    }
  };

  const cancelVehicleStateEditor = () => {
    setVehicleStateError("");
    setIsEditingVehicleState(false);
  };

  const saveVehicleState = async () => {
    if (!vehicleId || !vehicle) {
      setVehicleStateError("Не удалось определить мотоцикл.");
      return;
    }

    const stateValues = {
      odometer: vehicleStateOdometer,
      engineHours: vehicleStateEngineHours,
    };
    const validation = validateVehicleStateFormValues(stateValues, "web");
    if (validation.errors.length > 0) {
      setVehicleStateError(validation.errors[0]);
      return;
    }

    try {
      setIsSavingVehicleState(true);
      setVehicleStateError("");

      const data = await vehicleDetailApi.updateVehicleState(
        vehicleId,
        normalizeVehicleStatePayload(stateValues)
      );

      setVehicle((currentVehicle) =>
        currentVehicle
          ? {
              ...currentVehicle,
              odometer: data.vehicle?.odometer ?? currentVehicle.odometer,
              engineHours:
                data.vehicle?.engineHours !== undefined
                  ? data.vehicle.engineHours
                  : currentVehicle.engineHours,
            }
          : currentVehicle
      );
      setIsEditingVehicleState(false);
      await Promise.all([loadNodeTree(), loadServiceEvents(), loadWishlist(), loadTopServiceNodes()]);
    } catch (saveError) {
      console.error(saveError);
      setVehicleStateError(
        saveError instanceof Error
          ? saveError.message
          : "Произошла ошибка при сохранении состояния."
      );
    } finally {
      setIsSavingVehicleState(false);
    }
  };

  const resetServiceEventForm = () => {
    setEditingServiceEventId(null);
    setPendingWishlistInstallItemId(null);
    setSelectedNodePath([]);
    const empty = createInitialAddServiceEventFormValues();
    empty.currency = readDefaultCurrencySetting();
    applyAddServiceEventFormValues(empty);
  };

  const openCreateServiceEventModal = () => {
    overlayReturnStackRef.current = [];
    resetServiceEventForm();
    setServiceEventFormError("");
    setIsAddServiceEventModalOpen(true);
  };
  const closeAddServiceEventModal = (options: { restorePrevious?: boolean } = {}) => {
    setIsAddServiceEventModalOpen(false);
    setPendingWishlistInstallItemId(null);
    if (options.restorePrevious ?? true) {
      restorePreviousOverlay();
    }
  };

  const handleSubmitServiceEvent = async () => {
    try {
      setServiceEventFormError("");

      if (!vehicleId) {
        setServiceEventFormError("Не удалось определить мотоцикл.");
        return;
      }

      const serviceFormValues: AddServiceEventFormValues = {
        nodeId: selectedFinalNode?.id ?? "",
        serviceType,
        eventDate,
        odometer,
        engineHours,
        costAmount,
        currency,
        comment,
        installedPartsJson,
        partSku,
        partName,
      };

      const validation = validateAddServiceEventFormValues(serviceFormValues, {
        todayDateYmd: todayDate,
        currentVehicleOdometer: vehicle?.odometer ?? null,
        isLeafNode: selectedFinalNode ? isLeafNodeSelected : undefined,
      });

      if (validation.errors.length > 0) {
        setServiceEventFormError(validation.errors[0]);
        return;
      }

      setIsCreatingServiceEvent(true);
      if (editingServiceEventId) {
        await vehicleDetailApi.updateServiceEvent(
          vehicleId,
          editingServiceEventId,
          normalizeEditServiceEventPayload(serviceFormValues)
        );
      } else {
        await vehicleDetailApi.createServiceEvent(
          vehicleId,
          normalizeAddServiceEventPayload(serviceFormValues)
        );
      }

      if (!editingServiceEventId && pendingWishlistInstallItemId) {
        await vehicleDetailApi.updateWishlistItem(vehicleId, pendingWishlistInstallItemId, {
          status: "INSTALLED",
          nodeId: serviceFormValues.nodeId,
        });
        setWishlistNotice("Позиция отмечена как установленная после добавления события.");
      }

      setServiceLogActionNotice({
        tone: "success",
        title: editingServiceEventId
          ? "Сервисное событие обновлено"
          : "Сервисное событие добавлено",
        details: "Статусы и расходы обновлены",
      });
      setPendingWishlistInstallItemId(null);
      resetServiceEventForm();
      await Promise.all([loadServiceEvents(), loadNodeTree(), loadWishlist(), loadTopServiceNodes()]);
      closeAddServiceEventModal({ restorePrevious: false });
    } catch (createError) {
      console.error(createError);
      setServiceEventFormError("Не удалось сохранить сервисное событие.");
      setServiceLogActionNotice({
        tone: "error",
        title: "Не удалось сохранить сервисное событие",
      });
    } finally {
      setIsCreatingServiceEvent(false);
    }
  };

  const title =
    vehicle?.nickname ||
    `${vehicle?.brandName || ""} ${vehicle?.modelName || ""}`.trim() ||
    "Карточка мотоцикла";
  const vehicleHeader = vehicle ? buildVehicleHeaderProps(vehicle) : null;
  const detailViewModel = vehicleHeader?.detail ?? null;
  const vehicleStateViewModel = vehicle
    ? buildVehicleStateViewModel({
        odometer: vehicle.odometer,
        engineHours: vehicle.engineHours,
      })
    : null;
  const rideProfileViewModel = vehicle
    ? buildRideProfileViewModel(vehicle.rideProfile)
    : null;
  const technicalInfoViewModel = vehicle
    ? buildVehicleTechnicalInfoViewModel({ modelVariant: vehicle.modelVariant })
    : { items: [] };

  const showFullNodeTree = pageView === "nodeTree" || isFullNodeTreeOpen;

  function renderMainNodeTreeSection() {
    if (!vehicle) {
      return null;
    }
    return (
            <section
              className="node-tree-readable garage-dark-surface-text rounded-3xl border border-slate-700 bg-slate-900 p-7 shadow-sm"
              style={{
                backgroundColor: productSemanticColors.card,
                borderColor: productSemanticColors.borderStrong,
                color: productSemanticColors.textPrimary,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2
                  className="text-2xl font-semibold tracking-tight text-slate-100"
                  style={{ color: productSemanticColors.textPrimary }}
                >
                  {pageView === "nodeTree" ? "Состояние узлов" : "Состояние основных узлов"}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {pageView !== "nodeTree" ? (
                    <button
                      type="button"
                      onClick={() => setIsFullNodeTreeOpen((prev) => !prev)}
                      className={`inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition ${
                        isFullNodeTreeOpen
                          ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
                          : "border-slate-600 text-slate-100 hover:bg-slate-800"
                      }`}
                    >
                      {isFullNodeTreeOpen ? "Скрыть полное дерево" : "Все узлы →"}
                    </button>
                  ) : null}
                  {pageView === "nodeTree" ? (
                    <button
                      type="button"
                      onClick={() => setIsNodeMaintenanceModeEnabled((prev) => !prev)}
                      className={`inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition ${
                        isNodeMaintenanceModeEnabled
                          ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
                          : "border-slate-600 text-slate-100 hover:bg-slate-800"
                      }`}
                      style={{
                        backgroundColor: isNodeMaintenanceModeEnabled
                          ? productSemanticColors.cardMuted
                          : productSemanticColors.cardSubtle,
                        borderColor: productSemanticColors.borderStrong,
                        color: productSemanticColors.textPrimary,
                      }}
                    >
                      {getNodeModeToggleLabel()}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={openServiceLogModalFull}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-600 px-4 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                    style={{
                      backgroundColor: productSemanticColors.cardSubtle,
                      borderColor: productSemanticColors.borderStrong,
                      color: productSemanticColors.textPrimary,
                    }}
                  >
                    Открыть журнал обслуживания
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-300" style={{ color: productSemanticColors.textSecondary }}>
                {pageView === "nodeTree"
                  ? "Поиск по дереву, контекст узла, обслуживание и план — как в полном рабочем экране."
                  : "Краткая сводка по основным узлам. Детальная структура доступна в полном дереве."}
              </p>

              {isTopServiceNodesLoading ? (
                <p className="mt-4 text-sm text-slate-300" style={{ color: productSemanticColors.textSecondary }}>
                  Загрузка основных узлов...
                </p>
              ) : null}
              {!isTopServiceNodesLoading && topServiceNodesError ? (
                <p className="mt-4 text-sm" style={{ color: productSemanticColors.error }}>
                  {topServiceNodesError}
                </p>
              ) : null}
              {pageView !== "nodeTree" &&
              !isTopServiceNodesLoading &&
              !topServiceNodesError &&
              topNodeOverviewCards.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {topNodeOverviewCards.map((card) => (
                    <article
                      key={card.key}
                      className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3"
                      style={{
                        backgroundColor: productSemanticColors.cardMuted,
                        borderColor: productSemanticColors.borderStrong,
                        color: productSemanticColors.textPrimary,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openTopOverviewIssueNodes(card.nodes.map((node) => node.id))}
                          className="inline-flex"
                          title="Показать узлы со статусом Скоро или Просрочено"
                          aria-label={`Показать проблемные узлы группы ${card.title}`}
                        >
                          <TopNodeOverviewIcon nodeKey={card.key} status={card.status} />
                        </button>
                        <h3 className="text-sm font-semibold text-gray-900" style={{ color: productSemanticColors.textPrimary }}>
                          {card.title}
                        </h3>
                      </div>
                      <div className="mt-2">
                        <div className="space-y-2">
                          {card.nodes.map((node) => (
                            <button
                              key={node.code}
                              type="button"
                              onClick={() => openTopOverviewNode(node.id)}
                              className="inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium"
                              style={getStatusBadgeStyle(node.status)}
                              title={`${node.name}: ${node.statusLabel}`}
                            >
                              <span className="truncate">
                                {node.name}
                              </span>
                            </button>
                          ))}
                        </div>
                        {card.nodes.length === 0 ? (
                          <p className="mt-2 text-xs text-gray-600" style={{ color: productSemanticColors.textMuted }}>
                            {card.details}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {showFullNodeTree && isNodeTreeLoading ? (
                <p className="mt-4 text-sm text-slate-300">Загрузка дерева узлов...</p>
              ) : null}

              {showFullNodeTree && !isNodeTreeLoading && nodeTreeError ? (
                <p className="mt-4 text-sm" style={{ color: productSemanticColors.error }}>
                  {nodeTreeError}
                </p>
              ) : null}

              {showFullNodeTree && !isNodeTreeLoading && !nodeTreeError && nodeTree.length === 0 ? (
                <p className="mt-4 text-sm text-slate-300" style={{ color: productSemanticColors.textSecondary }}>
                  Дерево узлов пока не найдено.
                </p>
              ) : null}

              {showFullNodeTree && !isNodeTreeLoading && !nodeTreeError && nodeTree.length > 0 ? (
                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="node-tree-search"
                      className="block text-xs font-medium uppercase tracking-wide text-slate-400"
                      style={{ color: productSemanticColors.textSecondary }}
                    >
                      Поиск по узлам
                    </label>
                    <input
                      id="node-tree-search"
                      type="search"
                      value={nodeSearchQuery}
                      onChange={(event) => setNodeSearchQuery(event.target.value)}
                      placeholder="Поиск по узлам"
                      className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-700"
                      style={{
                        backgroundColor: productSemanticColors.cardMuted,
                        borderColor: productSemanticColors.borderStrong,
                        color: productSemanticColors.textPrimary,
                      }}
                    />
                    {nodeSearchQuery.trim().length > 0 && nodeSearchQuery.trim().length < 2 ? (
                      <p className="text-xs text-slate-400" style={{ color: productSemanticColors.textSecondary }}>
                        Введите минимум 2 символа.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <p
                      className="text-xs font-medium uppercase tracking-wide text-slate-400"
                      style={{ color: productSemanticColors.textSecondary }}
                    >
                      Фильтр по статусу
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setNodeStatusFilter("ALL")}
                        className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                        style={{
                          backgroundColor:
                            nodeStatusFilter === "ALL"
                              ? productSemanticColors.textPrimary
                              : productSemanticColors.cardMuted,
                          borderColor: productSemanticColors.borderStrong,
                          color:
                            nodeStatusFilter === "ALL"
                              ? productSemanticColors.textInverse
                              : productSemanticColors.textSecondary,
                        }}
                      >
                        Все
                      </button>
                      {NODE_STATUS_FILTER_OPTIONS.map((status) => {
                        const tokens = statusSemanticTokens[status];
                        const isActive = nodeStatusFilter === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setNodeStatusFilter(status)}
                            className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                            style={{
                              backgroundColor: isActive
                                ? tokens.background
                                : productSemanticColors.cardMuted,
                              borderColor: isActive ? tokens.border : productSemanticColors.borderStrong,
                              color: isActive ? tokens.foreground : productSemanticColors.textSecondary,
                            }}
                          >
                            {statusTextLabelsRu[status]} · {nodeStatusCounts[status]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {nodeSearchQuery.trim().length >= 2 ? (
                    nodeSearchResults.length > 0 ? (
                      <div
                        className="space-y-2 rounded-2xl border border-slate-700 bg-slate-800/70 p-2.5"
                        style={{
                          backgroundColor: productSemanticColors.cardMuted,
                          borderColor: productSemanticColors.borderStrong,
                        }}
                      >
                        {nodeSearchResults.map((result) => {
                          const resultNode = getNodeSubtreeById(topLevelNodeViewModels, result.nodeId);
                          const canOpenResultExplanation =
                            Boolean(result.shortExplanationLabel) &&
                            Boolean(resultNode) &&
                            canOpenNodeStatusExplanationModal(resultNode);
                          return (
                            <div
                              key={result.nodeId}
                              className="rounded-xl border border-transparent bg-slate-900 px-3 py-2.5 transition hover:border-slate-600"
                              style={{
                                backgroundColor: productSemanticColors.cardSubtle,
                                borderColor: productSemanticColors.border,
                              }}
                            >
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => openSearchResultInSubtreeModal(result)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    openSearchResultInSubtreeModal(result);
                                  }
                                }}
                                className="w-full text-left"
                              >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-100" style={{ color: productSemanticColors.textPrimary }}>{result.nodeName}</p>
                                  <p className="truncate text-xs text-slate-400" style={{ color: productSemanticColors.textSecondary }}>{result.pathLabel}</p>
                                  <p className="truncate text-[11px] text-slate-500" style={{ color: productSemanticColors.textMuted }}>{result.nodeCode}</p>
                                  {result.shortExplanationLabel ? (
                                    canOpenResultExplanation ? (
                                      <button
                                        type="button"
                                        className="block truncate pt-1 text-left text-xs text-slate-400 underline decoration-dotted underline-offset-2"
                                        style={{ color: productSemanticColors.textSecondary }}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          openStatusExplanationFromSearchResult(result);
                                        }}
                                      >
                                        {result.shortExplanationLabel}
                                      </button>
                                    ) : (
                                      <p className="truncate pt-1 text-xs text-slate-400" style={{ color: productSemanticColors.textSecondary }}>
                                        {result.shortExplanationLabel}
                                      </p>
                                    )
                                  ) : null}
                                </div>
                                {result.effectiveStatus ? (
                                  <span
                                    className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
                                    style={getStatusBadgeStyle(result.effectiveStatus)}
                                  >
                                    {result.statusLabel}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {buildNodeSearchResultActions(result).map((action) => (
                                <div key={`${result.nodeId}.${action.key}`} className="group relative">
                                  <button
                                    type="button"
                                    onClick={() => handleSearchResultAction(action.key, result)}
                                    aria-label={`${action.label}: ${result.nodeName}`}
                                    title={action.label}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 text-slate-200 transition hover:bg-slate-800"
                                  >
                                    {action.key === "open" ? (
                                      <OpenContextIcon />
                                    ) : action.key === "service_log" ? (
                                      <ActionIcon iconKey="openServiceLog" />
                                    ) : (
                                      <ActionIcon iconKey="addToShoppingList" />
                                    )}
                                  </button>
                                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                                    {action.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p
                        className="rounded-xl border border-dashed border-slate-600 px-3 py-2 text-sm text-slate-300"
                        style={{
                          borderColor: productSemanticColors.borderStrong,
                          color: productSemanticColors.textSecondary,
                        }}
                      >
                        Узлы не найдены
                      </p>
                    )
                  ) : null}
                  {filteredTopLevelNodeViewModels.length === 0 ? (
                    <p
                      className="rounded-xl border border-dashed border-slate-600 px-3 py-3 text-sm text-slate-300"
                      style={{
                        borderColor: productSemanticColors.borderStrong,
                        color: productSemanticColors.textSecondary,
                      }}
                    >
                      Узлы с выбранным статусом не найдены.
                    </p>
                  ) : null}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTopLevelNodeViewModels.map((rootNode) => {
                      const summary = buildTopLevelNodeSummaryViewModel(rootNode, {
                        maintenanceModeEnabled: isNodeMaintenanceModeEnabled,
                      });
                      const canOpenSummaryExplanation = canOpenNodeStatusExplanationModal(rootNode);
                      return (
                        <div
                          key={rootNode.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openTopLevelNodeSubtreeModal(rootNode.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openTopLevelNodeSubtreeModal(rootNode.id);
                            }
                          }}
                          className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5 text-left transition hover:border-slate-500 hover:bg-slate-800"
                          style={{
                            backgroundColor: productSemanticColors.cardMuted,
                            borderColor: productSemanticColors.borderStrong,
                            color: productSemanticColors.textPrimary,
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3
                                className="truncate text-[15px] font-semibold text-slate-100"
                                style={{ color: productSemanticColors.textPrimary }}
                              >
                                {summary.nodeName}
                              </h3>
                              {summary.shortExplanationLabel ? (
                                <button
                                  type="button"
                                  className="mt-1.5 text-left text-xs text-slate-400 underline decoration-dotted underline-offset-2"
                                  style={{ color: productSemanticColors.textSecondary }}
                                  onClick={(event) => {
                                    if (!canOpenSummaryExplanation) {
                                      return;
                                    }
                                    event.stopPropagation();
                                    openStatusExplanationFromTreeContext(rootNode);
                                  }}
                                  disabled={!canOpenSummaryExplanation}
                                >
                                  {summary.shortExplanationLabel}
                                </button>
                              ) : null}
                              {summary.maintenanceSummaryLine ? (
                                canOpenSummaryExplanation ? (
                                  <button
                                    type="button"
                                    className="mt-1.5 block text-left text-xs font-medium text-slate-300 underline decoration-dotted underline-offset-2"
                                    style={{ color: productSemanticColors.textSecondary }}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openStatusExplanationFromTreeContext(rootNode);
                                    }}
                                  >
                                    {summary.maintenanceSummaryLine}
                                  </button>
                                ) : (
                                  <p
                                    className="mt-1.5 text-xs font-medium text-slate-300"
                                    style={{ color: productSemanticColors.textSecondary }}
                                  >
                                    {summary.maintenanceSummaryLine}
                                  </p>
                                )
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {summary.effectiveStatus ? (
                                <span
                                  className="inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium"
                                  style={getStatusBadgeStyle(summary.effectiveStatus)}
                                >
                                  {summary.statusLabel}
                                </span>
                              ) : null}
                              <span className="text-sm text-slate-500" style={{ color: productSemanticColors.textMuted }}>›</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
    );
  }

  function renderPartsSelectionPage() {
    if (!vehicle) {
      return null;
    }

    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <button
            type="button"
            onClick={() => navigateBackWithFallback(`/vehicles/${vehicleId}`)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 px-3.5 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
            style={{
              backgroundColor: productSemanticColors.card,
              borderColor: productSemanticColors.borderStrong,
              color: productSemanticColors.textPrimary,
            }}
          >
            ← К мотоциклу
          </button>
        </div>

        <section
          className="parts-selection-surface garage-dark-surface-text rounded-3xl border border-gray-200 bg-white p-7 shadow-sm"
          style={{
            backgroundColor: productSemanticColors.card,
            borderColor: productSemanticColors.borderStrong,
            color: productSemanticColors.textPrimary,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: productSemanticColors.textMuted }}
              >
                Подбор деталей
              </p>
              <h1
                className="mt-1 text-3xl font-semibold tracking-tight"
                style={{ color: productSemanticColors.textPrimary }}
              >
                Корзина замен и расходников
              </h1>
              <p
                className="mt-2 max-w-3xl text-sm"
                style={{ color: productSemanticColors.textSecondary }}
              >
                Здесь видны все позиции для замены: SKU, узел, стоимость, происхождение из
                комплекта, комментарий и текущий статус от «Нужно купить» до «Установлено».
              </p>
            </div>
            <button
              type="button"
              onClick={() => openWishlistModalForCreate()}
              className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition"
              style={{
                backgroundColor: productSemanticColors.primaryAction,
                color: productSemanticColors.onPrimaryAction,
              }}
            >
              Подобрать новую позицию
            </button>
          </div>

          {wishlistNotice ? (
            <p
              className={`mt-4 text-sm ${
                wishlistNotice.startsWith("Ошибка:")
                  ? "text-red-700"
                  : wishlistNotice.includes("не открыто")
                    ? "text-amber-800"
                    : "text-emerald-800"
              }`}
              role="status"
            >
              {wishlistNotice}
            </p>
          ) : null}

          {wishlistViewModels.length > 0 ? (
            <div
              className="mt-6 rounded-2xl border px-4 py-4"
              style={{
                backgroundColor: productSemanticColors.cardMuted,
                borderColor: productSemanticColors.borderStrong,
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPartsStatusFilter("ALL")}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    backgroundColor:
                      partsStatusFilter === "ALL"
                        ? productSemanticColors.primaryAction
                        : productSemanticColors.cardSubtle,
                    borderColor:
                      partsStatusFilter === "ALL"
                        ? productSemanticColors.primaryAction
                        : productSemanticColors.borderStrong,
                    color:
                      partsStatusFilter === "ALL"
                        ? productSemanticColors.onPrimaryAction
                        : productSemanticColors.textPrimary,
                  }}
                >
                  Все · {wishlistViewModels.length}
                </button>
                {PART_WISHLIST_STATUS_ORDER.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setPartsStatusFilter(status)}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                    style={{
                      backgroundColor:
                        partsStatusFilter === status
                          ? productSemanticColors.primaryAction
                          : productSemanticColors.cardSubtle,
                      borderColor:
                        partsStatusFilter === status
                          ? productSemanticColors.primaryAction
                          : productSemanticColors.borderStrong,
                      color:
                        partsStatusFilter === status
                          ? productSemanticColors.onPrimaryAction
                          : productSemanticColors.textPrimary,
                    }}
                  >
                    {partWishlistStatusLabelsRu[status]} · {partsStatusCounts.get(status) ?? 0}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={partsSearchQuery}
                  onChange={(event) => setPartsSearchQuery(event.target.value)}
                  className="min-w-[240px] flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition"
                  style={{
                    backgroundColor: productSemanticColors.cardSubtle,
                    borderColor: productSemanticColors.borderStrong,
                    color: productSemanticColors.textPrimary,
                    colorScheme: "dark",
                  }}
                  placeholder="Поиск по названию, SKU, узлу или комментарию"
                />
                {(partsStatusFilter !== "ALL" || partsSearchQuery.trim()) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPartsStatusFilter("ALL");
                      setPartsSearchQuery("");
                    }}
                    className="rounded-xl border px-3 py-2 text-xs font-semibold transition"
                    style={{
                      backgroundColor: productSemanticColors.cardSubtle,
                      borderColor: productSemanticColors.borderStrong,
                      color: productSemanticColors.textSecondary,
                    }}
                  >
                    Сбросить
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {isWishlistLoading ? (
            <p className="mt-6 text-sm" style={{ color: productSemanticColors.textSecondary }}>
              Загрузка подбора деталей...
            </p>
          ) : null}
          {wishlistError ? (
            <p className="mt-6 text-sm" style={{ color: productSemanticColors.error }}>
              {wishlistError}
            </p>
          ) : null}

          {!isWishlistLoading && !wishlistError && wishlistViewModels.length === 0 ? (
            <div
              className="mt-6 rounded-2xl border border-dashed px-5 py-8 text-center"
              style={{
                backgroundColor: productSemanticColors.cardMuted,
                borderColor: productSemanticColors.borderStrong,
              }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: productSemanticColors.textPrimary }}
              >
                Позиции пока не добавлены
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: productSemanticColors.textSecondary }}
              >
                Добавьте расходники вручную, из дерева узлов, из рекомендаций SKU или комплектом.
              </p>
            </div>
          ) : null}

          {!isWishlistLoading &&
          !wishlistError &&
          wishlistViewModels.length > 0 &&
          filteredPartsWishlistViewModels.length === 0 ? (
            <div
              className="mt-6 rounded-2xl border border-dashed px-5 py-8 text-center"
              style={{
                backgroundColor: productSemanticColors.cardMuted,
                borderColor: productSemanticColors.borderStrong,
              }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: productSemanticColors.textPrimary }}
              >
                Ничего не найдено
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: productSemanticColors.textSecondary }}
              >
                Измените статус-фильтр или поисковый запрос.
              </p>
            </div>
          ) : null}

          {!isWishlistLoading && !wishlistError && filteredPartsWishlistGroups.length > 0 ? (
            <div className="mt-6 grid gap-6">
              {filteredPartsWishlistGroups.map((group) => {
                const isCollapsed =
                  Boolean(collapsedPartsStatusGroups[group.status]) &&
                  partsStatusFilter === "ALL" &&
                  !normalizedPartsSearchQuery;
                const visibleCount =
                  partsVisibleCountByStatus[group.status] ??
                  PARTS_SELECTION_INITIAL_VISIBLE_COUNT;
                const visibleItems = isCollapsed ? [] : group.items.slice(0, visibleCount);
                const hiddenCount = Math.max(0, group.items.length - visibleItems.length);
                return (
                <section key={group.status}>
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedPartsStatusGroups((prev) => ({
                        ...prev,
                        [group.status]: !prev[group.status],
                      }))
                    }
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <h2
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: productSemanticColors.textMuted }}
                    >
                      {group.sectionTitleRu} · {group.items.length}
                    </h2>
                    <span
                      className="text-xs font-medium"
                      style={{ color: productSemanticColors.textSecondary }}
                    >
                      {isCollapsed ? "Развернуть" : "Свернуть"}
                    </span>
                  </button>
                  <div className="mt-3 grid gap-3">
                    {isCollapsed ? (
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedPartsStatusGroups((prev) => ({
                            ...prev,
                            [group.status]: false,
                          }))
                        }
                        className="rounded-2xl border border-dashed px-4 py-3 text-left text-sm transition hover:opacity-85"
                        style={{
                          backgroundColor: productSemanticColors.cardMuted,
                          borderColor: productSemanticColors.borderStrong,
                          color: productSemanticColors.textSecondary,
                        }}
                      >
                        Группа свернута. Позиций: {group.items.length}. Нажмите, чтобы развернуть.
                      </button>
                    ) : null}
                    {visibleItems.map((it) => {
                      const isHighlighted = highlightedWishlistItemIdFromSearchParams === it.id;
                      const isBusy =
                        wishlistStatusUpdatingId === it.id || wishlistDeletingId === it.id;
                      const skuLines = it.sku ? getWishlistItemSkuDisplayLines(it.sku) : null;
                      const installedServiceEventId =
                        it.status === "INSTALLED"
                          ? installedWishlistServiceEventIdByItemId.get(it.id)
                          : null;
                      return (
                        <article
                          key={it.id}
                          data-wishlist-item-id={it.id}
                          className="rounded-2xl border px-4 py-4 text-sm"
                          style={{
                            backgroundColor: productSemanticColors.cardMuted,
                            borderColor: isHighlighted
                              ? productSemanticColors.primaryAction
                              : productSemanticColors.border,
                            boxShadow: isHighlighted
                              ? `0 0 0 2px ${productSemanticColors.primaryAction}`
                              : undefined,
                          }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3
                                  className="text-base font-semibold"
                                  style={{ color: productSemanticColors.textPrimary }}
                                >
                                  {it.title}
                                </h3>
                                <span
                                  className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                                  style={{
                                    backgroundColor: productSemanticColors.cardSubtle,
                                    borderColor: productSemanticColors.borderStrong,
                                    color: productSemanticColors.textSecondary,
                                  }}
                                >
                                  {it.statusLabelRu}
                                </span>
                              </div>

                              {skuLines ? (
                                <div
                                  className="mt-3 rounded-xl border px-3 py-2"
                                  style={{
                                    backgroundColor: productSemanticColors.cardSubtle,
                                    borderColor: productSemanticColors.borderStrong,
                                  }}
                                >
                                  <p
                                    className="text-sm font-semibold"
                                    style={{ color: productSemanticColors.textPrimary }}
                                  >
                                    {skuLines.primaryLine}
                                  </p>
                                  <p
                                    className="mt-0.5 text-xs"
                                    style={{ color: productSemanticColors.textSecondary }}
                                  >
                                    {skuLines.secondaryLine}
                                  </p>
                                </div>
                              ) : (
                                <p
                                  className="mt-3 rounded-xl border border-dashed px-3 py-2 text-xs"
                                  style={{
                                    borderColor: productSemanticColors.borderStrong,
                                    color: productSemanticColors.textSecondary,
                                  }}
                                >
                                  SKU не выбран. Откройте редактирование, чтобы подобрать позицию из
                                  каталога или оставить ручную запись.
                                </p>
                              )}

                              <div
                                className="mt-3 grid gap-1 text-xs sm:grid-cols-2"
                                style={{ color: productSemanticColors.textSecondary }}
                              >
                                <p>Количество: {it.quantity}</p>
                                <p>Узел: {it.node?.name ?? "Не выбран"}</p>
                                <p>Стоимость: {it.costLabelRu ?? "Не указана"}</p>
                                <p>ID позиции: {it.id}</p>
                              </div>

                              {it.kitOriginLabelRu ? (
                                <p
                                  className="mt-3 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                                  style={{
                                    backgroundColor: productSemanticColors.serviceBadgeBg,
                                    color: productSemanticColors.serviceBadgeText,
                                  }}
                                >
                                  {it.kitOriginLabelRu}
                                </p>
                              ) : null}
                              {it.commentBodyRu ? (
                                <p
                                  className="mt-2 text-xs leading-5"
                                  style={{ color: productSemanticColors.textSecondary }}
                                >
                                  {it.commentBodyRu}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              {installedServiceEventId ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(
                                      `/vehicles/${vehicleId}/service-log?serviceEventId=${encodeURIComponent(installedServiceEventId)}`
                                    )
                                  }
                                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                                  style={{
                                    backgroundColor: productSemanticColors.cardSubtle,
                                    borderColor: productSemanticColors.borderStrong,
                                    color: productSemanticColors.textPrimary,
                                  }}
                                >
                                  В журнал
                                </button>
                              ) : null}
                              <select
                                value={it.status}
                                onChange={(e) =>
                                  patchWishlistItemStatus(
                                    it.id,
                                    e.target.value as PartWishlistItem["status"],
                                    it.status
                                  )
                                }
                                disabled={isBusy}
                                className="rounded-lg border px-2 py-1.5 text-xs disabled:cursor-wait disabled:opacity-60"
                                style={{
                                  backgroundColor: productSemanticColors.cardSubtle,
                                  borderColor: productSemanticColors.borderStrong,
                                  color: productSemanticColors.textPrimary,
                                }}
                                aria-label="Статус позиции"
                              >
                                {PART_WISHLIST_STATUS_ORDER.map((s) => (
                                  <option key={s} value={s}>
                                    {partWishlistStatusLabelsRu[s]}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  const raw = wishlistItems.find((w) => w.id === it.id);
                                  if (raw) {
                                    openWishlistModalForEdit(raw);
                                  }
                                }}
                                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                                style={{
                                  backgroundColor: productSemanticColors.cardSubtle,
                                  borderColor: productSemanticColors.borderStrong,
                                  color: productSemanticColors.textPrimary,
                                }}
                              >
                                Изменить
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteWishlistItemById(it.id)}
                                disabled={isBusy}
                                className="rounded-lg border px-3 py-1.5 text-xs transition disabled:cursor-wait disabled:opacity-60"
                                style={{
                                  backgroundColor: productSemanticColors.cardSubtle,
                                  borderColor: productSemanticColors.border,
                                  color: productSemanticColors.textSecondary,
                                }}
                              >
                                {wishlistDeletingId === it.id ? "Удаляем..." : "Удалить"}
                              </button>
                            </div>
                          </div>
                          {wishlistStatusUpdatingId === it.id ? (
                            <p
                              className="mt-3 text-xs"
                              style={{ color: productSemanticColors.textSecondary }}
                              role="status"
                            >
                              Обновляем статус...
                            </p>
                          ) : null}
                        </article>
                      );
                    })}
                    {!isCollapsed && hiddenCount > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPartsVisibleCountByStatus((prev) => ({
                            ...prev,
                            [group.status]:
                              (prev[group.status] ?? PARTS_SELECTION_INITIAL_VISIBLE_COUNT) +
                              PARTS_SELECTION_VISIBLE_INCREMENT,
                          }))
                        }
                        className="rounded-2xl border border-dashed px-4 py-3 text-sm font-semibold transition"
                        style={{
                          backgroundColor: productSemanticColors.cardSubtle,
                          borderColor: productSemanticColors.borderStrong,
                          color: productSemanticColors.textPrimary,
                        }}
                      >
                        Показать ещё {Math.min(PARTS_SELECTION_VISIBLE_INCREMENT, hiddenCount)}
                      </button>
                    ) : null}
                  </div>
                </section>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  const selectedStatusExplanation = selectedStatusExplanationNode?.statusExplanation ?? null;
  const selectedStatusCurrent = selectedStatusExplanation?.current ?? null;
  const selectedStatusLastService = selectedStatusExplanation?.lastService ?? null;
  const selectedStatusRule = selectedStatusExplanation?.rule ?? null;
  const selectedStatusUsage = selectedStatusExplanation?.usage ?? null;
  const hasStatusKmDetails = [
    selectedStatusCurrent?.odometer,
    selectedStatusLastService?.odometer,
    selectedStatusRule?.intervalKm,
    selectedStatusRule?.warningKm,
    selectedStatusUsage?.elapsedKm,
    selectedStatusUsage?.remainingKm,
  ].some((value) => value != null);
  const hasStatusHoursDetails = [
    selectedStatusCurrent?.engineHours,
    selectedStatusLastService?.engineHours,
    selectedStatusRule?.intervalHours,
    selectedStatusRule?.warningHours,
    selectedStatusUsage?.elapsedHours,
    selectedStatusUsage?.remainingHours,
  ].some((value) => value != null);
  const hasStatusDaysDetails = [
    selectedStatusRule?.intervalDays,
    selectedStatusRule?.warningDays,
    selectedStatusUsage?.elapsedDays,
    selectedStatusUsage?.remainingDays,
  ].some((value) => value != null);
  const darkModalFormControlStyle = {
    backgroundColor: productSemanticColors.cardMuted,
    borderColor: productSemanticColors.borderStrong,
    color: productSemanticColors.textPrimary,
    colorScheme: "dark" as const,
  };
  const darkModalSectionStyle = {
    backgroundColor: productSemanticColors.cardMuted,
    borderColor: productSemanticColors.borderStrong,
    color: productSemanticColors.textPrimary,
  };
  const darkModalButtonStyle = {
    backgroundColor: productSemanticColors.cardSubtle,
    borderColor: productSemanticColors.borderStrong,
    color: productSemanticColors.textPrimary,
  };
  const darkModalInputLabelStyle = {
    color: productSemanticColors.textSecondary,
  };

  return (
    <>
      <main
        style={{
          width: "100%",
          minHeight: "100vh",
          backgroundColor: productSemanticColors.canvas,
        }}
      >
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: `${sidebarCollapsed ? 64 : 204}px minmax(0, 1fr)`,
            alignItems: "start",
            transition: "grid-template-columns 0.18s ease",
          }}
        >
          <GarageSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
          <section
            style={{
              display: "grid",
              gap: 12,
              padding: "10px 18px 24px 16px",
              maxWidth: 1420,
              width: "100%",
              minWidth: 0,
              justifySelf: "center",
            }}
          >
            {isLoading ? (
              <div
                style={{
                  borderRadius: 24,
                  border: `1px solid ${productSemanticColors.border}`,
                  backgroundColor: productSemanticColors.card,
                  padding: 28,
                  color: productSemanticColors.textMuted,
                  fontSize: 14,
                }}
              >
                Загрузка мотоцикла...
              </div>
            ) : null}

            {!isLoading && error ? (
              <div
                style={{
                  borderRadius: 24,
                  border: `1px solid ${productSemanticColors.errorBorder}`,
                  backgroundColor: productSemanticColors.errorSurface,
                  padding: 28,
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    color: productSemanticColors.textPrimary,
                    fontSize: 28,
                    lineHeight: "36px",
                    fontWeight: 700,
                  }}
                >
                  Не удалось открыть мотоцикл
                </h1>
                <p className="mt-3 text-sm" style={{ color: productSemanticColors.error }}>
                  {error}
                </p>
                <p className="mt-2 text-xs" style={{ color: productSemanticColors.error }}>
                  ID: {vehicleId}
                </p>
              </div>
            ) : null}

            {!isLoading && !error && vehicle && pageView === "nodeTree" ? (
              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <button
                    type="button"
                    onClick={() => navigateBackWithFallback(`/vehicles/${vehicleId}`)}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 px-3.5 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                    style={{
                      backgroundColor: productSemanticColors.card,
                      borderColor: productSemanticColors.borderStrong,
                      color: productSemanticColors.textPrimary,
                    }}
                  >
                    ← К обзору
                  </button>
                </div>
                {renderMainNodeTreeSection()}
              </div>
            ) : null}

            {!isLoading && !error && vehicle && pageView === "partsSelection"
              ? renderPartsSelectionPage()
              : null}

            {!isLoading && !error && vehicle && pageView === "dashboard" ? (
              <div style={{ display: "grid", gap: 16 }}>
                <VehicleDashboard
                  vehicle={vehicle}
                  detailViewModel={detailViewModel}
                  vehicleStateViewModel={vehicleStateViewModel}
                  topNodeOverviewCards={topNodeOverviewCards}
                  attentionSummary={attentionSummary}
                  attentionItems={attentionSummary.items}
                  expenseSummary={expenseSummary}
                  serviceEvents={serviceEvents}
                  wishlistItems={wishlistActiveViewModels}
                  isTopServiceNodesLoading={isTopServiceNodesLoading}
                  topServiceNodesError={topServiceNodesError}
                  isServiceEventsLoading={isServiceEventsLoading}
                  serviceEventsError={serviceEventsError}
                  isWishlistLoading={isWishlistLoading}
                  wishlistError={wishlistError}
                  moveToTrashError={moveToTrashError}
                  onEditProfile={openEditProfileModal}
                  onMoveToTrash={() => void moveVehicleToTrash()}
                  onUpdateMileage={openVehicleStateEditor}
                  onAddService={openCreateServiceEventModal}
                  onAddExpense={() =>
                    router.push(`/vehicles/${vehicleId}/expenses`)
                  }
                  onOpenParts={() => router.push(`/vehicles/${vehicleId}/parts`)}
                  onOpenPartItem={(itemId) =>
                    router.push(`/vehicles/${vehicleId}/parts?wishlistItemId=${encodeURIComponent(itemId)}`)
                  }
                  onOpenAttention={() => setIsAttentionModalOpen(true)}
                  onOpenAllNodes={() => {
                    router.push(`/vehicles/${vehicleId}/nodes`);
                  }}
                  onOpenNode={(nodeId) => {
                    router.push(`/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(nodeId)}`);
                  }}
                  onOpenNodeIssues={(nodeIds) => {
                    router.push(
                      `/vehicles/${vehicleId}/nodes?highlightIssueNodeIds=${encodeURIComponent(nodeIds.join(","))}`
                    );
                  }}
                  onOpenServiceLog={openServiceLogModalFull}
                  onOpenServiceLogEvent={(eventId) =>
                    router.push(
                      `/vehicles/${vehicleId}/service-log?serviceEventId=${encodeURIComponent(eventId)}`
                    )
                  }
                  onOpenExpenseDetails={() => router.push(`/vehicles/${vehicleId}/expenses`)}
                  onOpenAttentionItemService={openAddServiceFromAttentionItem}
                  onOpenAttentionItemLog={openServiceLogForAttentionItem}
                  onOpenAttentionItemContext={openNodeContextFromAttentionItem}
                />

                {false ? (
                <section
                  style={{
                    borderRadius: 24,
                    border: `1px solid ${productSemanticColors.border}`,
                    backgroundColor: productSemanticColors.card,
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsAdvancedDetailsOpen((prev) => !prev)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "18px 22px",
                      color: productSemanticColors.textPrimary,
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>
                        Расширенные данные и рабочие панели
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          color: productSemanticColors.textMuted,
                          fontSize: 13,
                          lineHeight: "18px",
                        }}
                      >
                        Состояние, дерево узлов, список покупок и техническая сводка в одном
                        раскрываемом блоке.
                      </div>
                    </div>
                    <span
                      style={{
                        color: productSemanticColors.textSecondary,
                        fontSize: 22,
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {isAdvancedDetailsOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isAdvancedDetailsOpen ? (
                    <div
                      style={{
                        padding: 20,
                        borderTop: `1px solid ${productSemanticColors.border}`,
                        backgroundColor: productSemanticColors.cardSubtle,
                      }}
                    >
                      <div className="space-y-7">
            <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="text-sm text-gray-500">
                {vehicle.brandName} | {vehicle.modelName}
              </div>

              <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <h1 className="min-w-0 flex-1 text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                  {detailViewModel?.displayName || title}
                </h1>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={openEditProfileModal}
                      title="Редактировать"
                      aria-label="Редактировать"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-900 transition hover:bg-gray-100"
                    >
                      <EditIcon />
                    </button>
                    <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      Редактировать
                    </span>
                  </div>
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={() => void moveVehicleToTrash()}
                      disabled={isMovingToTrash}
                      title="На свалку"
                      aria-label="На свалку"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-300 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <TrashIcon />
                    </button>
                    <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      На свалку
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAttentionModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition hover:opacity-95"
                    style={{
                      borderColor: attentionTok.border,
                      backgroundColor: attentionTok.background,
                      color: attentionTok.foreground,
                    }}
                  >
                    Требует внимания
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
                      style={{
                        backgroundColor: attentionBadgeBg,
                        color:
                          attentionAction.totalCount > 0
                            ? attentionTok.foreground
                            : productSemanticColors.textMuted,
                      }}
                    >
                      {attentionSummary.totalCount}
                    </span>
                  </button>
                </div>
              </div>
              {moveToTrashError ? (
                <p className="mt-3 text-sm" style={{ color: productSemanticColors.error }}>
                  {moveToTrashError}
                </p>
              ) : null}

              <p className="mt-3 text-base leading-7 text-gray-600">
                {(
                  detailViewModel?.yearVersionLine ||
                  `${vehicle.year} · ${vehicle.variantName}`
                ).replace(" · ", " | ")}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openCreateServiceEventModal}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  Добавить ТО
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/vehicles/${vehicleId}/expenses`)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  Добавить расход
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/vehicles/${vehicleId}/parts`)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  Подобрать деталь
                </button>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <InfoCard label="Никнейм" value={vehicle.nickname || "Не задан"} />
                <InfoCard label="VIN" value={vehicle.vin || "Не указан"} />
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-semibold tracking-tight text-gray-950">
                    Текущее состояние
                  </h2>
                  {!isEditingVehicleState ? (
                    <button
                      type="button"
                      onClick={openVehicleStateEditor}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                    >
                      Редактировать
                    </button>
                  ) : null}
                </div>

                {!isEditingVehicleState ? (
                  <div className="mt-4 grid gap-2.5 text-sm text-gray-700 sm:grid-cols-2">
                    <div>
                      <span className="font-medium text-gray-950">
                        {vehicleStateViewModel?.odometerLabel || "Пробег"}:
                      </span>{" "}
                      {vehicleStateViewModel?.odometerValue || `${vehicle.odometer} км`}
                    </div>
                    <div>
                      <span className="font-medium text-gray-950">
                        {vehicleStateViewModel?.engineHoursLabel || "Моточасы"}:
                      </span>{" "}
                      {vehicleStateViewModel?.engineHoursValue ||
                        (vehicle.engineHours !== null ? `${vehicle.engineHours} ч` : "Не указаны")}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InputField label="Пробег, км">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={vehicleStateOdometer}
                          onChange={(event) =>
                            setVehicleStateOdometer(event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                          placeholder="Например, 15000"
                          disabled={isSavingVehicleState}
                        />
                      </InputField>

                      <InputField label="Моточасы">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={vehicleStateEngineHours}
                          onChange={(event) =>
                            setVehicleStateEngineHours(event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                          placeholder="Пусто = не указаны"
                          disabled={isSavingVehicleState}
                        />
                      </InputField>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={saveVehicleState}
                        disabled={isSavingVehicleState}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingVehicleState ? "Сохраняем..." : "Сохранить"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelVehicleStateEditor}
                        disabled={isSavingVehicleState}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Отмена
                      </button>
                    </div>

                    {vehicleStateError ? (
                      <p className="text-sm" style={{ color: productSemanticColors.error }}>
                        {vehicleStateError}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="mt-7 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsUsageProfileSectionExpanded((prev) => !prev)}
                      className="inline-flex items-center gap-2 text-left"
                      aria-expanded={isUsageProfileSectionExpanded}
                    >
                      <h2 className="text-base font-semibold tracking-tight text-gray-950">
                        Профиль эксплуатации
                      </h2>
                      <span className="text-sm text-gray-500" aria-hidden>
                        {isUsageProfileSectionExpanded ? "▾" : "▸"}
                      </span>
                    </button>
                  </div>

                  {isUsageProfileSectionExpanded ? (
                    rideProfileViewModel ? (
                      <div className="mt-4 space-y-2.5 text-sm leading-6 text-gray-700">
                        <div>
                          <span className="font-medium text-gray-950">
                            Сценарий:
                          </span>{" "}
                          {rideProfileViewModel.usageType}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">Стиль:</span>{" "}
                          {rideProfileViewModel.ridingStyle}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">
                            Нагрузка:
                          </span>{" "}
                          {rideProfileViewModel.loadType}
                        </div>
                        <div>
                          <span className="font-medium text-gray-950">
                            Интенсивность:
                          </span>{" "}
                          {rideProfileViewModel.usageIntensity}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-gray-600">
                        Профиль эксплуатации пока не задан.
                      </p>
                    )
                  ) : null}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <button
                    type="button"
                    onClick={() => setIsTechnicalSummarySectionExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-2 text-left"
                    aria-expanded={isTechnicalSummarySectionExpanded}
                  >
                    <h2 className="text-base font-semibold tracking-tight text-gray-950">
                      Техническая сводка
                    </h2>
                    <span className="text-sm text-gray-500" aria-hidden>
                      {isTechnicalSummarySectionExpanded ? "▾" : "▸"}
                    </span>
                  </button>

                  {isTechnicalSummarySectionExpanded ? (
                    <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                      {technicalInfoViewModel.items.map((item) => (
                        <SpecCard key={item.key} label={item.label} value={item.value} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                  Что нужно купить
                </h2>
                <button
                  type="button"
                  onClick={() => openWishlistModalForCreate()}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                >
                  Добавить
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Запчасти и расходники к покупке (без каталога и магазинов). Активный список
                без отдельной вкладки «Установленные»: установленные позиции сохраняются в журнале
                обслуживания после создания сервисного события.
              </p>
              {isWishlistLoading ? (
                <p className="mt-4 text-sm text-gray-600">Загрузка списка…</p>
              ) : null}
              {wishlistError ? (
                <p className="mt-4 text-sm" style={{ color: productSemanticColors.error }}>
                  {wishlistError}
                </p>
              ) : null}
              {wishlistNotice ? (
                <p
                  className={`mt-3 text-sm ${
                    wishlistNotice.startsWith("Ошибка:")
                      ? "text-red-700"
                      : wishlistNotice.includes("не открыто")
                        ? "text-amber-800"
                        : "text-emerald-800"
                  }`}
                  role="status"
                >
                  {wishlistNotice}
                </p>
              ) : null}
              {!isWishlistLoading &&
              !wishlistError &&
              wishlistItems.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">Пока нет позиций.</p>
              ) : null}
              {!isWishlistLoading &&
              !wishlistError &&
              wishlistItems.length > 0 &&
              wishlistActiveViewModels.length === 0 ? (
                <div className="mt-4 space-y-1">
                  <p className="text-sm font-medium text-gray-900">Список покупок пуст</p>
                  <p className="text-sm text-gray-600">Все позиции установлены.</p>
                  <p className="text-xs text-gray-500">
                    Установленные позиции сохраняются в журнале обслуживания после создания
                    сервисного события.
                  </p>
                </div>
              ) : null}
              {!isWishlistLoading && wishlistGroups.length > 0 ? (
                <div className="mt-5 space-y-6">
                  {wishlistGroups.map((group) => (
                    <div key={group.status}>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {group.sectionTitleRu}
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {group.items.map((it) => (
                          <li
                            key={it.id}
                            className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-950">{it.title}</p>
                                {it.sku ? (
                                  <div className="mt-1 rounded-lg border border-gray-100 bg-white/80 px-2 py-1.5">
                                    <p className="text-xs font-medium text-gray-800">
                                      {getWishlistItemSkuDisplayLines(it.sku).primaryLine}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {getWishlistItemSkuDisplayLines(it.sku).secondaryLine}
                                    </p>
                                  </div>
                                ) : null}
                                <p className="mt-0.5 text-xs text-gray-600">
                                  Кол-во: {it.quantity}
                                  {it.node ? ` · Узел: ${it.node.name}` : ""}
                                </p>
                                {it.costLabelRu ? (
                                  <p className="mt-0.5 text-xs text-gray-600">
                                    Стоимость: {it.costLabelRu}
                                  </p>
                                ) : null}
                                {it.kitOriginLabelRu ? (
                                  <p className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                    {it.kitOriginLabelRu}
                                  </p>
                                ) : null}
                                {it.commentBodyRu ? (
                                  <p className="mt-1 text-xs text-gray-600">{it.commentBodyRu}</p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-1">
                                <label className="sr-only" htmlFor={`wishlist-status-${it.id}`}>
                                  Статус позиции
                                </label>
                                <select
                                  id={`wishlist-status-${it.id}`}
                                  value={it.status}
                                  onChange={(e) =>
                                    patchWishlistItemStatus(
                                      it.id,
                                      e.target.value as PartWishlistItem["status"],
                                      it.status
                                    )
                                  }
                                  disabled={wishlistStatusUpdatingId === it.id}
                                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs disabled:cursor-wait disabled:opacity-60"
                                  aria-label="Статус позиции"
                                  title={
                                    it.node
                                      ? "Сменить статус позиции"
                                      : "Для смены статуса нужно выбрать конечный узел"
                                  }
                                >
                                  {PART_WISHLIST_STATUS_ORDER.map((s) => (
                                    <option key={s} value={s}>
                                      {partWishlistStatusLabelsRu[s]}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const raw = wishlistItems.find((w) => w.id === it.id);
                                    if (raw) {
                                      openWishlistModalForEdit(raw);
                                    }
                                  }}
                                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-800 transition hover:bg-white"
                                >
                                  Изменить
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteWishlistItemById(it.id)}
                                  disabled={wishlistDeletingId === it.id}
                                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
                                >
                                  {wishlistDeletingId === it.id ? "Удаляем..." : "Удалить"}
                                </button>
                              </div>
                            </div>
                            {wishlistStatusUpdatingId === it.id ? (
                              <p className="mt-2 text-xs text-gray-500" role="status">
                                Обновляем статус...
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {renderMainNodeTreeSection()}
                      </div>
                    </div>
                  ) : null}
                </section>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {selectedNodeSubtreeModalViewModel ? (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center px-4 py-6 sm:items-center"
          style={{ backgroundColor: productSemanticColors.overlayModal }}
        >
          <div
            className="garage-dark-surface-text w-full max-w-5xl rounded-3xl border border-slate-700 bg-slate-900 shadow-xl"
            style={{
              backgroundColor: productSemanticColors.card,
              borderColor: productSemanticColors.borderStrong,
              color: productSemanticColors.textPrimary,
            }}
          >
            <div
              className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700 px-6 py-4"
              style={{
                backgroundColor: productSemanticColors.card,
                borderBottomColor: productSemanticColors.borderStrong,
                color: productSemanticColors.textPrimary,
              }}
            >
              <div
                className={
                  highlightedNodeId === selectedNodeSubtreeModalViewModel.rootNodeId
                    ? "rounded-lg border border-amber-500/60 bg-amber-900/20 px-2 py-1"
                    : undefined
                }
                style={
                  highlightedNodeId === selectedNodeSubtreeModalViewModel.rootNodeId
                    ? {
                        backgroundColor: productSemanticColors.cardMuted,
                        borderColor: statusSemanticTokens.SOON.border,
                        color: productSemanticColors.textPrimary,
                      }
                    : { color: productSemanticColors.textPrimary }
                }
              >
                <h2
                  className="text-xl font-semibold tracking-tight text-slate-100"
                  style={{ color: productSemanticColors.textPrimary }}
                >
                  {selectedNodeSubtreeModalViewModel.rootNodeName}
                </h2>
                {selectedNodeSubtreeModalViewModel.shortExplanationLabel ? (
                  <button
                    type="button"
                    className="mt-1 text-left text-xs text-slate-400 underline decoration-dotted underline-offset-2"
                    style={{ color: productSemanticColors.textSecondary }}
                    onClick={() => {
                      if (
                        selectedTopLevelNode &&
                        canOpenNodeStatusExplanationModal(selectedTopLevelNode)
                      ) {
                        openStatusExplanationFromTreeContext(selectedTopLevelNode);
                      }
                    }}
                    disabled={
                      !selectedTopLevelNode ||
                      !canOpenNodeStatusExplanationModal(selectedTopLevelNode)
                    }
                  >
                    {selectedNodeSubtreeModalViewModel.shortExplanationLabel}
                  </button>
                ) : null}
                {selectedNodeSubtreeModalViewModel.maintenanceSummaryLine ? (
                  selectedTopLevelNode && canOpenNodeStatusExplanationModal(selectedTopLevelNode) ? (
                    <button
                      type="button"
                      className="mt-1 block text-left text-xs font-medium text-slate-300 underline decoration-dotted underline-offset-2"
                      style={{ color: productSemanticColors.textSecondary }}
                      onClick={() => openStatusExplanationFromTreeContext(selectedTopLevelNode)}
                    >
                      {selectedNodeSubtreeModalViewModel.maintenanceSummaryLine}
                    </button>
                  ) : (
                    <p
                      className="mt-1 text-xs font-medium text-slate-300"
                      style={{ color: productSemanticColors.textSecondary }}
                    >
                      {selectedNodeSubtreeModalViewModel.maintenanceSummaryLine}
                    </p>
                  )
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNodeMaintenanceModeEnabled((prev) => !prev)}
                  className={`inline-flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-medium transition ${
                    isNodeMaintenanceModeEnabled
                      ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
                      : "border-slate-600 text-slate-100 hover:bg-slate-800"
                  }`}
                  style={{
                    backgroundColor: isNodeMaintenanceModeEnabled
                      ? productSemanticColors.cardMuted
                      : productSemanticColors.cardSubtle,
                    borderColor: productSemanticColors.borderStrong,
                    color: productSemanticColors.textPrimary,
                  }}
                >
                  {getNodeModeToggleLabel()}
                </button>
                <button
                  type="button"
                  onClick={closeTopLevelNodeSubtreeModal}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-600 px-3.5 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                  style={{
                    backgroundColor: productSemanticColors.cardSubtle,
                    borderColor: productSemanticColors.borderStrong,
                    color: productSemanticColors.textPrimary,
                  }}
                >
                  Закрыть
                </button>
              </div>
            </div>
            <div
              className="max-h-[72vh] overflow-y-auto px-6 py-6"
              style={{ backgroundColor: productSemanticColors.card, color: productSemanticColors.textPrimary }}
            >
              {selectedNodeSubtreeModalViewModel.isLeafRoot ? (
                <div className="space-y-2.5">
                  {selectedTopLevelNodeForDisplay
                    ? renderChildTreeNode(selectedTopLevelNodeForDisplay, 0)
                    : null}
                </div>
              ) : selectedNodeSubtreeModalViewModel.childNodes.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedNodeSubtreeModalViewModel.childNodes.map((child) =>
                    renderChildTreeNode(child, 0)
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-300" style={{ color: productSemanticColors.textSecondary }}>
                  Для этого узла нет дочерних элементов.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isExpenseDetailsModalOpen ? (
        <div className="fixed inset-0 z-[55] flex items-start justify-center bg-black/45 px-4 py-6 sm:items-center">
          <div className="garage-dark-surface-text w-full max-w-3xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                Расходы на обслуживание
              </h2>
              <button
                type="button"
                onClick={() => setIsExpenseDetailsModalOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
              <p className="text-xs text-gray-500">
                Сводка по полям стоимости в сервисных записях. Валюты не суммируются между
                собой.
              </p>

              {isServiceEventsLoading ? (
                <p className="mt-4 text-sm text-gray-600">Загрузка данных журнала…</p>
              ) : serviceEventsError ? (
                <p className="mt-4 text-sm" style={{ color: productSemanticColors.error }}>
                  Не удалось загрузить расходы: проверьте журнал обслуживания.
                </p>
              ) : expenseSummary.paidEventCount === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">Расходы пока не указаны</p>
                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    Добавьте сумму и валюту при создании сервисного события — здесь появятся
                    итоги по каждой валюте и за текущий месяц.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4 text-sm">
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <div>
                      <span className="text-gray-500">Записей с суммой</span>
                      <p className="font-semibold text-gray-950">{expenseSummary.paidEventCount}</p>
                    </div>
                    {expenseSummary.latestPaidEvent ? (
                      <div className="min-w-0 flex-1">
                        <span className="text-gray-500">Последняя оплаченная</span>
                        <p className="font-medium text-gray-950">
                          {formatIsoCalendarDateRu(expenseSummary.latestPaidEvent.eventDate)} ·{" "}
                          {expenseSummary.latestPaidEvent.serviceType}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatExpenseAmountRu(expenseSummary.latestPaidEvent.totalAmount)}{" "}
                          {expenseSummary.latestPaidEvent.currency} ·{" "}
                          {expenseSummary.latestPaidEvent.nodeLabel}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Всего по валютам
                    </p>
                    <ul className="mt-2 space-y-1">
                      {expenseSummary.totalsByCurrency.map((row) => (
                        <li key={row.currency} className="flex justify-between gap-4 text-gray-900">
                          <span>{row.currency}</span>
                          <span className="font-medium tabular-nums">
                            {formatExpenseAmountRu(row.totalAmount)} {row.currency}
                            <span className="ml-2 text-xs font-normal text-gray-500">
                              ({row.paidEventCount} {row.paidEventCount === 1 ? "запись" : "записей"})
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {expenseSummary.currentMonthTotalsByCurrency.length > 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
                      <p className="text-xs font-medium text-gray-600">
                        Текущий месяц ({expenseSummary.currentMonthLabel})
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {expenseSummary.currentMonthTotalsByCurrency.map((row) => (
                          <li key={row.currency} className="flex justify-between text-sm text-gray-900">
                            <span>{row.currency}</span>
                            <span className="font-medium tabular-nums">
                              {formatExpenseAmountRu(row.totalAmount)} {row.currency}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      В {expenseSummary.currentMonthLabel} платных сервисных записей пока нет.
                    </p>
                  )}

                  {expenseSummary.byMonth.length > 1 ? (
                    <details className="rounded-lg border border-gray-100 bg-white">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-700">
                        По месяцам ({expenseSummary.byMonth.length})
                      </summary>
                      <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-600">
                        <ul className="space-y-2">
                          {expenseSummary.byMonth.slice(0, 6).map((m) => (
                            <li key={m.monthKey}>
                              <span className="font-medium text-gray-800">{m.monthLabel}</span>
                              <span className="text-gray-600">
                                {" "}
                                —{" "}
                                {m.totalsByCurrency
                                  .map((t) => `${formatExpenseAmountRu(t.totalAmount)} ${t.currency}`)
                                  .join(" · ")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isAddServiceEventModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 py-6 sm:items-center"
          style={{ backgroundColor: productSemanticColors.overlayModal }}
        >
          <div
            className="garage-dark-surface-text w-full max-w-4xl rounded-3xl border border-gray-200 bg-white shadow-xl"
            style={{
              backgroundColor: productSemanticColors.card,
              borderColor: productSemanticColors.borderStrong,
              color: productSemanticColors.textPrimary,
            }}
          >
            <div
              className="flex items-center justify-between border-b border-gray-200 px-5 py-3"
              style={{
                backgroundColor: productSemanticColors.card,
                borderBottomColor: productSemanticColors.borderStrong,
                color: productSemanticColors.textPrimary,
              }}
            >
              <h2
                className="text-xl font-semibold tracking-tight"
                style={{ color: productSemanticColors.textPrimary }}
              >
                {editingServiceEventId
                  ? "Редактировать сервисное событие"
                  : "Добавить сервисное событие"}
              </h2>
              <button
                type="button"
                onClick={() => closeAddServiceEventModal()}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                style={darkModalButtonStyle}
              >
                Закрыть
              </button>
            </div>

            <div
              className="max-h-[78vh] overflow-y-auto px-5 py-4"
              style={{
                backgroundColor: productSemanticColors.card,
                color: productSemanticColors.textPrimary,
              }}
            >
              <div className="space-y-2.5">
                <div
                  className="rounded-2xl border border-gray-200 bg-gray-50/70 px-3 py-2.5"
                  style={darkModalSectionStyle}
                >
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: productSemanticColors.textPrimary }}
                  >
                    Выбор узла
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-end gap-2">
                    {nodeSelectLevels.map((nodesAtLevel, levelIndex) => (
                      <div
                        key={`level-${levelIndex}`}
                        className="min-w-[150px] flex-1"
                      >
                        <label
                          className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide"
                          style={{ color: productSemanticColors.textSecondary }}
                        >
                          {`Уровень ${levelIndex + 1}`}
                        </label>
                        <select
                          value={selectedNodePath[levelIndex] ?? ""}
                          onChange={(event) => {
                            const nextNodeId = event.target.value;
                            setSelectedNodePath((prev) => {
                              const next = prev.slice(0, levelIndex);
                              if (nextNodeId) {
                                next[levelIndex] = nextNodeId;
                              }
                              return next;
                            });
                          }}
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none transition focus:border-gray-950"
                          style={darkModalFormControlStyle}
                        >
                          <option value="">{`Уровень ${levelIndex + 1}`}</option>
                          {nodesAtLevel.map((nodeAtLevel) => (
                            <option key={nodeAtLevel.id} value={nodeAtLevel.id}>
                              {nodeAtLevel.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2.5"
                  style={darkModalSectionStyle}
                >
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: productSemanticColors.textPrimary }}
                  >
                    Данные события
                  </h3>
                  <div className="mt-1.5 grid gap-x-3 gap-y-2 sm:grid-cols-2">
                    <InputField label="Тип сервиса" labelStyle={darkModalInputLabelStyle}>
                      <input
                        value={serviceType}
                        onChange={(event) => setServiceType(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Например: Oil change"
                      />
                    </InputField>

                    <InputField label="Дата события" labelStyle={darkModalInputLabelStyle}>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(event) => setEventDate(event.target.value)}
                        max={todayDate}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                      />
                    </InputField>

                    <InputField label="Пробег, км" labelStyle={darkModalInputLabelStyle}>
                      <input
                        value={odometer}
                        onChange={(event) => setOdometer(event.target.value)}
                        inputMode="numeric"
                        max={vehicle?.odometer ?? undefined}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Например: 15000"
                      />
                    </InputField>

                    <InputField label="Моточасы" labelStyle={darkModalInputLabelStyle}>
                      <input
                        value={engineHours}
                        onChange={(event) => setEngineHours(event.target.value)}
                        inputMode="numeric"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Если применимо"
                      />
                    </InputField>

                    <InputField label="Стоимость" labelStyle={darkModalInputLabelStyle}>
                      <input
                        value={costAmount}
                        onChange={(event) => setCostAmount(event.target.value)}
                        inputMode="decimal"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Например: 120.5"
                      />
                    </InputField>

                    <InputField label="Валюта" labelStyle={darkModalInputLabelStyle}>
                      <select
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                      >
                        <option value="">Не выбрана</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="RUB">RUB</option>
                      </select>
                    </InputField>
                  </div>

                  <div className="mt-3 grid gap-x-3 gap-y-2 sm:grid-cols-2">
                    <InputField label="Артикул (SKU)" labelStyle={darkModalInputLabelStyle}>
                      <input
                        value={partSku}
                        onChange={(event) => setPartSku(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Опционально"
                        maxLength={200}
                        autoComplete="off"
                      />
                    </InputField>
                    <InputField label="Наименование запчасти" labelStyle={darkModalInputLabelStyle}>
                      <input
                        value={partName}
                        onChange={(event) => setPartName(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Опционально"
                        maxLength={500}
                      />
                    </InputField>
                  </div>

                  {partSku.trim().length >= 2 ? (
                    <div
                      className="mt-2 rounded-xl border px-3 py-2"
                      style={{
                        borderColor: productSemanticColors.borderStrong,
                        backgroundColor: productSemanticColors.cardSubtle,
                      }}
                    >
                      <p className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
                        Поиск в каталоге по артикулу
                      </p>
                      {serviceEventSkuLoading ? (
                        <p className="mt-1 text-xs" style={{ color: productSemanticColors.textMuted }}>
                          Ищем совпадения...
                        </p>
                      ) : null}
                      {!serviceEventSkuLoading && serviceEventSkuError ? (
                        <p className="mt-1 text-xs" style={{ color: productSemanticColors.error }}>
                          {serviceEventSkuError}
                        </p>
                      ) : null}
                      {!serviceEventSkuLoading &&
                      !serviceEventSkuError &&
                      serviceEventSkuResults.length === 0 ? (
                        <p className="mt-1 text-xs" style={{ color: productSemanticColors.textMuted }}>
                          Ничего не найдено.
                        </p>
                      ) : null}
                      {!serviceEventSkuLoading && serviceEventSkuResults.length > 0 ? (
                        <div className="mt-2 space-y-1.5">
                          {serviceEventSkuResults.map((sku) => {
                            const partNumber = sku.partNumbers[0]?.number?.trim() ?? "";
                            return (
                              <button
                                key={sku.id}
                                type="button"
                                onClick={() => {
                                  setPartSku(partNumber || partSku.trim());
                                  setPartName(sku.canonicalName?.trim() || partName);
                                }}
                                className="w-full rounded-lg border px-2.5 py-2 text-left text-xs transition hover:opacity-90"
                                style={{
                                  borderColor: productSemanticColors.borderStrong,
                                  backgroundColor: productSemanticColors.cardMuted,
                                  color: productSemanticColors.textPrimary,
                                }}
                              >
                                <div style={{ fontWeight: 600 }}>{partNumber || "Без артикула"}</div>
                                <div style={{ color: productSemanticColors.textSecondary }}>
                                  {sku.brandName} · {sku.canonicalName}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-3">
                    <InputField label="Комментарий" labelStyle={darkModalInputLabelStyle}>
                      <textarea
                        ref={serviceEventCommentTextareaRef}
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        className="min-h-20 w-full resize-none overflow-hidden rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-950"
                        style={darkModalFormControlStyle}
                        placeholder="Опционально"
                      />
                    </InputField>
                  </div>
                </div>

                <div
                  className="border-t border-gray-100 pt-3"
                  style={{ borderTopColor: productSemanticColors.borderStrong }}
                >
                <button
                  type="button"
                  onClick={handleSubmitServiceEvent}
                  disabled={
                    isCreatingServiceEvent ||
                    !isLeafNodeSelected ||
                    !eventDate
                  }
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-950 px-5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: productSemanticColors.primaryAction,
                    color: productSemanticColors.onPrimaryAction,
                  }}
                >
                  {isCreatingServiceEvent
                    ? "Сохраняем..."
                    : editingServiceEventId
                      ? "Сохранить изменения"
                      : "Добавить событие"}
                </button>

                {!isLeafNodeSelected && selectedFinalNode ? (
                  <p className="mt-3 text-sm" style={{ color: statusSemanticTokens.SOON.foreground }}>
                    Для создания события выберите узел последнего уровня.
                  </p>
                ) : null}

                {serviceEventFormError ? (
                  <p className="mt-3 text-sm" style={{ color: productSemanticColors.error }}>
                    {serviceEventFormError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : null}

      {isWishlistModalOpen ? (
        <div
          className="fixed inset-0 z-[64] flex items-start justify-center px-4 py-6 sm:items-center"
          style={{ backgroundColor: productSemanticColors.overlayModal }}
        >
          <div className="parts-selection-surface garage-dark-surface-text w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                {wishlistEditingId ? "Позиция списка" : "Новая позиция"}
              </h2>
              <button
                type="button"
                onClick={closeWishlistModal}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>
            <div className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-600">Название</label>
                <input
                  type="text"
                  value={wishlistForm.title}
                  onChange={(e) =>
                    setWishlistForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  placeholder="Например: масло моторное"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">
                  Узел мотоцикла <span className="text-rose-600">*</span>
                </label>
                <select
                  value={wishlistForm.nodeId}
                  onChange={(e) =>
                    setWishlistForm((f) => ({ ...f, nodeId: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                >
                  <option value="">Выберите узел мотоцикла</option>
                  {wishlistNodeOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {"\u00A0".repeat(Math.max(0, opt.level - 1) * 2)}
                      {opt.name}
                    </option>
                  ))}
                </select>
                {wishlistNodeRequiredError ? (
                  <p className="mt-1 text-xs" style={{ color: productSemanticColors.error }}>
                    Выберите узел мотоцикла
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-3">
                <p className="text-xs font-medium text-gray-700">SKU из каталога</p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Необязательно. Поиск по названию, бренду или артикулу
                  {wishlistForm.nodeId.trim()
                    ? " (учтён выбранный узел)."
                    : " (от 2 символов). С узлом — можно открыть подбор по узлу без текста."}
                </p>
                {wishlistForm.nodeId.trim() ? (
                  <div className="mt-2 rounded-lg border border-gray-200 bg-white p-2">
                    <p className="text-[11px] font-medium text-gray-700">Рекомендации по узлу</p>
                    {wishlistRecommendationsError ? (
                      <p className="mt-1 text-[11px]" style={{ color: productSemanticColors.error }}>
                        {wishlistRecommendationsError}
                      </p>
                    ) : null}
                    {wishlistRecommendationsLoading ? (
                      <p className="mt-1 text-[11px] text-gray-500">Загружаем рекомендации…</p>
                    ) : null}
                    {!wishlistRecommendationsLoading && wishlistRecommendations.length === 0 ? (
                      <p className="mt-1 text-[11px] text-gray-500">
                        Для этого узла пока нет рекомендаций из каталога
                      </p>
                    ) : null}
                    {!wishlistRecommendationsLoading && wishlistRecommendationGroups.length > 0 ? (
                      <div className="mt-2 space-y-3">
                        {wishlistRecommendationGroups.map((group) => (
                          <div key={group.recommendationType}>
                            <p className="text-[11px] font-semibold text-gray-800">
                              {getPartRecommendationGroupTitle(group.recommendationType)}
                            </p>
                            <ul className="mt-1.5 space-y-1.5">
                              {group.items.map((rec) => {
                                const primaryNo = rec.partNumbers[0]?.trim() || "";
                                const warn = getPartRecommendationWarningLabel(rec);
                                const isVerify = rec.recommendationType === "VERIFY_REQUIRED";
                                return (
                                  <li
                                    key={rec.skuId}
                                    className={`rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 ${
                                      isVerify ? "border-l-2 border-l-amber-500 bg-amber-50/50" : ""
                                    }`}
                                  >
                                    <p className="text-xs font-medium text-gray-900">
                                      {rec.canonicalName}
                                    </p>
                                    <p className="text-[11px] text-gray-600">{rec.brandName}</p>
                                    {primaryNo ? (
                                      <p className="text-[11px] text-gray-500">Арт.: {primaryNo}</p>
                                    ) : null}
                                    {rec.partType.trim() ? (
                                      <p className="text-[11px] text-gray-500">{rec.partType}</p>
                                    ) : null}
                                    {rec.priceAmount != null ? (
                                      <p className="text-[11px] text-gray-500">
                                        {`${formatExpenseAmountRu(rec.priceAmount)} ${
                                          rec.currency?.trim() || ""
                                        }`.trim()}
                                      </p>
                                    ) : null}
                                    <p className="text-[11px] text-gray-700">{rec.recommendationLabel}</p>
                                    <p className="text-[11px] text-gray-600">{rec.whyRecommended}</p>
                                    {rec.fitmentNote ? (
                                      <p className="text-[11px] text-gray-500">{rec.fitmentNote}</p>
                                    ) : null}
                                    {warn ? (
                                      <p
                                        className={`text-[11px] ${
                                          isVerify ? "font-medium text-amber-900" : "text-amber-800"
                                        }`}
                                      >
                                        {warn}
                                      </p>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => void addRecommendedSkuToWishlist(rec)}
                                      disabled={wishlistAddingRecommendedSkuId === rec.skuId}
                                      className="mt-1 inline-flex rounded-lg border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {wishlistEditingId
                                        ? "Применить SKU"
                                        : wishlistAddingRecommendedSkuId === rec.skuId
                                          ? "Добавление…"
                                          : "Добавить в список покупок"}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {wishlistForm.nodeId.trim() && !wishlistEditingId ? (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-white p-2">
                    <p className="text-[11px] font-medium text-gray-700">Комплекты обслуживания</p>
                    {wishlistServiceKitsError ? (
                      <p className="mt-1 text-[11px]" style={{ color: productSemanticColors.error }}>
                        {wishlistServiceKitsError}
                      </p>
                    ) : null}
                    {wishlistServiceKitsLoading ? (
                      <p className="mt-1 text-[11px] text-gray-500">Загружаем комплекты…</p>
                    ) : null}
                    {!wishlistServiceKitsLoading && wishlistServiceKits.length === 0 ? (
                      <p className="mt-1 text-[11px] text-gray-500">
                        Для этого узла пока нет подходящих комплектов.
                      </p>
                    ) : null}
                    {!wishlistServiceKitsLoading && wishlistServiceKits.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {wishlistServiceKits.map((kit) => {
                          const preview = serviceKitPreviewByCode.get(kit.code);
                          return (
                          <li key={kit.code} className="rounded-md border border-gray-200 bg-gray-50 p-2">
                            <p className="text-xs font-semibold text-gray-900">{kit.title}</p>
                            <p className="mt-0.5 text-[11px] text-gray-600">{kit.description}</p>
                            <ul className="mt-1 space-y-1">
                              {(preview?.items ?? []).map((item) => (
                                <li
                                  key={item.itemKey}
                                  className={`rounded border px-2 py-1 text-[11px] ${
                                    item.status === "WILL_ADD"
                                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
                                      : item.status === "DUPLICATE_ACTIVE_ITEM"
                                        ? "border-gray-200 bg-white text-gray-500"
                                        : "border-amber-200 bg-amber-50/80 text-amber-800"
                                  }`}
                                >
                                  <p>
                                    {item.title}
                                    {item.matchedSkuTitle ? ` — ${item.matchedSkuTitle}` : ""}
                                  </p>
                                  <p className="mt-0.5">
                                    {item.nodeName ? `Узел: ${item.nodeName}` : `Узел: ${item.nodeCode}`}
                                    {item.costAmount != null
                                      ? ` · ${formatExpenseAmountRu(item.costAmount)} ${item.currency ?? ""}`.trim()
                                      : ""}
                                  </p>
                                  <p className="mt-0.5 font-medium">
                                    {getServiceKitPreviewItemStatusLabel(item.status)}
                                  </p>
                                </li>
                              ))}
                            </ul>
                            {preview ? (
                              <p className="mt-1 text-[11px] text-gray-600">
                                Доступно к добавлению: {preview.addableCount} · Уже есть: {preview.duplicateCount} ·
                                Пропуск: {preview.invalidCount}
                              </p>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void addServiceKitToWishlist(kit)}
                              disabled={
                                wishlistAddingKitCode === kit.code || (preview ? !preview.canAddAny : false)
                              }
                              className="mt-2 inline-flex rounded-lg border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {wishlistAddingKitCode === kit.code
                                ? "Добавление комплекта…"
                                : "Добавить доступные позиции"}
                            </button>
                          </li>
                        )})}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                <label className="mt-2 block text-[11px] font-medium text-gray-600">
                  Найти в каталоге
                </label>
                <input
                  type="search"
                  value={wishlistSkuQuery}
                  onChange={(e) => setWishlistSkuQuery(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  placeholder="Motul, Brembo, HF155…"
                  autoComplete="off"
                />
                {wishlistSkuFetchError ? (
                  <p className="mt-1 text-xs" style={{ color: productSemanticColors.error }}>
                    {wishlistSkuFetchError}
                  </p>
                ) : null}
                {wishlistSkuLoading ? (
                  <p className="mt-2 text-xs text-gray-500">Поиск…</p>
                ) : null}
                {!wishlistSkuLoading && wishlistSkuResults.length > 0 ? (
                  <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1">
                    {wishlistSkuResults.map((sku) => (
                      <li key={sku.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setWishlistSkuPickedPreview(sku);
                            setWishlistForm((f) =>
                              applyPartSkuViewModelToPartWishlistFormValues(f, sku)
                            );
                          }}
                          className="w-full rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-gray-50"
                        >
                          <span className="font-medium text-gray-900">
                            {getPartSkuViewModelDisplayLines(sku).primaryLine}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-gray-500">
                            {formatPartSkuSearchResultMetaLineRu(sku)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {wishlistForm.skuId.trim() ? (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-white px-2 py-2">
                    <p className="text-[11px] font-medium text-gray-600">Выбранный SKU</p>
                    {wishlistSkuPickedPreview?.id === wishlistForm.skuId.trim() ? (
                      <>
                        <p className="mt-0.5 text-xs font-medium text-gray-900">
                          {
                            getPartSkuViewModelDisplayLines(wishlistSkuPickedPreview)
                              .primaryLine
                          }
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {
                            getPartSkuViewModelDisplayLines(wishlistSkuPickedPreview)
                              .secondaryLine
                          }
                        </p>
                      </>
                    ) : wishlistEditingSourceItem?.sku?.id === wishlistForm.skuId.trim() ? (
                      <>
                        <p className="mt-0.5 text-xs font-medium text-gray-900">
                          {
                            getWishlistItemSkuDisplayLines(wishlistEditingSourceItem.sku)
                              .primaryLine
                          }
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {
                            getWishlistItemSkuDisplayLines(wishlistEditingSourceItem.sku)
                              .secondaryLine
                          }
                        </p>
                      </>
                    ) : (
                      <p className="mt-0.5 text-xs text-gray-600">SKU привязан</p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setWishlistSkuPickedPreview(null);
                        setWishlistForm((f) => clearPartWishlistFormSkuSelection(f));
                      }}
                      className="mt-2 inline-flex rounded-lg border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-800 hover:bg-gray-50"
                    >
                      Очистить SKU
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Количество</label>
                  <input
                    type="number"
                    min={1}
                    value={wishlistForm.quantity}
                    onChange={(e) =>
                      setWishlistForm((f) => ({ ...f, quantity: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Статус</label>
                  <select
                    value={wishlistForm.status}
                    onChange={(e) =>
                      setWishlistForm((f) => ({
                        ...f,
                        status: e.target.value as PartWishlistItem["status"],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  >
                    {PART_WISHLIST_STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {partWishlistStatusLabelsRu[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_88px]">
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Стоимость (необязательно)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={wishlistForm.costAmount}
                    onChange={(e) =>
                      setWishlistForm((f) => ({ ...f, costAmount: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                    placeholder="Например: 1500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Валюта</label>
                  <input
                    type="text"
                    value={wishlistForm.currency}
                    onChange={(e) =>
                      setWishlistForm((f) => ({ ...f, currency: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                    placeholder="RUB"
                    maxLength={8}
                    autoCapitalize="off"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">Комментарий</label>
                <textarea
                  value={wishlistForm.comment}
                  onChange={(e) =>
                    setWishlistForm((f) => ({ ...f, comment: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
              {wishlistFormError ? (
                <p style={{ color: productSemanticColors.error }}>{wishlistFormError}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => void submitWishlistForm()}
                  disabled={isWishlistSaving}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-950 px-5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
                >
                  {isWishlistSaving ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isAttentionModalOpen ? (
        <div
          className="fixed inset-0 z-[65] flex items-start justify-center px-4 py-6 sm:items-center"
          style={{ backgroundColor: productSemanticColors.overlayModal }}
        >
          <div
            className="garage-dark-surface-text w-full max-w-3xl rounded-3xl border shadow-xl sm:max-w-4xl"
            style={{
              backgroundColor: productSemanticColors.card,
              borderColor: productSemanticColors.borderStrong,
              color: productSemanticColors.textPrimary,
            }}
          >
            <div
              className="flex flex-wrap items-start justify-between gap-3 border-b px-6 py-4"
              style={{ borderColor: productSemanticColors.borderStrong }}
            >
              <div>
                <h2
                  className="text-xl font-semibold tracking-tight"
                  style={{ color: productSemanticColors.textPrimary }}
                >
                  Требует внимания
                </h2>
                <p className="mt-1 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                  Узлы «Просрочено» и «Скоро» по текущему дереву узлов.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAttentionModalOpen(false)}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border px-3.5 text-sm font-medium transition"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                  color: productSemanticColors.textPrimary,
                }}
              >
                Закрыть
              </button>
            </div>
            <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
              <p className="text-sm" style={{ color: productSemanticColors.textSecondary }}>
                Всего:{" "}
                <span className="font-semibold" style={{ color: productSemanticColors.textPrimary }}>
                  {attentionSummary.totalCount}
                </span>
                {attentionSummary.overdueCount > 0 ? (
                  <>
                    {" "}
                    · Просрочено:{" "}
                    <span className="font-medium" style={{ color: productSemanticColors.textPrimary }}>
                      {attentionSummary.overdueCount}
                    </span>
                  </>
                ) : null}
                {attentionSummary.soonCount > 0 ? (
                  <>
                    {" "}
                    · Скоро:{" "}
                    <span className="font-medium" style={{ color: productSemanticColors.textPrimary }}>
                      {attentionSummary.soonCount}
                    </span>
                  </>
                ) : null}
              </p>
              {!isNodeTreeLoading && !nodeTreeError && attentionSummary.totalCount > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["all", "unsnoozed", "snoozed"] as AttentionSnoozeFilter[]).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setAttentionSnoozeFilter(filter)}
                      className="inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition"
                      style={{
                        backgroundColor:
                          attentionSnoozeFilter === filter
                            ? productSemanticColors.primaryAction
                            : productSemanticColors.cardSubtle,
                        borderColor:
                          attentionSnoozeFilter === filter
                            ? productSemanticColors.primaryAction
                            : productSemanticColors.borderStrong,
                        color:
                          attentionSnoozeFilter === filter
                            ? productSemanticColors.onPrimaryAction
                            : productSemanticColors.textPrimary,
                      }}
                    >
                      {getAttentionSnoozeFilterLabel(filter)}
                    </button>
                  ))}
                </div>
              ) : null}

              {isNodeTreeLoading ? (
                <p className="mt-6 text-sm" style={{ color: productSemanticColors.textSecondary }}>
                  Загрузка дерева узлов…
                </p>
              ) : nodeTreeError ? (
                <p className="mt-6 text-sm" style={{ color: productSemanticColors.error }}>
                  {nodeTreeError}
                </p>
              ) : filteredAttentionItems.length === 0 ? (
                <div
                  className="mt-6 rounded-xl border border-dashed px-4 py-8 text-center text-sm"
                  style={{
                    backgroundColor: productSemanticColors.cardMuted,
                    borderColor: productSemanticColors.borderSubtle,
                    color: productSemanticColors.textSecondary,
                  }}
                >
                  {attentionEmptyStateLabel}
                </div>
              ) : (
                <div className="mt-5 space-y-6">
                  {filteredAttentionGroups.map((group) => (
                    <section key={group.status}>
                      <h3
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: productSemanticColors.textMuted }}
                      >
                        {group.sectionTitleRu}
                      </h3>
                      <ul className="mt-3 space-y-3">
                        {group.items.map((item) => {
                          const st =
                            item.effectiveStatus === "OVERDUE"
                              ? statusSemanticTokens.OVERDUE
                              : statusSemanticTokens.SOON;
                          const snoozeLabel = formatSnoozeUntilLabel(
                            nodeSnoozeByNodeId[item.nodeId] ?? null
                          );
                          return (
                            <li
                              key={item.nodeId}
                              className="rounded-2xl border p-4 shadow-sm"
                              style={{
                                backgroundColor: productSemanticColors.cardMuted,
                                borderColor: productSemanticColors.borderStrong,
                                color: productSemanticColors.textPrimary,
                              }}
                            >
                              {item.topLevelParentName ? (
                                <p className="text-xs" style={{ color: productSemanticColors.textMuted }}>
                                  Раздел: {item.topLevelParentName}
                                </p>
                              ) : null}
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openNodeContextFromAttentionItem(item)}
                                  className="text-base font-semibold transition hover:underline"
                                  style={{ color: productSemanticColors.textPrimary }}
                                >
                                  {item.name}
                                </button>
                                <span
                                  className="inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                                  style={{
                                    borderColor: st.border,
                                    backgroundColor: st.background,
                                    color: st.foreground,
                                  }}
                                >
                                  {item.statusLabelRu}
                                </span>
                              </div>
                              {item.shortExplanation && item.canOpenStatusExplanation ? (
                                <button
                                  type="button"
                                  onClick={() => openStatusExplanationForAttentionItem(item)}
                                  className="mt-2 text-left text-sm underline decoration-dotted underline-offset-2 transition"
                                  style={{ color: productSemanticColors.textSecondary }}
                                >
                                  {item.shortExplanation}
                                </button>
                              ) : item.shortExplanation ? (
                                <p className="mt-2 text-sm" style={{ color: productSemanticColors.textSecondary }}>
                                  {item.shortExplanation}
                                </p>
                              ) : null}
                              {snoozeLabel ? (
                                <p
                                  className="mt-2 text-xs font-medium"
                                  style={{ color: productSemanticColors.textSecondary }}
                                >
                                  {snoozeLabel}
                                </p>
                              ) : null}

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => openServiceLogForAttentionItem(item)}
                                  className="inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition"
                                  style={{
                                    backgroundColor: productSemanticColors.cardSubtle,
                                    borderColor: productSemanticColors.borderStrong,
                                    color: productSemanticColors.textPrimary,
                                  }}
                                >
                                  Журнал по узлу
                                </button>
                                {item.canAddServiceEvent ? (
                                  <button
                                    type="button"
                                    onClick={() => openAddServiceFromAttentionItem(item)}
                                    className="inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition"
                                    style={{
                                      backgroundColor: productSemanticColors.cardSubtle,
                                      borderColor: productSemanticColors.borderStrong,
                                      color: productSemanticColors.textPrimary,
                                    }}
                                  >
                                    Добавить сервис
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => openWishlistFromAttentionItem(item)}
                                  className="inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition"
                                  style={{
                                    backgroundColor: productSemanticColors.cardSubtle,
                                    borderColor: productSemanticColors.borderStrong,
                                    color: productSemanticColors.textPrimary,
                                  }}
                                >
                                  В список покупок
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openNodeContextFromAttentionItem(item)}
                                  className="inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition"
                                  style={{
                                    backgroundColor: productSemanticColors.cardSubtle,
                                    borderColor: productSemanticColors.borderStrong,
                                    color: productSemanticColors.textPrimary,
                                  }}
                                >
                                  Контекст узла
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedNodeContextViewModel ? (
        <div
          className="fixed inset-0 z-[65] flex items-start justify-center px-4 py-6 sm:items-center"
          style={{ backgroundColor: productSemanticColors.overlayModal }}
        >
          <div
            className="garage-dark-surface-text w-full max-w-4xl rounded-3xl border shadow-xl"
            style={{
              backgroundColor: productSemanticColors.card,
              borderColor: productSemanticColors.borderStrong,
              color: productSemanticColors.textPrimary,
            }}
          >
            <div
              className="flex items-start justify-between gap-3 border-b px-6 py-4"
              style={{ borderColor: productSemanticColors.borderStrong }}
            >
              <div className="min-w-0">
                <h2
                  className="truncate text-xl font-semibold tracking-tight"
                  style={{ color: productSemanticColors.textPrimary }}
                >
                  {selectedNodeContextViewModel.nodeName}
                </h2>
                <p className="truncate text-xs" style={{ color: productSemanticColors.textSecondary }}>
                  {selectedNodeContextViewModel.pathLabel}
                </p>
                <p className="truncate text-[11px]" style={{ color: productSemanticColors.textMuted }}>
                  {selectedNodeContextViewModel.nodeCode}
                </p>
                {selectedNodeContextViewModel.shortExplanationLabel ? (
                  selectedNodeContextNode && canOpenNodeStatusExplanationModal(selectedNodeContextNode) ? (
                    <button
                      type="button"
                      className="mt-1 block text-left text-sm underline decoration-dotted underline-offset-2"
                      style={{ color: productSemanticColors.textSecondary }}
                      onClick={() => openStatusExplanationFromTreeContext(selectedNodeContextNode)}
                    >
                      {selectedNodeContextViewModel.shortExplanationLabel}
                    </button>
                  ) : (
                    <p className="mt-1 text-sm" style={{ color: productSemanticColors.textSecondary }}>
                      {selectedNodeContextViewModel.shortExplanationLabel}
                    </p>
                  )
                ) : null}
                {selectedNodeSnoozeLabel ? (
                  <p
                    className="mt-1 text-xs font-medium"
                    style={{ color: productSemanticColors.textSecondary }}
                  >
                    {selectedNodeSnoozeLabel}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {selectedNodeContextViewModel.effectiveStatus ? (
                  <span
                    className="inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium"
                    style={getStatusBadgeStyle(selectedNodeContextViewModel.effectiveStatus)}
                  >
                    {selectedNodeContextViewModel.statusLabel}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={closeNodeContextModal}
                  className="inline-flex h-9 items-center justify-center rounded-lg border px-3.5 text-sm font-medium transition"
                  style={{
                    backgroundColor: productSemanticColors.cardSubtle,
                    borderColor: productSemanticColors.borderStrong,
                    color: productSemanticColors.textPrimary,
                  }}
                >
                  Закрыть
                </button>
              </div>
            </div>
            <div className="max-h-[74vh] space-y-4 overflow-y-auto px-6 py-6">
              <div className="flex flex-wrap gap-2">
                {selectedNodeContextViewModel.actions.map((action) => (
                  <div key={action.key} className="group relative">
                    <button
                      type="button"
                      onClick={() => handleNodeContextAction(action.key)}
                      disabled={action.key === "add_kit" && Boolean(nodeContextAddingKitCode)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-100 transition hover:bg-slate-700"
                      title={action.label}
                      aria-label={action.label}
                    >
                      {action.key === "journal" ? (
                        <ActionIcon iconKey="openServiceLog" />
                      ) : action.key === "add_service_event" ? (
                        <ActionIcon iconKey="addServiceEvent" />
                      ) : action.key === "add_wishlist" ? (
                        <ActionIcon iconKey="addToShoppingList" />
                      ) : action.key === "add_kit" ? (
                        <KitIcon />
                      ) : (
                        <InfoIcon />
                      )}
                    </button>
                    <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      {action.label}
                    </span>
                  </div>
                ))}
                {canSnoozeSelectedNode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setNodeSnoozeOption(selectedNodeContextViewModel.nodeId, "7d")}
                      className="inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition"
                      style={{
                        backgroundColor: productSemanticColors.cardSubtle,
                        borderColor: productSemanticColors.borderStrong,
                        color: productSemanticColors.textPrimary,
                      }}
                    >
                      Отложить на 7 дней
                    </button>
                    <button
                      type="button"
                      onClick={() => setNodeSnoozeOption(selectedNodeContextViewModel.nodeId, "30d")}
                      className="inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition"
                      style={{
                        backgroundColor: productSemanticColors.cardSubtle,
                        borderColor: productSemanticColors.borderStrong,
                        color: productSemanticColors.textPrimary,
                      }}
                    >
                      Отложить на 30 дней
                    </button>
                    {selectedNodeSnoozeLabel ? (
                      <button
                        type="button"
                        onClick={() => setNodeSnoozeOption(selectedNodeContextViewModel.nodeId, "clear")}
                        className="inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition"
                        style={{
                          backgroundColor: productSemanticColors.cardSubtle,
                          borderColor: productSemanticColors.borderStrong,
                          color: productSemanticColors.textPrimary,
                        }}
                      >
                        Снять отложенное
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>

              {selectedNodeContextViewModel.maintenancePlan &&
              selectedNodeContextViewModel.maintenancePlan.hasMeaningfulData ? (
                <section
                  className="rounded-xl border px-4 py-3"
                  style={{
                    backgroundColor: productSemanticColors.cardSubtle,
                    borderColor: productSemanticColors.borderStrong,
                    color: productSemanticColors.textPrimary,
                  }}
                >
                  <h3 className="text-sm font-semibold" style={{ color: productSemanticColors.textPrimary }}>
                    План обслуживания
                  </h3>
                  {selectedNodeContextViewModel.maintenancePlan.shortText ? (
                    selectedNodeContextNode && canOpenNodeStatusExplanationModal(selectedNodeContextNode) ? (
                      <button
                        type="button"
                        className="mt-1 block text-left text-xs underline decoration-dotted underline-offset-2"
                        style={{ color: productSemanticColors.textSecondary }}
                        onClick={() => openStatusExplanationFromTreeContext(selectedNodeContextNode)}
                      >
                        {selectedNodeContextViewModel.maintenancePlan.shortText}
                      </button>
                    ) : (
                      <p className="mt-1 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                        {selectedNodeContextViewModel.maintenancePlan.shortText}
                      </p>
                    )
                  ) : null}
                  <div className="mt-2 space-y-1">
                    {selectedNodeContextViewModel.maintenancePlan.dueLines.map((line) => (
                      selectedNodeContextNode && canOpenNodeStatusExplanationModal(selectedNodeContextNode) ? (
                        <button
                          key={line}
                          type="button"
                          className="block text-left text-xs underline decoration-dotted underline-offset-2"
                          style={{ color: productSemanticColors.textPrimary }}
                          onClick={() => openStatusExplanationFromTreeContext(selectedNodeContextNode)}
                        >
                          {line}
                        </button>
                      ) : (
                        <p key={line} className="text-xs" style={{ color: productSemanticColors.textPrimary }}>
                          {line}
                        </p>
                      )
                    ))}
                    {selectedNodeContextViewModel.maintenancePlan.lastServiceLine ? (
                      selectedNodeContextNode && canOpenNodeStatusExplanationModal(selectedNodeContextNode) ? (
                        <button
                          type="button"
                          className="block text-left text-xs underline decoration-dotted underline-offset-2"
                          style={{ color: productSemanticColors.textSecondary }}
                          onClick={() => openStatusExplanationFromTreeContext(selectedNodeContextNode)}
                        >
                          {selectedNodeContextViewModel.maintenancePlan.lastServiceLine}
                        </button>
                      ) : (
                        <p className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
                          {selectedNodeContextViewModel.maintenancePlan.lastServiceLine}
                        </p>
                      )
                    ) : null}
                    {selectedNodeContextViewModel.maintenancePlan.ruleIntervalLine ? (
                      selectedNodeContextNode && canOpenNodeStatusExplanationModal(selectedNodeContextNode) ? (
                        <button
                          type="button"
                          className="block text-left text-xs underline decoration-dotted underline-offset-2"
                          style={{ color: productSemanticColors.textSecondary }}
                          onClick={() => openStatusExplanationFromTreeContext(selectedNodeContextNode)}
                        >
                          {selectedNodeContextViewModel.maintenancePlan.ruleIntervalLine}
                        </button>
                      ) : (
                        <p className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
                          {selectedNodeContextViewModel.maintenancePlan.ruleIntervalLine}
                        </p>
                      )
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section
                className="rounded-xl border px-4 py-3"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                  color: productSemanticColors.textPrimary,
                }}
              >
                <h3 className="text-sm font-semibold" style={{ color: productSemanticColors.textPrimary }}>
                  Последние сервисные события
                </h3>
                {selectedNodeContextViewModel.recentServiceEvents.length === 0 ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                    По этому узлу записей пока нет.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {selectedNodeContextViewModel.recentServiceEvents.map((event) => (
                      <li
                        key={event.id}
                        className="rounded-lg border px-3 py-2"
                        style={{
                          backgroundColor: productSemanticColors.cardMuted,
                          borderColor: productSemanticColors.borderSubtle,
                        }}
                      >
                        <p className="text-xs font-medium" style={{ color: productSemanticColors.textPrimary }}>
                          {formatIsoCalendarDateRu(event.eventDate)} · {event.serviceType}
                        </p>
                        <p className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
                          Пробег: {event.odometer} км
                        </p>
                        {event.costLabelRu ? (
                          <p className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
                            Стоимость: {event.costLabelRu}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                className="rounded-xl border px-4 py-3"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                  color: productSemanticColors.textPrimary,
                }}
              >
                <h3 className="text-sm font-semibold" style={{ color: productSemanticColors.textPrimary }}>
                  Рекомендации SKU
                </h3>
                {nodeContextRecommendationsError ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.error }}>
                    {nodeContextRecommendationsError}
                  </p>
                ) : null}
                {nodeContextRecommendationsLoading ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                    Загрузка рекомендаций...
                  </p>
                ) : null}
                {!nodeContextRecommendationsLoading && nodeContextRecommendations.length === 0 ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                    Для этого узла пока нет рекомендаций из каталога.
                  </p>
                ) : null}
                <div className="mt-2 space-y-2">
                  {nodeContextRecommendations.slice(0, 5).map((rec) => (
                    <div
                      key={rec.skuId}
                      className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2"
                      style={{
                        backgroundColor: productSemanticColors.cardMuted,
                        borderColor: productSemanticColors.borderSubtle,
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium" style={{ color: productSemanticColors.textPrimary }}>
                          {rec.brandName} · {rec.canonicalName}
                        </p>
                        <p className="truncate text-[11px]" style={{ color: productSemanticColors.textSecondary }}>
                          {rec.recommendationLabel}
                        </p>
                        {rec.compatibilityWarning ? (
                          <p className="truncate text-[11px] text-amber-700">{rec.compatibilityWarning}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => void addRecommendedSkuToWishlistFromNodeContext(rec)}
                        disabled={nodeContextAddingRecommendedSkuId === rec.skuId}
                        className="inline-flex h-7 shrink-0 items-center rounded-md border px-2.5 text-[11px] font-medium transition disabled:opacity-60"
                        style={{
                          backgroundColor: productSemanticColors.card,
                          borderColor: productSemanticColors.borderStrong,
                          color: productSemanticColors.textPrimary,
                        }}
                      >
                        {nodeContextAddingRecommendedSkuId === rec.skuId ? "Добавление..." : "В список"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section
                className="rounded-xl border px-4 py-3"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                  color: productSemanticColors.textPrimary,
                }}
              >
                <h3 className="text-sm font-semibold" style={{ color: productSemanticColors.textPrimary }}>
                  Комплекты обслуживания
                </h3>
                {nodeContextServiceKitsError ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.error }}>
                    {nodeContextServiceKitsError}
                  </p>
                ) : null}
                {nodeContextServiceKitsLoading ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                    Загрузка комплектов...
                  </p>
                ) : null}
                {!nodeContextServiceKitsLoading && nodeContextServiceKits.length === 0 ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                    Для этого узла комплекты не найдены.
                  </p>
                ) : null}
                <div className="mt-2 space-y-2">
                  {nodeContextServiceKits.slice(0, 3).map((kit) => (
                    <div
                      key={kit.code}
                      className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2"
                      style={{
                        backgroundColor: productSemanticColors.cardMuted,
                        borderColor: productSemanticColors.borderSubtle,
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium" style={{ color: productSemanticColors.textPrimary }}>
                          {kit.title}
                        </p>
                        <p className="truncate text-[11px]" style={{ color: productSemanticColors.textSecondary }}>
                          {kit.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void addServiceKitToWishlistFromNodeContext(kit)}
                        disabled={nodeContextAddingKitCode === kit.code}
                        className="inline-flex h-7 shrink-0 items-center rounded-md border px-2.5 text-[11px] font-medium transition disabled:opacity-60"
                        style={{
                          backgroundColor: productSemanticColors.card,
                          borderColor: productSemanticColors.borderStrong,
                          color: productSemanticColors.textPrimary,
                        }}
                      >
                        {nodeContextAddingKitCode === kit.code ? "Добавление..." : "Добавить"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {selectedStatusExplanationNode && selectedStatusExplanation ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center px-4 py-6 sm:items-center"
          style={{ backgroundColor: productSemanticColors.overlayModal }}
        >
          <div
            className="garage-dark-surface-text w-full max-w-3xl rounded-3xl border shadow-xl"
            style={{
              backgroundColor: productSemanticColors.card,
              borderColor: productSemanticColors.borderStrong,
              color: productSemanticColors.textPrimary,
            }}
          >
            <div
              className="flex items-center justify-between border-b px-6 py-4"
              style={{
                backgroundColor: productSemanticColors.card,
                borderBottomColor: productSemanticColors.borderStrong,
                color: productSemanticColors.textPrimary,
              }}
            >
              <h2
                className="text-xl font-semibold tracking-tight"
                style={{ color: productSemanticColors.textPrimary }}
              >
                Пояснение расчета: {selectedStatusExplanationNode.name}
              </h2>
              <button
                type="button"
                onClick={() => closeStatusExplanationModal()}
                className="inline-flex h-9 items-center justify-center rounded-lg border px-3.5 text-sm font-medium transition"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                  color: productSemanticColors.textPrimary,
                }}
              >
                Закрыть
              </button>
            </div>

            <div
              className="max-h-[72vh] space-y-6 overflow-y-auto px-6 py-6 text-sm"
              style={{
                backgroundColor: productSemanticColors.card,
                color: productSemanticColors.textSecondary,
              }}
            >
              {selectedStatusExplanation.reasonShort ? (
                <div
                  className="rounded-xl border px-4 py-3"
                  style={{
                    backgroundColor: productSemanticColors.cardMuted,
                    borderColor: productSemanticColors.borderStrong,
                    color: productSemanticColors.textPrimary,
                  }}
                >
                  <div
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: productSemanticColors.textMuted }}
                  >
                    Кратко
                  </div>
                  <div
                    className="mt-1 font-medium"
                    style={{ color: productSemanticColors.textPrimary }}
                  >
                    {selectedStatusExplanation.reasonShort}
                  </div>
                </div>
              ) : null}

              {selectedStatusExplanation.reasonDetailed ? (
                <div>
                  <div
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: productSemanticColors.textMuted }}
                  >
                    Подробно
                  </div>
                  <p className="mt-1" style={{ color: productSemanticColors.textSecondary }}>
                    {selectedStatusExplanation.reasonDetailed}
                  </p>
                </div>
              ) : null}

              {selectedStatusExplanation.triggeredBy ? (
                <div>
                  <div
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: productSemanticColors.textMuted }}
                  >
                    Сработавшее измерение
                  </div>
                  <p className="mt-1" style={{ color: productSemanticColors.textSecondary }}>
                    {getStatusExplanationTriggeredByLabel(
                      selectedStatusExplanation.triggeredBy
                    )}
                  </p>
                </div>
              ) : null}

              <div>
                <div
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: productSemanticColors.textMuted }}
                >
                  Детали расчета
                </div>
                <div
                  className="mt-2 overflow-x-auto rounded-xl border"
                  style={{
                    backgroundColor: productSemanticColors.cardMuted,
                    borderColor: productSemanticColors.borderStrong,
                    color: productSemanticColors.textSecondary,
                  }}
                >
                  <table
                    className="min-w-full text-left text-xs"
                    style={{ color: productSemanticColors.textSecondary }}
                  >
                    <thead
                      style={{
                        backgroundColor: productSemanticColors.cardSubtle,
                        color: productSemanticColors.textMuted,
                      }}
                    >
                      <tr>
                        <th className="px-3 py-2 font-medium">Параметр</th>
                        <th className="px-3 py-2 font-medium">Текущее</th>
                        <th className="px-3 py-2 font-medium">Последний сервис</th>
                        <th className="px-3 py-2 font-medium">Интервал</th>
                        <th className="px-3 py-2 font-medium">Warning</th>
                        <th className="px-3 py-2 font-medium">Использовано</th>
                        <th className="px-3 py-2 font-medium">Осталось</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasStatusKmDetails ? (
                        <tr className="border-t border-slate-700">
                          <td className="px-3 py-2 font-medium text-slate-100">Пробег</td>
                          <td className="px-3 py-2">
                            {selectedStatusCurrent?.odometer != null
                              ? `${selectedStatusCurrent.odometer} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusLastService?.odometer != null
                              ? `${selectedStatusLastService.odometer} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusRule?.intervalKm != null
                              ? `${selectedStatusRule.intervalKm} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusRule?.warningKm != null
                              ? `${selectedStatusRule.warningKm} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusUsage?.elapsedKm != null
                              ? `${selectedStatusUsage.elapsedKm} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusUsage?.remainingKm != null
                              ? `${selectedStatusUsage.remainingKm} км`
                              : "—"}
                          </td>
                        </tr>
                      ) : null}

                      {hasStatusHoursDetails ? (
                        <tr className="border-t border-slate-700">
                          <td className="px-3 py-2 font-medium text-slate-100">Моточасы</td>
                          <td className="px-3 py-2">
                            {selectedStatusCurrent?.engineHours != null
                              ? `${selectedStatusCurrent.engineHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusLastService?.engineHours != null
                              ? `${selectedStatusLastService.engineHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusRule?.intervalHours != null
                              ? `${selectedStatusRule.intervalHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusRule?.warningHours != null
                              ? `${selectedStatusRule.warningHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusUsage?.elapsedHours != null
                              ? `${selectedStatusUsage.elapsedHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusUsage?.remainingHours != null
                              ? `${selectedStatusUsage.remainingHours} ч`
                              : "—"}
                          </td>
                        </tr>
                      ) : null}

                      {hasStatusDaysDetails ? (
                        <tr className="border-t border-slate-700">
                          <td className="px-3 py-2 font-medium text-slate-100">Время</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">
                            {selectedStatusRule?.intervalDays != null
                              ? `${selectedStatusRule.intervalDays} дн`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusRule?.warningDays != null
                              ? `${selectedStatusRule.warningDays} дн`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusUsage?.elapsedDays != null
                              ? `${selectedStatusUsage.elapsedDays} дн`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusUsage?.remainingDays != null
                              ? `${selectedStatusUsage.remainingDays} дн`
                              : "—"}
                          </td>
                        </tr>
                      ) : null}

                      <tr className="border-t border-slate-700">
                        <td className="px-3 py-2 font-medium text-slate-100">Дата расчета</td>
                        <td className="px-3 py-2">
                          {selectedStatusCurrent?.date
                            ? formatIsoCalendarDateRu(selectedStatusCurrent.date)
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {selectedStatusLastService?.eventDate
                            ? formatIsoCalendarDateRu(selectedStatusLastService.eventDate)
                            : "—"}
                        </td>
                        <td className="px-3 py-2" colSpan={4}>
                          Trigger mode:{" "}
                          {selectedStatusExplanation.triggerMode || "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isEditProfileModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 px-4 py-6 sm:items-center">
          <div className="garage-dark-surface-text w-full max-w-3xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                Редактировать мотоцикл
              </h2>
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                disabled={isSavingProfile}
              >
                Закрыть
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
              <p className="mb-3 text-sm text-gray-500">
                Пробег и моточасы обновляются через действие «Обновить состояние».
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="Название в гараже">
                  <input
                    value={profileForm.nickname}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, nickname: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    placeholder="Например: Мой GS"
                    disabled={isSavingProfile}
                  />
                </InputField>

                <InputField label="VIN">
                  <input
                    value={profileForm.vin}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, vin: event.target.value.toUpperCase() }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    placeholder="Опционально"
                    disabled={isSavingProfile}
                  />
                </InputField>

                <InputField label="Сценарий эксплуатации">
                  <select
                    value={profileForm.usageType}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        usageType: event.target.value as EditVehicleProfileFormValues["usageType"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    disabled={isSavingProfile}
                  >
                    {RIDE_USAGE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </InputField>

                <InputField label="Стиль езды">
                  <select
                    value={profileForm.ridingStyle}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        ridingStyle: event.target.value as EditVehicleProfileFormValues["ridingStyle"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    disabled={isSavingProfile}
                  >
                    {RIDE_RIDING_STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </InputField>

                <InputField label="Нагрузка">
                  <select
                    value={profileForm.loadType}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        loadType: event.target.value as EditVehicleProfileFormValues["loadType"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    disabled={isSavingProfile}
                  >
                    {RIDE_LOAD_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </InputField>

                <InputField label="Интенсивность">
                  <select
                    value={profileForm.usageIntensity}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        usageIntensity: event.target
                          .value as EditVehicleProfileFormValues["usageIntensity"],
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                    disabled={isSavingProfile}
                  >
                    {RIDE_USAGE_INTENSITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </InputField>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={saveVehicleProfile}
                  disabled={isSavingProfile}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-gray-950 px-6 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingProfile ? "Сохраняем..." : "Сохранить профиль"}
                </button>

                {profileFormError ? (
                  <p className="mt-3 text-sm" style={{ color: productSemanticColors.error }}>
                    {profileFormError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {serviceLogActionNotice ? (
        <div
          className="fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow"
          style={{
            backgroundColor:
              serviceLogActionNotice.tone === "success"
                ? productSemanticColors.successSurface
                : productSemanticColors.errorSurface,
            borderColor:
              serviceLogActionNotice.tone === "success"
                ? productSemanticColors.successBorder
                : productSemanticColors.errorBorder,
            color:
              serviceLogActionNotice.tone === "success"
                ? productSemanticColors.success
                : productSemanticColors.error,
          }}
          role="status"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{serviceLogActionNotice.title}</p>
            {serviceLogActionNotice.details ? (
              <p className="mt-0.5 text-xs opacity-85">{serviceLogActionNotice.details}</p>
            ) : null}
          </div>
          {serviceLogActionNotice.tone === "success" ? (
            <button
              type="button"
              onClick={() => {
                setServiceLogActionNotice(null);
                openServiceLogModalFull();
              }}
              className="shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition hover:opacity-85"
              style={{
                borderColor: productSemanticColors.borderStrong,
                color: productSemanticColors.textPrimary,
              }}
            >
              В журнал
            </button>
          ) : null}
        </div>
      ) : null}
      {profileFormSuccess ? (
        <div className="fixed bottom-5 right-5 z-[70] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 shadow">
          {profileFormSuccess}
        </div>
      ) : null}
    </>
  );
}

function InputField({
  label,
  children,
  labelStyle,
}: {
  label: string;
  children: ReactNode;
  labelStyle?: CSSProperties;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-900" style={labelStyle}>
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-gray-950">{value}</div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <title>Редактировать</title>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <title>Удалить</title>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function ActionIcon({
  iconKey,
  className = "h-4 w-4",
}: {
  iconKey: ActionIconKey;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: ACTION_SVG_BODIES[iconKey] }}
    />
  );
}

function OpenContextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <path d="M21 14v7h-7" />
      <path d="M3 10V3h7" />
      <path d="M3 21l8-8" />
    </svg>
  );
}

function KitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7 12 3l9 4-9 4-9-4Z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TopNodeOverviewIcon({
  nodeKey,
  status,
}: {
  nodeKey: TopNodeOverviewCard["key"];
  status: NodeStatus | null;
}) {
  const tokens = status ? statusSemanticTokens[status] : statusSemanticTokens.UNKNOWN;
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center"
      style={{
        color: tokens.foreground,
      }}
    >
      <TopNodeIcon iconKey={nodeKey} size={22} />
    </span>
  );
}


function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-gray-950">{value}</div>
    </div>
  );
}


function getStatusBadgeStyle(status: NodeStatus | null) {
  const tokens = status ? statusSemanticTokens[status] : statusSemanticTokens.UNKNOWN;
  return {
    borderColor: tokens.border,
    backgroundColor: tokens.background,
    color: tokens.foreground,
  };
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
