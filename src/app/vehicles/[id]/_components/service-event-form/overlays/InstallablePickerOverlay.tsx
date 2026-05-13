"use client";

import { formatExpenseAmountRu } from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type {
  InstallableForServiceEventEntry,
  PartWishlistItemStatus,
} from "@mototwin/types";

export type InstallableFilter = "all" | "paid" | "wishlist";

export type InstallablePickerOverlayProps = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string;
  entries: InstallableForServiceEventEntry[];
  filter: InstallableFilter;
  setFilter: (next: InstallableFilter) => void;
  selectedKeys: Set<string>;
  isLeafNode: (nodeId: string) => boolean;
  isNodeUsed: (nodeId: string) => boolean;
  counts: { all: number; paid: number; wishlist: number };
  onToggleEntry: (entry: InstallableForServiceEventEntry) => void;
};

const STATUS_LABEL_RU: Record<PartWishlistItemStatus, string> = {
  NEEDED: "Нужно купить",
  ORDERED: "Заказано",
  BOUGHT: "Куплено",
  INSTALLED: "Установлено",
  REJECTED: "Не подошла",
};

function entryBadge(entry: InstallableForServiceEventEntry): string {
  if (entry.source === "wishlist+expense") {
    return "Куплено · из списка";
  }
  if (entry.source === "expense") {
    return "Куплено";
  }
  return entry.wishlistStatus ? STATUS_LABEL_RU[entry.wishlistStatus] : "В списке";
}

export function InstallablePickerOverlay({
  open,
  onClose,
  loading,
  error,
  entries,
  filter,
  setFilter,
  selectedKeys,
  isLeafNode,
  isNodeUsed,
  counts,
  onToggleEntry,
}: InstallablePickerOverlayProps) {
  if (!open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-3 py-6 sm:items-center"
      style={{ backgroundColor: productSemanticColors.overlayModal }}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="flex max-h-[min(640px,86vh)] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: productSemanticColors.card,
          borderColor: productSemanticColors.border,
          color: productSemanticColors.textPrimary,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Готово к установке"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderBottomColor: productSemanticColors.border }}
        >
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight">Готово к установке</h3>
            <p className="mt-1 text-xs" style={{ color: productSemanticColors.textSecondary }}>
              Отметьте позиции, которые установили в этом событии. Сюда сведены активный список покупок и
              купленные, но ещё не установленные детали — без дублей.
            </p>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition hover:opacity-90"
            style={{ borderColor: productSemanticColors.border, color: productSemanticColors.textPrimary }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div
          className="flex flex-wrap gap-2 border-b px-5 py-3"
          style={{ borderBottomColor: productSemanticColors.border }}
        >
          {(["all", "paid", "wishlist"] as const).map((value) => {
            const isActive = filter === value;
            const label =
              value === "all"
                ? `Все · ${counts.all}`
                : value === "paid"
                  ? `Куплено · ${counts.paid}`
                  : `В списке покупок · ${counts.wishlist}`;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-95"
                style={
                  isActive
                    ? {
                        borderColor: productSemanticColors.primaryAction,
                        backgroundColor: productSemanticColors.primaryAction,
                        color: productSemanticColors.onPrimaryAction,
                      }
                    : {
                        borderColor: productSemanticColors.border,
                        backgroundColor: productSemanticColors.cardMuted,
                        color: productSemanticColors.textSecondary,
                      }
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {error ? (
            <p className="rounded-lg border px-3 py-2 text-xs" style={{ color: productSemanticColors.error, borderColor: productSemanticColors.border, backgroundColor: productSemanticColors.cardSubtle }}>
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className="py-6 text-center text-sm" style={{ color: productSemanticColors.textSecondary }}>
              Загрузка…
            </p>
          ) : entries.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: productSemanticColors.textSecondary }}>
              Нет позиций под этот фильтр.
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => {
                const nid = entry.nodeId?.trim() ?? "";
                const onLeaf = Boolean(nid && isLeafNode(nid));
                const isSelected = selectedKeys.has(entry.key);
                const usedNode = !isSelected && Boolean(nid) && isNodeUsed(nid);
                const disabled = !isSelected && (!onLeaf || usedNode);
                const badge = entryBadge(entry);
                const metaParts: string[] = [];
                if (entry.amount != null && entry.currency) {
                  metaParts.push(`${formatExpenseAmountRu(entry.amount)} ${entry.currency}`);
                }
                const dateIso = entry.purchasedAt ?? entry.expenseDate;
                if (dateIso) {
                  metaParts.push(new Date(dateIso).toLocaleDateString("ru-RU"));
                }
                if (entry.nodeName) {
                  metaParts.push(entry.nodeName);
                } else if (!nid) {
                  metaParts.push("Без узла");
                }
                if (entry.vendor?.trim()) {
                  metaParts.push(entry.vendor.trim());
                }
                if (entry.partSku?.trim()) {
                  metaParts.push(`Арт. ${entry.partSku.trim()}`);
                }
                return (
                  <li key={entry.key}>
                    <label
                      className="flex gap-3 rounded-xl border px-3 py-2.5 text-sm"
                      style={{
                        backgroundColor: isSelected
                          ? "rgba(249, 115, 22, 0.08)"
                          : productSemanticColors.cardMuted,
                        borderColor: isSelected
                          ? productSemanticColors.primaryAction
                          : productSemanticColors.border,
                        color: productSemanticColors.textPrimary,
                        opacity: disabled ? 0.55 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={isSelected}
                        disabled={disabled}
                        onChange={() => onToggleEntry(entry)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{entry.title}</span>
                          <span
                            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                            style={{
                              borderColor: productSemanticColors.border,
                              backgroundColor: productSemanticColors.cardSubtle,
                              color: productSemanticColors.textSecondary,
                            }}
                          >
                            {badge}
                          </span>
                        </span>
                        {metaParts.length > 0 ? (
                          <span
                            className="mt-1 block text-xs"
                            style={{ color: productSemanticColors.textSecondary }}
                          >
                            {metaParts.join(" · ")}
                          </span>
                        ) : null}
                        {!isSelected && (!onLeaf || usedNode) ? (
                          <span
                            className="mt-1 block text-[11px]"
                            style={{ color: productSemanticColors.textMeta }}
                          >
                            {!nid
                              ? "Нет узла — установка через это событие недоступна."
                              : !onLeaf
                                ? "Узел не конечный для этого ТС."
                                : "Этот узел уже добавлен в событие."}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 border-t px-5 py-3"
          style={{ borderTopColor: productSemanticColors.border }}
        >
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition hover:opacity-90"
            style={{
              backgroundColor: productSemanticColors.primaryAction,
              color: productSemanticColors.onPrimaryAction,
            }}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
