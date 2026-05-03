"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  removeFromDraft,
  vehicleDetailFromApiRecord,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import { GarageSidebar } from "@/app/garage/_components/GarageSidebar";
import type {
  NodeTreeItem,
  PartRecommendationViewModel,
  PartSkuViewModel,
  PartWishlistItem,
  PickerDraftCart,
  PickerSubmitPreview,
  ServiceKitViewModel,
  TopServiceNodeItem,
  VehicleDetail,
  VehicleDetailApiRecord,
} from "@mototwin/types";
import { buildPartSkuViewModelFromRecommendation } from "../../_components/part-picker-utils";
import { VehicleChip, NodeChip, ResetSelectionChip } from "./PickerChips";
import { PickerSearchBar } from "./PickerSearchBar";
import { RecommendationsSection } from "./RecommendationsSection";
import { SearchResultsSection } from "./SearchResultsSection";
import { KitsSection } from "./KitsSection";
import { PickerDraftCartPanel } from "./PickerDraftCartPanel";
import { WhyMatchesPanel } from "./WhyMatchesPanel";
import { PickerSubmitPreviewModal } from "./PickerSubmitPreviewModal";
import { PickerCatalogFiltersPanel } from "./PickerCatalogFiltersPanel";
import { NodePickerPopover, type NodePickerOption } from "./NodePickerPopover";
import { PickerLoadingSkeleton } from "./PickerLoadingSkeleton";
import { pickerColors } from "./picker-styles";

const SIDEBAR_COLLAPSED_KEY = "garage.sidebar.collapsed";

const vehiclePickerApi = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

type PickerBannerState =
  | { kind: "error"; message: string }
  | { kind: "info"; message: string }
  | { kind: "success"; message: string };

export type PartPickerPageProps = {
  vehicleId: string;
  initialNodeId: string | null;
  initialFocus: "all" | "kits";
};

export function PartPickerPage({
  vehicleId,
  initialNodeId,
  initialFocus,
}: PartPickerPageProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
        setSidebarCollapsed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [vehicleError, setVehicleError] = useState("");
  const [vehicleLoading, setVehicleLoading] = useState(true);

  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [nodeTreeLoading, setNodeTreeLoading] = useState(true);
  const [nodeTreeError, setNodeTreeError] = useState("");

  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const bootstrapNodeRef = useRef(false);

  const [wishlistItems, setWishlistItems] = useState<PartWishlistItem[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [skuResults, setSkuResults] = useState<PartSkuViewModel[]>([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuError, setSkuError] = useState("");

  const [recommendations, setRecommendations] = useState<PartRecommendationViewModel[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState("");

  const [kits, setKits] = useState<ServiceKitViewModel[]>([]);
  const [kitsLoading, setKitsLoading] = useState(false);
  const [kitsError, setKitsError] = useState("");

  const [draft, setDraft] = useState<PickerDraftCart>(() =>
    createEmptyDraftCart(vehicleId)
  );

  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const [submitPreview, setSubmitPreview] = useState<PickerSubmitPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addingKitCode, setAddingKitCode] = useState<string | null>(null);
  const [recAlternativesVisible, setRecAlternativesVisible] = useState(false);
  const [banner, setBanner] = useState<PickerBannerState | null>(null);
  const [catalogFiltersOpen, setCatalogFiltersOpen] = useState(false);
  const [catalogIncludeInactiveSkus, setCatalogIncludeInactiveSkus] = useState(false);
  const [catalogSearchWithoutNodeScope, setCatalogSearchWithoutNodeScope] = useState(false);
  const [catalogMaxPriceRub, setCatalogMaxPriceRub] = useState("");
  const [isNarrow, setIsNarrow] = useState(false);
  const kitsSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1279px)");
    const u = () => setIsNarrow(mq.matches);
    u();
    mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);

  useEffect(() => {
    setDraft(createEmptyDraftCart(vehicleId));
    bootstrapNodeRef.current = false;
  }, [vehicleId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setVehicleLoading(true);
      setVehicleError("");
      try {
        const data = await vehiclePickerApi.getVehicleDetail(vehicleId);
        const raw = data.vehicle as unknown as VehicleDetailApiRecord | null;
        if (!cancelled) {
          setVehicle(raw ? vehicleDetailFromApiRecord(raw) : null);
        }
      } catch (e) {
        if (!cancelled) {
          setVehicleError(
            e instanceof Error ? e.message : "Не удалось загрузить мотоцикл."
          );
        }
      } finally {
        if (!cancelled) setVehicleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await vehiclePickerApi.getTopServiceNodes();
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNodeTreeLoading(true);
      setNodeTreeError("");
      try {
        const data = await vehiclePickerApi.getNodeTree(vehicleId);
        if (!cancelled) {
          setNodeTree(data.nodeTree ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setNodeTree([]);
          setNodeTreeError(
            e instanceof Error ? e.message : "Не удалось загрузить дерево узлов."
          );
        }
      } finally {
        if (!cancelled) setNodeTreeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  useEffect(() => {
    if (nodeTree.length === 0) return;
    const leaves = getLeafNodeOptions(nodeTree);
    if (leaves.length === 0) return;
    const leafIds = new Set(leaves.map((l) => l.id));

    if (!bootstrapNodeRef.current) {
      bootstrapNodeRef.current = true;
      if (initialNodeId && leafIds.has(initialNodeId)) {
        setSelectedNodeId(initialNodeId);
      } else {
        // Без nodeId в URL не подставляем «первый лист» (часто Цилиндр) — пользователь выбирает узел сам.
        setSelectedNodeId(null);
      }
      return;
    }

    setSelectedNodeId((prev) => {
      if (!prev) return prev;
      return leafIds.has(prev) ? prev : null;
    });
  }, [nodeTree, initialNodeId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await vehiclePickerApi.getVehicleWishlist(vehicleId);
        if (!cancelled) {
          setWishlistItems(data.items ?? []);
        }
      } catch {
        if (!cancelled) setWishlistItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    const q = searchQuery.trim();
    if (q.length < 2) {
      setDebouncedSearch("");
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(q);
    }, 320);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!vehicleId || !selectedNodeId) {
      setRecommendations([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setRecLoading(true);
      setRecError("");
      try {
        const data = await vehiclePickerApi.getRecommendedSkusForNode(
          vehicleId,
          selectedNodeId
        );
        if (!cancelled) {
          setRecommendations(data.recommendations ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setRecError(
            e instanceof Error ? e.message : "Не удалось загрузить рекомендации."
          );
          setRecommendations([]);
        }
      } finally {
        if (!cancelled) setRecLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, selectedNodeId]);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    (async () => {
      setKitsLoading(true);
      setKitsError("");
      try {
        const data = await vehiclePickerApi.getServiceKits({
          vehicleId,
          nodeId: selectedNodeId ?? undefined,
        });
        if (!cancelled) {
          setKits(data.kits ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setKitsError(e instanceof Error ? e.message : "Не удалось загрузить комплекты.");
          setKits([]);
        }
      } finally {
        if (!cancelled) setKitsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, selectedNodeId]);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSkuResults([]);
      setSkuError("");
      return;
    }
    let cancelled = false;
    (async () => {
      setSkuLoading(true);
      setSkuError("");
      try {
        const data = await vehiclePickerApi.getPartSkus({
          search: debouncedSearch,
          nodeId:
            catalogSearchWithoutNodeScope ? undefined : (selectedNodeId ?? undefined),
          activeOnly: catalogIncludeInactiveSkus ? false : undefined,
        });
        if (!cancelled) {
          setSkuResults(data.skus ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setSkuError(e instanceof Error ? e.message : "Ошибка поиска.");
          setSkuResults([]);
        }
      } finally {
        if (!cancelled) setSkuLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    vehicleId,
    debouncedSearch,
    selectedNodeId,
    catalogIncludeInactiveSkus,
    catalogSearchWithoutNodeScope,
  ]);

  useEffect(() => {
    if (!selectedNodeId) {
      setCatalogSearchWithoutNodeScope(false);
    }
  }, [selectedNodeId]);

  useEffect(() => {
    if (initialFocus !== "kits" || kitsLoading || !kitsSectionRef.current) {
      return;
    }
    kitsSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [initialFocus, kitsLoading]);

  const leafPickerOptions: NodePickerOption[] = useMemo(() => {
    const leaves = getLeafNodeOptions(nodeTree);
    return leaves.map((opt) => {
      const vm = getNodePathItemViewModelsByNodeId(nodeTree, opt.id);
      const pathLabel = vm ? vm.map((p) => p.name).join(" / ") : "";
      return { id: opt.id, name: opt.name, pathLabel };
    });
  }, [nodeTree]);

  const orderedTopNodeIdsForPicker = useMemo(
    () => getOrderedTopNodeIdsPresentInNodeTree(nodeTree, topServiceNodes),
    [nodeTree, topServiceNodes]
  );

  const leafPickerOptionsTopOnly = useMemo(
    () =>
      filterLeafOptionsUnderTopNodeAncestors(
        nodeTree,
        leafPickerOptions,
        orderedTopNodeIdsForPicker
      ),
    [nodeTree, leafPickerOptions, orderedTopNodeIdsForPicker]
  );

  const selectedPathVm = useMemo(() => {
    if (!selectedNodeId || nodeTree.length === 0) return null;
    return getNodePathItemViewModelsByNodeId(nodeTree, selectedNodeId);
  }, [nodeTree, selectedNodeId]);

  const nodeNameForUi = selectedPathVm?.at(-1)?.name ?? null;
  const nodePathLabel =
    selectedPathVm && selectedPathVm.length > 1
      ? selectedPathVm
          .slice(0, -1)
          .map((p) => p.name)
          .join(" / ")
      : null;

  const merchandise = useMemo(
    () => classifyRecommendationsForPicker(recommendations),
    [recommendations]
  );

  const draftSkuIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of draft.items) {
      if (item.kind === "sku") {
        ids.add(item.sku.id);
      }
    }
    return ids;
  }, [draft.items]);

  const draftKitCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const item of draft.items) {
      if (item.kind === "kit") {
        codes.add(item.kit.code);
      }
    }
    return codes;
  }, [draft.items]);

  const catalogFiltersActiveCount = useMemo(() => {
    let n = 0;
    if (catalogIncludeInactiveSkus) {
      n += 1;
    }
    if (catalogSearchWithoutNodeScope && selectedNodeId) {
      n += 1;
    }
    const cap = Number.parseInt(catalogMaxPriceRub.replace(/\s/g, ""), 10);
    if (Number.isFinite(cap) && cap > 0) {
      n += 1;
    }
    return n;
  }, [
    catalogIncludeInactiveSkus,
    catalogSearchWithoutNodeScope,
    selectedNodeId,
    catalogMaxPriceRub,
  ]);

  const catalogDisplaySkuResults = useMemo(() => {
    const cap = Number.parseInt(catalogMaxPriceRub.replace(/\s/g, ""), 10);
    if (!Number.isFinite(cap) || cap <= 0) {
      return skuResults;
    }
    return skuResults.filter(
      (s) => s.priceAmount == null || s.priceAmount <= cap
    );
  }, [skuResults, catalogMaxPriceRub]);

  const vehicleLabel = vehicle
    ? vehicle.nickname?.trim() ||
      `${vehicle.brandName} ${vehicle.modelName}`.trim()
    : "…";

  const vehicleSubtitle = vehicle
    ? `${vehicle.year} · ${formatKm(vehicle.odometer)} км${
        formatRideStyleChipRu(vehicle.rideProfile)
          ? ` · ${formatRideStyleChipRu(vehicle.rideProfile)}`
          : ""
      }`
    : "";

  const whyMatches = useMemo(() => {
    if (!vehicle) return [];
    const modelLabel = `${vehicle.brandName} ${vehicle.modelName}`.trim();
    return buildWhyMatchesReasons({
      vehicleModelLabel: modelLabel,
      draft,
      rideProfile: vehicle.rideProfile,
    });
  }, [vehicle, draft]);

  const handleAddRecommendation = useCallback(
    (rec: PartRecommendationViewModel) => {
      if (!selectedNodeId) {
        setBanner({ kind: "error", message: "Сначала выберите узел мотоцикла." });
        return;
      }
      const sku = buildPartSkuViewModelFromRecommendation(rec);
      setDraft((d) =>
        addSkuToDraft(d, {
          sku,
          nodeId: selectedNodeId,
          source: "recommendation",
        })
      );
      setBanner(null);
    },
    [selectedNodeId]
  );

  const handleAddSearchSku = useCallback(
    (sku: PartSkuViewModel) => {
      const nodeId = selectedNodeId ?? sku.primaryNodeId;
      if (!nodeId) {
        setBanner({ kind: "error", message: "Выберите узел или SKU с привязкой к узлу." });
        return;
      }
      setDraft((d) =>
        addSkuToDraft(d, {
          sku,
          nodeId,
          source: "search",
        })
      );
      setBanner(null);
    },
    [selectedNodeId]
  );

  const handleAddKit = useCallback(async (kit: ServiceKitViewModel) => {
    setAddingKitCode(kit.code);
    try {
      // Комплект раскладывается по нескольким узлам (nodeCode в позициях); contextNodeId опционален для API.
      setDraft((d) => addKitToDraft(d, { kit, contextNodeId: selectedNodeId }));
      setBanner(null);
    } finally {
      setAddingKitCode(null);
    }
  }, [selectedNodeId]);

  const handleResetSelection = useCallback(() => {
    if (draft.items.length > 0) {
      const ok = window.confirm(
        "Сбросить выбор узла и очистить черновую корзину?"
      );
      if (!ok) return;
    }
    setSelectedNodeId(null);
    setDraft(createEmptyDraftCart(vehicleId));
    setSearchQuery("");
    setDebouncedSearch("");
    setRecAlternativesVisible(false);
    setBanner(null);
  }, [draft.items.length, vehicleId]);

  const openCheckoutPreview = useCallback(() => {
    const active = filterActiveWishlistItems(wishlistItems);
    setSubmitPreview(
      buildPickerSubmitPreview({
        draft,
        activeWishlistItems: active,
      })
    );
  }, [draft, wishlistItems]);

  const handleConfirmSubmit = useCallback(async () => {
    if (!submitPreview || submitPreview.willAddCount === 0) return;
    setIsSubmitting(true);
    setBanner(null);
    try {
      const api = createPickerSubmitApi("");
      const result = await submitPickerDraft(api, draft);
      const picked = result.createdWishlistItemIds.join(",");
      const parts = [];
      if (result.createdSkuIds.length) {
        parts.push(`SKU: ${result.createdSkuIds.length}`);
      }
      if (result.createdKitCodes.length) {
        parts.push(`комплекты: ${result.createdKitCodes.length}`);
      }
      if (result.skipped.length) {
        parts.push(`пропущено: ${result.skipped.length}`);
      }
      setSubmitPreview(null);
      setDraft(createEmptyDraftCart(vehicleId));
      const qs = picked ? `?picked=${encodeURIComponent(picked)}` : "";
      router.push(`/vehicles/${encodeURIComponent(vehicleId)}/parts${qs}`);
    } catch (e) {
      setBanner({
        kind: "error",
        message: e instanceof Error ? e.message : "Не удалось сохранить позиции.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [submitPreview, draft, vehicleId, router]);

  const showSearchResults = debouncedSearch.trim().length >= 2;
  const centerLoading = vehicleLoading || nodeTreeLoading;
  const hasLeafNodes = leafPickerOptions.length > 0;
  const noTreeRows = !centerLoading && !nodeTreeError && nodeTree.length === 0;
  const treeEmptyAfterLoad =
    !centerLoading && !nodeTreeError && nodeTree.length > 0 && !hasLeafNodes;

  return (
    <main
      style={{
        width: "100%",
        maxWidth: "100%",
        minHeight: "100vh",
        overflowX: "hidden",
        boxSizing: "border-box",
        backgroundColor: productSemanticColors.canvas,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: `${sidebarCollapsed ? 64 : 204}px minmax(0, 1fr)`,
          alignItems: "start",
          transition: "grid-template-columns 0.18s ease",
        }}
      >
        <GarageSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <section
          style={{
            minHeight: "100vh",
            backgroundColor: "#070B10",
            padding: isNarrow ? "12px 14px 100px" : "20px 24px 32px",
            minWidth: 0,
            maxWidth: "100%",
            overflowX: "hidden",
            boxSizing: "border-box",
          }}
        >
          {banner ? (
            <div style={{ ...bannerBaseStyle, ...bannerVariantStyle(banner.kind) }}>
              {banner.message}
            </div>
          ) : null}

          {vehicleError ? (
            <div
              style={{
                padding: 24,
                borderRadius: 18,
                border: `1px solid ${productSemanticColors.errorBorder}`,
                backgroundColor: productSemanticColors.errorSurface,
                color: productSemanticColors.error,
              }}
            >
              {vehicleError}
            </div>
          ) : null}

          {!vehicleError ? (
            <>
              <div style={topBarStyle}>
                <Link
                  href={`/vehicles/${encodeURIComponent(vehicleId)}/parts`}
                  className="no-underline"
                  style={backLinkStyle}
                >
                  ← К корзине
                </Link>
                <h1 style={pageTitleStyle}>Подбор детали</h1>
              </div>

              {nodeTreeError ? (
                <div style={{ ...bannerBaseStyle, ...bannerVariantStyle("error") }}>{nodeTreeError}</div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isNarrow
                    ? "1fr"
                    : "minmax(0, 1fr) minmax(260px, min(360px, 38vw))",
                  gap: 20,
                  alignItems: "start",
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                  {centerLoading ? (
                    <PickerLoadingSkeleton />
                  ) : noTreeRows ? (
                    <div style={mutedBoxStyle}>
                      Дерево узлов для этого мотоцикла пусто. Проверьте данные на странице мотоцикла или
                      попробуйте позже.
                    </div>
                  ) : treeEmptyAfterLoad ? (
                    <div style={mutedBoxStyle}>
                      В дереве мотоцикла нет конечных узлов для привязки деталей. Обновите данные или
                      выберите другой мотоцикл.
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
                          gap: 10,
                          width: "100%",
                          minWidth: 0,
                        }}
                      >
                        <VehicleChip
                          vehicleLabel={vehicleLabel}
                          vehicleSubtitle={vehicleSubtitle}
                        />
                        <NodeChip
                          nodeName={nodeNameForUi}
                          nodePath={nodePathLabel}
                          onClick={() => setNodePickerOpen(true)}
                        />
                        <ResetSelectionChip
                          onClick={handleResetSelection}
                          disabled={!selectedNodeId && draft.items.length === 0}
                        />
                      </div>

                      {recError ? (
                        <p style={{ color: productSemanticColors.error, fontSize: 12, margin: 0 }}>
                          {recError}
                        </p>
                      ) : null}
                      {kitsError ? (
                        <p style={{ color: productSemanticColors.error, fontSize: 12, margin: 0 }}>
                          {kitsError}
                        </p>
                      ) : null}

                      <PickerSearchBar
                        query={searchQuery}
                        onQueryChange={(v) => {
                          setSearchQuery(v);
                          setCatalogFiltersOpen(false);
                        }}
                        filtersOpen={catalogFiltersOpen}
                        onToggleFilters={() => setCatalogFiltersOpen((o) => !o)}
                        onCloseFilters={() => setCatalogFiltersOpen(false)}
                        filtersActiveCount={
                          catalogFiltersActiveCount > 0
                            ? catalogFiltersActiveCount
                            : undefined
                        }
                        filtersPanel={
                          <PickerCatalogFiltersPanel
                            selectedLeafName={nodeNameForUi}
                            hasSelectedNode={Boolean(selectedNodeId)}
                            onOpenNodePicker={() => {
                              setCatalogFiltersOpen(false);
                              setNodePickerOpen(true);
                            }}
                            searchWithoutNodeScope={catalogSearchWithoutNodeScope}
                            onSearchWithoutNodeScopeChange={setCatalogSearchWithoutNodeScope}
                            includeInactiveSkus={catalogIncludeInactiveSkus}
                            onIncludeInactiveSkusChange={setCatalogIncludeInactiveSkus}
                            maxPriceRub={catalogMaxPriceRub}
                            onMaxPriceRubChange={setCatalogMaxPriceRub}
                          />
                        }
                      />

                      {showSearchResults ? (
                        <SearchResultsSection
                          query={debouncedSearch}
                          results={catalogDisplaySkuResults}
                          totalUnfiltered={skuResults.length}
                          draftSkuIds={draftSkuIds}
                          isLoading={skuLoading}
                          error={skuError}
                          onAddSku={handleAddSearchSku}
                          onResetSearch={() => {
                            setSearchQuery("");
                            setDebouncedSearch("");
                            setCatalogFiltersOpen(false);
                          }}
                        />
                      ) : (
                        <RecommendationsSection
                          nodeName={nodeNameForUi}
                          rideProfile={vehicle?.rideProfile ?? null}
                          recommendations={merchandise}
                          draftSkuIds={draftSkuIds}
                          onAddSku={handleAddRecommendation}
                          onEditRideProfile={() => {
                            router.push(
                              `/vehicles/${encodeURIComponent(vehicleId)}`
                            );
                          }}
                          onShowMore={() =>
                            setRecAlternativesVisible((v) => !v)
                          }
                          alternativesVisible={recAlternativesVisible}
                          isLoading={recLoading}
                        />
                      )}

                      <KitsSection
                        ref={kitsSectionRef}
                        kits={kits}
                        draftKitCodes={draftKitCodes}
                        addingKitCode={addingKitCode}
                        onAddKit={(kit) => void handleAddKit(kit)}
                        isLoading={kitsLoading}
                      />

                      {isNarrow ? <WhyMatchesPanel reasons={whyMatches} /> : null}

                      <p style={legalFooterStyle}>
                        Цены и наличие в каталоге носят справочный характер и могут отличаться у
                        продавцов.
                      </p>
                    </>
                  )}
                </div>

                {!isNarrow ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      minWidth: 0,
                      maxWidth: "100%",
                    }}
                  >
                    <PickerDraftCartPanel
                      draft={draft}
                      onRemove={(id) => setDraft((d) => removeFromDraft(d, id))}
                      onClear={() => setDraft((d) => clearDraft(d))}
                      onCheckout={openCheckoutPreview}
                      isSubmitting={isSubmitting}
                    />
                    <WhyMatchesPanel reasons={whyMatches} />
                  </div>
                ) : null}
              </div>

              {isNarrow ? (
                <div
                  style={{
                    position: "fixed",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 40,
                    padding: "10px 12px",
                    backgroundColor: pickerColors.surface,
                    borderTop: `1px solid ${pickerColors.border}`,
                    boxShadow: "0 -8px 24px rgba(0,0,0,0.35)",
                  }}
                >
                  <PickerDraftCartPanel
                    variant="dock"
                    draft={draft}
                    onRemove={(id) => setDraft((d) => removeFromDraft(d, id))}
                    onClear={() => setDraft((d) => clearDraft(d))}
                    onCheckout={openCheckoutPreview}
                    isSubmitting={isSubmitting}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          <NodePickerPopover
            key={nodePickerOpen ? "node-picker-open" : "node-picker-closed"}
            isOpen={nodePickerOpen}
            options={leafPickerOptions}
            topLeafOptions={
              leafPickerOptionsTopOnly.length > 0 ? leafPickerOptionsTopOnly : undefined
            }
            onClose={() => setNodePickerOpen(false)}
            onSelect={(id) => {
              setSelectedNodeId(id);
              setNodePickerOpen(false);
            }}
          />

          {submitPreview ? (
            <PickerSubmitPreviewModal
              preview={submitPreview}
              isSubmitting={isSubmitting}
              onCancel={() => setSubmitPreview(null)}
              onConfirm={() => void handleConfirmSubmit()}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function formatKm(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

const bannerBaseStyle: CSSProperties = {
  marginBottom: 12,
  padding: "10px 12px",
  borderRadius: 12,
  fontSize: 13,
};

function bannerVariantStyle(kind: PickerBannerState["kind"]): CSSProperties {
  if (kind === "error") {
    return {
      backgroundColor: productSemanticColors.errorSurface,
      border: `1px solid ${productSemanticColors.errorBorder}`,
      color: productSemanticColors.error,
    };
  }
  if (kind === "info") {
    return {
      backgroundColor: productSemanticColors.cardMuted,
      border: `1px solid ${productSemanticColors.borderStrong}`,
      color: productSemanticColors.textSecondary,
    };
  }
  return {
    backgroundColor: productSemanticColors.successSurface,
    border: `1px solid ${productSemanticColors.successBorder}`,
    color: productSemanticColors.successText,
  };
}

const topBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginBottom: 8,
  minWidth: 0,
  width: "100%",
};

const backLinkStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: productSemanticColors.textSecondary,
  flexShrink: 0,
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 26,
  fontWeight: 800,
  color: productSemanticColors.textPrimary,
  letterSpacing: -0.3,
  minWidth: 0,
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const mutedBoxStyle: CSSProperties = {
  padding: 24,
  borderRadius: 14,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.card,
  color: productSemanticColors.textMuted,
  fontSize: 14,
};

const legalFooterStyle: CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: productSemanticColors.textMuted,
  lineHeight: 1.45,
};
