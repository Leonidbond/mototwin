import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import {
  createApiClient,
  createMotoTwinEndpoints,
  createPickerSubmitApi,
  submitPickerDraft,
} from "@mototwin/api-client";
import {
  addKitToDraft,
  addSkuToDraft,
  buildPickerSubmitPreview,
  buildWhyMatchesReasons,
  classifyRecommendationsForPicker,
  clearDraft,
  createEmptyDraftCart,
  filterActiveWishlistItems,
  filterLeafOptionsUnderTopNodeAncestors,
  formatRideStyleChipRu,
  getLeafNodeOptions,
  getNodePathItemViewModelsByNodeId,
  getOrderedTopNodeIdsPresentInNodeTree,
  nodeAncestorPathLabelRu,
  removeFromDraft,
  updateSkuDraftItemQuantity,
  vehicleDetailFromApiRecord,
  arePickerQuantityResolutionsComplete,
  computePickerSubmitPriceEstimate,
  computePickerSubmitWishlistPieceDelta,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type {
  NodeTreeItem,
  PartRecommendationViewModel,
  PartSkuViewModel,
  PartWishlistItem,
  PickerDraftCart,
  PickerQuantitySubmitResolution,
  PickerSubmitDecision,
  PickerSubmitPreview,
  PickerSubmitResult,
  ServiceKitViewModel,
  TopServiceNodeItem,
  VehicleDetail,
  VehicleDetailApiRecord,
} from "@mototwin/types";
import { getApiBaseUrl } from "../../../../src/api-base-url";
import { KeyboardAwareScrollScreen } from "../../../components/keyboard-aware-scroll-screen";
import { GarageBottomNav } from "../../../../components/garage/GarageBottomNav";
import { CompactVehicleContextRow } from "../../../components/vehicles/CompactVehicleContextRow";
import { PickerNodeCtaBar } from "./picker-node-cta";
import { PickerRecommendationsSection } from "./picker-recommendations-section";
import { PickerSearchResultsSection } from "./picker-search-results-section";
import { PickerKitsSection } from "./picker-kits-section";
import {
  PickerDraftCartBar,
  PickerDraftCartSheet,
} from "./picker-draft-cart-bar";
import { PickerWhyMatchesPanel } from "./picker-why-matches-panel";
import { MobileNodePickerModal } from "../_components/mobile-node-picker-modal";

function skuFromRecommendation(rec: PartRecommendationViewModel): PartSkuViewModel {
  const now = new Date().toISOString();
  return {
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
    createdAt: now,
    updatedAt: now,
    primaryNode: rec.primaryNode,
    nodeLinks: [],
    fitments: [],
    offers: [],
    partNumbers: rec.partNumbers.map((number, idx) => ({
      id: `${rec.skuId}-${idx}`,
      skuId: rec.skuId,
      number,
      normalizedNumber: number.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
      numberType: "MANUFACTURER" as const,
      brandName: rec.brandName,
      createdAt: now,
    })),
  };
}

function submitHasAnySuccess(result: PickerSubmitResult): boolean {
  return (
    result.createdWishlistItemIds.length > 0 ||
    result.updatedWishlistItemIds.length > 0 ||
    result.createdSkuIds.length > 0 ||
    result.createdKitCodes.length > 0 ||
    (result.noOpQuantityUpdates ?? 0) > 0
  );
}

function formatSubmitResultMessage(result: PickerSubmitResult): string {
  const lines: string[] = [];
  if (result.createdWishlistItemIds.length > 0 || result.updatedWishlistItemIds.length > 0) {
    const bits: string[] = [];
    if (result.createdWishlistItemIds.length > 0) {
      bits.push(`новых ${result.createdWishlistItemIds.length}`);
    }
    if (result.updatedWishlistItemIds.length > 0) {
      bits.push(`обновлено ${result.updatedWishlistItemIds.length}`);
    }
    lines.push(`В списке покупок: ${bits.join(", ")}.`);
  } else if ((result.noOpQuantityUpdates ?? 0) > 0) {
    lines.push(
      `Количество в списке не менялось (${result.noOpQuantityUpdates}): в подборе не больше, чем уже в строке.`
    );
  } else if (result.createdSkuIds.length > 0 || result.createdKitCodes.length > 0) {
    lines.push(`SKU: ${result.createdSkuIds.length}, комплекты: ${result.createdKitCodes.length}.`);
  }
  for (const w of result.warnings.slice(0, 4)) {
    lines.push(`⚠ ${w}`);
  }
  if (result.warnings.length > 4) {
    lines.push(`… ещё предупреждений: ${result.warnings.length - 4}`);
  }
  if (result.skipped.length > 0) {
    lines.push(`Не добавлено (${result.skipped.length}):`);
    for (const s of result.skipped.slice(0, 10)) {
      lines.push(`· ${s.label}: ${s.reason}`);
    }
    if (result.skipped.length > 10) {
      lines.push(`… и ещё ${result.skipped.length - 10}`);
    }
  }
  return lines.join("\n");
}

function formatYearOdometerLine(vehicle: VehicleDetail): string {
  const year = vehicle.modelVariant?.year ?? vehicle.year;
  const odometerLabel = vehicle.odometer.toLocaleString("ru-RU");
  const ride = formatRideStyleChipRu(vehicle.rideProfile);
  const base = `${year || "—"} · ${odometerLabel} км`;
  return ride ? `${base} · ${ride}` : base;
}

function vehicleDisplayName(vehicle: VehicleDetail | null): string {
  if (!vehicle) return "";
  return (
    vehicle.nickname?.trim() ||
    `${vehicle.brandName} ${vehicle.modelName}`.trim() ||
    "Мотоцикл"
  );
}

export default function WishlistPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string;
    nodeId?: string;
    focus?: string;
    skuId?: string;
    kitCode?: string;
  }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const initialNodeId = typeof params.nodeId === "string" ? params.nodeId.trim() : "";
  const initialFocusKits = params.focus === "kits";
  const apiBaseUrl = getApiBaseUrl();

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [wishlistItems, setWishlistItems] = useState<PartWishlistItem[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const bootstrapRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [skuResults, setSkuResults] = useState<PartSkuViewModel[]>([]);
  const [skuLoading, setSkuLoading] = useState(false);

  const [recommendations, setRecommendations] = useState<PartRecommendationViewModel[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  const [kits, setKits] = useState<ServiceKitViewModel[]>([]);
  const [kitsLoading, setKitsLoading] = useState(false);

  const [draft, setDraft] = useState<PickerDraftCart>(() => createEmptyDraftCart(vehicleId || ""));

  const [expandedKitCode, setExpandedKitCode] = useState<string | null>(null);
  const [recAlternativesVisible, setRecAlternativesVisible] = useState(false);

  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [includeInactiveSkus, setIncludeInactiveSkus] = useState(false);
  const [searchWithoutNodeScope, setSearchWithoutNodeScope] = useState(false);
  const [maxPriceRub, setMaxPriceRub] = useState("");

  const [draftSheetOpen, setDraftSheetOpen] = useState(false);
  const [submitPreviewModalOpen, setSubmitPreviewModalOpen] = useState(false);
  const [submitPreview, setSubmitPreview] = useState<PickerSubmitPreview | null>(null);
  const [quantityResolutionByDraftId, setQuantityResolutionByDraftId] = useState<
    Record<string, "addAllFromDraft" | "setQtyToDraft" | undefined>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const searchSectionLayoutY = useRef(0);

  const navVehicleId = vehicleId || null;
  const goGarage = useCallback(() => router.push("/"), [router]);
  const goNodes = useCallback(() => {
    if (!navVehicleId) return;
    router.push(`/vehicles/${navVehicleId}`);
  }, [navVehicleId, router]);
  const goJournal = useCallback(() => {
    if (!navVehicleId) return;
    router.push(`/vehicles/${navVehicleId}/service-log`);
  }, [navVehicleId, router]);
  const goExpenses = useCallback(() => {
    if (!navVehicleId) return;
    router.push(`/vehicles/${navVehicleId}/expenses`);
  }, [navVehicleId, router]);
  const goProfile = useCallback(() => router.push("/profile"), [router]);

  useEffect(() => {
    setDraft(createEmptyDraftCart(vehicleId));
    bootstrapRef.current = false;
  }, [vehicleId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!vehicleId) {
        setTreeLoading(false);
        return;
      }
      setTreeLoading(true);
      try {
        const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
        const [treeRes, wishRes, detailRes] = await Promise.all([
          endpoints.getNodeTree(vehicleId),
          endpoints.getVehicleWishlist(vehicleId),
          endpoints.getVehicleDetail(vehicleId),
        ]);
        if (cancelled) return;
        setNodeTree(treeRes.nodeTree ?? []);
        setWishlistItems(wishRes.items ?? []);
        const raw = detailRes.vehicle as unknown as VehicleDetailApiRecord | null;
        const detail = raw ? vehicleDetailFromApiRecord(raw) : null;
        setVehicle(detail);
      } catch {
        if (!cancelled) {
          setNodeTree([]);
          setWishlistItems([]);
          setVehicle(null);
        }
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, vehicleId]);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    (async () => {
      try {
        const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
        const data = await endpoints.getTopServiceNodes();
        if (!cancelled) {
          setTopServiceNodes(data.nodes ?? []);
        }
      } catch {
        if (!cancelled) {
          setTopServiceNodes([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, vehicleId]);

  const leafOptions = useMemo(() => getLeafNodeOptions(nodeTree), [nodeTree]);

  const leafRowsForModal = useMemo(
    () =>
      leafOptions.map((leaf) => ({
        ...leaf,
        pathLabel: nodeAncestorPathLabelRu(nodeTree, leaf.id),
      })),
    [leafOptions, nodeTree]
  );

  const orderedTopNodeIdsForPicker = useMemo(
    () => getOrderedTopNodeIdsPresentInNodeTree(nodeTree, topServiceNodes),
    [nodeTree, topServiceNodes]
  );

  const topLeafRowsForModal = useMemo(
    () =>
      filterLeafOptionsUnderTopNodeAncestors(
        nodeTree,
        leafRowsForModal,
        orderedTopNodeIdsForPicker
      ),
    [nodeTree, leafRowsForModal, orderedTopNodeIdsForPicker]
  );

  useEffect(() => {
    if (leafOptions.length === 0) return;
    if (!bootstrapRef.current) {
      bootstrapRef.current = true;
      if (initialNodeId && leafOptions.some((l) => l.id === initialNodeId)) {
        setSelectedNodeId(initialNodeId);
      } else {
        setSelectedNodeId(null);
      }
      return;
    }
    setSelectedNodeId((prev) => {
      if (!prev) return prev;
      return leafOptions.some((l) => l.id === prev) ? prev : null;
    });
  }, [leafOptions, initialNodeId]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 320);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!vehicleId || !selectedNodeId) {
      setRecommendations([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setRecLoading(true);
      try {
        const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
        const data = await endpoints.getRecommendedSkusForNode(vehicleId, selectedNodeId);
        if (!cancelled) setRecommendations(data.recommendations ?? []);
      } catch {
        if (!cancelled) setRecommendations([]);
      } finally {
        if (!cancelled) setRecLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, vehicleId, selectedNodeId]);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    (async () => {
      setKitsLoading(true);
      try {
        const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
        const data = await endpoints.getServiceKits({
          vehicleId,
          nodeId: selectedNodeId ?? undefined,
        });
        if (!cancelled) setKits(data.kits ?? []);
      } catch {
        if (!cancelled) setKits([]);
      } finally {
        if (!cancelled) setKitsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, vehicleId, selectedNodeId]);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSkuResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSkuLoading(true);
      try {
        const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
        const data = await endpoints.getPartSkus({
          search: debouncedSearch,
          nodeId: searchWithoutNodeScope ? undefined : (selectedNodeId ?? undefined),
          activeOnly: includeInactiveSkus ? false : undefined,
        });
        if (!cancelled) setSkuResults(data.skus ?? []);
      } catch {
        if (!cancelled) setSkuResults([]);
      } finally {
        if (!cancelled) setSkuLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    apiBaseUrl,
    debouncedSearch,
    selectedNodeId,
    includeInactiveSkus,
    searchWithoutNodeScope,
  ]);

  useEffect(() => {
    if (!selectedNodeId) {
      setSearchWithoutNodeScope(false);
    }
  }, [selectedNodeId]);

  useEffect(() => {
    if (!initialFocusKits || kitsLoading) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 450);
    return () => clearTimeout(t);
  }, [initialFocusKits, kitsLoading]);

  const selectedPathVm = useMemo(() => {
    if (!selectedNodeId || nodeTree.length === 0) return null;
    return getNodePathItemViewModelsByNodeId(nodeTree, selectedNodeId);
  }, [nodeTree, selectedNodeId]);

  const selectedNodeName = selectedPathVm?.at(-1)?.name ?? null;

  const merchandise = useMemo(
    () => classifyRecommendationsForPicker(recommendations),
    [recommendations]
  );

  const draftSkuIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of draft.items) {
      if (item.kind === "sku") set.add(item.sku.id);
    }
    return set;
  }, [draft.items]);

  const draftKitCodes = useMemo(() => {
    const set = new Set<string>();
    for (const item of draft.items) {
      if (item.kind === "kit") set.add(item.kit.code);
    }
    return set;
  }, [draft.items]);

  const whyMatches = useMemo(() => {
    if (!vehicle) return [];
    const modelLabel = `${vehicle.brandName} ${vehicle.modelName}`.trim();
    return buildWhyMatchesReasons({
      vehicleModelLabel: modelLabel,
      draft,
      rideProfile: vehicle.rideProfile,
    });
  }, [vehicle, draft]);

  const filtersActiveCount = useMemo(() => {
    let n = 0;
    if (includeInactiveSkus) n += 1;
    if (searchWithoutNodeScope && selectedNodeId) n += 1;
    const cap = Number.parseInt(maxPriceRub.replace(/\s/g, ""), 10);
    if (Number.isFinite(cap) && cap > 0) n += 1;
    return n;
  }, [includeInactiveSkus, searchWithoutNodeScope, selectedNodeId, maxPriceRub]);

  const filteredSkuResults = useMemo(() => {
    const cap = Number.parseInt(maxPriceRub.replace(/\s/g, ""), 10);
    if (!Number.isFinite(cap) || cap <= 0) return skuResults;
    return skuResults.filter((s) => s.priceAmount == null || s.priceAmount <= cap);
  }, [skuResults, maxPriceRub]);

  const onAddRec = useCallback(
    (rec: PartRecommendationViewModel) => {
      if (!selectedNodeId) {
        Alert.alert("Узел", "Выберите узел мотоцикла.");
        return;
      }
      const sku = skuFromRecommendation(rec);
      setDraft((d) => addSkuToDraft(d, { sku, nodeId: selectedNodeId, source: "recommendation" }));
    },
    [selectedNodeId]
  );

  const onAddSku = useCallback(
    (sku: PartSkuViewModel) => {
      const nodeId = selectedNodeId ?? sku.primaryNodeId;
      if (!nodeId) {
        Alert.alert("Узел", "Выберите узел или SKU с привязкой к узлу.");
        return;
      }
      setDraft((d) => addSkuToDraft(d, { sku, nodeId, source: "search" }));
    },
    [selectedNodeId]
  );

  const onAddKit = useCallback(
    (kit: ServiceKitViewModel) => {
      setDraft((d) => addKitToDraft(d, { kit, contextNodeId: selectedNodeId }));
    },
    [selectedNodeId]
  );

  const openSubmit = useCallback(() => {
    const active = filterActiveWishlistItems(wishlistItems);
    const preview = buildPickerSubmitPreview({ draft, activeWishlistItems: active });
    if (preview.willAddCount === 0 && preview.quantityUpgradeCount === 0) {
      Alert.alert(
        "Корзина",
        "Нет позиций для добавления или обновления: всё уже в списке в достаточном количестве, либо не выбран узел."
      );
      return;
    }
    setQuantityResolutionByDraftId({});
    setSubmitPreview(preview);
    setSubmitPreviewModalOpen(true);
  }, [draft, wishlistItems]);

  const runPickerSubmitConfirm = useCallback(async () => {
    if (!submitPreview || !vehicleId) return;
    if (
      submitPreview.quantityUpgradeCount > 0 &&
      !arePickerQuantityResolutionsComplete(submitPreview, quantityResolutionByDraftId)
    ) {
      return;
    }
    setSubmitting(true);
    const draftSnapshot = draft;
    const previewSnapshot = submitPreview;
    const resSnapshot = { ...quantityResolutionByDraftId };
    try {
      const quantityResolutions: PickerQuantitySubmitResolution[] = [];
      for (const d of previewSnapshot.decisions) {
        if (d.kind !== "quantityUpgrade") continue;
        const mode = resSnapshot[d.draftId];
        if (!mode) continue;
        quantityResolutions.push({
          draftId: d.draftId,
          existingWishlistItemId: d.existingWishlistItemId,
          nodeId: d.nodeId,
          mode,
          draftRequestedQty: d.draftRequestedQty,
          existingQty: d.existingQty,
        });
      }
      const api = createPickerSubmitApi(apiBaseUrl);
      const result = await submitPickerDraft(api, draftSnapshot, { quantityResolutions });
      const ok = submitHasAnySuccess(result);
      if (!ok && draftSnapshot.items.length > 0) {
        Alert.alert(
          "Не удалось добавить",
          formatSubmitResultMessage(result) || "Проверьте соединение и попробуйте снова."
        );
        return;
      }
      setDraft(createEmptyDraftCart(vehicleId));
      setDraftSheetOpen(false);
      setSubmitPreviewModalOpen(false);
      setSubmitPreview(null);
      setQuantityResolutionByDraftId({});
      const picked = [...result.createdWishlistItemIds, ...result.updatedWishlistItemIds].join(",");
      const qs = picked ? `?picked=${encodeURIComponent(picked)}` : "";
      const target = `/vehicles/${vehicleId}/wishlist${qs}`;
      const detail = formatSubmitResultMessage(result);
      const needsSummary = result.skipped.length > 0 || result.warnings.length > 0;
      const title = ok && result.skipped.length > 0 ? "Частично готово" : "Готово";
      if (needsSummary && detail.trim()) {
        Alert.alert(title, detail, [{ text: "К списку покупок", onPress: () => router.replace(target) }]);
      } else {
        router.replace(target);
      }
    } catch (e) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось сохранить.");
    } finally {
      setSubmitting(false);
    }
  }, [
    apiBaseUrl,
    draft,
    quantityResolutionByDraftId,
    router,
    submitPreview,
    vehicleId,
  ]);

  const handleEditRideProfile = useCallback(() => {
    if (!vehicleId) return;
    router.push(`/vehicles/${vehicleId}`);
  }, [router, vehicleId]);

  const handleClearAndCloseSheet = useCallback(() => {
    Alert.alert("Очистить корзину?", undefined, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Очистить",
        style: "destructive",
        onPress: () => {
          setDraft((d) => clearDraft(d));
          setDraftSheetOpen(false);
        },
      },
    ]);
  }, []);

  if (!vehicleId) {
    return (
      <SafeAreaView style={styles.safe}>
        <PickerHeader onBack={() => router.back()} />
        <Text style={styles.muted}>Не удалось определить мотоцикл.</Text>
      </SafeAreaView>
    );
  }

  const showSearchResults = debouncedSearch.length >= 2;
  const vehicleName = vehicleDisplayName(vehicle);
  const vehicleSubtitle = vehicle ? formatYearOdometerLine(vehicle) : "";

  const canConfirmPickerSubmit =
    submitPreview != null &&
    (submitPreview.willAddCount > 0 || submitPreview.quantityUpgradeCount > 0) &&
    (submitPreview.quantityUpgradeCount === 0 ||
      arePickerQuantityResolutionsComplete(submitPreview, quantityResolutionByDraftId));

  const submitPieceDelta = useMemo(() => {
    if (!submitPreview) return null;
    return computePickerSubmitWishlistPieceDelta(submitPreview, quantityResolutionByDraftId);
  }, [submitPreview, quantityResolutionByDraftId]);

  const submitPriceEst = useMemo(() => {
    if (!submitPreview) return null;
    return computePickerSubmitPriceEstimate(draft, submitPreview, quantityResolutionByDraftId);
  }, [draft, submitPreview, quantityResolutionByDraftId]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <PickerHeader onBack={() => router.replace(`/vehicles/${vehicleId}/wishlist`)} />
      <View style={styles.flex}>
        <KeyboardAwareScrollScreen
          scrollViewRef={scrollRef}
          keyboardVerticalOffset={insets.top + 52}
          contentContainerStyle={styles.scrollContent}
          scrollViewProps={{
            onScrollBeginDrag: () => Keyboard.dismiss(),
          }}
        >
          {treeLoading ? (
            <View style={styles.skeletonStack}>
              <View style={[styles.skeletonRow, { height: 64 }]} />
              <View style={[styles.skeletonRow, { height: 48 }]} />
              <View style={[styles.skeletonRow, { height: 240 }]} />
              <View style={[styles.skeletonRow, { height: 96 }]} />
            </View>
          ) : (
            <>
              {vehicle ? (
                <CompactVehicleContextRow
                  vehicle={vehicle}
                  title={vehicleName}
                  subtitle={vehicleSubtitle}
                  silhouetteWidth={64}
                  silhouetteHeight={42}
                  onPress={() => router.push(`/vehicles/${vehicleId}`)}
                />
              ) : null}

              <PickerNodeCtaBar
                hasSelectedNode={Boolean(selectedNodeId)}
                nodeName={selectedNodeName}
                onPickNode={() => setNodeModalOpen(true)}
              />

              <View
                onLayout={(e) => {
                  searchSectionLayoutY.current = e.nativeEvent.layout.y;
                }}
                style={styles.searchRow}
              >
                <View style={styles.searchShell}>
                  <MaterialIcons
                    name="search"
                    size={18}
                    color={c.textMuted}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => {
                      requestAnimationFrame(() => {
                        const y = Math.max(0, searchSectionLayoutY.current - 16);
                        scrollRef.current?.scrollTo({ y, animated: true });
                      });
                    }}
                    placeholder="Поиск по SKU или названию"
                    placeholderTextColor={c.textMuted}
                    style={styles.searchInput}
                  />
                  {searchQuery.length > 0 ? (
                    <Pressable
                      onPress={() => setSearchQuery("")}
                      hitSlop={6}
                      accessibilityLabel="Очистить поиск"
                      style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
                    >
                      <MaterialIcons name="close" size={18} color={c.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => setFiltersOpen(true)}
                  style={({ pressed }) => [
                    styles.filtersBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Фильтры"
                >
                  <MaterialIcons name="tune" size={16} color={c.textPrimary} />
                  <Text style={styles.filtersBtnText}>Фильтры</Text>
                  {filtersActiveCount > 0 ? (
                    <View style={styles.filtersBadge}>
                      <Text style={styles.filtersBadgeText}>{filtersActiveCount}</Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>

              {showSearchResults ? (
                <PickerSearchResultsSection
                  query={debouncedSearch}
                  results={filteredSkuResults}
                  isLoading={skuLoading}
                  draftSkuIds={draftSkuIds}
                  onAddSku={onAddSku}
                  onResetSearch={() => setSearchQuery("")}
                />
              ) : (
                <PickerRecommendationsSection
                  nodeName={selectedNodeName}
                  rideProfile={vehicle?.rideProfile ?? null}
                  recommendations={merchandise}
                  draftSkuIds={draftSkuIds}
                  hasSelectedNode={Boolean(selectedNodeId)}
                  isLoading={recLoading}
                  onAddSku={onAddRec}
                  onEditRideProfile={handleEditRideProfile}
                  onShowMore={() => setRecAlternativesVisible((v) => !v)}
                  alternativesVisible={recAlternativesVisible}
                />
              )}

              <PickerKitsSection
                kits={kits}
                draftKitCodes={draftKitCodes}
                addingKitCode={null}
                expandedKitCode={expandedKitCode}
                isLoading={kitsLoading}
                onAddKit={onAddKit}
                onToggleExpand={(code) =>
                  setExpandedKitCode((prev) => (prev === code ? null : code))
                }
              />

              <PickerWhyMatchesPanel reasons={whyMatches} />

              <Text style={styles.legalFooter}>
                Цены и наличие в каталоге носят справочный характер и могут отличаться у продавцов.
              </Text>
            </>
          )}
        </KeyboardAwareScrollScreen>

        <PickerDraftCartBar
          draft={draft}
          isSubmitting={submitting}
          bottomInset={0}
          onCheckout={openSubmit}
          onOpenSheet={() => setDraftSheetOpen(true)}
        />

        <GarageBottomNav
          onOpenGarage={goGarage}
          onOpenNodes={goNodes}
          onOpenJournal={goJournal}
          onOpenExpenses={goExpenses}
          onOpenProfile={goProfile}
          hasVehicleContext={Boolean(navVehicleId)}
          currentVehicleId={navVehicleId}
        />
      </View>

      <MobileNodePickerModal
        visible={nodeModalOpen}
        title="Конечный узел"
        options={leafRowsForModal}
        topOptions={topLeafRowsForModal.length > 0 ? topLeafRowsForModal : undefined}
        selectedId={selectedNodeId}
        onClose={() => setNodeModalOpen(false)}
        onSelect={setSelectedNodeId}
      />

      <Modal visible={filtersOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Фильтры поиска</Text>
            <View style={styles.filterRow}>
              <View style={styles.filterTextCol}>
                <Text style={styles.filterTitle}>Искать по всему каталогу</Text>
                <Text style={styles.filterHint}>
                  Игнорировать выбранный узел при поиске SKU
                </Text>
              </View>
              <Switch
                value={searchWithoutNodeScope}
                onValueChange={setSearchWithoutNodeScope}
                disabled={!selectedNodeId}
              />
            </View>
            <View style={styles.filterRow}>
              <View style={styles.filterTextCol}>
                <Text style={styles.filterTitle}>Включая неактивные SKU</Text>
                <Text style={styles.filterHint}>
                  Показывать SKU с пометкой «не активны»
                </Text>
              </View>
              <Switch value={includeInactiveSkus} onValueChange={setIncludeInactiveSkus} />
            </View>
            <View style={[styles.filterRow, styles.filterRowColumn]}>
              <Text style={styles.filterTitle}>Цена до, ₽</Text>
              <TextInput
                value={maxPriceRub}
                onChangeText={(v) => setMaxPriceRub(v.replace(/[^0-9]/g, ""))}
                placeholder="например, 15000"
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                style={styles.filterPriceInput}
              />
              <Text style={styles.filterHint}>
                Скрывает SKU дороже указанной суммы (без валютной нормализации)
              </Text>
            </View>
            <View style={styles.filterFooter}>
              <Pressable
                style={({ pressed }) => [styles.filterReset, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  setIncludeInactiveSkus(false);
                  setSearchWithoutNodeScope(false);
                  setMaxPriceRub("");
                }}
              >
                <Text style={styles.filterResetText}>Сбросить</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.filterApply, pressed && { opacity: 0.92 }]}
                onPress={() => setFiltersOpen(false)}
              >
                <Text style={styles.filterApplyText}>Готово</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={submitPreviewModalOpen} animationType="fade" transparent>
        <View style={styles.submitModalOverlay}>
          <View style={styles.submitModalCard}>
            <Text style={styles.submitModalTitle}>Подтвердите состав</Text>
            {submitPreview ? (
              <>
                <View style={styles.submitSummaryGrid}>
                  <View style={styles.submitSummaryCell}>
                    <Text style={styles.submitSummaryLabel}>Новые</Text>
                    <Text style={[styles.submitSummaryValue, { color: c.successText }]}>
                      {submitPreview.willAddCount}
                    </Text>
                  </View>
                  <View style={styles.submitSummaryCell}>
                    <Text style={styles.submitSummaryLabel}>Обновить</Text>
                    <Text style={[styles.submitSummaryValue, { color: "#FFC400" }]}>
                      {submitPreview.quantityUpgradeCount}
                    </Text>
                  </View>
                  <View style={styles.submitSummaryCell}>
                    <Text style={styles.submitSummaryLabel}>Достаточно</Text>
                    <Text style={[styles.submitSummaryValue, { color: c.textSecondary }]}>
                      {submitPreview.duplicateCount}
                    </Text>
                  </View>
                  <View style={styles.submitSummaryCell}>
                    <Text style={styles.submitSummaryLabel}>Нельзя</Text>
                    <Text style={[styles.submitSummaryValue, { color: c.error }]}>
                      {submitPreview.blockedCount}
                    </Text>
                  </View>
                </View>
                <ScrollView
                  style={styles.submitDecisionsScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  {submitPreview.decisions.map((decision) => (
                    <View key={decision.draftId} style={styles.submitDecisionRow}>
                      <View
                        style={[
                          styles.submitDecisionDot,
                          decision.kind === "willAdd" && { backgroundColor: c.successStrong },
                          decision.kind === "duplicate" && { backgroundColor: c.textMuted },
                          decision.kind === "blocked" && { backgroundColor: c.error },
                          decision.kind === "quantityUpgrade" && { backgroundColor: "#FFC400" },
                        ]}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.submitDecisionTitle}>{decision.label}</Text>
                        {decision.kind === "willAdd" && decision.pieceCount > 1 ? (
                          <Text style={styles.submitDecisionMeta}>
                            В количестве: {decision.pieceCount} шт.
                          </Text>
                        ) : null}
                        {decision.kind === "quantityUpgrade" ? (
                          <View style={{ marginTop: 8, gap: 8 }}>
                            <Text style={styles.submitDecisionMeta}>
                              Совпадает со строкой в списке: сейчас{" "}
                              <Text style={{ fontWeight: "800", color: c.textPrimary }}>
                                {decision.existingQty}
                              </Text>{" "}
                              шт., в подборе —{" "}
                              <Text style={{ fontWeight: "800", color: c.textPrimary }}>
                                {decision.draftRequestedQty}
                              </Text>{" "}
                              шт. Выберите вариант — ниже появится итог.
                            </Text>
                            <View style={styles.submitChoiceRow}>
                              <Pressable
                                onPress={() =>
                                  setQuantityResolutionByDraftId((prev) => ({
                                    ...prev,
                                    [decision.draftId]: "addAllFromDraft",
                                  }))
                                }
                                style={({ pressed }) => [
                                  styles.submitChoiceChip,
                                  quantityResolutionByDraftId[decision.draftId] === "addAllFromDraft" &&
                                    styles.submitChoiceChipSelected,
                                  pressed && { opacity: 0.88 },
                                ]}
                              >
                                <Text style={styles.submitChoiceChipText}>
                                  Прибавить {decision.draftRequestedQty} шт. из подбора к строке
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() =>
                                  setQuantityResolutionByDraftId((prev) => ({
                                    ...prev,
                                    [decision.draftId]: "setQtyToDraft",
                                  }))
                                }
                                style={({ pressed }) => [
                                  styles.submitChoiceChip,
                                  quantityResolutionByDraftId[decision.draftId] === "setQtyToDraft" &&
                                    styles.submitChoiceChipSelected,
                                  pressed && { opacity: 0.88 },
                                ]}
                              >
                                <Text style={styles.submitChoiceChipText}>
                                  {pickerSetQtyChipLabel(decision)}
                                </Text>
                              </Pressable>
                            </View>
                            {quantityResolutionByDraftId[decision.draftId] ? (
                              <View style={styles.submitOutcomeBox}>
                                <Text style={styles.submitOutcomeText}>
                                  {pickerQuantityUpgradeOutcomeLine(
                                    decision,
                                    quantityResolutionByDraftId[decision.draftId]!
                                  )}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                        {decision.kind === "duplicate" || decision.kind === "blocked" ? (
                          <Text style={styles.submitDecisionMeta}>{decision.reason}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </ScrollView>
                {submitPreview.quantityUpgradeCount > 0 && submitPieceDelta === null ? (
                  <Text style={styles.submitFooterHint}>
                    Суммарное изменение количества: укажите варианты для строк со совпадением — затем здесь
                    отобразится итог.
                  </Text>
                ) : submitPieceDelta !== null ? (
                  <Text style={styles.submitFooterHint}>
                    Суммарное изменение количества в списке покупок:{" "}
                    <Text style={{ fontWeight: "800", color: c.textPrimary }}>
                      {submitPieceDelta >= 0 ? "+" : "−"}
                      {Math.abs(submitPieceDelta)}
                    </Text>{" "}
                    шт. (с учётом выбора).
                    {submitPriceEst != null && Number.isFinite(submitPriceEst.amount)
                      ? `\nОриентир по сумме: ≈ ${formatPickerSubmitPriceRu(
                          submitPriceEst.amount,
                          submitPriceEst.currency
                        )}`
                      : submitPreview.quantityUpgradeCount > 0 && submitPriceEst == null
                        ? "\nОриентир по сумме — после выбора всех вариантов или при одной валюте по позициям."
                        : ""}
                  </Text>
                ) : null}
              </>
            ) : null}
            <View style={styles.submitModalActions}>
              <Pressable
                onPress={() => {
                  setSubmitPreviewModalOpen(false);
                  setSubmitPreview(null);
                  setQuantityResolutionByDraftId({});
                }}
                disabled={submitting}
                style={({ pressed }) => [styles.submitBtnSecondary, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.submitBtnSecondaryText}>Назад</Text>
              </Pressable>
              <Pressable
                onPress={() => void runPickerSubmitConfirm()}
                disabled={submitting || !canConfirmPickerSubmit}
                style={({ pressed }) => [
                  styles.submitBtnPrimary,
                  (submitting || !canConfirmPickerSubmit) && styles.submitBtnPrimaryDisabled,
                  pressed && { opacity: 0.92 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={c.onPrimaryAction} />
                ) : (
                  <Text style={styles.submitBtnPrimaryText}>Подтвердить</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <PickerDraftCartSheet
        visible={draftSheetOpen}
        draft={draft}
        bottomInset={insets.bottom}
        isSubmitting={submitting}
        onClose={() => setDraftSheetOpen(false)}
        onClear={handleClearAndCloseSheet}
        onRemove={(draftId) => setDraft((d) => removeFromDraft(d, draftId))}
        onChangeSkuQuantity={(draftId, nextQuantity) =>
          setDraft((d) => updateSkuDraftItemQuantity(d, draftId, nextQuantity))
        }
        onCheckout={() => {
          setDraftSheetOpen(false);
          openSubmit();
        }}
      />
    </SafeAreaView>
  );
}

function pickerQuantityUpgradeOutcomeLine(
  d: Extract<PickerSubmitDecision, { kind: "quantityUpgrade" }>,
  mode: "addAllFromDraft" | "setQtyToDraft"
): string {
  if (mode === "addAllFromDraft") {
    return `К этой строке прибавится +${d.draftRequestedQty} шт. из подбора. В списке станет ${d.existingQty + d.draftRequestedQty} шт.`;
  }
  const dlt = d.draftRequestedQty - d.existingQty;
  if (dlt > 0) {
    return `К строке прибавится +${dlt} шт. В списке станет ${d.draftRequestedQty} шт.`;
  }
  return "Строка в списке не изменится: в подборе не больше, чем уже есть — ничего не добавим.";
}

function pickerSetQtyChipLabel(d: Extract<PickerSubmitDecision, { kind: "quantityUpgrade" }>): string {
  if (d.addQty > 0) {
    return `В списке ровно ${d.draftRequestedQty} шт. (+${d.addQty})`;
  }
  return "Не добавлять (в списке уже не меньше подбора)";
}

function formatPickerSubmitPriceRu(amount: number, currency: string | null): string {
  const numFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  const cur = currency?.trim().toUpperCase();
  const sym = cur === "RUB" ? "₽" : cur === "USD" ? "$" : cur === "EUR" ? "€" : cur || "";
  return sym ? `${numFmt} ${sym}` : numFmt;
}

function PickerHeader(props: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={props.onBack}
        accessibilityRole="button"
        accessibilityLabel="Назад"
        hitSlop={10}
        style={({ pressed }) => [styles.headerBack, pressed && { opacity: 0.8 }]}
      >
        <MaterialIcons name="chevron-left" size={26} color={c.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        Подбор детали
      </Text>
      <View style={styles.headerRightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: c.canvas,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: c.textPrimary,
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchShell: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    fontSize: 14,
    color: c.textPrimary,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  filtersBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
  },
  filtersBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: c.primaryAction,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: c.onPrimaryAction,
  },
  legalFooter: {
    marginTop: 4,
    fontSize: 11,
    color: c.textMuted,
    lineHeight: 16,
  },
  skeletonStack: {
    gap: 12,
    paddingTop: 4,
  },
  skeletonRow: {
    borderRadius: 14,
    backgroundColor: c.cardMuted,
    opacity: 0.6,
  },
  link: { fontSize: 13, fontWeight: "600", color: c.primaryAction },
  muted: { fontSize: 13, color: c.textMuted, paddingHorizontal: 16, paddingVertical: 8 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: c.textPrimary },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: c.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: c.textPrimary, marginBottom: 10 },
  modalSearch: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: c.textPrimary,
    backgroundColor: c.cardMuted,
    marginBottom: 10,
  },
  modalTopToggle: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    marginBottom: 10,
  },
  modalTopToggleOn: {
    backgroundColor: c.cardMuted,
    borderColor: c.textPrimary,
  },
  modalTopToggleText: { fontSize: 14, fontWeight: "700", color: c.textMuted },
  modalTopToggleTextOn: { color: c.textPrimary },
  modalRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  modalPath: { fontSize: 12, color: c.textMuted, marginTop: 4 },
  modalClose: { marginTop: 12, alignItems: "center" },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  filterRowColumn: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
  },
  filterTextCol: { flex: 1 },
  filterTitle: { fontSize: 14, fontWeight: "700", color: c.textPrimary },
  filterHint: { marginTop: 2, fontSize: 11, color: c.textMuted },
  filterPriceInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: c.textPrimary,
    backgroundColor: c.cardMuted,
  },
  filterFooter: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  filterReset: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardSubtle,
  },
  filterResetText: { fontSize: 13, fontWeight: "700", color: c.textSecondary },
  filterApply: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: c.primaryAction,
  },
  filterApplyText: { fontSize: 13, fontWeight: "800", color: c.onPrimaryAction },
  submitModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 16,
  },
  submitModalCard: {
    borderRadius: 20,
    padding: 16,
    maxHeight: "88%",
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  submitModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: c.textPrimary,
    marginBottom: 12,
  },
  submitSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  submitSummaryCell: {
    flexGrow: 1,
    flexBasis: "45%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: c.cardMuted,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
  },
  submitSummaryLabel: { fontSize: 10, color: c.textMuted, textAlign: "center" },
  submitSummaryValue: { fontSize: 18, fontWeight: "800", marginTop: 2 },
  submitDecisionsScroll: { maxHeight: 280, marginBottom: 8 },
  submitDecisionRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  submitDecisionDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
    backgroundColor: c.textMuted,
  },
  submitDecisionTitle: { fontSize: 13, fontWeight: "600", color: c.textPrimary },
  submitDecisionMeta: { fontSize: 11, color: c.textMuted, marginTop: 4 },
  submitChoiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  submitChoiceChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardSubtle,
    maxWidth: "100%",
  },
  submitChoiceChipSelected: {
    borderColor: c.primaryAction,
    backgroundColor: "rgba(255,122,0,0.12)",
  },
  submitChoiceChipText: { fontSize: 12, fontWeight: "700", color: c.textPrimary },
  submitOutcomeBox: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: c.cardMuted,
    borderWidth: 1,
    borderColor: c.border,
  },
  submitOutcomeText: { fontSize: 12, fontWeight: "600", color: c.textPrimary },
  submitFooterHint: {
    fontSize: 12,
    fontWeight: "600",
    color: c.textSecondary,
    textAlign: "right",
    marginBottom: 10,
  },
  submitModalActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  submitBtnSecondary: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  submitBtnSecondaryText: { fontSize: 13, fontWeight: "700", color: c.textPrimary },
  submitBtnPrimary: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: c.primaryAction,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnPrimaryDisabled: { opacity: 0.5 },
  submitBtnPrimaryText: { fontSize: 13, fontWeight: "800", color: c.onPrimaryAction },
});
