"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  findNodePathById,
  findNodeTreeItemById,
  formatExpenseAmountRu,
  formatIsoCalendarDateRu,
  getWishlistItemSkuDisplayLines,
  partWishlistStatusLabelsRu,
  PART_WISHLIST_STATUS_ORDER,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type {
  NodeTreeItem,
  PartWishlistItem,
  PartWishlistItemStatus,
  PartWishlistItemViewModel,
  PartWishlistStatusGroupViewModel,
} from "@mototwin/types";
import { buildPartsCartSummary } from "./parts-cart-summary";
import { PARTS_CART_REF } from "./parts-cart-reference-theme";
import styles from "./PartsCartPage.module.css";

export type PartsStatusFilter = PartWishlistItemStatus | "ALL";

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
  partsStatusCounts: Map<PartWishlistItemStatus, number>;
  partsStatusFilter: PartsStatusFilter;
  onPartsStatusFilterChange: (value: PartsStatusFilter) => void;
  partsSearchQuery: string;
  onPartsSearchQueryChange: (value: string) => void;
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

function SummaryIcon({ kind }: { kind: "needed" | "ordered" | "bought" | "installed" | "cart" }) {
  if (kind === "installed") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.65" />
        <path d="M7 12.3l3.2 3.2L17.5 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "ordered") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 8l7-4 7 4v8l-7 4-7-4V8z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 8l7 4 7-4M12 12v8" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  if (kind === "needed") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 5.5c-2.7 4.3-2.7 8.7 0 13M15 5.5c2.7 4.3 2.7 8.7 0 13" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    partsStatusCounts,
    partsStatusFilter,
    onPartsStatusFilterChange,
    partsSearchQuery,
    onPartsSearchQueryChange,
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

  const summaryCards = [
    { key: "needed", label: "Нужно купить", value: summary.needed, color: PARTS_CART_REF.statusNeeded, icon: "needed" as const },
    { key: "ordered", label: "Заказано", value: summary.ordered, color: PARTS_CART_REF.statusOrdered, icon: "ordered" as const },
    { key: "bought", label: "Куплено", value: summary.bought, color: PARTS_CART_REF.statusBought, icon: "bought" as const },
    { key: "installed", label: "Установлено", value: summary.installed, color: PARTS_CART_REF.statusInstalled, icon: "installed" as const },
    { key: "bni", label: "Куплено, но не установлено", value: summary.boughtNotInstalled, color: PARTS_CART_REF.statusMuted, icon: "cart" as const },
  ];

  const renderDetail = () => {
    if (!selectedVm || !selectedRaw) {
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
            <button type="button" className={styles.closeButton} onClick={() => onSelectWishlistItem(null)} aria-label="Закрыть панель">
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
                <span aria-hidden>↗</span>
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
                router.push(`/vehicles/${vehicleId}/service-log?serviceEventId=${encodeURIComponent(installedServiceEventId)}`);
                return;
              }
              router.push(`/vehicles/${vehicleId}/service-log${item.nodeId ? `?nodeId=${encodeURIComponent(item.nodeId)}` : ""}`);
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
              <article key={card.key} className={styles.summaryCard}>
                <span className={styles.summaryIcon} style={{ color: card.color }}><SummaryIcon kind={card.icon} /></span>
                <div>
                  <p className={styles.summaryLabel} style={{ color: card.color }}>{card.label}</p>
                  <p className={styles.summaryCount}>{card.value.count}</p>
                  <p className={styles.summaryAmount}>{formatSummaryAmount(card.value.amount)}</p>
                </div>
              </article>
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
            <nav className={styles.tabs} aria-label="Статусы корзины">
              {(["ALL", ...PART_WISHLIST_STATUS_ORDER] as const).map((key) => {
                const active = partsStatusFilter === key;
                const isAll = key === "ALL";
                const count = isAll ? wishlistViewModels.length : partsStatusCounts.get(key) ?? 0;
                const label = isAll ? "Все" : partWishlistStatusLabelsRu[key];
                const tabAccent = isAll ? "#ff6b00" : statusColor(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onPartsStatusFilterChange(key)}
                    className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                    style={{ "--tab-accent": tabAccent } as CSSProperties}
                  >
                    <span>{label}</span>
                    {!isAll ? (
                      <span
                        className={styles.tabBadge}
                        style={{ color: tabAccent, borderColor: tint(tabAccent, 0.38), backgroundColor: tint(tabAccent, 0.12) }}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div className={styles.listSearch}>
              <div className={styles.searchRow}>
                <div className={styles.searchBox}>
                  <span className={styles.searchIcon} aria-hidden><SearchIcon /></span>
                  <input className={styles.searchInput} value={partsSearchQuery} onChange={(e) => onPartsSearchQueryChange(e.target.value)} placeholder="Поиск по названию, SKU, узлу, комментарию" />
                </div>
                <button type="button" className={styles.filterButton} onClick={() => { if (hasNodeFilter) onClearNodeFilter(); }}>
                  <FilterIcon />
                  <span>Фильтры</span>
                </button>
              </div>
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
                                onClick={() => onSelectWishlistItem(item.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onSelectWishlistItem(item.id);
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
                                <span className={styles.statusPill} style={{ color: st, backgroundColor: tint(st, 0.15), border: `1px solid ${tint(st, 0.28)}` }}>{item.statusLabelRu}</span>
                                <button
                                  type="button"
                                  className={styles.menuButton}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenRowMenuId((id) => (id === item.id ? null : item.id));
                                  }}
                                  aria-label="Меню строки"
                                >
                                  ⋮
                                </button>
                              </div>
                              {openRowMenuId === item.id && raw ? (
                                <div className={styles.rowMenu}>
                                  <button type="button" onClick={() => { setOpenRowMenuId(null); onOpenWishlistEdit(raw); }}>Изменить</button>
                                  {item.status === "NEEDED" ? <button type="button" onClick={() => { setOpenRowMenuId(null); void onPatchWishlistItemStatus(item.id, "ORDERED", item.status); }} disabled={isBusy}>Заказано</button> : null}
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
