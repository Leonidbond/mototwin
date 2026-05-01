"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  buildPartsCartSummary,
  findNodePathById,
  findNodeTreeItemById,
  formatExpenseAmountRu,
  formatIsoCalendarDateRu,
  getWishlistItemSkuDisplayLines,
  partWishlistStatusLabelsRu,
  PART_WISHLIST_STATUS_ORDER,
  type CartSummaryMetric,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type {
  NodeTreeItem,
  PartWishlistItem,
  PartWishlistItemStatus,
  PartWishlistItemViewModel,
  PartWishlistStatusGroupViewModel,
} from "@mototwin/types";
import { PARTS_CART_REF } from "./parts-cart-reference-theme";
import styles from "./PartsCartPage.module.css";

export type PartsStatusFilter = PartWishlistItemStatus | "ALL";

export type PartsAdvancedFilterState = {
  nodeId: string;
  skuMode: "ALL" | "WITH_SKU" | "WITHOUT_SKU";
  kitMode: "ALL" | "KIT" | "SINGLE";
  priceMode: "ALL" | "WITH_PRICE" | "WITHOUT_PRICE";
  minPrice: string;
  maxPrice: string;
};

export type PartsNodeFilterOption = { id: string; name: string; level: number };

const PARTS_SELECTION_INITIAL_VISIBLE_COUNT = 4;
const PARTS_SELECTION_COLLAPSED_VISIBLE_COUNT = 5;
const PARTS_SELECTION_VISIBLE_INCREMENT = 3;

type PartsCartPageProps = {
  vehicleDisplayName: string;
  vehicleYearOdometerLine: string;
  onNavigateBack: () => void;
  nodeTree: NodeTreeItem[];
  vehicleId: string;
  wishlistNotice: string | null;
  isWishlistLoading: boolean;
  wishlistError: string | null;
  onRetryWishlist: () => void;
  wishlistViewModels: PartWishlistItemViewModel[];
  filteredGroups: PartWishlistStatusGroupViewModel[];
  filteredViewModels: PartWishlistItemViewModel[];
  partsStatusFilter: PartsStatusFilter;
  onPartsStatusFilterChange: (value: PartsStatusFilter) => void;
  partsSearchQuery: string;
  onPartsSearchQueryChange: (value: string) => void;
  advancedFilters: PartsAdvancedFilterState;
  onAdvancedFiltersChange: (value: PartsAdvancedFilterState) => void;
  onResetAdvancedFilters: () => void;
  advancedFilterCount: number;
  nodeFilterOptions: PartsNodeFilterOption[];
  collapsedPartsStatusGroups: Partial<Record<PartWishlistItemStatus, boolean>>;
  onToggleCollapsedGroup: (status: PartWishlistItemStatus) => void;
  onExpandCollapsedGroup: (status: PartWishlistItemStatus) => void;
  partsVisibleCountByStatus: Partial<Record<PartWishlistItemStatus, number>>;
  onShowMoreInGroup: (status: PartWishlistItemStatus, increment: number, hiddenCount: number) => void;
  normalizedPartsSearchQuery: string;
  selectedWishlistItemId: string | null;
  statusTransitionHistoryByItemId: Partial<
    Record<
      string,
      {
        changedAt: string;
        previousStatus: PartWishlistItemStatus;
        nextStatus: PartWishlistItemStatus;
      }
    >
  >;
  onSelectWishlistItem: (id: string | null) => void;
  wishlistItems: PartWishlistItem[];
  wishlistStatusUpdatingId: string | null;
  wishlistDeletingId: string | null;
  installedWishlistServiceEventIdByItemId: Map<string, string>;
  onPatchWishlistItemStatus: (
    itemId: string,
    status: PartWishlistItem["status"],
    previousStatus: PartWishlistItem["status"]
  ) => void | Promise<void>;
  onOpenWishlistPurchaseExpense: (item: PartWishlistItem) => void;
  onOpenWishlistEdit: (item: PartWishlistItem) => void;
  onDeleteWishlistItem: (itemId: string, options?: { skipConfirm?: boolean }) => void | Promise<void>;
  onOpenWishlistCreate: () => void;
  onOpenWishlistAddKit: () => void;
  router: AppRouterInstance;
  hasNodeFilter: boolean;
  onClearNodeFilter: () => void;
};

function nodePathLabel(nodeTree: NodeTreeItem[], nodeId: string | null | undefined): string {
  if (!nodeId) {
    return "";
  }
  const pathIds = findNodePathById(nodeTree, nodeId);
  if (!pathIds?.length) {
    return "";
  }
  return pathIds.map((id) => findNodeTreeItemById(nodeTree, id)?.name ?? id).join(" › ");
}

function nodePathForRow(nodeTree: NodeTreeItem[], nodeId: string | null | undefined): string {
  const label = nodePathLabel(nodeTree, nodeId);
  return label ? label.split(" › ").map((s) => s.toUpperCase()).join(" > ") : "—";
}

function formatRubAmount(amount: number | null | undefined): string {
  if (amount == null || amount <= 0) {
    return "—";
  }
  return `${formatExpenseAmountRu(amount)} ₽`;
}

function formatSummaryAmount(amount: number): string {
  return amount > 0 ? `на ${formatExpenseAmountRu(amount)} ₽` : "—";
}

function statusColor(status: PartWishlistItemStatus): string {
  switch (status) {
    case "NEEDED":
      return PARTS_CART_REF.statusNeeded;
    case "ORDERED":
      return PARTS_CART_REF.statusOrdered;
    case "BOUGHT":
      return PARTS_CART_REF.statusBought;
    case "INSTALLED":
      return PARTS_CART_REF.statusInstalled;
  }
}

function tint(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const value = Number.parseInt(raw, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function SummaryIcon({ kind }: { kind: "all" | "needed" | "ordered" | "bought" | "installed" | "cart" }) {
  if (kind === "all") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 7h14M5 12h14M5 17h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "installed") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.65" />
        <path d="M7 12.3l3.2 3.2L17.5 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "ordered") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 8l7-4 7 4v8l-7 4-7-4V8z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 8l7 4 7-4M12 12v8" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  if (kind === "needed") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 5.5c-2.7 4.3-2.7 8.7 0 13M15 5.5c2.7 4.3 2.7 8.7 0 13" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6h15l-1.5 10H8L6 3H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="20" r="1.2" fill="currentColor" />
      <circle cx="17" cy="20" r="1.2" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function PartPlaceholderIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M9 9.5h14l-1.8 13H10.8L9 9.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M11 9.5c.8-2.5 2.4-3.8 5-3.8s4.2 1.3 5 3.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.5 14h7M12 18h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

function DetailActionIcon({ kind }: { kind: "edit" | "ordered" | "bought" | "installed" | "delete" }) {
  if (kind === "edit") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 19l4.2-1 9.1-9.1-3.2-3.2L6 14.8 5 19z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M13.8 7l3.2 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "ordered") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4.8 8.2L12 4.5l7.2 3.7v7.6L12 19.5l-7.2-3.7V8.2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M5.2 8.4l6.8 3.5 6.8-3.5M12 12v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "bought") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 5h12v14H6V5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M9 9h6M9 13h4M15 16.5h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "installed") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8.7 12.2l2.2 2.2 4.7-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 8h8l-.5 11h-7L8 8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 8h10M10 8V5h4v3M10.5 11.5v4M13.5 11.5v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function PartsCartPage(props: PartsCartPageProps) {
  const {
    onNavigateBack,
    nodeTree,
    vehicleId,
    wishlistNotice,
    isWishlistLoading,
    wishlistError,
    onRetryWishlist,
    wishlistViewModels,
    filteredGroups,
    filteredViewModels,
    partsStatusFilter,
    onPartsStatusFilterChange,
    partsSearchQuery,
    onPartsSearchQueryChange,
    advancedFilters,
    onAdvancedFiltersChange,
    onResetAdvancedFilters,
    advancedFilterCount,
    nodeFilterOptions,
    collapsedPartsStatusGroups,
    onToggleCollapsedGroup,
    onExpandCollapsedGroup,
    partsVisibleCountByStatus,
    onShowMoreInGroup,
    normalizedPartsSearchQuery,
    selectedWishlistItemId,
    statusTransitionHistoryByItemId,
    onSelectWishlistItem,
    wishlistItems,
    wishlistStatusUpdatingId,
    wishlistDeletingId,
    installedWishlistServiceEventIdByItemId,
    onPatchWishlistItemStatus,
    onOpenWishlistPurchaseExpense,
    onOpenWishlistEdit,
    onDeleteWishlistItem,
    onOpenWishlistCreate,
    onOpenWishlistAddKit,
    router,
    hasNodeFilter,
    onClearNodeFilter,
  } = props;

  const [deleteConfirmItemId, setDeleteConfirmItemId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isDetailPanelClosed, setIsDetailPanelClosed] = useState(false);
  const [isDetailHistoryExpanded, setIsDetailHistoryExpanded] = useState(false);
  const summary = useMemo(() => buildPartsCartSummary(wishlistViewModels), [wishlistViewModels]);

  const selectedVm = useMemo(() => {
    const selectedInFiltered = selectedWishlistItemId
      ? filteredViewModels.find((w) => w.id === selectedWishlistItemId)
      : null;
    return (
      selectedInFiltered ??
      filteredViewModels[0] ??
      wishlistViewModels.find((w) => w.id === selectedWishlistItemId) ??
      wishlistViewModels[0] ??
      null
    );
  }, [filteredViewModels, selectedWishlistItemId, wishlistViewModels]);
  const selectedRaw = useMemo(
    () => (selectedVm ? wishlistItems.find((w) => w.id === selectedVm.id) ?? null : null),
    [selectedVm, wishlistItems]
  );
  const selectedId = selectedVm?.id ?? null;

  const summaryCards: Array<{
    key: string;
    label: string;
    value: CartSummaryMetric;
    color: string;
    icon: "all" | "needed" | "ordered" | "bought" | "installed";
    filter: PartsStatusFilter;
  }> = [
    { key: "all", label: "Все", value: summary.all, color: "#ff6b00", icon: "all", filter: "ALL" },
    { key: "needed", label: "Нужно купить", value: summary.needed, color: PARTS_CART_REF.statusNeeded, icon: "needed", filter: "NEEDED" },
    { key: "ordered", label: "Заказано", value: summary.ordered, color: PARTS_CART_REF.statusOrdered, icon: "ordered", filter: "ORDERED" },
    { key: "bought", label: "Куплено", value: summary.bought, color: PARTS_CART_REF.statusBought, icon: "bought", filter: "BOUGHT" },
    { key: "installed", label: "Установлено", value: summary.installed, color: PARTS_CART_REF.statusInstalled, icon: "installed", filter: "INSTALLED" },
  ];

  const updateAdvancedFilters = (patch: Partial<PartsAdvancedFilterState>) => {
    onAdvancedFiltersChange({ ...advancedFilters, ...patch });
  };

  const selectWishlistItem = (id: string | null) => {
    setIsDetailPanelClosed(false);
    onSelectWishlistItem(id);
  };

  const openWishlistItemJournal = (item: PartWishlistItemViewModel) => {
    const installedServiceEventId = item.status === "INSTALLED" ? installedWishlistServiceEventIdByItemId.get(item.id) : null;
    if (installedServiceEventId) {
      router.push(`/vehicles/${vehicleId}/service-log?serviceEventId=${encodeURIComponent(installedServiceEventId)}`);
      return;
    }
    router.push(`/vehicles/${vehicleId}/service-log${item.nodeId ? `?nodeId=${encodeURIComponent(item.nodeId)}` : ""}`);
  };

  const runStatusAction = (item: PartWishlistItemViewModel, raw: PartWishlistItem, nextStatus: PartWishlistItemStatus) => {
    setOpenStatusMenuId(null);
    setOpenRowMenuId(null);
    if (nextStatus === item.status) {
      return;
    }
    if (nextStatus === "BOUGHT") {
      onOpenWishlistPurchaseExpense(raw);
      return;
    }
    void onPatchWishlistItemStatus(item.id, nextStatus, item.status);
  };

  const renderDetail = () => {
    if (isDetailPanelClosed || !selectedVm || !selectedRaw) {
      return (
        <aside className={styles.detail}>
          <div className={styles.emptyDetail}>Выберите позицию в списке слева — здесь появятся детали и действия.</div>
        </aside>
      );
    }

    const item = selectedVm;
    const raw = selectedRaw;
    const skuLines = item.sku ? getWishlistItemSkuDisplayLines(item.sku) : null;
    const st = statusColor(item.status);
    const isBusy = wishlistStatusUpdatingId === item.id || wishlistDeletingId === item.id;
    const installedServiceEventId = item.status === "INSTALLED" ? installedWishlistServiceEventIdByItemId.get(item.id) : null;
    const pathRow = nodePathForRow(nodeTree, item.nodeId);
    const priceDisplay =
      item.costLabelRu ??
      (item.costAmount != null ? `${formatRubAmount(item.costAmount)} ${(item.currency ?? "RUB").toUpperCase()}` : "—");
    const statusTransition = statusTransitionHistoryByItemId[item.id];
    const fallbackStatusTransition =
      !statusTransition && raw.updatedAt !== raw.createdAt && item.status !== "NEEDED"
        ? {
            changedAt: raw.updatedAt,
            previousStatus: "NEEDED" as const,
            nextStatus: item.status,
          }
        : null;
    const effectiveStatusTransition = statusTransition ?? fallbackStatusTransition;
    const historyEvents = [
      {
        key: "created",
        at: raw.createdAt,
        label: "Создано",
      },
      effectiveStatusTransition
        ? {
            key: "status",
            at: effectiveStatusTransition.changedAt,
            label: `Статус: ${partWishlistStatusLabelsRu[effectiveStatusTransition.previousStatus]} → ${partWishlistStatusLabelsRu[effectiveStatusTransition.nextStatus]}`,
          }
        : null,
      item.commentBodyRu
        ? {
            key: "comment",
            at: raw.updatedAt,
            label: "Комментарий добавлен",
          }
        : null,
    ]
      .filter((event): event is { key: string; at: string; label: string } => Boolean(event))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

    return (
      <aside className={styles.detail}>
        <div className={styles.detailInner}>
          <div className={styles.detailHeader}>
            <div>
              <h2 className={styles.detailTitle}>{item.title}</h2>
              <p className={styles.detailStatus} style={{ color: st }}>{item.statusLabelRu}</p>
            </div>
            <button type="button" className={styles.closeButton} onClick={() => setIsDetailPanelClosed(true)} aria-label="Закрыть панель">
              ×
            </button>
          </div>

          <div className={styles.productBlock}>
            <div className={styles.previewSlot} aria-label="Заглушка превью детали">
              <PartPlaceholderIcon />
            </div>
            <div className={styles.productText}>
              <p className={styles.productName}>{skuLines?.primaryLine ?? item.title}</p>
              <p className={styles.productMeta}>{skuLines?.secondaryLine ?? item.node?.name ?? "Ручная позиция"}</p>
              {item.sku ? <span className={styles.aftermarket}>AFTERMARKET</span> : null}
              {item.sku?.primaryPartNumber ? <p className={styles.productMeta}>Арт.: {item.sku.primaryPartNumber}</p> : null}
            </div>
          </div>

          <dl className={styles.detailRows}>
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>Узел</dt>
              <dd className={styles.detailValue}>{pathRow}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>Количество</dt>
              <dd className={styles.detailValue}>{item.quantity} шт.</dd>
            </div>
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>Стоимость</dt>
              <dd className={styles.detailValue}>{priceDisplay}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>Комментарий</dt>
              <dd className={styles.detailValue}>{item.commentBodyRu?.trim() || "—"}</dd>
            </div>
          </dl>

          {item.kitOriginLabelRu ? (
            <div className={styles.kitBox}>
              <p className={styles.sectionLabel}>Из комплекта</p>
              <div className={styles.kitLine}>
                <span>{item.kitOriginLabelRu.replace(/^Из комплекта:\s*/i, "")}</span>
              </div>
            </div>
          ) : null}

          <div className={`${styles.historyBox} ${styles.detailHistoryBox}`}>
            <button
              type="button"
              className={styles.historyToggle}
              onClick={() => setIsDetailHistoryExpanded((value) => !value)}
              aria-expanded={isDetailHistoryExpanded}
            >
              <span>История</span>
              <span aria-hidden>{isDetailHistoryExpanded ? "Свернуть" : "Развернуть"}⌄</span>
            </button>
            <div className={`${styles.historyViewport} ${isDetailHistoryExpanded ? styles.historyViewportExpanded : ""}`}>
              <ul className={styles.historyList}>
                {historyEvents.map((event) => (
                  <li key={`${event.key}-${event.at}`} className={styles.historyItem}>
                    <span>{formatIsoCalendarDateRu(event.at)}</span>
                    <span>{event.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.actions}>
            <p className={styles.sectionLabel}>Действия</p>
            <button type="button" className={styles.actionButton} onClick={() => onOpenWishlistEdit(raw)} disabled={isBusy} style={{ background: "transparent", borderColor: PARTS_CART_REF.border, color: PARTS_CART_REF.text }}>
              <span className={styles.actionIcon}><DetailActionIcon kind="edit" /></span>
              <span>Редактировать</span>
            </button>
            {item.status === "NEEDED" ? (
              <button type="button" className={styles.actionButton} onClick={() => onPatchWishlistItemStatus(item.id, "ORDERED", item.status)} disabled={isBusy} style={{ background: tint(PARTS_CART_REF.statusOrdered, 0.18), borderColor: tint(PARTS_CART_REF.statusOrdered, 0.35), color: PARTS_CART_REF.statusOrdered }}>
                <span className={styles.actionIcon}><DetailActionIcon kind="ordered" /></span>
                <span>Заказано</span>
              </button>
            ) : null}
            {(item.status === "NEEDED" || item.status === "ORDERED") ? (
              <button type="button" className={styles.actionButton} onClick={() => onOpenWishlistPurchaseExpense(raw)} disabled={isBusy} style={{ background: tint(PARTS_CART_REF.statusBought, 0.16), borderColor: tint(PARTS_CART_REF.statusBought, 0.35), color: PARTS_CART_REF.statusBought }}>
                <span className={styles.actionIcon}><DetailActionIcon kind="bought" /></span>
                <span>Куплено</span>
              </button>
            ) : null}
            {item.status !== "INSTALLED" ? (
              <button type="button" className={styles.actionButton} onClick={() => onPatchWishlistItemStatus(item.id, "INSTALLED", item.status)} disabled={isBusy} style={{ background: tint(PARTS_CART_REF.statusInstalled, 0.16), borderColor: tint(PARTS_CART_REF.statusInstalled, 0.35), color: PARTS_CART_REF.statusInstalled }}>
                <span className={styles.actionIcon}><DetailActionIcon kind="installed" /></span>
                <span>Установлено</span>
              </button>
            ) : null}
            <button type="button" className={styles.actionButton} onClick={() => setDeleteConfirmItemId(item.id)} disabled={isBusy} style={{ background: tint(PARTS_CART_REF.statusNeeded, 0.16), borderColor: tint(PARTS_CART_REF.statusNeeded, 0.35), color: PARTS_CART_REF.statusNeeded }}>
              <span className={styles.actionIcon}><DetailActionIcon kind="delete" /></span>
              <span>Удалить</span>
            </button>
          </div>

          <button
            type="button"
            className={styles.journalButton}
            onClick={() => {
              if (installedServiceEventId) {
                openWishlistItemJournal(item);
                return;
              }
              openWishlistItemJournal(item);
            }}
          >
            <span>Перейти в журнал обслуживания</span><span aria-hidden>›</span>
          </button>
        </div>
      </aside>
    );
  };

  return (
    <div className={styles.root}>
      <main className={styles.mainColumn}>
        <header className={styles.header}>
          <button type="button" onClick={onNavigateBack} className={styles.backButton} aria-label="Назад">←</button>
          <div>
            <h1 className={styles.title}>Корзина замен и расходников</h1>
            <p className={styles.subtitle}>Список запчастей и расходников для вашего мотоцикла.</p>
          </div>
          <div className={styles.headerActions}>
            <button type="button" onClick={onOpenWishlistAddKit} className={styles.secondaryAction}>
              <span aria-hidden>▣</span>
              <span>Добавить комплект</span>
            </button>
            <button type="button" onClick={onOpenWishlistCreate} className={styles.primaryAction}>+ Добавить позицию</button>
          </div>
        </header>

        {wishlistNotice ? <p className="text-[12px]" style={{ color: productSemanticColors.error }}>{wishlistNotice}</p> : null}

        {wishlistViewModels.length > 0 ? (
          <section className={styles.summaryGrid} aria-label="Сводка корзины">
            {summaryCards.map((card) => (
              <button
                key={card.key}
                type="button"
                className={`${styles.summaryCard} ${partsStatusFilter === card.filter ? styles.summaryCardActive : ""}`}
                onClick={() => {
                  onPartsStatusFilterChange(card.filter);
                  setIsDetailPanelClosed(false);
                }}
              >
                <span className={styles.summaryIcon} style={{ color: card.color }}><SummaryIcon kind={card.icon} /></span>
                <div className={styles.summaryCardBody}>
                  <p className={styles.summaryLabel} style={{ color: card.color }}>{card.label}</p>
                  <p className={styles.summaryStatsRow}>
                    <span className={styles.summaryCount}>{card.value.count}</span>
                    <span className={styles.summaryAmount}>{formatSummaryAmount(card.value.amount)}</span>
                  </p>
                </div>
              </button>
            ))}
          </section>
        ) : null}

        {isWishlistLoading ? (
          <div className={styles.contentGrid} aria-busy="true">
            <div className="h-9 animate-pulse rounded-lg" style={{ backgroundColor: PARTS_CART_REF.surfaceElevated }} />
            <div className="h-56 animate-pulse rounded-lg" style={{ backgroundColor: PARTS_CART_REF.surfaceElevated }} />
          </div>
        ) : null}

        {wishlistError ? (
          <div className={styles.historyBox}>
            <p className="text-sm font-semibold">Не удалось загрузить корзину</p>
            <p className="mt-1 text-xs" style={{ color: productSemanticColors.error }}>{wishlistError}</p>
            <button type="button" className={styles.primaryAction} onClick={onRetryWishlist}>Повторить</button>
          </div>
        ) : null}

        {!isWishlistLoading && !wishlistError && wishlistViewModels.length === 0 ? (
          <div className={styles.historyBox}>
            <p className="text-sm font-semibold">Корзина замен пуста</p>
            <p className="mt-1 text-xs" style={{ color: PARTS_CART_REF.textMuted }}>Добавьте деталь или готовый комплект обслуживания.</p>
          </div>
        ) : null}

        {!isWishlistLoading && !wishlistError && wishlistViewModels.length > 0 && filteredViewModels.length === 0 ? (
          <div className={styles.historyBox}>
            <p className="text-sm font-semibold">Ничего не найдено</p>
            <p className="mt-1 text-xs" style={{ color: PARTS_CART_REF.textMuted }}>Попробуйте изменить поиск или фильтры.</p>
          </div>
        ) : null}

        {wishlistViewModels.length > 0 ? (
          <section className={styles.listPanel} aria-label="Список позиций корзины">
            <div className={styles.listSearch}>
              <div className={styles.searchRow}>
                <div className={styles.searchBox}>
                  <span className={styles.searchIcon} aria-hidden><SearchIcon /></span>
                  <input className={styles.searchInput} value={partsSearchQuery} onChange={(e) => onPartsSearchQueryChange(e.target.value)} placeholder="Поиск по названию, SKU, узлу, комментарию" />
                </div>
                <button type="button" className={styles.filterButton} onClick={() => setIsFilterPanelOpen((value) => !value)} aria-expanded={isFilterPanelOpen}>
                  <FilterIcon />
                  <span>Фильтры</span>
                  {advancedFilterCount > 0 ? <span className={styles.filterCount}>{advancedFilterCount}</span> : null}
                </button>
              </div>
              {isFilterPanelOpen ? (
                <div className={styles.filterPanel}>
                  <div className={styles.filterPanelHeader}>
                    <p>Фильтры списка</p>
                    <button
                      type="button"
                      onClick={() => {
                        onResetAdvancedFilters();
                        if (hasNodeFilter) onClearNodeFilter();
                      }}
                    >
                      Сбросить
                    </button>
                  </div>
                  <div className={styles.filterGrid}>
                    <label className={styles.filterField}>
                      <span>Узел</span>
                      <select value={advancedFilters.nodeId} onChange={(e) => updateAdvancedFilters({ nodeId: e.target.value })}>
                        <option value="">Все узлы</option>
                        {nodeFilterOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {"\u00A0".repeat(Math.max(0, option.level - 1) * 2)}
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.filterField}>
                      <span>SKU</span>
                      <select value={advancedFilters.skuMode} onChange={(e) => updateAdvancedFilters({ skuMode: e.target.value as PartsAdvancedFilterState["skuMode"] })}>
                        <option value="ALL">Все</option>
                        <option value="WITH_SKU">С SKU</option>
                        <option value="WITHOUT_SKU">Без SKU</option>
                      </select>
                    </label>
                    <label className={styles.filterField}>
                      <span>Комплект</span>
                      <select value={advancedFilters.kitMode} onChange={(e) => updateAdvancedFilters({ kitMode: e.target.value as PartsAdvancedFilterState["kitMode"] })}>
                        <option value="ALL">Все</option>
                        <option value="KIT">Из комплекта</option>
                        <option value="SINGLE">Одиночные</option>
                      </select>
                    </label>
                    <label className={styles.filterField}>
                      <span>Стоимость</span>
                      <select value={advancedFilters.priceMode} onChange={(e) => updateAdvancedFilters({ priceMode: e.target.value as PartsAdvancedFilterState["priceMode"] })}>
                        <option value="ALL">Все</option>
                        <option value="WITH_PRICE">С ценой</option>
                        <option value="WITHOUT_PRICE">Без цены</option>
                      </select>
                    </label>
                    <label className={styles.filterField}>
                      <span>Цена от</span>
                      <input inputMode="decimal" value={advancedFilters.minPrice} onChange={(e) => updateAdvancedFilters({ minPrice: e.target.value })} placeholder="0" />
                    </label>
                    <label className={styles.filterField}>
                      <span>Цена до</span>
                      <input inputMode="decimal" value={advancedFilters.maxPrice} onChange={(e) => updateAdvancedFilters({ maxPrice: e.target.value })} placeholder="5000" />
                    </label>
                  </div>
                  {hasNodeFilter ? (
                    <button type="button" className={styles.clearNodeFilter} onClick={onClearNodeFilter}>
                      Сбросить фильтр узла из ссылки
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {!isWishlistLoading && !wishlistError && filteredGroups.length > 0 ? (
              <div className={styles.groups}>
                {filteredGroups.map((group) => {
                  const canCollapseGroup = partsStatusFilter === "ALL" && !normalizedPartsSearchQuery;
                  const isCollapsed = canCollapseGroup && Boolean(collapsedPartsStatusGroups[group.status]);
                  const visibleCount = canCollapseGroup
                    ? isCollapsed
                      ? PARTS_SELECTION_COLLAPSED_VISIBLE_COUNT
                      : partsVisibleCountByStatus[group.status] ?? PARTS_SELECTION_INITIAL_VISIBLE_COUNT
                    : group.items.length;
                  const visibleItems = group.items.slice(0, visibleCount);
                  const hiddenCount = Math.max(0, group.items.length - visibleItems.length);
                  return (
                    <div key={group.status}>
                      {canCollapseGroup ? (
                        <button type="button" className={styles.groupHeader} onClick={() => onToggleCollapsedGroup(group.status)}>
                          <span className={styles.groupTitle}>{group.sectionTitleRu} ({group.items.length})</span>
                          <span className={styles.collapseLabel}>{isCollapsed ? "Развернуть" : "Свернуть"}</span>
                        </button>
                      ) : (
                        <div className={styles.groupHeader}>
                          <span className={styles.groupTitle}>{group.sectionTitleRu} ({group.items.length})</span>
                        </div>
                      )}
                      <div className={styles.rows}>
                        {visibleItems.map((item) => {
                          const raw = wishlistItems.find((w) => w.id === item.id);
                          const skuLines = item.sku ? getWishlistItemSkuDisplayLines(item.sku) : null;
                          const st = statusColor(item.status);
                          const isSelected = item.id === selectedId;
                          const isBusy = wishlistStatusUpdatingId === item.id || wishlistDeletingId === item.id;
                          return (
                            <div key={item.id} className={styles.rowShell}>
                              <div
                                role="button"
                                tabIndex={0}
                                data-wishlist-item-id={item.id}
                                className={`${styles.row} ${isSelected ? styles.rowSelected : ""}`}
                                style={{ "--row-accent": st } as CSSProperties}
                                onClick={() => selectWishlistItem(item.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    selectWishlistItem(item.id);
                                  }
                                }}
                              >
                                <span className={styles.thumb} aria-hidden><PartPlaceholderIcon /></span>
                                <span className="min-w-0">
                                  <span className={styles.rowTitle}>{item.title}</span>
                                  <span className={styles.rowPath}>{nodePathForRow(nodeTree, item.nodeId)}</span>
                                </span>
                                <span className={styles.skuLine}>{skuLines?.primaryLine ?? "—"}</span>
                                <span className={styles.qty}>{item.quantity} шт.</span>
                                <span className={styles.price}>{formatRubAmount(item.costAmount)}</span>
                                <button
                                  type="button"
                                  className={styles.statusPill}
                                  style={{ color: st, backgroundColor: tint(st, 0.15), border: `1px solid ${tint(st, 0.28)}` }}
                                  disabled={isBusy || !raw}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenRowMenuId(null);
                                    setOpenStatusMenuId((id) => (id === item.id ? null : item.id));
                                  }}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  aria-label={`Сменить статус: ${item.statusLabelRu}`}
                                >
                                  {item.statusLabelRu}
                                </button>
                                <button
                                  type="button"
                                  className={styles.menuButton}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenRowMenuId((id) => (id === item.id ? null : item.id));
                                  }}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  aria-label="Меню строки"
                                >
                                  ⋮
                                </button>
                              </div>
                              {openStatusMenuId === item.id && raw ? (
                                <div className={styles.statusMenu}>
                                  {PART_WISHLIST_STATUS_ORDER.map((nextStatus) => {
                                    const nextColor = statusColor(nextStatus);
                                    const isCurrent = nextStatus === item.status;
                                    return (
                                      <button
                                        key={nextStatus}
                                        type="button"
                                        disabled={isBusy || isCurrent}
                                        onClick={() => runStatusAction(item, raw, nextStatus)}
                                      >
                                        <span style={{ color: nextColor }}>●</span>
                                        <span>{partWishlistStatusLabelsRu[nextStatus]}</span>
                                        {isCurrent ? <span className={styles.currentStatusMark}>текущий</span> : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                              {openRowMenuId === item.id && raw ? (
                                <div className={styles.rowMenu}>
                                  <button type="button" onClick={() => { setOpenRowMenuId(null); onOpenWishlistEdit(raw); }}>Изменить</button>
                                  {item.status !== "ORDERED" ? <button type="button" onClick={() => runStatusAction(item, raw, "ORDERED")} disabled={isBusy}>Заказано</button> : null}
                                  {item.status !== "BOUGHT" ? <button type="button" onClick={() => runStatusAction(item, raw, "BOUGHT")} disabled={isBusy}>Куплено</button> : null}
                                  {item.status !== "INSTALLED" ? <button type="button" onClick={() => runStatusAction(item, raw, "INSTALLED")} disabled={isBusy}>Установлено</button> : null}
                                  {item.status === "INSTALLED" ? <button type="button" onClick={() => { setOpenRowMenuId(null); openWishlistItemJournal(item); }}>В журнал</button> : null}
                                  <button type="button" onClick={() => { setOpenRowMenuId(null); setDeleteConfirmItemId(item.id); }} style={{ color: PARTS_CART_REF.statusNeeded }}>Удалить</button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                        {canCollapseGroup && isCollapsed && hiddenCount > 0 ? (
                          <button type="button" className={styles.showMore} onClick={() => onExpandCollapsedGroup(group.status)}>
                            Показать все {group.items.length}⌄
                          </button>
                        ) : null}
                        {canCollapseGroup && !isCollapsed && hiddenCount > 0 ? (
                          <button type="button" className={styles.showMore} onClick={() => onShowMoreInGroup(group.status, PARTS_SELECTION_VISIBLE_INCREMENT, hiddenCount)}>
                            Показать ещё {Math.min(PARTS_SELECTION_VISIBLE_INCREMENT, hiddenCount)}⌄
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        ) : null}
      </main>

      {renderDetail()}

      {deleteConfirmItemId ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6" style={{ backgroundColor: productSemanticColors.overlayModal }}>
          <div className={styles.historyBox} style={{ width: "100%", maxWidth: 420 }}>
            <h3 className="text-base font-semibold">Удалить позицию?</h3>
            <p className="mt-2 text-xs" style={{ color: PARTS_CART_REF.textMuted }}>Позиция будет удалена из корзины замен. История обслуживания не изменится.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={styles.secondaryAction} onClick={() => setDeleteConfirmItemId(null)}>Отмена</button>
              <button
                type="button"
                className={styles.actionButton}
                style={{ background: PARTS_CART_REF.statusNeeded, color: "#fff", paddingInline: 18 }}
                onClick={() => {
                  const id = deleteConfirmItemId;
                  setDeleteConfirmItemId(null);
                  if (id) void onDeleteWishlistItem(id, { skipConfirm: true });
                  if (selectedWishlistItemId === id) onSelectWishlistItem(null);
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
