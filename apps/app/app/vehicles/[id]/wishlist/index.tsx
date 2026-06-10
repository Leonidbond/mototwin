import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Modal,
  Pressable,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppTextInput as TextInput } from "../../../../components/ui/AppTextInput";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import {
  PART_WISHLIST_STATUS_ORDER,
  buildPartWishlistItemViewModel,
  buildPartsCartSummary,
  buildVehicleDetailViewModel,
  findNodePathById,
  findNodeTreeItemById,
  formatExpenseAmountRu,
  formatIsoCalendarDateRu,
  getPartWishlistStatusLabelRu,
  getWishlistItemIdsFromInstalledPartsJson,
  getWishlistItemSkuDisplayLines,
  groupPartWishlistItemsByStatus,
  isWishlistTransitionToInstalled,
  wishlistLineTotalAmount,
  partWishlistStatusLabelsRu,
  vehicleDetailFromApiRecord,
  WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT,
} from "@mototwin/domain";
import type {
  NodeTreeItem,
  PartWishlistItemStatus,
  PartWishlistItemViewModel,
  VehicleDetail,
  VehicleDetailApiRecord,
} from "@mototwin/types";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import {
  createMobileApiClient,
  prioritizeMobileApiForNavigation,
} from "../../../../src/create-mobile-api-client";
import { withAuthGuard } from "../../../../src/mobile-auth-guard";
import {
  pushServiceEventNewFromWishlist,
  replaceServiceEventNewFromWishlist,
  buildVehicleServiceLogEventHref,
  buildVehicleWishlistCommunityHref,
  buildVehicleWishlistNewHref,
} from "../../../../components/vehicle-wishlist/hrefs";
import { InternalScreenChrome } from "../../../../components/expo-shell/internal-screen-chrome";
import { GarageVehicleContextPlaque } from "../../../../components/garage/GarageVehicleContextPlaque";
import { GarageBottomNav } from "../../../../components/garage/GarageBottomNav";
import { WishlistItemCompatibilityBlock } from "../../../../components/vehicle-wishlist/wishlist-item-compatibility-block";

type PartsStatusFilter = PartWishlistItemStatus | "ALL";
const INITIAL_VISIBLE_COUNT = 10;
const VISIBLE_INCREMENT = 10;

/** Как web `parts-cart-reference-theme` (корзина на сайте). */
const PARTS_CART_REF = {
  canvas: "#0D0D0D",
  surface: "#1A1A1A",
  surfaceElevated: "#1E1E1E",
  border: "#2A2A2A",
  borderSubtle: "#242424",
  text: "#F3F4F6",
  textMuted: "#9CA3AF",
  textSubtle: "#6B7280",
  orange: "#FF6B00",
} as const;

/** Тексты статусов как в web-корзине (PartsCartPage). */
const WEB_WISHLIST_STATUS_LABELS: Record<PartWishlistItemStatus, string> = {
  NEEDED: "Нужно купить",
  ORDERED: "Заказано",
  BOUGHT: "Куплено",
  INSTALLED: "Установлено",
  REJECTED: "Не подошла",
};

/**
 * Панель списка и строки — как PartsCartPage.module.css
 * (`.listPanel`, `.listSearch`, `.searchInput`, `.filterButton`, `.groups`, `.row`).
 */
const PARTS_LIST = {
  panelBorder: "#1F2937",
  panelBg: "rgba(9, 15, 22, 0.92)",
  controlBg: "#0B1118",
  rowBg: "#0D141C",
  rowBorder: "#1F2937",
  metaLine: "#C4CBD4",
  chipBorder: "#253140",
  controlInset: "#101720",
} as const;

/** Как web `.detail` — правая панель корзины. */
const PARTS_DETAIL_BG = "#0A1017";

/** Как web `.summaryCard`: чуть светлее canvas, бордер #1f2937. */
const SUMMARY_CARD_BG = "#111923";
const SUMMARY_CARD_BORDER = "#1F2937";
const CART_STATUS_COLOR: Record<PartWishlistItemStatus, string> = {
  NEEDED: "#FF3B30",
  ORDERED: "#F5C400",
  BOUGHT: "#36A3FF",
  INSTALLED: "#30D158",
  REJECTED: "#8E8E93",
};

function tintRgb(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const value = Number.parseInt(raw, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Полный путь к узлу — как `nodePathForRow` на web-корзине
 * (`A > B > C` из имён в дереве, fallback на имя листа из API).
 */
function wishlistNodePathForRow(
  nodes: NodeTreeItem[],
  nodeId: string | null | undefined,
  fallbackLeafName?: string | null
): string {
  if (!nodeId?.trim()) {
    const leaf = fallbackLeafName?.trim();
    return leaf ? leaf.toUpperCase() : "—";
  }
  const pathIds = findNodePathById(nodes, nodeId);
  if (!pathIds?.length) {
    const leaf = fallbackLeafName?.trim();
    return leaf ? leaf.toUpperCase() : "—";
  }
  const label = pathIds
    .map((id) => findNodeTreeItemById(nodes, id)?.name ?? id)
    .join(" › ");
  return label
    .split(" › ")
    .map((segment) => segment.toUpperCase())
    .join(" > ");
}

function wishlistRowPriceCell(item: PartWishlistItemViewModel): string {
  return item.costLabelRu?.trim() || "—";
}

function detailPriceDisplay(item: PartWishlistItemViewModel): string {
  if (item.costLabelRu?.trim()) {
    return item.costLabelRu.trim();
  }
  const line = wishlistLineTotalAmount(item);
  if (line != null && line > 0) {
    return `${formatExpenseAmountRu(line)} ${(item.currency ?? "RUB").toUpperCase()}`;
  }
  return "—";
}

/** История в панели деталей — как на web без локального журнала переходов статусов. */
function buildDetailHistoryEvents(item: PartWishlistItemViewModel): { key: string; at: string; label: string }[] {
  const events: Array<{ key: string; at: string; label: string } | null> = [
    { key: "created", at: item.createdAt, label: "Создано" },
    item.updatedAt !== item.createdAt && item.status !== "NEEDED"
      ? {
          key: "status",
          at: item.updatedAt,
          label: `Статус: ${partWishlistStatusLabelsRu["NEEDED"]} → ${partWishlistStatusLabelsRu[item.status]}`,
        }
      : null,
    item.commentBodyRu
      ? { key: "comment", at: item.updatedAt, label: "Комментарий добавлен" }
      : null,
  ];
  return events
    .filter((row): row is { key: string; at: string; label: string } => Boolean(row))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** Компактная сумма в строке со счётчиком (без «на …», чтобы влезало в узкую колонку). */
function formatSummaryAmountRubCompact(amount: number): string {
  if (amount <= 0) {
    return "—";
  }
  return `${formatExpenseAmountRu(amount)} ₽`;
}

/** Как web `PartsCartPage`: повтор для заказано / куплено / установлено при привязке к узлу. */
function canRepeatWishlistPurchase(item: PartWishlistItemViewModel): boolean {
  return Boolean(item.nodeId?.trim()) &&
    (item.status === "ORDERED" || item.status === "BOUGHT" || item.status === "INSTALLED");
}

const SWIPE_DX = 72;
const SWIPE_MAX_DY = 56;

type WishlistRowSwipeShellProps = {
  busy: boolean;
  children: ReactNode;
  onSwipeRightEdit: () => void;
  onSwipeLeftDelete: () => void;
};

/** Свайп вправо — редактирование, влево — удаление (подтверждение удаления в `confirmDelete`). */
function WishlistRowSwipeShell({
  busy,
  children,
  onSwipeRightEdit,
  onSwipeLeftDelete,
}: WishlistRowSwipeShellProps) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, g) =>
          !busy && Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.15,
        onPanResponderRelease: (_evt, g) => {
          if (busy) {
            return;
          }
          if (g.dx > SWIPE_DX && Math.abs(g.dy) < SWIPE_MAX_DY) {
            onSwipeRightEdit();
            return;
          }
          if (g.dx < -SWIPE_DX && Math.abs(g.dy) < SWIPE_MAX_DY) {
            onSwipeLeftDelete();
          }
        },
      }),
    [busy, onSwipeLeftDelete, onSwipeRightEdit]
  );
  return <View {...panResponder.panHandlers}>{children}</View>;
}

export default function VehicleWishlistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    wishlistItemId?: string;
    partsStatus?: string;
    partsSearch?: string;
    installWishlistItemId?: string;
    picked?: string;
  }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const highlightedWishlistItemId =
    typeof params.wishlistItemId === "string" ? params.wishlistItemId : "";
  const partsStatusParam = typeof params.partsStatus === "string" ? params.partsStatus : "";
  const installWishlistItemId =
    typeof params.installWishlistItemId === "string" ? params.installWishlistItemId : "";
  const pickedParam = typeof params.picked === "string" ? params.picked : "";
  const partsSearchFromRoute =
    typeof params.partsSearch === "string" ? params.partsSearch.trim() : "";
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [wishlistStatusMenuItemId, setWishlistStatusMenuItemId] = useState<string | null>(null);
  const [repeatPurchaseConfirmItem, setRepeatPurchaseConfirmItem] =
    useState<PartWishlistItemViewModel | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [detailHistoryExpanded, setDetailHistoryExpanded] = useState(false);
  const [items, setItems] = useState<PartWishlistItemViewModel[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [serviceEventIdByWishlistItemId, setServiceEventIdByWishlistItemId] = useState<
    Map<string, string>
  >(() => new Map());
  const [statusFilter, setStatusFilter] = useState<PartsStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Partial<Record<PartWishlistItemStatus, boolean>>
  >({ INSTALLED: true });
  const [visibleCountByStatus, setVisibleCountByStatus] = useState<
    Partial<Record<PartWishlistItemStatus, number>>
  >({});
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [headerScrollY, setHeaderScrollY] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const itemYByIdRef = useRef<Record<string, number>>({});
  const loadSeqRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  const applyServiceEventLinks = useCallback(
    (serviceEvents: Awaited<ReturnType<ReturnType<typeof createMobileApiClient>["getServiceEvents"]>>["serviceEvents"]) => {
      const byWishlistItemId = new Map<string, string>();
      const newestEventsFirst = [...(serviceEvents ?? [])].sort((left, right) => {
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
        const wlIds = getWishlistItemIdsFromInstalledPartsJson(event.installedPartsJson);
        for (const wishlistItemId of wlIds) {
          if (wishlistItemId && !byWishlistItemId.has(wishlistItemId)) {
            byWishlistItemId.set(wishlistItemId, event.id);
          }
        }
      }
      setServiceEventIdByWishlistItemId(byWishlistItemId);
    },
    []
  );

  const loadWishlistExtras = useCallback(
    async (
      seq: number,
      endpoints: ReturnType<typeof createMobileApiClient>
    ) => {
      const [serviceResult, nodeTreeResult] = await Promise.allSettled([
        endpoints.getServiceEvents(vehicleId),
        endpoints.getNodeTree(vehicleId),
      ]);
      if (seq !== loadSeqRef.current) {
        return;
      }
      if (serviceResult.status === "fulfilled") {
        applyServiceEventLinks(serviceResult.value.serviceEvents);
      }
      if (nodeTreeResult.status === "fulfilled") {
        setNodeTree(nodeTreeResult.value.nodeTree ?? []);
      }
    },
    [applyServiceEventLinks, vehicleId]
  );

  const load = useCallback(async (): Promise<PartWishlistItemViewModel[] | null> => {
    if (!vehicleId) {
      setError("Не удалось определить ID мотоцикла.");
      setIsLoading(false);
      return null;
    }

    const seq = ++loadSeqRef.current;
    const showBlockingSpinner = !hasLoadedOnceRef.current;
    prioritizeMobileApiForNavigation();

    try {
      if (showBlockingSpinner) {
        setIsLoading(true);
        setError("");
      }
      const endpoints = createMobileApiClient();
      const fetchCore = () =>
        withAuthGuard(
          () =>
            Promise.all([
              endpoints.getVehicleWishlist(vehicleId),
              endpoints.getVehicleDetail(vehicleId),
            ]),
          () => router.replace("/login")
        );

      let payload: Awaited<ReturnType<typeof fetchCore>> | null = null;
      try {
        payload = await fetchCore();
      } catch (firstError) {
        const isTimeout =
          firstError instanceof Error &&
          firstError.message.includes("Превышено время ожидания");
        if (!isTimeout || seq !== loadSeqRef.current) {
          throw firstError;
        }
        prioritizeMobileApiForNavigation();
        payload = await fetchCore();
      }

      if (seq !== loadSeqRef.current) {
        return null;
      }
      if (!payload) {
        return null;
      }

      const [wishlistData, vehicleData] = payload;
      setVehicle(
        vehicleData.vehicle
          ? vehicleDetailFromApiRecord(vehicleData.vehicle as unknown as VehicleDetailApiRecord)
          : null
      );
      const mappedItems = (wishlistData.items ?? []).map(buildPartWishlistItemViewModel);
      setItems(mappedItems);
      hasLoadedOnceRef.current = true;
      setError("");
      void loadWishlistExtras(seq, endpoints);
      return mappedItems;
    } catch (e) {
      if (seq !== loadSeqRef.current) {
        return null;
      }
      if (e instanceof Error && e.message === "Запрос отменён.") {
        return null;
      }
      setError("Не удалось загрузить список покупок.");
      if (showBlockingSpinner) {
        setItems([]);
        setVehicle(null);
        setNodeTree([]);
      }
      return null;
    } finally {
      if (seq === loadSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, [loadWishlistExtras, router, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        loadSeqRef.current += 1;
      };
    }, [load])
  );

  useEffect(() => {
    hasLoadedOnceRef.current = false;
  }, [vehicleId]);

  useEffect(() => {
    if (
      partsStatusParam === "NEEDED" ||
      partsStatusParam === "ORDERED" ||
      partsStatusParam === "BOUGHT" ||
      partsStatusParam === "INSTALLED"
    ) {
      setStatusFilter(partsStatusParam);
      setCollapsedGroups((prev) => ({ ...prev, [partsStatusParam]: false }));
    }
  }, [partsStatusParam]);

  useEffect(() => {
    if (partsSearchFromRoute) {
      setSearchQuery(partsSearchFromRoute);
    }
  }, [partsSearchFromRoute]);

  useEffect(() => {
    if (detailItemId && !items.some((row) => row.id === detailItemId)) {
      setDetailItemId(null);
    }
  }, [detailItemId, items]);

  useEffect(() => {
    setDetailHistoryExpanded(false);
  }, [detailItemId]);

  const detailItem = useMemo(
    () => (detailItemId ? (items.find((row) => row.id === detailItemId) ?? null) : null),
    [detailItemId, items]
  );

  const cartSummary = useMemo(() => buildPartsCartSummary(items), [items]);
  const summaryCards = useMemo(() => {
    const summaryMetricByStatus: Record<
      PartWishlistItemStatus,
      "needed" | "ordered" | "bought" | "installed" | "rejected"
    > = {
      NEEDED: "needed",
      ORDERED: "ordered",
      BOUGHT: "bought",
      INSTALLED: "installed",
      REJECTED: "rejected",
    };
    const iconByStatus: Record<
      PartWishlistItemStatus,
      "report-problem" | "inventory-2" | "shopping-bag" | "check-circle" | "cancel"
    > = {
      NEEDED: "report-problem",
      ORDERED: "inventory-2",
      BOUGHT: "shopping-bag",
      INSTALLED: "check-circle",
      REJECTED: "cancel",
    };
    return [
      {
        key: "all",
        label: "Все",
        value: cartSummary.all,
        color: PARTS_CART_REF.orange,
        icon: "view-headline" as const,
        filter: "ALL" as const,
      },
      ...PART_WISHLIST_STATUS_ORDER.map((status) => ({
        key: status,
        label: WEB_WISHLIST_STATUS_LABELS[status],
        value: cartSummary[summaryMetricByStatus[status]],
        color: CART_STATUS_COLOR[status],
        icon: iconByStatus[status],
        filter: status,
      })),
    ];
  }, [cartSummary]);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      if (!normalizedSearchQuery) {
        return true;
      }
      const skuLines = item.sku ? getWishlistItemSkuDisplayLines(item.sku) : null;
      const pathLine = wishlistNodePathForRow(nodeTree, item.nodeId, item.node?.name ?? null);
      const haystack = [
        item.title,
        item.statusLabelRu,
        item.node?.name ?? "",
        pathLine,
        item.costLabelRu ?? "",
        item.kitOriginLabelRu ?? "",
        item.commentBodyRu ?? "",
        skuLines?.primaryLine ?? "",
        skuLines?.secondaryLine ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearchQuery);
    });
  }, [items, nodeTree, normalizedSearchQuery, statusFilter]);
  const groups = useMemo(() => groupPartWishlistItemsByStatus(filteredItems), [filteredItems]);

  const wishlistStatusMenuItem = useMemo(
    () =>
      wishlistStatusMenuItemId
        ? (items.find((candidate) => candidate.id === wishlistStatusMenuItemId) ?? null)
        : null,
    [items, wishlistStatusMenuItemId]
  );
  const closeWishlistStatusMenu = useCallback(() => {
    setWishlistStatusMenuItemId(null);
  }, []);

  /** На RN второй `Modal` поверх листа детали часто не показывается — сначала закрываем другие модалки. */
  const openRepeatPurchaseConfirm = useCallback(
    (item: PartWishlistItemViewModel) => {
      closeWishlistStatusMenu();
      setDetailItemId(null);
      InteractionManager.runAfterInteractions(() => {
        setRepeatPurchaseConfirmItem(item);
      });
    },
    [closeWishlistStatusMenu]
  );

  /** Без смены URL: иначе useFocusEffect снова вызывает load() → isLoading и сброс модалки деталей. */
  const applyWishlistRowFocus = useCallback(
    (itemId: string, itemsSnapshot: PartWishlistItemViewModel[]) => {
      const highlightedItem = itemsSnapshot.find((i) => i.id === itemId);
      if (!highlightedItem) {
        return;
      }
      const st = highlightedItem.status;
      setStatusFilter(st);
      setSearchQuery("");
      setCollapsedGroups((prev) => ({ ...prev, [st]: false }));
      const itemsInStatus = itemsSnapshot.filter((i) => i.status === st);
      const highlightedIndex = itemsInStatus.findIndex((i) => i.id === itemId);
      if (highlightedIndex >= 0) {
        setVisibleCountByStatus((prev) => ({
          ...prev,
          [st]: Math.max(prev[st] ?? INITIAL_VISIBLE_COUNT, highlightedIndex + 1),
        }));
      }
      setTimeout(() => {
        const y = itemYByIdRef.current[itemId];
        if (typeof y === "number") {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
        }
      }, 120);
      setTimeout(() => {
        setDetailItemId(itemId);
      }, 220);
    },
    []
  );

  const vehicleCardVm = useMemo(
    () => (vehicle ? buildVehicleDetailViewModel(vehicle) : null),
    [vehicle]
  );
  useEffect(() => {
    if (!highlightedWishlistItemId || items.length === 0 || !vehicleId) {
      return;
    }
    const highlightedItem = items.find((item) => item.id === highlightedWishlistItemId);
    if (!highlightedItem) {
      return;
    }
    setStatusFilter(highlightedItem.status);
    setSearchQuery("");
    setCollapsedGroups((prev) => ({ ...prev, [highlightedItem.status]: false }));
    const itemsInStatus = items.filter((item) => item.status === highlightedItem.status);
    const highlightedIndex = itemsInStatus.findIndex((item) => item.id === highlightedItem.id);
    if (highlightedIndex >= 0) {
      setVisibleCountByStatus((prev) => ({
        ...prev,
        [highlightedItem.status]: Math.max(
          prev[highlightedItem.status] ?? INITIAL_VISIBLE_COUNT,
          highlightedIndex + 1
        ),
      }));
    }
    const skipDetailSheet =
      Boolean(installWishlistItemId.trim()) &&
      installWishlistItemId === highlightedWishlistItemId;

    const scrollTimeoutId = setTimeout(() => {
      const y = itemYByIdRef.current[highlightedWishlistItemId];
      if (typeof y === "number") {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
      }
    }, 120);

    /** Как web: панель деталей открыта сразу после перехода из журнала по «Из списка покупок».
     *  Без `router.replace` на «голый» wishlist: иначе снова срабатывает useFocusEffect → load(),
     *  экран может перемонтироваться и фильтр сбрасывается в «Все», деталь пропадает. */
    const detailTimeoutId = skipDetailSheet
      ? null
      : setTimeout(() => {
          setDetailItemId(highlightedWishlistItemId);
        }, 220);

    return () => {
      clearTimeout(scrollTimeoutId);
      if (detailTimeoutId != null) {
        clearTimeout(detailTimeoutId);
      }
    };
  }, [highlightedWishlistItemId, installWishlistItemId, items, vehicleId]);

  useEffect(() => {
    if (!installWishlistItemId || items.length === 0 || !vehicleId) {
      return;
    }
    const item = items.find((candidate) => candidate.id === installWishlistItemId);
    if (!item || item.status !== "BOUGHT") {
      return;
    }
    replaceServiceEventNewFromWishlist(router, vehicleId, item, { pendingInstall: true });
  }, [installWishlistItemId, items, router, vehicleId]);

  useEffect(() => {
    if (!pickedParam.trim() || isLoading || items.length === 0 || !vehicleId) {
      return;
    }
    const ids = pickedParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const found = ids.filter((id) => items.some((row) => row.id === id));
    if (found.length > 0) {
      setStatusFilter("ALL");
      setSearchQuery("");
      setCollapsedGroups((prev) => {
        const next = { ...prev };
        for (const id of found) {
          const row = items.find((i) => i.id === id);
          if (row) {
            next[row.status] = false;
          }
        }
        return next;
      });
      const primaryId = found[0];
      const primaryRow = items.find((i) => i.id === primaryId);
      if (primaryRow) {
        const itemsInStatus = items.filter((i) => i.status === primaryRow.status);
        const highlightedIndex = itemsInStatus.findIndex((i) => i.id === primaryRow.id);
        if (highlightedIndex >= 0) {
          setVisibleCountByStatus((prev) => ({
            ...prev,
            [primaryRow.status]: Math.max(
              prev[primaryRow.status] ?? INITIAL_VISIBLE_COUNT,
              highlightedIndex + 1
            ),
          }));
        }
      }
    }
    const primaryIdForSheet = found.length > 0 ? found[0] : null;
    const message =
      found.length > 0 ? `Добавлено в список: ${found.length}` : "Список обновлён.";
    /**
     * Не открывать лист детали и не делать `router.replace` до закрытия Alert: иначе на RN
     * одновременно Modal + системный Alert даёт «тишину» и подвисание; плюс после `replace`
     * меняется `pickedParam`, cleanup эффекта отменяет отложенный scroll/alert.
     */
    Alert.alert("Готово", message, [
      {
        text: "OK",
        onPress: () => {
          router.replace(`/vehicles/${vehicleId}/wishlist`);
          if (primaryIdForSheet) {
            setDetailItemId(primaryIdForSheet);
            setTimeout(() => {
              const y = itemYByIdRef.current[primaryIdForSheet];
              if (typeof y === "number") {
                scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
              }
            }, 120);
          }
        },
      },
    ]);
  }, [pickedParam, isLoading, items, router, vehicleId]);

  async function patchStatus(
    item: PartWishlistItemViewModel,
    status: PartWishlistItemStatus,
    previousStatus: PartWishlistItemStatus
  ) {
    if (!vehicleId) {
      return;
    }
    const nodeId = item.nodeId?.trim() ?? "";
    if (!nodeId) {
      Alert.alert("Список покупок", "Выберите узел мотоцикла");
      return;
    }
    if (isWishlistTransitionToInstalled(previousStatus, status)) {
      setDetailItemId(null);
      pushServiceEventNewFromWishlist(router, vehicleId, item, { pendingInstall: true });
      return;
    }
    try {
      setBusyId(item.id);
      const endpoints = createMobileApiClient();
      const res = await withAuthGuard(
        () => endpoints.updateWishlistItem(vehicleId, item.id, { status, nodeId }),
        () => router.replace("/login")
      );
      if (!res) {
        return;
      }
      const nextItems = await load();
      if (isWishlistTransitionToInstalled(previousStatus, res.item.status)) {
        setDetailItemId(null);
        if (res.item.nodeId) {
          pushServiceEventNewFromWishlist(router, vehicleId, res.item, { pendingInstall: false });
        } else {
          Alert.alert("Список покупок", WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT);
        }
      } else if (nextItems) {
        applyWishlistRowFocus(res.item.id, nextItems);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось обновить статус.";
      Alert.alert("Ошибка", message);
    } finally {
      setBusyId(null);
    }
  }

  const confirmDelete = (item: PartWishlistItemViewModel) => {
    Alert.alert("Удалить позицию?", item.title, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          setDetailItemId((current) => (current === item.id ? null : current));
          void deleteItem(item.id);
        },
      },
    ]);
  };

  async function createExpenseFromWishlist(item: PartWishlistItemViewModel) {
    if (!vehicleId) {
      return;
    }
    const currency = item.currency;
    const lineTotal = wishlistLineTotalAmount(item);
    if (lineTotal == null || lineTotal <= 0 || !currency) {
      Alert.alert("Расходы", "Укажите цену за шт. и валюту в карточке позиции перед переносом в расходы.");
      return;
    }
    try {
      setBusyId(item.id);
      const endpoints = createMobileApiClient();
      const created = await withAuthGuard(
        () =>
          endpoints.createExpenseFromShoppingListItem(item.id, {
            amount: lineTotal,
            currency,
            purchasedAt: new Date().toISOString().slice(0, 10),
            comment: item.commentBodyRu ?? item.comment ?? null,
          }),
        () => router.replace("/login")
      );
      if (!created) {
        return;
      }
      await load();
      Alert.alert("Расходы", "Позиция отмечена купленной и добавлена в расходы.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось создать расход.";
      Alert.alert("Ошибка", message);
    } finally {
      setBusyId(null);
    }
  }

  function confirmCreateExpense(item: PartWishlistItemViewModel) {
    Alert.alert(
      "Добавить в расходы?",
      `${item.title}${item.costLabelRu ? `\n${item.costLabelRu}` : ""}`,
      [
        { text: "Отмена", style: "cancel" },
        { text: "Добавить", onPress: () => void createExpenseFromWishlist(item) },
      ]
    );
  }

  async function submitRepeatWishlistPurchase(source: PartWishlistItemViewModel) {
    if (!vehicleId) {
      return;
    }
    const nodeId = source.nodeId?.trim();
    if (!nodeId) {
      Alert.alert("Список покупок", "У позиции нет привязки к узлу — повторить покупку нельзя.");
      return;
    }
    try {
      setBusyId(source.id);
      const remark = "Повтор из корзины замен";
      const baseComment = source.comment?.trim() ?? "";
      const comment = baseComment ? `${baseComment} · ${remark}` : remark;
      const endpoints = createMobileApiClient();
      const res = await withAuthGuard(
        () =>
          endpoints.createWishlistItem(vehicleId, {
            nodeId,
            title: source.title.trim() || undefined,
            skuId: source.skuId ?? null,
            quantity: source.quantity >= 1 ? source.quantity : 1,
            comment,
            status: "NEEDED",
            costAmount: null,
            currency: null,
          }),
        () => router.replace("/login")
      );
      if (!res) {
        return;
      }
      const nextItems = await load();
      const newItemId = res.item.id;
      setRepeatPurchaseConfirmItem(null);
      setDetailItemId(null);
      setStatusFilter("NEEDED");
      /** Не вызывать `applyWishlistRowFocus` в том же тике, что и Alert — иначе Modal + Alert подвисают. */
      Alert.alert("Список покупок", "Добавлена новая позиция «Нужно» по этой запчасти.", [
        {
          text: "OK",
          onPress: () => {
            if (nextItems) {
              applyWishlistRowFocus(newItemId, nextItems);
            }
          },
        },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось повторить покупку.";
      Alert.alert("Ошибка", message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteItem(itemId: string) {
    if (!vehicleId) {
      return;
    }
    try {
      setBusyId(itemId);
      const endpoints = createMobileApiClient();
      const deleted = await withAuthGuard(
        () => endpoints.deleteWishlistItem(vehicleId, itemId),
        () => router.replace("/login")
      );
      if (!deleted) {
        return;
      }
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось удалить.";
      Alert.alert("Ошибка", message);
    } finally {
      setBusyId(null);
    }
  }

  if (!vehicleId) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text style={styles.error}>Не удалось определить ID мотоцикла.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color={c.textPrimary} />
        <Text style={styles.muted}>Загрузка…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text style={styles.error}>{error}</Text>
        <Pressable
          onPress={() => void load()}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>Повторить</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const scrollBottomPad = 88 + insets.bottom;
  const openGarage = () => router.push("/garage");
  const openNodes = () => router.push(`/vehicles/${vehicleId}/nodes`);
  const openJournal = () => router.push(`/vehicles/${vehicleId}/service-log`);
  const openPicker = () => router.push(`/vehicles/${vehicleId}/wishlist`);
  const openExpenses = () => router.push(`/vehicles/${vehicleId}/expenses`);
  const openProfile = () => router.push("/profile");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <InternalScreenChrome
        crumbs={[
          { label: "Мой гараж", href: "/" },
          {
            label: vehicle && vehicleCardVm ? vehicleCardVm.displayName : "Мотоцикл",
            href: `/vehicles/${vehicleId}`,
          },
          { label: "Корзина замен" },
        ]}
        title="Корзина замен и расходников"
        declutterMobile
        scrollOffsetY={headerScrollY}
        belowNavRow={
          vehicle ? (
            <GarageVehicleContextPlaque vehicle={vehicle} currentVehicleId={vehicleId} compactByDefault />
          ) : null
        }
      />
      <View style={styles.mainColumn}>
        <Text style={styles.pageSubtitle}>Список запчастей и расходников</Text>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollFlex}
          contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPad }]}
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => setHeaderScrollY(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <Text style={styles.sectionHint}>
            Сводка и поиск — как на сайте; установленные позиции привязаны к журналу после
            сохранения сервисного события.
          </Text>

          {items.length > 0 ? (
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                {summaryCards.map((card) => {
                  const active = statusFilter === card.filter;
                  return (
                    <Pressable
                      key={card.key}
                      onPress={() => setStatusFilter(card.filter)}
                      style={({ pressed }) => [
                        styles.summaryCard,
                        active && styles.summaryCardActive,
                        pressed && styles.summaryCardPressed,
                      ]}
                    >
                      <View style={styles.summaryIconWrap}>
                        <MaterialIcons name={card.icon} size={16} color={card.color} />
                      </View>
                      <Text
                        style={[styles.summaryLabel, { color: card.color }]}
                        numberOfLines={2}
                      >
                        {card.label}
                      </Text>
                      <Text style={styles.summaryCount}>{card.value.count}</Text>
                      <Text style={styles.summaryAmount} numberOfLines={1}>
                        {formatSummaryAmountRubCompact(card.value.amount)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.listPanel}>
            <View style={styles.listSearch}>
              <View style={styles.searchRow}>
                <View style={styles.searchShell}>
                  <MaterialIcons
                    name="search"
                    size={14}
                    color={PARTS_CART_REF.textSubtle}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Поиск по названию, SKU, узлу, комментарию"
                    placeholderTextColor={PARTS_CART_REF.textMuted}
                    style={styles.searchInputInner}
                  />
                </View>
                <Pressable
                  onPress={() => setFiltersVisible(true)}
                  style={({ pressed }) => [styles.filterButton, pressed && styles.filterButtonPressed]}
                >
                  <MaterialIcons name="tune" size={16} color={PARTS_CART_REF.text} />
                  <Text style={styles.filterButtonText}>Фильтры</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.listBody}>
              {items.length === 0 ? (
                <View style={styles.listEmpty}>
                  <Text style={styles.emptyTitle}>Список пуст</Text>
                  <Text style={styles.emptyText}>
                    Добавьте расходники и запчасти, которые планируете купить для этого мотоцикла.
                  </Text>
                </View>
              ) : groups.length === 0 ? (
                <View style={styles.listEmpty}>
                  <Text style={styles.emptyTitle}>Ничего не найдено</Text>
                  <Text style={styles.emptyText}>Измените статус в сводке или поисковый запрос.</Text>
                </View>
              ) : (
                <View style={styles.groups}>
                  {groups.map((group, groupIndex) => {
              const isCollapsed =
                Boolean(collapsedGroups[group.status]) &&
                statusFilter === "ALL" &&
                !normalizedSearchQuery;
              const visibleCount = visibleCountByStatus[group.status] ?? INITIAL_VISIBLE_COUNT;
              const visibleItems = isCollapsed ? [] : group.items.slice(0, visibleCount);
              const hiddenCount = Math.max(0, group.items.length - visibleItems.length);
              const isLastGroup = groupIndex === groups.length - 1;
              return (
              <View
                key={group.status}
                style={[styles.group, isLastGroup && styles.groupLast]}
              >
                <Pressable
                  onPress={() =>
                    setCollapsedGroups((prev) => ({
                      ...prev,
                      [group.status]: !prev[group.status],
                    }))
                  }
                  style={styles.groupHeader}
                >
                  <Text style={styles.groupTitle}>
                    {group.sectionTitleRu} · {group.items.length}
                  </Text>
                  <Text style={styles.groupToggle}>{isCollapsed ? "Развернуть" : "Свернуть"}</Text>
                </Pressable>
                {isCollapsed ? (
                  <Pressable
                    onPress={() =>
                      setCollapsedGroups((prev) => ({
                        ...prev,
                        [group.status]: false,
                      }))
                    }
                    style={({ pressed }) => [
                      styles.collapsedBox,
                      pressed && styles.collapsedBoxPressed,
                    ]}
                  >
                    <Text style={styles.collapsedText}>
                      Группа свернута. Позиций: {group.items.length}. Нажмите, чтобы развернуть.
                    </Text>
                  </Pressable>
                ) : null}
                {visibleItems.map((item) => {
                  const isBusy = busyId === item.id;
                  const isHighlighted = highlightedWishlistItemId === item.id;
                  return (
                    <WishlistRowSwipeShell
                      key={item.id}
                      busy={isBusy}
                      onSwipeRightEdit={() =>
                        router.push(`/vehicles/${vehicleId}/wishlist/${item.id}`)
                      }
                      onSwipeLeftDelete={() => confirmDelete(item)}
                    >
                      <View
                        onLayout={(event) => {
                          itemYByIdRef.current[item.id] = event.nativeEvent.layout.y;
                        }}
                        style={[styles.card, isHighlighted && styles.cardHighlighted]}
                      >
                        <View style={styles.rowTop}>
                          <View
                            style={[
                              styles.rowAccent,
                              { backgroundColor: CART_STATUS_COLOR[item.status] },
                            ]}
                          />
                          <View style={styles.rowBody}>
                            <Pressable
                              onPress={() => {
                                if (!isBusy) {
                                  setDetailItemId(item.id);
                                }
                              }}
                              disabled={isBusy}
                              style={({ pressed }) => [
                                styles.rowTapBlock,
                                pressed && styles.rowMainPressablePressed,
                              ]}
                            >
                              <View style={styles.rowThumb}>
                                <MaterialIcons
                                  name="inventory-2"
                                  size={22}
                                  color={PARTS_CART_REF.textSubtle}
                                />
                              </View>
                              <View style={styles.rowTitlePathCol}>
                                <View style={styles.rowTitleKitRow}>
                                  <Text style={styles.rowTitle} numberOfLines={2}>
                                    {item.title}
                                  </Text>
                                  {item.kitOriginLabelRu ? (
                                    <View style={styles.kitOriginBadge}>
                                      <Text
                                        style={[
                                          styles.kitOriginBadgeText,
                                          item.kitOriginKitCode ? styles.kitOriginBadgeTextMono : null,
                                        ]}
                                        numberOfLines={1}
                                      >
                                        {item.kitOriginKitCode ?? "Комплект"}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                                <Text style={styles.rowPath} numberOfLines={2}>
                                  {wishlistNodePathForRow(nodeTree, item.nodeId, item.node?.name ?? null)}
                                </Text>
                              </View>
                              <View style={styles.rowQtyCol}>
                                <Text style={styles.rowQtyValue}>{item.quantity}</Text>
                                <Text style={styles.rowQtyUnit}>шт</Text>
                              </View>
                            </Pressable>
                            <View style={styles.rowRightRail}>
                              <Text style={styles.rowPrice} numberOfLines={2}>
                                {wishlistRowPriceCell(item)}
                              </Text>
                              <View style={styles.rowStatusRail}>
                                <Pressable
                                  disabled={isBusy}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Сменить статус: ${WEB_WISHLIST_STATUS_LABELS[item.status]}`}
                                  onPress={() =>
                                    setWishlistStatusMenuItemId((prev) => (prev === item.id ? null : item.id))
                                  }
                                  style={({ pressed }) => {
                                    const st = CART_STATUS_COLOR[item.status];
                                    return [
                                      styles.statusBtn,
                                      styles.statusBtnUnderPrice,
                                      styles.statusBtnFlex,
                                      {
                                        borderColor: tintRgb(st, 0.28),
                                        backgroundColor: tintRgb(st, 0.15),
                                      },
                                      pressed && !isBusy && styles.statusBtnPressed,
                                    ];
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.statusBtnText,
                                      { color: CART_STATUS_COLOR[item.status] },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {WEB_WISHLIST_STATUS_LABELS[item.status]}
                                  </Text>
                                </Pressable>
                                {canRepeatWishlistPurchase(item) ? (
                                  <Pressable
                                    disabled={isBusy}
                                    accessibilityRole="button"
                                    accessibilityLabel="Повторить покупку"
                                    onPress={() => openRepeatPurchaseConfirm(item)}
                                    style={({ pressed }) => [
                                      styles.repeatPurchaseRowIconBtn,
                                      pressed && !isBusy && styles.statusBtnPressed,
                                    ]}
                                  >
                                    <MaterialIcons
                                      name="add-shopping-cart"
                                      size={17}
                                      color={PARTS_CART_REF.orange}
                                    />
                                  </Pressable>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        </View>
                        {isBusy ? (
                          <View style={styles.cardBusyOverlay} pointerEvents="box-none">
                            <ActivityIndicator size="small" color={PARTS_CART_REF.textMuted} />
                          </View>
                        ) : null}
                      </View>
                    </WishlistRowSwipeShell>
                  );
                })}
                {!isCollapsed && hiddenCount > 0 ? (
                  <Pressable
                    onPress={() =>
                      setVisibleCountByStatus((prev) => ({
                        ...prev,
                        [group.status]:
                          (prev[group.status] ?? INITIAL_VISIBLE_COUNT) + VISIBLE_INCREMENT,
                      }))
                    }
                    style={styles.showMoreButton}
                  >
                    <Text style={styles.showMoreText}>
                      Показать ещё {Math.min(VISIBLE_INCREMENT, hiddenCount)}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              );
            })}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <Pressable
          onPress={() => router.push(buildVehicleWishlistCommunityHref(vehicleId))}
          style={({ pressed }) => [styles.communityLink, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Text style={styles.communityLinkText}>Добавить свою деталь</Text>
        </Pressable>

        <View style={[styles.footer, { paddingBottom: 10 }]}>
          <Pressable
            onPress={() => router.push(buildVehicleWishlistNewHref(vehicleId))}
            style={({ pressed }) => [styles.footerSecondary, pressed && styles.footerSecondaryPressed]}
          >
            <MaterialIcons name="inventory-2" size={18} color={c.textSecondary} />
            <Text style={styles.footerSecondaryText}>Добавить комплект</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(buildVehicleWishlistNewHref(vehicleId))}
            style={({ pressed }) => [styles.footerPrimary, pressed && styles.footerPrimaryPressed]}
          >
            <Text style={styles.footerPrimaryText}>+ Добавить позицию</Text>
          </Pressable>
        </View>
        <GarageBottomNav
          activeKey="picker"
          onOpenGarage={openGarage}
          onOpenNodes={openNodes}
          onOpenJournal={openJournal}
          onOpenPicker={openPicker}
          onOpenExpenses={openExpenses}
          onOpenProfile={openProfile}
          hasVehicleContext
          currentVehicleId={vehicleId}
        />
      </View>

      <Modal
        visible={detailItem != null}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailItemId(null)}
      >
        <View style={styles.detailModalRoot} pointerEvents="box-none">
          <Pressable
            style={styles.detailModalScrim}
            onPress={() => setDetailItemId(null)}
            accessibilityLabel="Закрыть"
          />
          {detailItem ? (
            <View
              style={[
                styles.detailSheet,
                { paddingBottom: Math.max(insets.bottom, 14), maxHeight: "92%" },
              ]}
            >
              <View style={styles.detailGrabBar} />
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.detailHeader}>
                  <View style={styles.detailHeaderText}>
                    <View style={styles.detailTitleRow}>
                      <View style={styles.detailTitleTextWrap}>
                        <Text style={styles.detailTitle} numberOfLines={3}>
                          {detailItem.title}
                        </Text>
                      </View>
                      {detailItem.kitOriginLabelRu ? (
                        <View style={styles.kitOriginBadge}>
                          <Text
                            style={[
                              styles.kitOriginBadgeText,
                              detailItem.kitOriginKitCode ? styles.kitOriginBadgeTextMono : null,
                            ]}
                            numberOfLines={1}
                          >
                            {detailItem.kitOriginKitCode ?? "Комплект"}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[styles.detailStatus, { color: CART_STATUS_COLOR[detailItem.status] }]}
                    >
                      {WEB_WISHLIST_STATUS_LABELS[detailItem.status]}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setDetailItemId(null)}
                    style={styles.detailCloseBtn}
                    accessibilityLabel="Закрыть"
                  >
                    <Text style={styles.detailCloseBtnText}>×</Text>
                  </Pressable>
                </View>

                <View style={styles.detailProductBlock}>
                  <View style={styles.detailPreviewSlot}>
                    <MaterialIcons name="inventory-2" size={36} color={PARTS_CART_REF.textSubtle} />
                  </View>
                  <View style={styles.detailProductText}>
                    <View style={styles.detailProductNameRow}>
                      <View style={styles.detailProductNameTextWrap}>
                        <Text style={styles.detailProductName} numberOfLines={3}>
                          {detailItem.sku
                            ? getWishlistItemSkuDisplayLines(detailItem.sku).primaryLine
                            : detailItem.title}
                        </Text>
                      </View>
                      {detailItem.kitOriginLabelRu ? (
                        <View style={styles.kitOriginBadge}>
                          <Text
                            style={[
                              styles.kitOriginBadgeText,
                              detailItem.kitOriginKitCode ? styles.kitOriginBadgeTextMono : null,
                            ]}
                            numberOfLines={1}
                          >
                            {detailItem.kitOriginKitCode ?? "Комплект"}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.detailProductMeta} numberOfLines={2}>
                      {detailItem.sku
                        ? getWishlistItemSkuDisplayLines(detailItem.sku).secondaryLine
                        : detailItem.node?.name ?? "Ручная позиция"}
                    </Text>
                    {detailItem.sku ? (
                      <View style={styles.detailAftermarket}>
                        <Text style={styles.detailAftermarketText}>AFTERMARKET</Text>
                      </View>
                    ) : null}
                    {detailItem.sku?.primaryPartNumber ? (
                      <Text style={styles.detailProductMeta}>
                        Арт.: {detailItem.sku.primaryPartNumber}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.detailRows}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Узел</Text>
                    <Text style={styles.detailValue} numberOfLines={4}>
                      {wishlistNodePathForRow(nodeTree, detailItem.nodeId, detailItem.node?.name ?? null)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Количество</Text>
                    <Text style={styles.detailValue}>{detailItem.quantity} шт.</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Стоимость</Text>
                    <View style={styles.detailValueCol}>
                      {detailItem.unitCostLabelRu ? (
                        <>
                          <Text style={styles.detailValue}>{detailItem.unitCostLabelRu}</Text>
                          <Text style={styles.detailValueMuted}>Всего: {detailPriceDisplay(detailItem)}</Text>
                        </>
                      ) : (
                        <Text style={styles.detailValue}>{detailPriceDisplay(detailItem)}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Комментарий</Text>
                    <Text style={styles.detailValue}>
                      {detailItem.commentBodyRu?.trim() || "—"}
                    </Text>
                  </View>
                </View>

                <WishlistItemCompatibilityBlock
                  vehicleId={vehicleId}
                  nodeId={detailItem.nodeId}
                  partMasterId={detailItem.sku?.partMasterId ?? null}
                  skuId={detailItem.sku?.id ?? detailItem.skuId ?? null}
                />

                {detailItem.kitOriginLabelRu ? (
                  <View style={styles.detailKitBox}>
                    <Text style={styles.detailSectionLabel}>Из комплекта</Text>
                    <View style={styles.detailKitLineRow}>
                      {detailItem.kitOriginKitCode ? (
                        <View style={styles.detailKitCodeChip}>
                          <Text style={styles.detailKitCodeText} numberOfLines={1}>
                            {detailItem.kitOriginKitCode}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={[styles.detailKitLine, { flexShrink: 1 }]} numberOfLines={3}>
                        {detailItem.kitOriginTitleRu ??
                          detailItem.kitOriginLabelRu.replace(/^Из комплекта:\s*/i, "")}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.detailHistoryBox}>
                  <Pressable
                    onPress={() => setDetailHistoryExpanded((v) => !v)}
                    style={styles.detailHistoryToggle}
                  >
                    <Text style={styles.detailHistoryToggleMain}>История</Text>
                    <Text style={styles.detailHistoryToggleHint}>
                      {detailHistoryExpanded ? "Свернуть" : "Развернуть"}⌄
                    </Text>
                  </Pressable>
                  <View
                    style={[
                      styles.detailHistoryViewport,
                      detailHistoryExpanded && styles.detailHistoryViewportExpanded,
                    ]}
                  >
                    {buildDetailHistoryEvents(detailItem).map((event) => (
                      <View key={`${event.key}-${event.at}`} style={styles.detailHistoryItem}>
                        <Text style={styles.detailHistoryDate}>
                          {formatIsoCalendarDateRu(event.at)}
                        </Text>
                        <Text style={styles.detailHistoryLabel}>{event.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.detailActions}>
                  <Text style={styles.detailSectionLabel}>Действия</Text>
                  <Pressable
                    disabled={busyId === detailItem.id}
                    onPress={() => {
                      setDetailItemId(null);
                      router.push(`/vehicles/${vehicleId}/wishlist/${detailItem.id}`);
                    }}
                    style={({ pressed }) => [
                      styles.detailActionBtn,
                      {
                        backgroundColor: "transparent",
                        borderColor: PARTS_CART_REF.border,
                      },
                      pressed && styles.detailActionBtnPressed,
                    ]}
                  >
                    <MaterialIcons name="edit" size={17} color={PARTS_CART_REF.text} />
                    <Text style={styles.detailActionBtnText}>Редактировать</Text>
                  </Pressable>
                  {detailItem.status === "NEEDED" ? (
                    <Pressable
                      disabled={busyId === detailItem.id}
                      onPress={() => void patchStatus(detailItem, "ORDERED", detailItem.status)}
                      style={({ pressed }) => [
                        styles.detailActionBtn,
                        {
                          backgroundColor: tintRgb(CART_STATUS_COLOR.ORDERED, 0.18),
                          borderColor: tintRgb(CART_STATUS_COLOR.ORDERED, 0.35),
                        },
                        pressed && styles.detailActionBtnPressed,
                      ]}
                    >
                      <MaterialIcons name="local-shipping" size={17} color={CART_STATUS_COLOR.ORDERED} />
                      <Text style={[styles.detailActionBtnText, { color: CART_STATUS_COLOR.ORDERED }]}>
                        Заказать
                      </Text>
                    </Pressable>
                  ) : null}
                  {detailItem.status === "NEEDED" || detailItem.status === "ORDERED" ? (
                    <Pressable
                      disabled={busyId === detailItem.id}
                      onPress={() => confirmCreateExpense(detailItem)}
                      style={({ pressed }) => [
                        styles.detailActionBtn,
                        {
                          backgroundColor: tintRgb(CART_STATUS_COLOR.BOUGHT, 0.16),
                          borderColor: tintRgb(CART_STATUS_COLOR.BOUGHT, 0.35),
                        },
                        pressed && styles.detailActionBtnPressed,
                      ]}
                    >
                      <MaterialIcons name="shopping-bag" size={17} color={CART_STATUS_COLOR.BOUGHT} />
                      <Text style={[styles.detailActionBtnText, { color: CART_STATUS_COLOR.BOUGHT }]}>
                        Купить
                      </Text>
                    </Pressable>
                  ) : null}
                  {detailItem.status !== "INSTALLED" ? (
                    <Pressable
                      disabled={busyId === detailItem.id}
                      onPress={() => void patchStatus(detailItem, "INSTALLED", detailItem.status)}
                      style={({ pressed }) => [
                        styles.detailActionBtn,
                        {
                          backgroundColor: tintRgb(CART_STATUS_COLOR.INSTALLED, 0.16),
                          borderColor: tintRgb(CART_STATUS_COLOR.INSTALLED, 0.35),
                        },
                        pressed && styles.detailActionBtnPressed,
                      ]}
                    >
                      <MaterialIcons name="build" size={17} color={CART_STATUS_COLOR.INSTALLED} />
                      <Text style={[styles.detailActionBtnText, { color: CART_STATUS_COLOR.INSTALLED }]}>
                        Установить
                      </Text>
                    </Pressable>
                  ) : null}
                  {canRepeatWishlistPurchase(detailItem) ? (
                    <Pressable
                      disabled={busyId === detailItem.id}
                      onPress={() => openRepeatPurchaseConfirm(detailItem)}
                      style={({ pressed }) => [
                        styles.detailActionBtn,
                        {
                          backgroundColor: tintRgb(PARTS_CART_REF.orange, 0.22),
                          borderColor: tintRgb(PARTS_CART_REF.orange, 0.45),
                        },
                        pressed && styles.detailActionBtnPressed,
                      ]}
                    >
                      <MaterialIcons name="add-shopping-cart" size={17} color={PARTS_CART_REF.orange} />
                      <Text style={[styles.detailActionBtnText, { color: PARTS_CART_REF.orange }]}>
                        Повторить
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    disabled={busyId === detailItem.id}
                    onPress={() => confirmDelete(detailItem)}
                    style={({ pressed }) => [
                      styles.detailActionBtn,
                      {
                        backgroundColor: tintRgb(CART_STATUS_COLOR.NEEDED, 0.16),
                        borderColor: tintRgb(CART_STATUS_COLOR.NEEDED, 0.35),
                      },
                      pressed && styles.detailActionBtnPressed,
                    ]}
                  >
                    <MaterialIcons name="delete-outline" size={17} color={CART_STATUS_COLOR.NEEDED} />
                    <Text style={[styles.detailActionBtnText, { color: CART_STATUS_COLOR.NEEDED }]}>
                      Удалить
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  accessibilityLabel="Перейти в журнал обслуживания"
                  onPress={() => {
                    const eventId =
                      detailItem.status === "INSTALLED"
                        ? serviceEventIdByWishlistItemId.get(detailItem.id)
                        : null;
                    if (eventId) {
                      setDetailItemId(null);
                      router.push(buildVehicleServiceLogEventHref(vehicleId, eventId));
                    } else {
                      Alert.alert(
                        "Журнал обслуживания",
                        "Для установленной позиции не найдено связанное сервисное событие. Добавьте событие при установке или откройте журнал вручную."
                      );
                    }
                  }}
                  style={({ pressed }) => [styles.detailJournalBtn, pressed && styles.detailActionBtnPressed]}
                >
                  <Text style={styles.detailJournalBtnText}>Перейти</Text>
                  <Text style={styles.detailJournalChevron}>›</Text>
                </Pressable>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={filtersVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalScrimFill}
            onPress={() => setFiltersVisible(false)}
            accessibilityLabel="Закрыть"
          />
          <View style={styles.modalCenter} pointerEvents="box-none">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Фильтры</Text>
              <Text style={styles.modalBody}>
                Расширенные фильтры (узел, SKU, комплект, диапазон цены), как в веб-корзине, появятся здесь
                позже. Сейчас доступны поиск и карточки сводки по статусам.
              </Text>
              <Pressable
                onPress={() => setFiltersVisible(false)}
                style={({ pressed }) => [styles.modalClose, pressed && styles.modalClosePressed]}
              >
                <Text style={styles.modalCloseText}>Понятно</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={wishlistStatusMenuItem !== null}
        transparent
        animationType="fade"
        onRequestClose={closeWishlistStatusMenu}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalScrimFill}
            onPress={closeWishlistStatusMenu}
            accessibilityLabel="Закрыть"
          />
          <View style={styles.modalCenter} pointerEvents="box-none">
            <View style={styles.wishlistMenuCard}>
              {wishlistStatusMenuItem ? (
                <>
                  <Text style={styles.wishlistMenuTitle} numberOfLines={2}>
                    {wishlistStatusMenuItem.title}
                  </Text>
                  {PART_WISHLIST_STATUS_ORDER.map((status) => {
                    const isCurrent = status === wishlistStatusMenuItem.status;
                    const dotColor = CART_STATUS_COLOR[status];
                    return (
                      <Pressable
                        key={status}
                        disabled={busyId === wishlistStatusMenuItem.id || isCurrent}
                        onPress={() => {
                          closeWishlistStatusMenu();
                          void patchStatus(wishlistStatusMenuItem, status, wishlistStatusMenuItem.status);
                        }}
                        style={({ pressed }) => [
                          styles.wishlistStatusMenuRow,
                          pressed && !(busyId === wishlistStatusMenuItem.id || isCurrent)
                            ? styles.wishlistMenuRowPressed
                            : null,
                        ]}
                      >
                        <Text style={[styles.wishlistStatusMenuDot, { color: dotColor }]}>●</Text>
                        <Text style={styles.wishlistMenuRowText}>
                          {WEB_WISHLIST_STATUS_LABELS[status]}
                        </Text>
                        {isCurrent ? (
                          <Text style={styles.wishlistStatusMenuCurrentMark}>текущий</Text>
                        ) : (
                          <View style={styles.wishlistStatusMenuSpacer} />
                        )}
                      </Pressable>
                    );
                  })}
                  {canRepeatWishlistPurchase(wishlistStatusMenuItem) ? (
                    <Pressable
                      disabled={busyId === wishlistStatusMenuItem.id}
                      onPress={() => {
                        const it = wishlistStatusMenuItem;
                        if (it) openRepeatPurchaseConfirm(it);
                      }}
                      style={({ pressed }) => [
                        styles.wishlistStatusMenuRow,
                        pressed && !(busyId === wishlistStatusMenuItem.id)
                          ? styles.wishlistMenuRowPressed
                          : null,
                      ]}
                    >
                      <MaterialIcons name="add-shopping-cart" size={18} color={PARTS_CART_REF.orange} />
                      <Text style={[styles.wishlistMenuRowText, styles.wishlistRepeatPurchaseMenuText]}>
                        Повторить покупку
                      </Text>
                      <View style={styles.wishlistStatusMenuSpacer} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={closeWishlistStatusMenu}
                    style={({ pressed }) => [
                      styles.wishlistMenuCancelRow,
                      pressed && styles.wishlistMenuRowPressed,
                    ]}
                  >
                    <Text style={styles.wishlistMenuCancelText}>Отмена</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={repeatPurchaseConfirmItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (repeatPurchaseConfirmItem && busyId === repeatPurchaseConfirmItem.id) {
            return;
          }
          setRepeatPurchaseConfirmItem(null);
        }}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalScrimFill}
            onPress={() => {
              if (repeatPurchaseConfirmItem && busyId === repeatPurchaseConfirmItem.id) {
                return;
              }
              setRepeatPurchaseConfirmItem(null);
            }}
            accessibilityLabel="Закрыть"
          />
          <View style={styles.modalCenter} pointerEvents="box-none">
            {repeatPurchaseConfirmItem ? (
              <View style={styles.repeatPurchaseModalCard}>
                <View style={styles.repeatPurchaseModalTitleRow}>
                  <MaterialIcons name="add-shopping-cart" size={22} color={PARTS_CART_REF.orange} />
                  <Text style={styles.repeatPurchaseModalTitle}>Повторить покупку</Text>
                </View>
                <Text style={styles.repeatPurchaseModalLead}>
                  Запчасть будет добавлена в корзину замен в раздел «Нужно купить».
                </Text>
                <View style={styles.repeatPurchaseModalSummary}>
                  <Text style={styles.repeatPurchaseModalSummaryTitle}>
                    {repeatPurchaseConfirmItem.title}
                  </Text>
                  <Text style={styles.repeatPurchaseModalSummaryMeta}>
                    Узел:{" "}
                    {wishlistNodePathForRow(
                      nodeTree,
                      repeatPurchaseConfirmItem.nodeId,
                      repeatPurchaseConfirmItem.node?.name ?? null
                    )}
                  </Text>
                  <Text style={styles.repeatPurchaseModalSummaryMeta}>
                    {repeatPurchaseConfirmItem.sku
                      ? getWishlistItemSkuDisplayLines(repeatPurchaseConfirmItem.sku).primaryLine ?? "—"
                      : "Без артикула каталога"}
                    {" · "}
                    {repeatPurchaseConfirmItem.quantity} шт.
                  </Text>
                  {repeatPurchaseConfirmItem.costLabelRu ? (
                    <Text style={styles.repeatPurchaseModalSummaryCost}>
                      {repeatPurchaseConfirmItem.costLabelRu}
                    </Text>
                  ) : null}
                  <Text style={styles.repeatPurchaseModalSummaryMeta}>
                    Статус сейчас: {WEB_WISHLIST_STATUS_LABELS[repeatPurchaseConfirmItem.status]}
                  </Text>
                </View>
                <View style={styles.repeatPurchaseModalActions}>
                  <Pressable
                    disabled={busyId === repeatPurchaseConfirmItem.id}
                    onPress={() => setRepeatPurchaseConfirmItem(null)}
                    style={({ pressed }) => [
                      styles.repeatPurchaseModalBtnSecondary,
                      pressed && busyId !== repeatPurchaseConfirmItem.id && styles.detailActionBtnPressed,
                    ]}
                  >
                    <Text style={styles.repeatPurchaseModalBtnSecondaryText}>Отмена</Text>
                  </Pressable>
                  <Pressable
                    disabled={busyId === repeatPurchaseConfirmItem.id}
                    onPress={() => void submitRepeatWishlistPurchase(repeatPurchaseConfirmItem)}
                    style={({ pressed }) => [
                      styles.repeatPurchaseModalBtnPrimary,
                      pressed && busyId !== repeatPurchaseConfirmItem.id && styles.detailActionBtnPressed,
                    ]}
                  >
                    {busyId === repeatPurchaseConfirmItem.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.repeatPurchaseModalBtnPrimaryText}>Добавить в корзину</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas },
  mainColumn: { flex: 1 },
  scrollFlex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 0 },
  pageSubtitle: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    fontSize: 13,
    color: c.textMuted,
    lineHeight: 18,
  },
  sectionHint: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 17,
    marginBottom: 14,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: c.canvas,
  },
  muted: { marginTop: 10, fontSize: 14, color: c.textMuted },
  error: { color: c.error, fontSize: 14, textAlign: "center" },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  retryPressed: { opacity: 0.88 },
  retryText: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
  /** Сводка как на web: без общей обводки, только карточки. */
  summarySection: {
    marginBottom: 12,
  },
  /** Панель списка — как web `.listPanel` / `.listSearch`. */
  listPanel: {
    borderWidth: 1,
    borderColor: PARTS_LIST.panelBorder,
    borderRadius: 10,
    backgroundColor: PARTS_LIST.panelBg,
    marginBottom: 16,
    overflow: "hidden",
  },
  listSearch: {
    borderBottomWidth: 1,
    borderBottomColor: PARTS_LIST.panelBorder,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 11,
  },
  listBody: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  listEmpty: {
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "stretch",
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    alignItems: "flex-start",
    paddingTop: 5,
    paddingBottom: 6,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: SUMMARY_CARD_BORDER,
    backgroundColor: SUMMARY_CARD_BG,
  },
  summaryCardActive: {
    borderColor: PARTS_CART_REF.orange,
    shadowColor: PARTS_CART_REF.orange,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  summaryCardPressed: { opacity: 0.9 },
  summaryIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  summaryLabel: {
    marginTop: 3,
    width: "100%",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 10,
    textAlign: "left",
  },
  summaryCount: {
    marginTop: 2,
    width: "100%",
    fontSize: 12,
    fontWeight: "800",
    color: c.textPrimary,
    textAlign: "left",
  },
  summaryAmount: {
    marginTop: 1,
    width: "100%",
    fontSize: 8,
    fontWeight: "600",
    color: c.textMuted,
    textAlign: "left",
  },
  searchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  /** Как web `.searchInput` внутри `.searchBox`. */
  searchShell: {
    flex: 1,
    minWidth: 140,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    borderWidth: 1,
    borderColor: PARTS_LIST.panelBorder,
    borderRadius: 8,
    backgroundColor: PARTS_LIST.controlBg,
    paddingLeft: 10,
    paddingRight: 10,
  },
  searchIcon: { marginRight: 2 },
  searchInputInner: {
    flex: 1,
    minHeight: 34,
    paddingVertical: 0,
    paddingRight: 4,
    fontSize: 12,
    color: PARTS_CART_REF.text,
  },
  /** Как web `.filterButton`. */
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 34,
    minWidth: 88,
    paddingVertical: 0,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PARTS_LIST.panelBorder,
    backgroundColor: PARTS_LIST.controlBg,
  },
  filterButtonPressed: { opacity: 0.9 },
  filterButtonText: { fontSize: 12, fontWeight: "700", color: PARTS_CART_REF.text },
  emptyBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.border,
    borderRadius: 14,
    padding: 24,
    backgroundColor: c.cardMuted,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: PARTS_CART_REF.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 12,
    color: PARTS_CART_REF.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  /** Как web `.groups`. */
  groups: { gap: 0, paddingBottom: 2 },
  group: {
    gap: 3,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: PARTS_LIST.panelBorder,
  },
  groupLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingBottom: 7,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: PARTS_CART_REF.text,
    lineHeight: 16,
  },
  groupToggle: { color: PARTS_CART_REF.textMuted, fontSize: 12, fontWeight: "600", lineHeight: 16 },
  collapsedBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: PARTS_LIST.panelBorder,
    borderRadius: 8,
    padding: 10,
    backgroundColor: PARTS_LIST.controlBg,
  },
  collapsedBoxPressed: { opacity: 0.88 },
  collapsedText: { color: PARTS_CART_REF.textMuted, fontSize: 12, lineHeight: 16 },
  /** Как web `.row` + левая полоска `--row-accent`. */
  card: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PARTS_LIST.rowBorder,
    borderRadius: 8,
    backgroundColor: PARTS_LIST.rowBg,
  },
  cardHighlighted: {
    borderColor: PARTS_CART_REF.orange,
    shadowColor: PARTS_CART_REF.orange,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 56,
  },
  rowAccent: {
    width: 3,
    alignSelf: "stretch",
    opacity: 0.95,
  },
  /** Иконка + 2 строки (название, путь) + количество — как в референсе. */
  rowBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingRight: 4,
  },
  rowTapBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingLeft: 4,
    paddingRight: 2,
  },
  rowMainPressablePressed: { opacity: 0.92 },
  /** Как web `.thumb`. */
  rowThumb: {
    width: 36,
    height: 40,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: PARTS_LIST.chipBorder,
    backgroundColor: "#111923",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitlePathCol: { flex: 1, minWidth: 0, gap: 2 },
  rowTitleKitRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  kitOriginBadge: {
    maxWidth: 200,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "rgba(99, 102, 241, 0.14)",
  },
  kitOriginBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#c7d2fe",
    letterSpacing: 0.3,
  },
  kitOriginBadgeTextMono: {
    fontFamily: "Menlo",
    fontSize: 7.5,
    letterSpacing: 0.1,
  },
  /** Как web `.rowTitle` / `.rowPath`. */
  rowTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: PARTS_CART_REF.text,
    lineHeight: 15,
  },
  rowPath: {
    fontSize: 9,
    fontWeight: "600",
    color: PARTS_CART_REF.textMuted,
    lineHeight: 13,
  },
  rowQtyCol: {
    width: 36,
    flexShrink: 0,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  rowQtyValue: {
    fontSize: 14,
    fontWeight: "800",
    color: PARTS_CART_REF.text,
    lineHeight: 16,
  },
  rowQtyUnit: {
    marginTop: -1,
    fontSize: 9,
    fontWeight: "700",
    color: PARTS_CART_REF.textMuted,
    lineHeight: 11,
  },
  /** Цена и под ней плашка статуса — отдельная колонка. */
  rowRightRail: {
    flexShrink: 0,
    minWidth: 72,
    maxWidth: 100,
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "center",
    gap: 5,
    paddingLeft: 4,
  },
  /** Как web `.price`. */
  rowPrice: {
    fontSize: 10,
    fontWeight: "800",
    color: PARTS_CART_REF.text,
    lineHeight: 14,
    textAlign: "right",
  },
  /** Блокировка строки при запросе. */
  cardBusyOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  /** База под web `.statusPill` (цвета задаются в JSX от статуса). */
  statusBtn: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 5,
    borderWidth: 1,
    minHeight: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Плашка статуса под ценой в правой колонке. */
  statusBtnUnderPrice: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  /** Статус + опционально «Повторить покупку» в одной строке под ценой. */
  rowStatusRail: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "stretch",
    gap: 5,
  },
  statusBtnFlex: {
    flex: 1,
    minWidth: 0,
  },
  repeatPurchaseRowIconBtn: {
    width: 34,
    flexShrink: 0,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: tintRgb(PARTS_CART_REF.orange, 0.35),
    backgroundColor: tintRgb(PARTS_CART_REF.orange, 0.12),
    alignItems: "center",
    justifyContent: "center",
    minHeight: 22,
  },
  statusBtnPressed: { opacity: 0.88 },
  statusBtnText: { fontSize: 9, fontWeight: "800", lineHeight: 12 },
  wishlistMenuCard: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#111923",
    overflow: "hidden",
  },
  wishlistMenuTitle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 12,
    fontWeight: "700",
    color: PARTS_CART_REF.text,
    lineHeight: 16,
    borderBottomWidth: 1,
    borderBottomColor: PARTS_LIST.panelBorder,
  },
  wishlistStatusMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: PARTS_LIST.panelBorder,
  },
  wishlistMenuRowPressed: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  wishlistStatusMenuDot: {
    fontSize: 11,
    fontWeight: "800",
    width: 16,
    textAlign: "center",
  },
  wishlistMenuRowText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: PARTS_CART_REF.text,
  },
  wishlistStatusMenuCurrentMark: {
    fontSize: 10,
    fontWeight: "700",
    color: PARTS_CART_REF.textSubtle,
  },
  wishlistStatusMenuSpacer: { flex: 1 },
  wishlistMenuCancelRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  wishlistMenuCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: PARTS_CART_REF.textMuted,
  },
  wishlistRepeatPurchaseMenuText: {
    color: PARTS_CART_REF.orange,
    fontWeight: "700",
  },
  repeatPurchaseModalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PARTS_CART_REF.border,
    backgroundColor: "#111923",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  repeatPurchaseModalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  repeatPurchaseModalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: PARTS_CART_REF.text,
  },
  repeatPurchaseModalLead: {
    fontSize: 13,
    fontWeight: "600",
    color: PARTS_CART_REF.text,
    lineHeight: 19,
    marginBottom: 12,
  },
  repeatPurchaseModalSummary: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PARTS_CART_REF.border,
    backgroundColor: "#0b1118",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  repeatPurchaseModalSummaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: PARTS_CART_REF.text,
  },
  repeatPurchaseModalSummaryMeta: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "600",
    color: PARTS_CART_REF.textMuted,
    lineHeight: 15,
  },
  repeatPurchaseModalSummaryCost: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "800",
    color: CART_STATUS_COLOR.BOUGHT,
  },
  repeatPurchaseModalActions: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  repeatPurchaseModalBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PARTS_CART_REF.border,
    backgroundColor: "transparent",
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatPurchaseModalBtnSecondaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: PARTS_CART_REF.text,
  },
  repeatPurchaseModalBtnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: PARTS_CART_REF.orange,
    minWidth: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatPurchaseModalBtnPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  /** Как web `.showMore`. */
  showMoreButton: {
    marginTop: 2,
    paddingVertical: 6,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  showMoreText: { color: PARTS_CART_REF.textMuted, fontSize: 11, fontWeight: "600", textAlign: "center" },
  communityLink: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF5A00",
    backgroundColor: "rgba(255,90,0,0.1)",
    alignItems: "center",
  },
  communityLinkText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FF5A00",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.borderStrong,
    backgroundColor: c.canvas,
  },
  footerSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardSubtle,
  },
  footerSecondaryPressed: { opacity: 0.9 },
  footerSecondaryText: { fontSize: 13, fontWeight: "700", color: c.textSecondary },
  footerPrimary: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.primaryAction,
  },
  footerPrimaryPressed: { opacity: 0.92 },
  footerPrimaryText: { fontSize: 14, fontWeight: "800", color: c.onPrimaryAction },
  modalRoot: { flex: 1 },
  modalScrimFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.overlayModal,
  },
  modalCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 14,
    padding: 20,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: c.textPrimary, marginBottom: 10 },
  modalBody: { fontSize: 14, color: c.textSecondary, lineHeight: 20, marginBottom: 16 },
  modalClose: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: c.primaryAction,
  },
  modalClosePressed: { opacity: 0.9 },
  modalCloseText: { fontSize: 14, fontWeight: "700", color: c.onPrimaryAction },
  /** Нижняя модалка — как web `.detail`. */
  detailModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  detailModalScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  detailSheet: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: PARTS_LIST.panelBorder,
    backgroundColor: PARTS_DETAIL_BG,
    overflow: "hidden",
  },
  detailGrabBar: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginTop: 8,
    marginBottom: 4,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: PARTS_LIST.panelBorder,
  },
  detailHeaderText: { flex: 1, minWidth: 0 },
  detailTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
  },
  detailTitleTextWrap: { flex: 1, minWidth: 0 },
  detailTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: PARTS_CART_REF.text,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  detailStatus: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
  },
  detailCloseBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCloseBtnText: {
    fontSize: 22,
    color: PARTS_CART_REF.textMuted,
    lineHeight: 24,
  },
  detailProductBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PARTS_LIST.panelBorder,
  },
  detailPreviewSlot: {
    width: 68,
    height: 68,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: PARTS_LIST.chipBorder,
    backgroundColor: PARTS_LIST.controlBg,
    alignItems: "center",
    justifyContent: "center",
  },
  detailProductText: { flex: 1, minWidth: 0 },
  detailProductNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
  },
  detailProductNameTextWrap: { flex: 1, minWidth: 0 },
  detailProductName: {
    fontSize: 13,
    fontWeight: "800",
    color: PARTS_CART_REF.text,
    lineHeight: 17,
  },
  detailProductMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: PARTS_CART_REF.textMuted,
    lineHeight: 15,
  },
  detailAftermarket: {
    marginTop: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#2C3746",
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  detailAftermarketText: {
    fontSize: 9,
    fontWeight: "900",
    color: PARTS_LIST.metaLine,
  },
  detailRows: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: PARTS_LIST.panelBorder,
  },
  detailLabel: {
    width: 112,
    flexShrink: 0,
    fontSize: 11,
    lineHeight: 15,
    color: PARTS_CART_REF.textMuted,
  },
  detailValue: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    color: PARTS_CART_REF.text,
    textAlign: "right",
  },
  detailValueCol: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  detailValueMuted: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
    color: PARTS_CART_REF.textMuted,
    textAlign: "right",
  },
  detailKitBox: {
    marginHorizontal: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: PARTS_LIST.panelBorder,
    borderRadius: 8,
    backgroundColor: PARTS_LIST.rowBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailKitLineRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  detailKitCodeChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    flexShrink: 0,
  },
  detailKitCodeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#e2e8f0",
    fontFamily: "Menlo",
    letterSpacing: 0.2,
  },
  detailKitLine: {
    fontSize: 11,
    fontWeight: "700",
    color: PARTS_LIST.metaLine,
    lineHeight: 15,
  },
  detailSectionLabel: {
    marginBottom: 7,
    fontSize: 12,
    fontWeight: "800",
    color: PARTS_CART_REF.textMuted,
    lineHeight: 16,
  },
  detailHistoryBox: {
    marginHorizontal: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: PARTS_LIST.panelBorder,
    borderRadius: 8,
    backgroundColor: PARTS_LIST.rowBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailHistoryToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailHistoryToggleMain: {
    fontSize: 11,
    fontWeight: "800",
    color: PARTS_CART_REF.textMuted,
    lineHeight: 15,
  },
  detailHistoryToggleHint: {
    fontSize: 10,
    fontWeight: "700",
    color: PARTS_CART_REF.textSubtle,
  },
  detailHistoryViewport: {
    maxHeight: 34,
    overflow: "hidden",
    marginTop: 8,
    gap: 6,
  },
  detailHistoryViewportExpanded: {
    maxHeight: 116,
    overflow: "scroll",
  },
  detailHistoryItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 6,
  },
  detailHistoryDate: {
    width: 82,
    flexShrink: 0,
    fontSize: 10,
    lineHeight: 14,
    color: PARTS_LIST.metaLine,
  },
  detailHistoryLabel: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    color: PARTS_LIST.metaLine,
  },
  detailActions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  detailActionBtn: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  detailActionBtnPressed: { opacity: 0.88 },
  detailActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: PARTS_CART_REF.text,
  },
  detailJournalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PARTS_CART_REF.border,
    backgroundColor: PARTS_LIST.controlBg,
  },
  detailJournalBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: PARTS_CART_REF.text,
  },
  detailJournalChevron: {
    fontSize: 18,
    color: PARTS_CART_REF.textMuted,
  },
});
