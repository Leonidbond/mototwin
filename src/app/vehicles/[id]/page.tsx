"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
import { productSemanticColors, statusSemanticTokens } from "@mototwin/design-tokens";
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
  PartWishlistFormValues,
  PartWishlistItem,
  PartSkuViewModel,
  TopNodeOverviewCard,
  TopServiceNodeItem,
} from "@mototwin/types";

const vehicleDetailApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

type VehiclePageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ServiceLogActionNotice = {
  tone: "success" | "error";
  title: string;
  details?: string;
};

function buildNodeSnoozeStorageKey(vehicleId: string, nodeId: string): string {
  return `mototwin.nodeSnooze.${vehicleId}.${nodeId}`;
}

export default function VehiclePage({ params }: VehiclePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [selectedStatusExplanationNode, setSelectedStatusExplanationNode] =
    useState<NodeTreeItemViewModel | null>(null);
  const [isUsageProfileSectionExpanded, setIsUsageProfileSectionExpanded] = useState(true);
  const [isTechnicalSummarySectionExpanded, setIsTechnicalSummarySectionExpanded] = useState(true);
  const [isNodeMaintenanceModeEnabled, setIsNodeMaintenanceModeEnabled] = useState(false);
  const [selectedTopLevelNodeId, setSelectedTopLevelNodeId] = useState<string | null>(null);
  const [nodeSearchQuery, setNodeSearchQuery] = useState("");
  const [debouncedNodeSearchQuery, setDebouncedNodeSearchQuery] = useState("");
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [selectedNodeContextId, setSelectedNodeContextId] = useState<string | null>(null);
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
  const [eventDate, setEventDate] = useState("");
  const [odometer, setOdometer] = useState("");
  const [engineHours, setEngineHours] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [currency, setCurrency] = useState(
    () => createInitialAddServiceEventFormValues().currency
  );
  const [comment, setComment] = useState("");
  const [installedPartsJson, setInstalledPartsJson] = useState("");
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
      openEditServiceEventFromLog(editServiceEventId);
      return;
    }
    openCreateServiceEventModal();
  }, [searchParams, serviceEvents]);

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
    applyAddServiceEventFormValues(values);
    setSelectedNodePath(nodePath);
    setIsAddServiceEventModalOpen(true);
  };

  const openAddServiceEventPrefilledFromWishlist = (item: PartWishlistItem) => {
    if (!vehicle) {
      setServiceEventFormError("Не удалось загрузить данные мотоцикла.");
      return;
    }
    if (!item.nodeId) {
      return;
    }
    const nodePath = findNodePathById(nodeTree, item.nodeId);
    if (!nodePath) {
      setServiceEventFormError("Не удалось определить путь узла для позиции списка.");
      return;
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
    setIsAddServiceEventModalOpen(true);
  };

  const openEditServiceEventFromLog = (eventId: string) => {
    const serviceEvent = serviceEvents.find((candidate) => candidate.id === eventId);
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
    applyAddServiceEventFormValues(createInitialEditServiceEventValues(serviceEvent));
    setSelectedNodePath(nodePath);
    setIsAddServiceEventModalOpen(true);
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
    setIsAttentionModalOpen(false);
    setSelectedStatusExplanationNode(vm);
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

  const closeWishlistModal = () => {
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
      closeWishlistModal();

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
      closeWishlistModal();
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
      closeWishlistModal();
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
      await vehicleDetailApi.deleteWishlistItem(vehicleId, itemId);
      await loadWishlist();
    } catch (e) {
      console.error(e);
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
    try {
      setWishlistNotice("");
      const sourceItem = wishlistItems.find((w) => w.id === itemId);
      const sourceNodeId = sourceItem?.nodeId?.trim() ?? "";
      if (!sourceNodeId) {
        setWishlistNotice("Ошибка: Выберите узел мотоцикла");
        return;
      }
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
    }
  };

  const openWishlistFromAttentionItem = (item: AttentionItemViewModel) => {
    setIsAttentionModalOpen(false);
    openWishlistModalForCreate(item.nodeId);
  };
  const openNodeContextFromAttentionItem = (item: AttentionItemViewModel) => {
    setIsAttentionModalOpen(false);
    openNodeContextModal(item.nodeId);
  };
  const closeTopLevelNodeSubtreeModal = () => {
    setSelectedTopLevelNodeId(null);
    setHighlightedNodeId(null);
  };
  const closeNodeContextModal = () => {
    setSelectedNodeContextId(null);
    setNodeContextAddingRecommendedSkuId("");
    setNodeContextAddingKitCode("");
  };
  const openNodeContextModal = (nodeId: string) => {
    setIsAttentionModalOpen(false);
    closeTopLevelNodeSubtreeModal();
    setSelectedNodeContextId(nodeId);
  };
  const openTopLevelNodeSubtreeModal = (nodeId: string) => {
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
      closeNodeContextModal();
      openServiceLogFilteredByNode(selectedNodeContextNode);
      return;
    }
    if (actionKey === "add_service_event" && selectedNodeContextNode.canAddServiceEvent) {
      closeNodeContextModal();
      openAddServiceEventFromLeafNode(selectedNodeContextNode.id);
      return;
    }
    if (actionKey === "add_wishlist" && !selectedNodeContextNode.hasChildren) {
      closeNodeContextModal();
      openWishlistModalForCreate(selectedNodeContextNode.id);
      return;
    }
    if (actionKey === "add_kit" && nodeContextServiceKits[0]) {
      void addServiceKitToWishlistFromNodeContext(nodeContextServiceKits[0]);
      return;
    }
    if (actionKey === "open_status_explanation" && selectedNodeContextNode.statusExplanation) {
      closeNodeContextModal();
      setSelectedStatusExplanationNode(selectedNodeContextNode);
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
    closeTopLevelNodeSubtreeModal();
    openAddServiceEventFromLeafNode(leafNodeId);
  };
  const openWishlistFromTreeContext = (nodeId: string) => {
    closeTopLevelNodeSubtreeModal();
    openWishlistModalForCreate(nodeId);
  };
  const openStatusExplanationFromTreeContext = (node: NodeTreeItemViewModel) => {
    closeTopLevelNodeSubtreeModal();
    setSelectedStatusExplanationNode(node);
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

    return (
      <div key={node.id} className="space-y-2.5">
        <div
          className={`rounded-xl border bg-white px-4 py-3.5 ${
            highlightedNodeId === node.id
              ? "border-amber-300 ring-2 ring-amber-200"
              : "border-gray-200"
          }`}
          style={{ marginLeft: `${depth * 16}px` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleNodeExpansion(node.id)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:bg-gray-50"
                    title={isExpanded ? "Свернуть ветку" : "Развернуть ветку"}
                    aria-label={isExpanded ? "Свернуть ветку" : "Развернуть ветку"}
                  >
                    {isExpanded ? "−" : "+"}
                  </button>
                ) : (
                  <span className="inline-flex h-6 w-6 items-center justify-center text-gray-400">
                    •
                  </span>
                )}
                <span className="truncate text-sm font-medium text-gray-950">
                  {node.name}
                </span>
              </div>
              {node.shortExplanationLabel &&
              canOpenNodeStatusExplanationModal(node) ? (
                <button
                  type="button"
                  onClick={() => openStatusExplanationFromTreeContext(node)}
                  className="mt-1.5 pl-8 text-left text-xs text-gray-500 underline decoration-dotted underline-offset-2 transition hover:text-gray-700"
                >
                  {node.shortExplanationLabel}
                </button>
              ) : null}
              {isNodeMaintenanceModeEnabled &&
              maintenancePlan &&
              !node.shortExplanationLabel &&
              maintenancePlan.shortText ? (
                <p className="mt-1.5 pl-8 text-xs text-gray-500">{maintenancePlan.shortText}</p>
              ) : null}
              {isNodeMaintenanceModeEnabled && parentMaintenanceSummary ? (
                <p className="mt-1.5 pl-8 text-xs font-medium text-gray-700">{parentMaintenanceSummary}</p>
              ) : null}
              {isNodeMaintenanceModeEnabled &&
              maintenancePlan &&
              !hasChildren &&
              maintenancePlan.hasMeaningfulData ? (
                <div className="mt-1.5 space-y-1 pl-8">
                  {maintenancePlan.dueLines.map((line) => (
                    <p key={line} className="text-xs text-gray-600">
                      {line}
                    </p>
                  ))}
                  {maintenancePlan.lastServiceLine ? (
                    <p className="text-xs text-gray-500">{maintenancePlan.lastServiceLine}</p>
                  ) : null}
                  {maintenancePlan.ruleIntervalLine ? (
                    <p className="text-xs text-gray-500">{maintenancePlan.ruleIntervalLine}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {node.effectiveStatus ? (
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => openServiceLogFromTreeContext(node)}
                    className="inline-flex h-7 cursor-pointer items-center rounded-full border px-2.5 text-xs font-medium transition hover:ring-2 hover:ring-gray-300 focus-visible:outline focus-visible:ring-2 focus-visible:ring-gray-400"
                    style={getStatusBadgeStyle(node.effectiveStatus)}
                    title="Журнал"
                    aria-label={`Открыть журнал обслуживания по узлу «${node.name}»`}
                  >
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
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50"
                  title="Добавить в список покупок"
                  aria-label="Добавить в список покупок"
                >
                  <WishlistIcon />
                </button>
                <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  Добавить в список покупок
                </span>
              </div>
              <div className="group relative">
                <button
                  type="button"
                  onClick={() => openNodeContextModal(node.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50"
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
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:bg-gray-50"
                    aria-label="Добавить сервисное событие"
                    title="Добавить сервисное событие"
                  >
                    <ServiceEventIcon />
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
    setSelectedNodePath([]);
    const empty = createInitialAddServiceEventFormValues();
    empty.currency = readDefaultCurrencySetting();
    applyAddServiceEventFormValues(empty);
  };

  const openCreateServiceEventModal = () => {
    resetServiceEventForm();
    setServiceEventFormError("");
    setIsAddServiceEventModalOpen(true);
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

      setServiceLogActionNotice({
        tone: "success",
        title: editingServiceEventId
          ? "Сервисное событие обновлено"
          : "Сервисное событие добавлено",
        details: "Статусы и расходы обновлены",
      });
      resetServiceEventForm();
      await Promise.all([loadServiceEvents(), loadNodeTree(), loadWishlist(), loadTopServiceNodes()]);
      setIsAddServiceEventModalOpen(false);
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

  return (
    <main
      className="min-h-screen px-6 py-14 text-gray-950 lg:py-16"
      style={{ backgroundColor: productSemanticColors.canvas }}
    >
      <div className="mx-auto max-w-6xl">
        <nav className="mb-3 text-sm text-gray-600">
          <Link href="/garage" className="transition hover:text-gray-950">
            Гараж
          </Link>{" "}
          <span className="text-gray-400">/</span>{" "}
          <span className="text-gray-900">Мотоцикл</span>
        </nav>

        <div className="mb-7">
          <Link
            href="/garage"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
          >
            Назад в гараж
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
            <p className="text-sm text-gray-600">Загрузка мотоцикла...</p>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div
            className="rounded-3xl border p-7"
            style={{
              borderColor: productSemanticColors.errorBorder,
              backgroundColor: productSemanticColors.errorSurface,
            }}
          >
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
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

        {!isLoading && !error && vehicle ? (
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
                                <select
                                  value={it.status}
                                  onChange={(e) =>
                                    patchWishlistItemStatus(
                                      it.id,
                                      e.target.value as PartWishlistItem["status"],
                                      it.status
                                    )
                                  }
                                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs"
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
                                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-800 transition hover:bg-white"
                                >
                                  Изменить
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteWishlistItemById(it.id)}
                                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-white"
                                >
                                  Удалить
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                  Состояние основных узлов
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFullNodeTreeOpen((prev) => !prev)}
                    className={`inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition ${
                      isFullNodeTreeOpen
                        ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
                        : "border-gray-300 text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {isFullNodeTreeOpen ? "Скрыть полное дерево" : "Все узлы →"}
                  </button>
                  <button
                    type="button"
                    onClick={openServiceLogModalFull}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                  >
                    Открыть журнал обслуживания
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Краткая сводка по основным узлам. Детальная структура доступна в полном дереве.
              </p>

              {isTopServiceNodesLoading ? (
                <p className="mt-4 text-sm text-gray-600">Загрузка основных узлов...</p>
              ) : null}
              {!isTopServiceNodesLoading && topServiceNodesError ? (
                <p className="mt-4 text-sm" style={{ color: productSemanticColors.error }}>
                  {topServiceNodesError}
                </p>
              ) : null}
              {!isTopServiceNodesLoading && !topServiceNodesError && topNodeOverviewCards.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {topNodeOverviewCards.map((card) => (
                    <article
                      key={card.key}
                      className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <TopNodeOverviewIcon nodeKey={card.key} />
                        <h3 className="text-sm font-semibold text-gray-900">{card.title}</h3>
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium ${
                            card.status ? "" : "border-gray-300 bg-white text-gray-600"
                          }`}
                          style={card.status ? getStatusBadgeStyle(card.status) : undefined}
                        >
                          {card.statusLabel}
                        </span>
                        <p className="mt-2 text-xs text-gray-600">{card.details}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {isFullNodeTreeOpen && isNodeTreeLoading ? (
                <p className="mt-4 text-sm text-gray-600">Загрузка дерева узлов...</p>
              ) : null}

              {isFullNodeTreeOpen && !isNodeTreeLoading && nodeTreeError ? (
                <p className="mt-4 text-sm" style={{ color: productSemanticColors.error }}>
                  {nodeTreeError}
                </p>
              ) : null}

              {isFullNodeTreeOpen && !isNodeTreeLoading && !nodeTreeError && nodeTree.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">
                  Дерево узлов пока не найдено.
                </p>
              ) : null}

              {isFullNodeTreeOpen && !isNodeTreeLoading && !nodeTreeError && nodeTree.length > 0 ? (
                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="node-tree-search"
                      className="block text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      Поиск по узлам
                    </label>
                    <input
                      id="node-tree-search"
                      type="search"
                      value={nodeSearchQuery}
                      onChange={(event) => setNodeSearchQuery(event.target.value)}
                      placeholder="Поиск по узлам"
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                    />
                    {nodeSearchQuery.trim().length > 0 && nodeSearchQuery.trim().length < 2 ? (
                      <p className="text-xs text-gray-500">Введите минимум 2 символа.</p>
                    ) : null}
                  </div>
                  {nodeSearchQuery.trim().length >= 2 ? (
                    nodeSearchResults.length > 0 ? (
                      <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50/70 p-2.5">
                        {nodeSearchResults.map((result) => (
                          <div
                            key={result.nodeId}
                            className="rounded-xl border border-transparent bg-white px-3 py-2.5 transition hover:border-gray-300"
                          >
                            <button
                              type="button"
                              onClick={() => openSearchResultInSubtreeModal(result)}
                              className="w-full text-left"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-gray-950">{result.nodeName}</p>
                                  <p className="truncate text-xs text-gray-500">{result.pathLabel}</p>
                                  <p className="truncate text-[11px] text-gray-400">{result.nodeCode}</p>
                                  {result.shortExplanationLabel ? (
                                    <p className="truncate pt-1 text-xs text-gray-500">
                                      {result.shortExplanationLabel}
                                    </p>
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
                            </button>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {buildNodeSearchResultActions(result).map((action) => (
                                <div key={`${result.nodeId}.${action.key}`} className="group relative">
                                  <button
                                    type="button"
                                    onClick={() => handleSearchResultAction(action.key, result)}
                                    aria-label={`${action.label}: ${result.nodeName}`}
                                    title={action.label}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:bg-gray-50"
                                  >
                                    {action.key === "open" ? (
                                      <OpenContextIcon />
                                    ) : action.key === "service_log" ? (
                                      <HistoryIcon />
                                    ) : (
                                      <WishlistIcon />
                                    )}
                                  </button>
                                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                                    {action.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600">
                        Узлы не найдены
                      </p>
                    )
                  ) : null}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {topLevelNodeViewModels.map((rootNode) => {
                      const summary = buildTopLevelNodeSummaryViewModel(rootNode, {
                        maintenanceModeEnabled: isNodeMaintenanceModeEnabled,
                      });
                      return (
                        <button
                          key={rootNode.id}
                          type="button"
                          onClick={() => openTopLevelNodeSubtreeModal(rootNode.id)}
                          className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5 text-left transition hover:border-gray-300 hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-[15px] font-semibold text-gray-950">
                                {summary.nodeName}
                              </h3>
                              {summary.shortExplanationLabel ? (
                                <p className="mt-1.5 text-xs text-gray-500">
                                  {summary.shortExplanationLabel}
                                </p>
                              ) : null}
                              {summary.maintenanceSummaryLine ? (
                                <p className="mt-1.5 text-xs font-medium text-gray-700">
                                  {summary.maintenanceSummaryLine}
                                </p>
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
                              <span className="text-sm text-gray-400">›</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>

          </div>
        ) : null}
      </div>

      {selectedNodeSubtreeModalViewModel ? (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center px-4 py-6 sm:items-center"
          style={{ backgroundColor: productSemanticColors.overlayModal }}
        >
          <div className="w-full max-w-5xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
              <div
                className={
                  highlightedNodeId === selectedNodeSubtreeModalViewModel.rootNodeId
                    ? "rounded-lg border border-amber-300 bg-amber-50/40 px-2 py-1"
                    : undefined
                }
              >
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                  {selectedNodeSubtreeModalViewModel.rootNodeName}
                </h2>
                {selectedNodeSubtreeModalViewModel.shortExplanationLabel ? (
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedNodeSubtreeModalViewModel.shortExplanationLabel}
                  </p>
                ) : null}
                {selectedNodeSubtreeModalViewModel.maintenanceSummaryLine ? (
                  <p className="mt-1 text-xs font-medium text-gray-700">
                    {selectedNodeSubtreeModalViewModel.maintenanceSummaryLine}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNodeMaintenanceModeEnabled((prev) => !prev)}
                  className={`inline-flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-medium transition ${
                    isNodeMaintenanceModeEnabled
                      ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
                      : "border-gray-300 text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {getNodeModeToggleLabel()}
                </button>
                <button
                  type="button"
                  onClick={closeTopLevelNodeSubtreeModal}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                >
                  Закрыть
                </button>
              </div>
            </div>
            <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
              {selectedNodeSubtreeModalViewModel.isLeafRoot ? (
                <div className="space-y-2.5">
                  {selectedTopLevelNode ? renderChildTreeNode(selectedTopLevelNode, 0) : null}
                </div>
              ) : selectedNodeSubtreeModalViewModel.childNodes.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedNodeSubtreeModalViewModel.childNodes.map((child) =>
                    renderChildTreeNode(child, 0)
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Для этого узла нет дочерних элементов.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isExpenseDetailsModalOpen ? (
        <div className="fixed inset-0 z-[55] flex items-start justify-center bg-black/45 px-4 py-6 sm:items-center">
          <div className="w-full max-w-3xl rounded-3xl border border-gray-200 bg-white shadow-xl">
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
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 py-6 sm:items-center">
          <div className="w-full max-w-4xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                {editingServiceEventId
                  ? "Редактировать сервисное событие"
                  : "Добавить сервисное событие"}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddServiceEventModalOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                  <h3 className="text-sm font-semibold text-gray-950">Выбор узла</h3>
                  <div className="mt-3 grid gap-4">
                    {nodeSelectLevels.map((nodesAtLevel, levelIndex) => (
                      <InputField
                        key={`level-${levelIndex}`}
                        label={`Уровень ${levelIndex + 1}`}
                      >
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
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                        >
                          <option value="">{`Выберите узел уровня ${levelIndex + 1}`}</option>
                          {nodesAtLevel.map((nodeAtLevel) => (
                            <option key={nodeAtLevel.id} value={nodeAtLevel.id}>
                              {nodeAtLevel.name}
                            </option>
                          ))}
                        </select>
                      </InputField>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-950">Данные события</h3>
                  <div className="mt-3 grid gap-4.5 sm:grid-cols-2">
                    <InputField label="Тип сервиса">
                      <input
                        value={serviceType}
                        onChange={(event) => setServiceType(event.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                        placeholder="Например: Oil change"
                      />
                    </InputField>

                    <InputField label="Дата события">
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(event) => setEventDate(event.target.value)}
                        max={todayDate}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                      />
                    </InputField>

                    <InputField label="Пробег, км">
                      <input
                        value={odometer}
                        onChange={(event) => setOdometer(event.target.value)}
                        inputMode="numeric"
                        max={vehicle?.odometer ?? undefined}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                        placeholder="Например: 15000"
                      />
                    </InputField>

                    <InputField label="Моточасы">
                      <input
                        value={engineHours}
                        onChange={(event) => setEngineHours(event.target.value)}
                        inputMode="numeric"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                        placeholder="Если применимо"
                      />
                    </InputField>

                    <InputField label="Стоимость">
                      <input
                        value={costAmount}
                        onChange={(event) => setCostAmount(event.target.value)}
                        inputMode="decimal"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                        placeholder="Например: 120.5"
                      />
                    </InputField>

                    <InputField label="Валюта">
                      <select
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                      >
                        <option value="">Не выбрана</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="RUB">RUB</option>
                      </select>
                    </InputField>
                  </div>

                  <div className="mt-4">
                    <InputField label="Комментарий">
                      <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        className="min-h-28 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-950"
                        placeholder="Опционально"
                      />
                    </InputField>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={handleSubmitServiceEvent}
                  disabled={
                    isCreatingServiceEvent ||
                    !isLeafNodeSelected ||
                    !eventDate
                  }
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-gray-950 px-6 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingServiceEvent
                    ? "Сохраняем..."
                    : editingServiceEventId
                      ? "Сохранить изменения"
                      : "Добавить событие"}
                </button>

                {!isLeafNodeSelected && selectedFinalNode ? (
                  <p className="mt-3 text-sm text-amber-700">
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
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-xl">
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
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-xl sm:max-w-xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                  Требует внимания
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Узлы «Просрочено» и «Скоро» по текущему дереву узлов.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAttentionModalOpen(false)}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>
            <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
              <p className="text-sm text-gray-600">
                Всего:{" "}
                <span className="font-semibold text-gray-950">
                  {attentionSummary.totalCount}
                </span>
                {attentionSummary.overdueCount > 0 ? (
                  <>
                    {" "}
                    · Просрочено:{" "}
                    <span className="font-medium text-gray-900">
                      {attentionSummary.overdueCount}
                    </span>
                  </>
                ) : null}
                {attentionSummary.soonCount > 0 ? (
                  <>
                    {" "}
                    · Скоро:{" "}
                    <span className="font-medium text-gray-900">
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
                      className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition ${
                        attentionSnoozeFilter === filter
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      {getAttentionSnoozeFilterLabel(filter)}
                    </button>
                  ))}
                </div>
              ) : null}

              {isNodeTreeLoading ? (
                <p className="mt-6 text-sm text-gray-600">Загрузка дерева узлов…</p>
              ) : nodeTreeError ? (
                <p className="mt-6 text-sm" style={{ color: productSemanticColors.error }}>
                  {nodeTreeError}
                </p>
              ) : filteredAttentionItems.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
                  {attentionEmptyStateLabel}
                </div>
              ) : (
                <div className="mt-5 space-y-6">
                  {filteredAttentionGroups.map((group) => (
                    <section key={group.status}>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                            >
                              {item.topLevelParentName ? (
                                <p className="text-xs text-gray-500">
                                  Раздел: {item.topLevelParentName}
                                </p>
                              ) : null}
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openNodeContextFromAttentionItem(item)}
                                  className="text-base font-semibold text-gray-950 transition hover:underline"
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
                                  className="mt-2 text-left text-sm text-gray-500 underline decoration-dotted underline-offset-2 transition hover:text-gray-700"
                                >
                                  {item.shortExplanation}
                                </button>
                              ) : item.shortExplanation ? (
                                <p className="mt-2 text-sm text-gray-600">{item.shortExplanation}</p>
                              ) : null}
                              {snoozeLabel ? (
                                <p className="mt-2 text-xs font-medium text-gray-600">{snoozeLabel}</p>
                              ) : null}

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => openServiceLogForAttentionItem(item)}
                                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                                >
                                  Журнал по узлу
                                </button>
                                {item.canAddServiceEvent ? (
                                  <button
                                    type="button"
                                    onClick={() => openAddServiceFromAttentionItem(item)}
                                    className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                                  >
                                    Добавить сервис
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => openWishlistFromAttentionItem(item)}
                                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
                                >
                                  В список покупок
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openNodeContextFromAttentionItem(item)}
                                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
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
        <div className="fixed inset-0 z-[65] flex items-start justify-center bg-black/45 px-4 py-6 sm:items-center">
          <div className="w-full max-w-4xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-tight text-gray-950">
                  {selectedNodeContextViewModel.nodeName}
                </h2>
                <p className="truncate text-xs text-gray-500">{selectedNodeContextViewModel.pathLabel}</p>
                <p className="truncate text-[11px] text-gray-400">{selectedNodeContextViewModel.nodeCode}</p>
                {selectedNodeContextViewModel.shortExplanationLabel ? (
                  <p className="mt-1 text-sm text-gray-600">
                    {selectedNodeContextViewModel.shortExplanationLabel}
                  </p>
                ) : null}
                {selectedNodeSnoozeLabel ? (
                  <p className="mt-1 text-xs font-medium text-gray-600">{selectedNodeSnoozeLabel}</p>
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
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
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
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-800 transition hover:bg-gray-50"
                      title={action.label}
                      aria-label={action.label}
                    >
                      {action.key === "journal" ? (
                        <HistoryIcon />
                      ) : action.key === "add_service_event" ? (
                        <ServiceEventIcon />
                      ) : action.key === "add_wishlist" ? (
                        <WishlistIcon />
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
                      className="inline-flex h-8 items-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 transition hover:bg-gray-50"
                    >
                      Отложить на 7 дней
                    </button>
                    <button
                      type="button"
                      onClick={() => setNodeSnoozeOption(selectedNodeContextViewModel.nodeId, "30d")}
                      className="inline-flex h-8 items-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 transition hover:bg-gray-50"
                    >
                      Отложить на 30 дней
                    </button>
                    {selectedNodeSnoozeLabel ? (
                      <button
                        type="button"
                        onClick={() => setNodeSnoozeOption(selectedNodeContextViewModel.nodeId, "clear")}
                        className="inline-flex h-8 items-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 transition hover:bg-gray-50"
                      >
                        Снять отложенное
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>

              {selectedNodeContextViewModel.maintenancePlan &&
              selectedNodeContextViewModel.maintenancePlan.hasMeaningfulData ? (
                <section className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900">План обслуживания</h3>
                  {selectedNodeContextViewModel.maintenancePlan.shortText ? (
                    <p className="mt-1 text-xs text-gray-600">
                      {selectedNodeContextViewModel.maintenancePlan.shortText}
                    </p>
                  ) : null}
                  <div className="mt-2 space-y-1">
                    {selectedNodeContextViewModel.maintenancePlan.dueLines.map((line) => (
                      <p key={line} className="text-xs text-gray-700">
                        {line}
                      </p>
                    ))}
                    {selectedNodeContextViewModel.maintenancePlan.lastServiceLine ? (
                      <p className="text-xs text-gray-500">
                        {selectedNodeContextViewModel.maintenancePlan.lastServiceLine}
                      </p>
                    ) : null}
                    {selectedNodeContextViewModel.maintenancePlan.ruleIntervalLine ? (
                      <p className="text-xs text-gray-500">
                        {selectedNodeContextViewModel.maintenancePlan.ruleIntervalLine}
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section className="rounded-xl border border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Последние сервисные события</h3>
                {selectedNodeContextViewModel.recentServiceEvents.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500">По этому узлу записей пока нет.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {selectedNodeContextViewModel.recentServiceEvents.map((event) => (
                      <li key={event.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="text-xs font-medium text-gray-900">
                          {formatIsoCalendarDateRu(event.eventDate)} · {event.serviceType}
                        </p>
                        <p className="text-xs text-gray-600">Пробег: {event.odometer} км</p>
                        {event.costLabelRu ? (
                          <p className="text-xs text-gray-500">Стоимость: {event.costLabelRu}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Рекомендации SKU</h3>
                {nodeContextRecommendationsError ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.error }}>
                    {nodeContextRecommendationsError}
                  </p>
                ) : null}
                {nodeContextRecommendationsLoading ? (
                  <p className="mt-2 text-xs text-gray-500">Загрузка рекомендаций...</p>
                ) : null}
                {!nodeContextRecommendationsLoading && nodeContextRecommendations.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Для этого узла пока нет рекомендаций из каталога.
                  </p>
                ) : null}
                <div className="mt-2 space-y-2">
                  {nodeContextRecommendations.slice(0, 5).map((rec) => (
                    <div
                      key={rec.skuId}
                      className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-900">
                          {rec.brandName} · {rec.canonicalName}
                        </p>
                        <p className="truncate text-[11px] text-gray-600">{rec.recommendationLabel}</p>
                        {rec.compatibilityWarning ? (
                          <p className="truncate text-[11px] text-amber-700">{rec.compatibilityWarning}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => void addRecommendedSkuToWishlistFromNodeContext(rec)}
                        disabled={nodeContextAddingRecommendedSkuId === rec.skuId}
                        className="inline-flex h-7 shrink-0 items-center rounded-md border border-gray-300 bg-white px-2.5 text-[11px] font-medium text-gray-800 transition hover:bg-gray-50 disabled:opacity-60"
                      >
                        {nodeContextAddingRecommendedSkuId === rec.skuId ? "Добавление..." : "В список"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Комплекты обслуживания</h3>
                {nodeContextServiceKitsError ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.error }}>
                    {nodeContextServiceKitsError}
                  </p>
                ) : null}
                {nodeContextServiceKitsLoading ? (
                  <p className="mt-2 text-xs text-gray-500">Загрузка комплектов...</p>
                ) : null}
                {!nodeContextServiceKitsLoading && nodeContextServiceKits.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500">Для этого узла комплекты не найдены.</p>
                ) : null}
                <div className="mt-2 space-y-2">
                  {nodeContextServiceKits.slice(0, 3).map((kit) => (
                    <div
                      key={kit.code}
                      className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-900">{kit.title}</p>
                        <p className="truncate text-[11px] text-gray-600">{kit.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void addServiceKitToWishlistFromNodeContext(kit)}
                        disabled={nodeContextAddingKitCode === kit.code}
                        className="inline-flex h-7 shrink-0 items-center rounded-md border border-gray-300 bg-white px-2.5 text-[11px] font-medium text-gray-800 transition hover:bg-gray-50 disabled:opacity-60"
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

      {selectedStatusExplanationNode?.statusExplanation ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 px-4 py-6 sm:items-center">
          <div className="w-full max-w-3xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                Пояснение расчета: {selectedStatusExplanationNode.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedStatusExplanationNode(null)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>

            <div className="max-h-[72vh] space-y-6 overflow-y-auto px-6 py-6 text-sm text-gray-700">
              {selectedStatusExplanationNode.statusExplanation.reasonShort ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Кратко
                  </div>
                  <div className="mt-1 font-medium text-gray-900">
                    {selectedStatusExplanationNode.statusExplanation.reasonShort}
                  </div>
                </div>
              ) : null}

              {selectedStatusExplanationNode.statusExplanation.reasonDetailed ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Подробно
                  </div>
                  <p className="mt-1 text-gray-800">
                    {selectedStatusExplanationNode.statusExplanation.reasonDetailed}
                  </p>
                </div>
              ) : null}

              {selectedStatusExplanationNode.statusExplanation.triggeredBy ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Сработавшее измерение
                  </div>
                  <p className="mt-1 text-gray-800">
                    {getStatusExplanationTriggeredByLabel(
                      selectedStatusExplanationNode.statusExplanation.triggeredBy
                    )}
                  </p>
                </div>
              ) : null}

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Детали расчета
                </div>
                <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50 text-gray-600">
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
                      {selectedStatusExplanationNode.statusExplanation.current.odometer !==
                        null ||
                      selectedStatusExplanationNode.statusExplanation.lastService
                        ?.odometer !== null ||
                      selectedStatusExplanationNode.statusExplanation.rule
                        ?.intervalKm !== null ||
                      selectedStatusExplanationNode.statusExplanation.rule
                        ?.warningKm !== null ||
                      selectedStatusExplanationNode.statusExplanation.usage
                        ?.elapsedKm !== null ||
                      selectedStatusExplanationNode.statusExplanation.usage
                        ?.remainingKm !== null ? (
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium text-gray-900">Пробег</td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.current.odometer !==
                            null
                              ? `${selectedStatusExplanationNode.statusExplanation.current.odometer} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.lastService
                              ?.odometer !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.lastService?.odometer ?? "—"} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.rule
                              ?.intervalKm !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.rule?.intervalKm ?? "—"} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.rule
                              ?.warningKm !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.rule?.warningKm ?? "—"} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.usage
                              ?.elapsedKm !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.usage?.elapsedKm ?? "—"} км`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.usage
                              ?.remainingKm !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.usage?.remainingKm ?? "—"} км`
                              : "—"}
                          </td>
                        </tr>
                      ) : null}

                      {selectedStatusExplanationNode.statusExplanation.current.engineHours !==
                        null ||
                      selectedStatusExplanationNode.statusExplanation.lastService
                        ?.engineHours !== null ||
                      selectedStatusExplanationNode.statusExplanation.rule
                        ?.intervalHours !== null ||
                      selectedStatusExplanationNode.statusExplanation.rule
                        ?.warningHours !== null ||
                      selectedStatusExplanationNode.statusExplanation.usage
                        ?.elapsedHours !== null ||
                      selectedStatusExplanationNode.statusExplanation.usage
                        ?.remainingHours !== null ? (
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium text-gray-900">Моточасы</td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.current
                              .engineHours !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.current.engineHours} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.lastService
                              ?.engineHours !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.lastService?.engineHours ?? "—"} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.rule
                              ?.intervalHours !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.rule?.intervalHours ?? "—"} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.rule
                              ?.warningHours !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.rule?.warningHours ?? "—"} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.usage
                              ?.elapsedHours !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.usage?.elapsedHours ?? "—"} ч`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.usage
                              ?.remainingHours !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.usage?.remainingHours ?? "—"} ч`
                              : "—"}
                          </td>
                        </tr>
                      ) : null}

                      {selectedStatusExplanationNode.statusExplanation.rule
                        ?.intervalDays !== null ||
                      selectedStatusExplanationNode.statusExplanation.rule
                        ?.warningDays !== null ||
                      selectedStatusExplanationNode.statusExplanation.usage
                        ?.elapsedDays !== null ||
                      selectedStatusExplanationNode.statusExplanation.usage
                        ?.remainingDays !== null ? (
                        <tr className="border-t border-gray-200">
                          <td className="px-3 py-2 font-medium text-gray-900">Время</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">—</td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.rule
                              ?.intervalDays !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.rule?.intervalDays ?? "—"} дн`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.rule
                              ?.warningDays !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.rule?.warningDays ?? "—"} дн`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.usage
                              ?.elapsedDays !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.usage?.elapsedDays ?? "—"} дн`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {selectedStatusExplanationNode.statusExplanation.usage
                              ?.remainingDays !== null
                              ? `${selectedStatusExplanationNode.statusExplanation.usage?.remainingDays ?? "—"} дн`
                              : "—"}
                          </td>
                        </tr>
                      ) : null}

                      <tr className="border-t border-gray-200">
                        <td className="px-3 py-2 font-medium text-gray-900">Дата расчета</td>
                        <td className="px-3 py-2">
                          {formatIsoCalendarDateRu(
                            selectedStatusExplanationNode.statusExplanation.current.date
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {selectedStatusExplanationNode.statusExplanation.lastService
                            ?.eventDate
                            ? formatIsoCalendarDateRu(
                                selectedStatusExplanationNode.statusExplanation.lastService.eventDate
                              )
                            : "—"}
                        </td>
                        <td className="px-3 py-2" colSpan={4}>
                          Trigger mode:{" "}
                          {selectedStatusExplanationNode.statusExplanation.triggerMode ||
                            "—"}
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
          <div className="w-full max-w-3xl rounded-3xl border border-gray-200 bg-white shadow-xl">
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
      {profileFormSuccess ? (
        <div className="fixed bottom-5 right-5 z-[70] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 shadow">
          {profileFormSuccess}
        </div>
      ) : null}
    </main>
  );
}

function InputField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-900">
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

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ServiceEventIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        d="M8.1 6.3a4.8 4.8 0 0 1 6 6l3.7 3.7-1.4 1.4-3.7-3.7a4.8 4.8 0 0 1-6-6l2.9 2.9h2.1l1.1-1.1V7.4L8.1 6.3Z"
        fill="#ffffff"
      />
    </svg>
  );
}

function WishlistIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
      <path d="M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7" />
    </svg>
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

function TopNodeOverviewIcon({ nodeKey }: { nodeKey: TopNodeOverviewCard["key"] }) {
  switch (nodeKey) {
    case "engine":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="8" width="9" height="8" rx="2" />
          <path d="M13 10h4l3 3-3 3h-4" />
        </svg>
      );
    case "brakes":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="12" r="6" />
          <path d="M17 8h3v8h-3" />
          <circle cx="11" cy="12" r="2" />
        </svg>
      );
    case "tires":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "chain":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 9h3a2 2 0 0 1 0 4H8" />
          <path d="M17 15h-3a2 2 0 0 1 0-4h2" />
          <path d="M10 13h4" />
        </svg>
      );
    case "electrics":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="7" width="16" height="10" rx="2" />
          <path d="M10 10l-2 3h3l-1 3 4-5h-3l1-2Z" />
        </svg>
      );
    case "suspension":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 5h10" />
          <path d="M7 19h10" />
          <path d="M8 7l8 10" />
          <path d="M8 17l8-10" />
        </svg>
      );
    default:
      return null;
  }
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
