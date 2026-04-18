"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  buildNodeTreeSectionProps,
  canOpenNodeStatusExplanationModal,
  buildRideProfileViewModel,
  buildServiceLogTimelineProps,
  getServiceLogEventKindBadgeLabel,
  SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS,
  buildVehicleHeaderProps,
  buildVehicleStateViewModel,
  buildVehicleTechnicalInfoViewModel,
  vehicleDetailFromApiRecord,
  createInitialAddServiceEventFormValues,
  createInitialAddServiceEventFromWishlistItem,
  createInitialEditVehicleProfileFormValues,
  createInitialVehicleStateFormValues,
  createServiceLogNodeFilter,
  findNodePathById,
  findNodeTreeItemById,
  formatIsoCalendarDateRu,
  getAvailableChildrenForSelectedPath,
  getNodeSelectLevels,
  getSelectedNodeFromPath,
  getStatusExplanationTriggeredByLabel,
  normalizeAddServiceEventPayload,
  normalizeEditVehicleProfilePayload,
  normalizeVehicleStatePayload,
  RIDE_LOAD_TYPE_OPTIONS,
  RIDE_RIDING_STYLE_OPTIONS,
  RIDE_USAGE_INTENSITY_OPTIONS,
  RIDE_USAGE_TYPE_OPTIONS,
  validateAddServiceEventFormValues,
  validateVehicleStateFormValues,
  isServiceLogTimelineQueryActive,
  buildExpenseSummaryFromServiceEvents,
  filterPaidServiceEvents,
  formatExpenseAmountRu,
  buildAttentionActionViewModel,
  buildAttentionSummaryFromNodeTree,
  buildNodeTreeItemViewModel,
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
  clearPartWishlistFormSkuSelection,
  formatPartSkuSearchResultMetaLineRu,
  getPartSkuViewModelDisplayLines,
  getWishlistItemSkuDisplayLines,
} from "@mototwin/domain";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import { productSemanticColors, statusSemanticTokens } from "@mototwin/design-tokens";
import type {
  AttentionItemViewModel,
  EditVehicleProfileFormValues,
  NodeStatus,
  NodeTreeItem,
  NodeTreeItemViewModel,
  SelectedNodePath,
  ServiceEventItem,
  ServiceEventsFilters,
  ServiceEventsSortDirection,
  ServiceEventsSortField,
  ServiceLogNodeFilter,
  VehicleDetail,
  VehicleDetailApiRecord,
  AddServiceEventFormValues,
  PartWishlistFormValues,
  PartWishlistItem,
  PartSkuViewModel,
} from "@mototwin/types";

const vehicleDetailApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

type VehiclePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function VehiclePage({ params }: VehiclePageProps) {
  const [vehicleId, setVehicleId] = useState("");
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceEvents, setServiceEvents] = useState<ServiceEventItem[]>([]);
  const [isServiceEventsLoading, setIsServiceEventsLoading] = useState(false);
  const [serviceEventsError, setServiceEventsError] = useState("");
  const [serviceEventsFilters, setServiceEventsFilters] = useState<ServiceEventsFilters>({
    dateFrom: "",
    dateTo: "",
    eventKind: "",
    serviceType: "",
    node: "",
  });
  const [serviceEventsSort, setServiceEventsSort] = useState<{
    field: ServiceEventsSortField;
    direction: ServiceEventsSortDirection;
  }>({
    field: "eventDate",
    direction: "desc",
  });
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [isNodeTreeLoading, setIsNodeTreeLoading] = useState(false);
  const [nodeTreeError, setNodeTreeError] = useState("");
  const [isServiceLogModalOpen, setIsServiceLogModalOpen] = useState(false);
  const [serviceLogNodeFilter, setServiceLogNodeFilter] =
    useState<ServiceLogNodeFilter | null>(null);
  const [isAddServiceEventModalOpen, setIsAddServiceEventModalOpen] = useState(false);
  const [isCreatingServiceEvent, setIsCreatingServiceEvent] = useState(false);
  const [serviceEventFormError, setServiceEventFormError] = useState("");
  const [serviceEventFormSuccess, setServiceEventFormSuccess] = useState("");
  const [selectedNodePath, setSelectedNodePath] = useState<SelectedNodePath>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedStatusExplanationNode, setSelectedStatusExplanationNode] =
    useState<NodeTreeItemViewModel | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [isExpenseSectionExpanded, setIsExpenseSectionExpanded] = useState(false);
  const [isAttentionModalOpen, setIsAttentionModalOpen] = useState(false);
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
  const wishlistSkuSearchGen = useRef(0);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFormError, setProfileFormError] = useState("");
  const [profileForm, setProfileForm] = useState<EditVehicleProfileFormValues>(() =>
    createInitialEditVehicleProfileFormValues()
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

  const serviceEventsByMonth = useMemo(() => {
    return buildServiceLogTimelineProps(
      serviceEvents,
      serviceEventsFilters,
      serviceEventsSort,
      "default",
      serviceLogNodeFilter?.nodeIds ?? null
    ).monthGroups;
  }, [serviceEvents, serviceEventsFilters, serviceEventsSort, serviceLogNodeFilter]);

  const isServiceLogQueryActive = useMemo(
    () =>
      isServiceLogTimelineQueryActive(
        serviceEventsFilters,
        serviceEventsSort,
        serviceLogNodeFilter
      ),
    [serviceEventsFilters, serviceEventsSort, serviceLogNodeFilter]
  );

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
  const wishlistNodeOptions = useMemo(
    () => flattenNodeTreeToSelectOptions(nodeTree),
    [nodeTree]
  );

  const wishlistEditingSourceItem = useMemo(
    () => (wishlistEditingId ? wishlistItems.find((w) => w.id === wishlistEditingId) : undefined),
    [wishlistEditingId, wishlistItems]
  );

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

  const hasAnyPaidServiceEventsInDataset = useMemo(
    () => filterPaidServiceEvents(serviceEvents).length > 0,
    [serviceEvents]
  );

  const updateServiceEventsFilter = (
    field: keyof ServiceEventsFilters,
    value: string
  ) => {
    setServiceEventsFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleServiceEventsSort = (field: ServiceEventsSortField) => {
    setServiceEventsSort((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        field,
        direction: field === "eventDate" ? "desc" : "asc",
      };
    });
  };

  const getServiceEventsSortIndicator = (field: ServiceEventsSortField) => {
    if (serviceEventsSort.field !== field) {
      return "↕";
    }
    return serviceEventsSort.direction === "asc" ? "↑" : "↓";
  };

  const resetServiceEventsFilters = () => {
    setServiceEventsFilters({
      dateFrom: "",
      dateTo: "",
      eventKind: "",
      serviceType: "",
      node: "",
      paidOnly: undefined,
    });
    setServiceEventsSort({
      field: "eventDate",
      direction: "desc",
    });
    setServiceLogNodeFilter(null);
  };

  const setPaidOnlyFilter = (paidOnly: boolean) => {
    setServiceEventsFilters((prev) => ({
      ...prev,
      paidOnly: paidOnly ? true : undefined,
    }));
  };

  const clearPaidOnlyFilter = () => {
    setPaidOnlyFilter(false);
  };

  const openServiceLogModalWithPaidExpenses = () => {
    setPaidOnlyFilter(true);
    setIsServiceLogModalOpen(true);
  };

  const openServiceLogModalFull = () => {
    setPaidOnlyFilter(false);
    setIsServiceLogModalOpen(true);
  };

  const openServiceLogFilteredByNode = (node: NodeTreeItemViewModel) => {
    const raw = findNodeTreeItemById(nodeTree, node.id);
    if (!raw) {
      return;
    }
    setServiceLogNodeFilter(createServiceLogNodeFilter(raw));
    setIsServiceLogModalOpen(true);
  };

  const clearServiceLogNodeFilter = () => {
    setServiceLogNodeFilter(null);
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

  const openAddServiceEventFromLeafNode = (leafNodeId: string) => {
    const nodePath = findNodePathById(nodeTree, leafNodeId);

    if (!nodePath) {
      setServiceEventFormError("Не удалось определить путь узла.");
      return;
    }

    setServiceEventFormError("");
    setServiceEventFormSuccess("");
    setInstalledPartsJson("");
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
    setServiceEventFormSuccess("");
    const values = createInitialAddServiceEventFromWishlistItem(
      item,
      { odometer: vehicle.odometer, engineHours: vehicle.engineHours },
      { todayDateYmd: todayDate }
    );
    applyAddServiceEventFormValues(values);
    setSelectedNodePath(nodePath);
    setIsAddServiceEventModalOpen(true);
  };

  const openServiceLogForAttentionItem = (item: AttentionItemViewModel) => {
    const raw = findNodeTreeItemById(nodeTree, item.nodeId);
    if (!raw) {
      return;
    }
    setIsAttentionModalOpen(false);
    setPaidOnlyFilter(false);
    setServiceLogNodeFilter(createServiceLogNodeFilter(raw));
    setIsServiceLogModalOpen(true);
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
    setWishlistForm(
      createInitialPartWishlistFormValues({
        nodeId: presetNodeId ?? "",
        status: "NEEDED",
      })
    );
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

      await Promise.all([loadWishlist(), loadServiceEvents(), loadNodeTree()]);
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
      const res = await vehicleDetailApi.updateWishlistItem(vehicleId, itemId, { status });
      await Promise.all([loadWishlist(), loadServiceEvents(), loadNodeTree()]);
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

  const renderChildTreeNode = (node: NodeTreeItemViewModel, depth: number): ReactNode => {
    const hasChildren = node.hasChildren;
    const isExpanded = Boolean(expandedNodes[node.id]);

    return (
      <div key={node.id} className="space-y-2.5">
        <div
          className="rounded-xl border border-gray-200 bg-white px-4 py-3.5"
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
                  onClick={() => setSelectedStatusExplanationNode(node)}
                  className="mt-1.5 pl-8 text-left text-xs text-gray-500 underline decoration-dotted underline-offset-2 transition hover:text-gray-700"
                >
                  {node.shortExplanationLabel}
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {node.effectiveStatus ? (
                <button
                  type="button"
                  onClick={() => openServiceLogFilteredByNode(node)}
                  className="inline-flex h-7 cursor-pointer items-center rounded-full border px-2.5 text-xs font-medium transition hover:ring-2 hover:ring-gray-300 focus-visible:outline focus-visible:ring-2 focus-visible:ring-gray-400"
                  style={getStatusBadgeStyle(node.effectiveStatus)}
                  title="Показать записи журнала по этому узлу"
                  aria-label={`Открыть журнал обслуживания по узлу «${node.name}»`}
                >
                  {node.statusLabel}
                </button>
              ) : null}
              {node.canAddServiceEvent ? (
                <button
                  type="button"
                  onClick={() => openAddServiceEventFromLeafNode(node.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  aria-label="Добавить сервисное событие"
                  title="Добавить сервисное событие"
                >
                  +
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => openWishlistModalForCreate(node.id)}
                className="inline-flex h-7 items-center rounded-md border border-gray-200 bg-white px-2 text-[11px] font-medium text-gray-700 transition hover:bg-gray-50"
                title="Добавить в список покупок"
              >
                В список
              </button>
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
    void loadWishlist();
  }, [vehicleId, loadNodeTree, loadWishlist]);

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
      createInitialEditVehicleProfileFormValues({
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
    setIsEditProfileModalOpen(true);
  };

  const saveVehicleProfile = async () => {
    if (!vehicleId) {
      setProfileFormError("Не удалось определить мотоцикл.");
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileFormError("");

      const data = await vehicleDetailApi.updateVehicleProfile(
        vehicleId,
        normalizeEditVehicleProfilePayload(profileForm)
      );

      const updated = data.vehicle as unknown as VehicleDetailApiRecord;
      setVehicle(vehicleDetailFromApiRecord(updated));
      setIsEditProfileModalOpen(false);
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
      await Promise.all([loadNodeTree(), loadServiceEvents(), loadWishlist()]);
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
    setSelectedNodePath([]);
    const empty = createInitialAddServiceEventFormValues();
    applyAddServiceEventFormValues(empty);
  };

  const handleCreateServiceEvent = async () => {
    try {
      setServiceEventFormError("");
      setServiceEventFormSuccess("");

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

      await vehicleDetailApi.createServiceEvent(
        vehicleId,
        normalizeAddServiceEventPayload(serviceFormValues)
      );

      setServiceEventFormSuccess("Сервисное событие добавлено.");
      resetServiceEventForm();
      await Promise.all([loadServiceEvents(), loadNodeTree(), loadWishlist()]);
      setIsAddServiceEventModalOpen(false);
    } catch (createError) {
      console.error(createError);
      setServiceEventFormError(
        createError instanceof Error
          ? createError.message
          : "Произошла ошибка при создании события."
      );
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
                <button
                  type="button"
                  onClick={() => setIsAttentionModalOpen(true)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition hover:opacity-95"
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
                    <h2 className="text-base font-semibold tracking-tight text-gray-950">
                      Профиль эксплуатации
                    </h2>
                    <button
                      type="button"
                      onClick={openEditProfileModal}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                    >
                      Редактировать профиль
                    </button>
                  </div>

                  {rideProfileViewModel ? (
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
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h2 className="text-base font-semibold tracking-tight text-gray-950">
                    Техническая сводка
                  </h2>

                  <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                    {technicalInfoViewModel.items.map((item) => (
                      <SpecCard key={item.key} label={item.label} value={item.value} />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <button
                type="button"
                aria-expanded={isExpenseSectionExpanded}
                onClick={() => setIsExpenseSectionExpanded((prev) => !prev)}
                className="flex w-full items-start gap-3 rounded-xl text-left transition hover:bg-gray-50/80 focus-visible:outline focus-visible:ring-2 focus-visible:ring-gray-300 -m-1 p-1"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                    Расходы на обслуживание
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {isServiceEventsLoading
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
                  </p>
                </div>
                <span className="shrink-0 pt-1 text-base text-gray-500 tabular-nums" aria-hidden>
                  {isExpenseSectionExpanded ? "▾" : "▸"}
                </span>
              </button>

              {isExpenseSectionExpanded ? (
                <>
                  {expenseSummary.paidEventCount > 0 ? (
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={openServiceLogModalWithPaidExpenses}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-gray-50 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                      >
                        Детали расходов
                      </button>
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs text-gray-500">
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
                        Добавьте сумму и валюту при создании сервисного события — здесь появятся итоги
                        по каждой валюте и за текущий месяц.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4 text-sm">
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div>
                          <span className="text-gray-500">Записей с суммой</span>
                          <p className="font-semibold text-gray-950">
                            {expenseSummary.paidEventCount}
                          </p>
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
                            <li
                              key={row.currency}
                              className="flex justify-between gap-4 text-gray-900"
                            >
                              <span>{row.currency}</span>
                              <span className="font-medium tabular-nums">
                                {formatExpenseAmountRu(row.totalAmount)} {row.currency}
                                <span className="ml-2 text-xs font-normal text-gray-500">
                                  ({row.paidEventCount}{" "}
                                  {row.paidEventCount === 1 ? "запись" : "записей"})
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
                              <li
                                key={row.currency}
                                className="flex justify-between text-sm text-gray-900"
                              >
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
                                      .map(
                                        (t) =>
                                          `${formatExpenseAmountRu(t.totalAmount)} ${t.currency}`
                                      )
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
                </>
              ) : null}
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
                                {it.comment ? (
                                  <p className="mt-1 text-xs text-gray-600">{it.comment}</p>
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
                  Дерево узлов
                </h2>
                <button
                  type="button"
                  onClick={openServiceLogModalFull}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                >
                  Открыть журнал обслуживания
                </button>
              </div>

              {isNodeTreeLoading ? (
                <p className="mt-4 text-sm text-gray-600">Загрузка дерева узлов...</p>
              ) : null}

              {!isNodeTreeLoading && nodeTreeError ? (
                <p className="mt-4 text-sm" style={{ color: productSemanticColors.error }}>
                  {nodeTreeError}
                </p>
              ) : null}

              {!isNodeTreeLoading && !nodeTreeError && nodeTree.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">
                  Дерево узлов пока не найдено.
                </p>
              ) : null}

              {!isNodeTreeLoading && !nodeTreeError && nodeTree.length > 0 ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {nodeTreeViewModel.map((rootNode) => {
                    const hasChildren = rootNode.hasChildren;
                    const isExpanded = Boolean(expandedNodes[rootNode.id]);

                    return (
                      <div
                        key={rootNode.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={() => toggleNodeExpansion(rootNode.id)}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:bg-gray-50"
                                  aria-label={
                                    isExpanded ? "Свернуть ветку" : "Развернуть ветку"
                                  }
                                >
                                  {isExpanded ? "−" : "+"}
                                </button>
                              ) : (
                                <span className="inline-flex h-6 w-6 items-center justify-center text-gray-400">
                                  •
                                </span>
                              )}
                              <h3 className="truncate text-[15px] font-semibold text-gray-950">
                                {rootNode.name}
                              </h3>
                            </div>
                            {rootNode.shortExplanationLabel &&
                            canOpenNodeStatusExplanationModal(rootNode) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedStatusExplanationNode(rootNode)
                                }
                                className="mt-1.5 pl-8 text-left text-xs text-gray-500 underline decoration-dotted underline-offset-2 transition hover:text-gray-700"
                              >
                                {rootNode.shortExplanationLabel}
                              </button>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {rootNode.effectiveStatus ? (
                              <button
                                type="button"
                                onClick={() => openServiceLogFilteredByNode(rootNode)}
                                className="inline-flex h-7 cursor-pointer items-center rounded-full border px-2.5 text-xs font-medium transition hover:ring-2 hover:ring-gray-300 focus-visible:outline focus-visible:ring-2 focus-visible:ring-gray-400"
                                style={getStatusBadgeStyle(rootNode.effectiveStatus)}
                                title="Показать записи журнала по этому узлу"
                                aria-label={`Открыть журнал обслуживания по узлу «${rootNode.name}»`}
                              >
                                {rootNode.statusLabel}
                              </button>
                            ) : null}
                            {rootNode.canAddServiceEvent ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openAddServiceEventFromLeafNode(rootNode.id)
                                }
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                aria-label="Добавить сервисное событие"
                                title="Добавить сервисное событие"
                              >
                                +
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => openWishlistModalForCreate(rootNode.id)}
                              className="inline-flex h-7 items-center rounded-md border border-gray-200 bg-white px-2 text-[11px] font-medium text-gray-700 transition hover:bg-gray-50"
                              title="Добавить в список покупок"
                            >
                              В список
                            </button>
                          </div>
                        </div>

                        {hasChildren && isExpanded ? (
                          <div className="mt-4 space-y-2.5">
                            {rootNode.children.map((child) =>
                              renderChildTreeNode(child, 0)
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>

          </div>
        ) : null}
      </div>

      {isServiceLogModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 py-6 sm:items-center"
          style={{ backgroundColor: productSemanticColors.overlayModal }}
        >
          <div className="w-full max-w-6xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                  Журнал обслуживания
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  История сервисных операций и обновлений состояния
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetServiceEventForm();
                    setServiceEventFormError("");
                    setServiceEventFormSuccess("");
                    setIsAddServiceEventModalOpen(true);
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-950 px-3.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Добавить сервисное событие
                </button>
                <button
                  type="button"
                  onClick={() => setIsServiceLogModalOpen(false)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                >
                  Закрыть
                </button>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
              {serviceLogNodeFilter ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                  <p className="text-gray-900">
                    <span className="font-medium text-gray-950">Фильтр по узлу: </span>
                    {serviceLogNodeFilter.displayLabel}
                  </p>
                  <button
                    type="button"
                    onClick={clearServiceLogNodeFilter}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-white"
                  >
                    Сбросить фильтр
                  </button>
                </div>
              ) : null}

              {serviceEventsFilters.paidOnly === true ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-amber-50/80 px-4 py-3 text-sm">
                  <p className="text-gray-900">
                    <span className="font-medium text-gray-950">Показаны события с расходами</span>
                    <span className="text-gray-600"> — только записи с суммой &gt; 0 и валютой.</span>
                  </p>
                  <button
                    type="button"
                    onClick={clearPaidOnlyFilter}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                  >
                    Сбросить фильтр
                  </button>
                </div>
              ) : null}

              {serviceEventFormSuccess ? (
                <p
                  className="mb-4 rounded-xl border px-3 py-2 text-sm"
                  style={{
                    borderColor: productSemanticColors.successBorder,
                    backgroundColor: productSemanticColors.successSurface,
                    color: productSemanticColors.successText,
                  }}
                >
                  {serviceEventFormSuccess}
                </p>
              ) : null}

              {isServiceEventsLoading ? (
                <p className="text-sm text-gray-600">Загрузка журнала обслуживания...</p>
              ) : null}

              {!isServiceEventsLoading && serviceEventsError ? (
                <p className="text-sm" style={{ color: productSemanticColors.error }}>
                  {serviceEventsError}
                </p>
              ) : null}

              {!isServiceEventsLoading &&
              !serviceEventsError &&
              serviceEvents.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">Журнал пуст</p>
                  <p className="mt-1">
                    Сервисные записи появятся здесь после первого обслуживания.
                  </p>
                </div>
              ) : null}

              {!isServiceEventsLoading &&
              !serviceEventsError &&
              serviceEvents.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
                    <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-12">
                    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600 lg:col-span-2">
                      Дата с
                      <input
                        type="date"
                        value={serviceEventsFilters.dateFrom}
                        onChange={(event) =>
                          updateServiceEventsFilter("dateFrom", event.target.value)
                        }
                        className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                      />
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600 lg:col-span-2">
                      Дата по
                      <input
                        type="date"
                        value={serviceEventsFilters.dateTo}
                        onChange={(event) =>
                          updateServiceEventsFilter("dateTo", event.target.value)
                        }
                        className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                      />
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600 lg:col-span-3">
                      Узел
                      <input
                        value={serviceEventsFilters.node}
                        onChange={(event) =>
                          updateServiceEventsFilter("node", event.target.value)
                        }
                        placeholder="Первые буквы узла"
                        className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                      />
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600 lg:col-span-2">
                      Тип записи
                      <select
                        value={serviceEventsFilters.eventKind}
                        onChange={(event) =>
                          updateServiceEventsFilter("eventKind", event.target.value)
                        }
                        className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                      >
                        <option value="">Все</option>
                        <option value="SERVICE">Сервис</option>
                        <option value="STATE_UPDATE">Обновление состояния</option>
                      </select>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600 lg:col-span-2">
                      Тип сервиса
                      <input
                        value={serviceEventsFilters.serviceType}
                        onChange={(event) =>
                          updateServiceEventsFilter("serviceType", event.target.value)
                        }
                        placeholder="Текст типа сервиса"
                        className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                      />
                    </label>
                    <div className="flex items-end lg:col-span-1">
                      <button
                        type="button"
                        onClick={resetServiceEventsFilters}
                        disabled={!isServiceLogQueryActive}
                        className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Сбросить
                      </button>
                    </div>
                    </div>
                    <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600">
                      <input
                        type="checkbox"
                        checked={serviceEventsFilters.paidOnly === true}
                        onChange={(event) => setPaidOnlyFilter(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Только события с расходами
                    </label>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("eventDate")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Дата {getServiceEventsSortIndicator("eventDate")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("eventKind")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Тип {getServiceEventsSortIndicator("eventKind")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("serviceType")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Сервис {getServiceEventsSortIndicator("serviceType")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("node")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Узел {getServiceEventsSortIndicator("node")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("odometer")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Пробег {getServiceEventsSortIndicator("odometer")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("engineHours")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Моточасы {getServiceEventsSortIndicator("engineHours")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("cost")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Стоимость {getServiceEventsSortIndicator("cost")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleServiceEventsSort("comment")}
                        className="rounded-full border border-gray-300 px-3 py-1 transition hover:bg-gray-50"
                      >
                        Комментарий {getServiceEventsSortIndicator("comment")}
                      </button>
                    </div>

                    {serviceEventsByMonth.length === 0 ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                        <p className="font-medium text-gray-900">
                          {serviceEventsFilters.paidOnly === true && !hasAnyPaidServiceEventsInDataset
                            ? "Расходов пока нет"
                            : "Ничего не найдено"}
                        </p>
                        <p className="mt-1">
                          {serviceEventsFilters.paidOnly === true && !hasAnyPaidServiceEventsInDataset
                            ? "Нет сервисных записей с суммой больше нуля и указанной валютой. Добавьте стоимость при создании события."
                            : serviceLogNodeFilter
                              ? `Для узла «${serviceLogNodeFilter.displayLabel}» в журнале нет записей с учётом текущих фильтров. Сбросьте фильтр по узлу или измените условия.`
                              : "По текущим фильтрам нет записей. Измените условия или сбросьте фильтры."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {serviceEventsByMonth.map((group) => (
                          <section key={group.monthKey} className="space-y-3">
                            <div className="sticky top-0 z-[1] -mx-1 px-1 py-1">
                              <div className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold capitalize tracking-tight text-gray-700">
                                {group.label}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {group.summary.serviceCount > 0 ? (
                                <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">
                                  Обслуживание: {group.summary.serviceCount}
                                </span>
                              ) : null}
                              {group.summary.stateUpdateCount > 0 ? (
                                <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">
                                  Обновления состояния: {group.summary.stateUpdateCount}
                                </span>
                              ) : null}
                              {group.summary.costLabel ? (
                                <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">
                                  Расходы: {group.summary.costLabel}
                                </span>
                              ) : null}
                            </div>

                            <div className="space-y-4">
                              {group.entries.map((entry) => {
                                const isStateUpdate = entry.eventKind === "STATE_UPDATE";

                                return (
                                  <article key={entry.id} className="relative pl-10">
                                    <div
                                      className="absolute left-4 top-0 bottom-0 w-px"
                                      style={{ backgroundColor: productSemanticColors.border }}
                                    />
                                    <div
                                      className="absolute left-[9px] top-6 h-3 w-3 rounded-full border-2"
                                      style={{
                                        borderColor: isStateUpdate
                                          ? productSemanticColors.timelineStateBorder
                                          : productSemanticColors.timelineServiceBorder,
                                        backgroundColor: isStateUpdate
                                          ? productSemanticColors.timelineStateFill
                                          : productSemanticColors.timelineServiceFill,
                                      }}
                                    />

                                    <div
                                      className={`rounded-2xl border px-4 py-3 sm:px-5 ${
                                        isStateUpdate ? "" : "shadow-sm"
                                      }`}
                                      style={{
                                        borderColor: productSemanticColors.border,
                                        backgroundColor: isStateUpdate
                                          ? productSemanticColors.cardMuted
                                          : productSemanticColors.card,
                                      }}
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-tight"
                                            style={
                                              isStateUpdate
                                                ? {
                                                    borderColor: productSemanticColors.borderStrong,
                                                    backgroundColor: productSemanticColors.divider,
                                                    color: productSemanticColors.textMuted,
                                                  }
                                                : {
                                                    borderColor: productSemanticColors.indigoSoftBorder,
                                                    backgroundColor: productSemanticColors.serviceBadgeBg,
                                                    color: productSemanticColors.serviceBadgeText,
                                                  }
                                            }
                                          >
                                            {getServiceLogEventKindBadgeLabel(entry.eventKind)}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {entry.dateLabel}
                                          </span>
                                        </div>
                                        <span
                                          className={`text-xs ${
                                            isStateUpdate ? "text-gray-500" : "text-gray-600"
                                          }`}
                                        >
                                          {entry.secondaryTitle}
                                        </span>
                                      </div>

                                      <div className="mt-2">
                                        {isStateUpdate ? (
                                          <>
                                            <h3 className="text-sm font-medium text-gray-700">
                                              {entry.mainTitle}
                                            </h3>
                                            <p className="mt-1 text-xs text-gray-500">
                                              {entry.stateUpdateSubtitle}
                                            </p>
                                          </>
                                        ) : (
                                          <>
                                            <h3 className="text-base font-semibold text-gray-950">
                                              {entry.mainTitle}
                                            </h3>
                                            {entry.wishlistOriginLabelRu ? (
                                              <p className="mt-0.5 text-xs text-gray-500">
                                                {entry.wishlistOriginLabelRu}
                                              </p>
                                            ) : null}
                                          </>
                                        )}
                                      </div>

                                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700">
                                          {entry.odometerLabel}: {entry.odometerValue}
                                        </span>
                                        {entry.engineHoursValue !== null ? (
                                          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700">
                                            {entry.engineHoursLabel}: {entry.engineHoursValue}
                                          </span>
                                        ) : null}
                                        {!isStateUpdate &&
                                        entry.costAmount !== null &&
                                        entry.costCurrency ? (
                                          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700">
                                            {entry.costLabel}: {entry.costAmount}{" "}
                                            {entry.costCurrency}
                                          </span>
                                        ) : null}
                                      </div>

                                      {entry.comment ? (
                                        <div className="mt-3 border-t border-gray-100 pt-3">
                                          <p
                                            className={`text-sm ${isStateUpdate ? "text-gray-500" : "text-gray-700"}`}
                                          >
                                            {expandedComments[entry.id]
                                              ? entry.comment
                                              : `${entry.comment.slice(0, SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS)}${entry.comment.length > SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS ? "..." : ""}`}
                                          </p>
                                          {entry.comment.length >
                                          SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setExpandedComments((prev) => ({
                                                  ...prev,
                                                  [entry.id]: !prev[entry.id],
                                                }))
                                              }
                                              className="mt-1 text-xs font-medium text-gray-600 underline decoration-dotted underline-offset-2 transition hover:text-gray-900"
                                            >
                                              {expandedComments[entry.id]
                                                ? "Скрыть"
                                                : "Показать"}
                                            </button>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                ) : null}
              </div>
            </div>
          </div>
      ) : null}

      {isAddServiceEventModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 py-6 sm:items-center">
          <div className="w-full max-w-4xl rounded-3xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                Добавить сервисное событие
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
                  onClick={handleCreateServiceEvent}
                  disabled={
                    isCreatingServiceEvent ||
                    !isLeafNodeSelected ||
                    !eventDate
                  }
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-gray-950 px-6 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingServiceEvent ? "Сохраняем..." : "Добавить событие"}
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

              <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-3">
                <p className="text-xs font-medium text-gray-700">SKU из каталога</p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Необязательно. Поиск по названию, бренду или артикулу
                  {wishlistForm.nodeId.trim()
                    ? " (учтён выбранный узел)."
                    : " (от 2 символов). С узлом — можно открыть подбор по узлу без текста."}
                </p>
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
                <label className="block text-xs font-medium text-gray-600">
                  Узел (необязательно)
                </label>
                <select
                  value={wishlistForm.nodeId}
                  onChange={(e) =>
                    setWishlistForm((f) => ({ ...f, nodeId: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                >
                  <option value="">— не привязано —</option>
                  {wishlistNodeOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {"\u00A0".repeat(Math.max(0, opt.level - 1) * 2)}
                      {opt.name}
                    </option>
                  ))}
                </select>
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

              {isNodeTreeLoading ? (
                <p className="mt-6 text-sm text-gray-600">Загрузка дерева узлов…</p>
              ) : nodeTreeError ? (
                <p className="mt-6 text-sm" style={{ color: productSemanticColors.error }}>
                  {nodeTreeError}
                </p>
              ) : attentionSummary.totalCount === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
                  Нет узлов, требующих внимания
                </div>
              ) : (
                <div className="mt-5 space-y-6">
                  {attentionSummary.groups.map((group) => (
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
                                <p className="text-base font-semibold text-gray-950">{item.name}</p>
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
                Редактировать профиль
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
