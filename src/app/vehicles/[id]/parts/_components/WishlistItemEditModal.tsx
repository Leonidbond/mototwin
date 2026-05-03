"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  applyPartSkuViewModelToPartWishlistFormValues,
  clearPartWishlistFormSkuSelection,
  formatPartSkuSearchResultMetaLineRu,
  getPartSkuViewModelDisplayLines,
  getWishlistItemSkuDisplayLines,
  partWishlistStatusLabelsRu,
  PART_WISHLIST_STATUS_ORDER,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { PartSkuViewModel, PartWishlistFormValues, PartWishlistItem, PartWishlistItemStatus } from "@mototwin/types";

const RADIUS_MODAL = 24;
const RADIUS_INNER = 14;

export type WishlistNodeSelectOption = { id: string; name: string; level: number };

export type WishlistItemEditModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  vehicleLabel: string;
  wishlistForm: PartWishlistFormValues;
  setWishlistForm: React.Dispatch<React.SetStateAction<PartWishlistFormValues>>;
  wishlistNodeOptions: WishlistNodeSelectOption[];
  wishlistNodeRequiredError: boolean;
  wishlistEditingSourceItem: PartWishlistItem | undefined;
  wishlistSkuQuery: string;
  setWishlistSkuQuery: (value: string) => void;
  wishlistSkuResults: PartSkuViewModel[];
  wishlistSkuLoading: boolean;
  wishlistSkuFetchError: string;
  wishlistSkuPickedPreview: PartSkuViewModel | null;
  setWishlistSkuPickedPreview: (value: PartSkuViewModel | null) => void;
  wishlistFormError: string;
  onSubmit: () => void;
  isWishlistSaving: boolean;
};

const control: CSSProperties = {
  backgroundColor: productSemanticColors.cardMuted,
  borderColor: productSemanticColors.borderStrong,
  color: productSemanticColors.textPrimary,
  colorScheme: "dark",
};

export function WishlistItemEditModal(props: WishlistItemEditModalProps) {
  const {
    isOpen,
    title,
    onClose,
    vehicleLabel,
    wishlistForm,
    setWishlistForm,
    wishlistNodeOptions,
    wishlistNodeRequiredError,
    wishlistEditingSourceItem,
    wishlistSkuQuery,
    setWishlistSkuQuery,
    wishlistSkuResults,
    wishlistSkuLoading,
    wishlistSkuFetchError,
    wishlistSkuPickedPreview,
    setWishlistSkuPickedPreview,
    wishlistFormError,
    onSubmit,
    isWishlistSaving,
  } = props;

  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const u = () => setIsNarrow(mq.matches);
    u();
    mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);

  const stickySelectionLabel = useMemo(() => {
    if (wishlistForm.skuId.trim()) {
      if (wishlistSkuPickedPreview?.id === wishlistForm.skuId.trim()) {
        return getPartSkuViewModelDisplayLines(wishlistSkuPickedPreview).primaryLine;
      }
      if (wishlistEditingSourceItem?.sku?.id === wishlistForm.skuId.trim()) {
        return getWishlistItemSkuDisplayLines(wishlistEditingSourceItem.sku).primaryLine;
      }
      return "SKU привязан";
    }
    return "";
  }, [wishlistForm.skuId, wishlistSkuPickedPreview, wishlistEditingSourceItem]);

  if (!isOpen) {
    return null;
  }

  const leftContext = (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: productSemanticColors.textMuted }}>
        Контекст
      </p>
      <p className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
        {vehicleLabel}
      </p>
      <div>
        <label className="block text-xs font-medium" style={{ color: productSemanticColors.textSecondary }}>
          Название
        </label>
        <input
          type="text"
          value={wishlistForm.title}
          onChange={(e) => setWishlistForm((f) => ({ ...f, title: e.target.value }))}
          className="mt-1 w-full border px-3 py-2 text-sm outline-none"
          style={{ ...control, borderRadius: RADIUS_INNER, borderWidth: 1, borderStyle: "solid" }}
          placeholder="Например: масло моторное"
        />
      </div>
      <div>
        <label className="block text-xs font-medium" style={{ color: productSemanticColors.textSecondary }}>
          Узел мотоцикла <span style={{ color: productSemanticColors.error }}>*</span>
        </label>
        <select
          value={wishlistForm.nodeId}
          onChange={(e) => setWishlistForm((f) => ({ ...f, nodeId: e.target.value }))}
          className="mt-1 w-full border px-3 py-2 text-sm outline-none"
          style={{ ...control, borderRadius: RADIUS_INNER, borderWidth: 1, borderStyle: "solid" }}
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium" style={{ color: productSemanticColors.textSecondary }}>
            Количество
          </label>
          <input
            type="number"
            min={1}
            value={wishlistForm.quantity}
            onChange={(e) => setWishlistForm((f) => ({ ...f, quantity: e.target.value }))}
            className="mt-1 w-full border px-3 py-2 text-sm outline-none"
            style={{ ...control, borderRadius: RADIUS_INNER, borderWidth: 1, borderStyle: "solid" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium" style={{ color: productSemanticColors.textSecondary }}>
            Статус
          </label>
          <select
            value={wishlistForm.status}
            onChange={(e) =>
              setWishlistForm((f) => ({
                ...f,
                status: e.target.value as PartWishlistItemStatus,
              }))
            }
            className="mt-1 w-full border px-3 py-2 text-sm outline-none"
            style={{ ...control, borderRadius: RADIUS_INNER, borderWidth: 1, borderStyle: "solid" }}
          >
            {PART_WISHLIST_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {partWishlistStatusLabelsRu[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_88px] gap-3">
        <div>
          <label className="block text-xs font-medium" style={{ color: productSemanticColors.textSecondary }}>
            Стоимость (опц.)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={wishlistForm.costAmount}
            onChange={(e) => setWishlistForm((f) => ({ ...f, costAmount: e.target.value }))}
            className="mt-1 w-full border px-3 py-2 text-sm outline-none"
            style={{ ...control, borderRadius: RADIUS_INNER, borderWidth: 1, borderStyle: "solid" }}
            placeholder="1500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium" style={{ color: productSemanticColors.textSecondary }}>
            Валюта
          </label>
          <input
            type="text"
            value={wishlistForm.currency}
            onChange={(e) => setWishlistForm((f) => ({ ...f, currency: e.target.value }))}
            className="mt-1 w-full border px-3 py-2 text-sm outline-none"
            style={{ ...control, borderRadius: RADIUS_INNER, borderWidth: 1, borderStyle: "solid" }}
            maxLength={8}
          />
        </div>
      </div>
    </div>
  );

  const centerSearch = (
    <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-y-auto">
      <p className="text-xs font-semibold" style={{ color: productSemanticColors.textSecondary }}>
        Найти в каталоге
      </p>
      <input
        type="search"
        value={wishlistSkuQuery}
        onChange={(e) => setWishlistSkuQuery(e.target.value)}
        className="w-full border px-3 py-2 text-sm outline-none"
        style={{ ...control, borderRadius: RADIUS_INNER, borderWidth: 1, borderStyle: "solid" }}
        placeholder="Motul, Brembo, HF155…"
        autoComplete="off"
      />
      {wishlistSkuFetchError ? (
        <p className="text-xs" style={{ color: productSemanticColors.error }}>
          {wishlistSkuFetchError}
        </p>
      ) : null}
      {wishlistSkuLoading ? (
        <p className="text-xs" style={{ color: productSemanticColors.textMuted }}>
          Поиск…
        </p>
      ) : null}
      {!wishlistSkuLoading && wishlistSkuResults.length > 0 ? (
        <ul
          className="max-h-[min(40vh,320px)] space-y-1 overflow-y-auto rounded-[12px] border p-1"
          style={{ borderColor: productSemanticColors.borderStrong, backgroundColor: productSemanticColors.cardSubtle }}
        >
          {wishlistSkuResults.map((sku) => (
            <li key={sku.id}>
              <button
                type="button"
                onClick={() => {
                  setWishlistSkuPickedPreview(sku);
                  setWishlistForm((f) => applyPartSkuViewModelToPartWishlistFormValues(f, sku));
                }}
                className="w-full rounded-lg px-2 py-2 text-left text-xs transition"
                style={{ color: productSemanticColors.textPrimary }}
              >
                <span className="font-medium">{getPartSkuViewModelDisplayLines(sku).primaryLine}</span>
                <span className="mt-0.5 block text-[11px]" style={{ color: productSemanticColors.textSecondary }}>
                  {formatPartSkuSearchResultMetaLineRu(sku)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  const rightSelection = (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: productSemanticColors.textMuted }}>
        Выбор
      </p>
      {wishlistForm.skuId.trim() ? (
        <div className="border px-3 py-2" style={{ ...control, borderRadius: RADIUS_INNER, borderWidth: 1, borderStyle: "solid" }}>
          <p className="text-[11px] font-medium" style={{ color: productSemanticColors.textSecondary }}>
            Выбранный SKU
          </p>
          {wishlistSkuPickedPreview?.id === wishlistForm.skuId.trim() ? (
            <>
              <p className="mt-1 text-xs font-medium" style={{ color: productSemanticColors.textPrimary }}>
                {getPartSkuViewModelDisplayLines(wishlistSkuPickedPreview).primaryLine}
              </p>
              <p className="text-[11px]" style={{ color: productSemanticColors.textSecondary }}>
                {getPartSkuViewModelDisplayLines(wishlistSkuPickedPreview).secondaryLine}
              </p>
            </>
          ) : wishlistEditingSourceItem?.sku?.id === wishlistForm.skuId.trim() ? (
            <>
              <p className="mt-1 text-xs font-medium" style={{ color: productSemanticColors.textPrimary }}>
                {getWishlistItemSkuDisplayLines(wishlistEditingSourceItem.sku).primaryLine}
              </p>
              <p className="text-[11px]" style={{ color: productSemanticColors.textSecondary }}>
                {getWishlistItemSkuDisplayLines(wishlistEditingSourceItem.sku).secondaryLine}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs" style={{ color: productSemanticColors.textSecondary }}>
              SKU привязан
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setWishlistSkuPickedPreview(null);
              setWishlistForm((f) => clearPartWishlistFormSkuSelection(f));
            }}
            className="mt-2 inline-flex rounded-[12px] border px-2 py-1 text-[11px] font-semibold transition"
            style={{
              borderColor: productSemanticColors.borderStrong,
              backgroundColor: productSemanticColors.cardSubtle,
              color: productSemanticColors.textPrimary,
            }}
          >
            Очистить SKU
          </button>
        </div>
      ) : (
        <p className="text-xs" style={{ color: productSemanticColors.textMuted }}>
          Выберите SKU в каталоге.
        </p>
      )}
      <div>
        <label className="block text-xs font-medium" style={{ color: productSemanticColors.textSecondary }}>
          Комментарий
        </label>
        <textarea
          value={wishlistForm.comment}
          onChange={(e) => setWishlistForm((f) => ({ ...f, comment: e.target.value }))}
          rows={4}
          className="mt-1 w-full resize-none border px-3 py-2 text-sm outline-none"
          style={{ ...control, borderRadius: RADIUS_INNER, borderWidth: 1, borderStyle: "solid" }}
        />
      </div>
      {wishlistFormError ? <p style={{ color: productSemanticColors.error }}>{wishlistFormError}</p> : null}
    </div>
  );

  const bottomActions = (
    <div
      className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3 lg:px-6 lg:py-4"
      style={{
        borderColor: productSemanticColors.borderStrong,
        backgroundColor: productSemanticColors.card,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-10 items-center justify-center rounded-[14px] border px-4 text-sm font-semibold transition"
        style={{
          borderColor: productSemanticColors.borderStrong,
          backgroundColor: productSemanticColors.cardSubtle,
          color: productSemanticColors.textPrimary,
        }}
      >
        Отмена
      </button>
      <button
        type="button"
        onClick={() => void onSubmit()}
        disabled={isWishlistSaving}
        className="inline-flex h-10 items-center justify-center rounded-[14px] px-5 text-sm font-bold transition disabled:opacity-60"
        style={{ backgroundColor: productSemanticColors.primaryAction, color: productSemanticColors.onPrimaryAction }}
      >
        {isWishlistSaving ? "Сохранение…" : "Сохранить"}
      </button>
    </div>
  );

  const stickyBar =
    isNarrow && stickySelectionLabel ? (
      <div
        className="border-t px-3 py-2"
        style={{
          backgroundColor: productSemanticColors.cardSubtle,
          borderColor: productSemanticColors.borderStrong,
        }}
      >
        <p className="truncate text-[11px] font-medium" style={{ color: productSemanticColors.textPrimary }}>
          {stickySelectionLabel}
        </p>
      </div>
    ) : null;

  const mainGrid = isNarrow ? (
    <div className="flex max-h-[calc(100dvh-200px)] flex-col gap-4 overflow-y-auto px-4 py-4">
      <section
        className="rounded-[14px] border p-3"
        style={{ borderColor: productSemanticColors.borderStrong, backgroundColor: productSemanticColors.cardMuted }}
      >
        {leftContext}
      </section>
      <section
        className="min-h-[160px] rounded-[14px] border p-3"
        style={{ borderColor: productSemanticColors.borderStrong, backgroundColor: productSemanticColors.cardMuted }}
      >
        {centerSearch}
      </section>
      <section
        className="rounded-[14px] border p-3"
        style={{ borderColor: productSemanticColors.borderStrong, backgroundColor: productSemanticColors.cardMuted }}
      >
        {rightSelection}
      </section>
    </div>
  ) : (
    <div
      className="grid max-h-[min(720px,calc(100dvh-140px))] gap-5 overflow-hidden px-6 py-5"
      style={{ gridTemplateColumns: "minmax(0,320px) minmax(0,1fr) minmax(0,360px)" }}
    >
      <div className="min-h-0 min-w-0 border-r pr-4" style={{ borderColor: productSemanticColors.borderStrong }}>
        {leftContext}
      </div>
      <div className="min-h-0 min-w-0 border-r px-1" style={{ borderColor: productSemanticColors.borderStrong }}>
        {centerSearch}
      </div>
      <div className="min-h-0 min-w-0">{rightSelection}</div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[64] flex items-start justify-center px-3 py-4 sm:items-center sm:px-4 sm:py-6"
      style={{ backgroundColor: productSemanticColors.overlayModal }}
    >
      <div
        className="garage-dark-surface-text flex max-h-[calc(100dvh-16px)] w-full flex-col overflow-hidden border shadow-2xl"
        style={{
          maxWidth: "min(1200px, calc(100vw - 48px))",
          borderRadius: RADIUS_MODAL,
          backgroundColor: productSemanticColors.card,
          borderColor: productSemanticColors.borderStrong,
          color: productSemanticColors.textPrimary,
        }}
      >
        <div
          className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4 sm:px-6"
          style={{ borderColor: productSemanticColors.borderStrong }}
        >
          <div>
            <h2 className="text-xl font-semibold tracking-tight" style={{ color: productSemanticColors.textPrimary }}>
              {title}
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: productSemanticColors.textSecondary }}>
              Редактирование позиции · {vehicleLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-[14px] border px-3.5 text-sm font-medium transition"
            style={{
              borderColor: productSemanticColors.borderStrong,
              backgroundColor: productSemanticColors.cardSubtle,
              color: productSemanticColors.textPrimary,
            }}
          >
            Закрыть
          </button>
        </div>
        {mainGrid}
        {stickyBar}
        {bottomActions}
      </div>
    </div>
  );
}
