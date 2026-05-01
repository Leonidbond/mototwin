"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  applyPartSkuViewModelToPartWishlistFormValues,
  clearPartWishlistFormSkuSelection,
  formatExpenseAmountRu,
  formatPartSkuSearchResultMetaLineRu,
  getPartRecommendationGroupTitle,
  getPartRecommendationWarningLabel,
  getPartSkuViewModelDisplayLines,
  getServiceKitPreviewItemStatusLabel,
  getWishlistItemSkuDisplayLines,
  partWishlistStatusLabelsRu,
  PART_WISHLIST_STATUS_ORDER,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type {
  PartRecommendationGroup,
  PartRecommendationViewModel,
  PartSkuViewModel,
  PartWishlistFormValues,
  PartWishlistItem,
  PartWishlistItemStatus,
  ServiceKitPreviewViewModel,
  ServiceKitViewModel,
} from "@mototwin/types";

export type PartPickerTab = "search" | "recommendations" | "kits";

const RADIUS_MODAL = 24;
const RADIUS_INNER = 14;

export type WishlistNodeSelectOption = { id: string; name: string; level: number };

export type PartPickerShellProps = {
  isOpen: boolean;
  initialTab: PartPickerTab;
  title: string;
  onClose: () => void;
  vehicleLabel: string;
  wishlistForm: PartWishlistFormValues;
  setWishlistForm: React.Dispatch<React.SetStateAction<PartWishlistFormValues>>;
  wishlistNodeOptions: WishlistNodeSelectOption[];
  wishlistNodeRequiredError: boolean;
  wishlistEditingId: string | null;
  wishlistEditingSourceItem: PartWishlistItem | undefined;
  wishlistSkuQuery: string;
  setWishlistSkuQuery: (value: string) => void;
  wishlistSkuResults: PartSkuViewModel[];
  wishlistSkuLoading: boolean;
  wishlistSkuFetchError: string;
  wishlistSkuPickedPreview: PartSkuViewModel | null;
  setWishlistSkuPickedPreview: (value: PartSkuViewModel | null) => void;
  wishlistRecommendationsLoading: boolean;
  wishlistRecommendationsError: string;
  wishlistRecommendationGroups: PartRecommendationGroup[];
  onAddRecommendedSku: (rec: PartRecommendationViewModel) => void;
  wishlistAddingRecommendedSkuId: string;
  wishlistServiceKitsLoading: boolean;
  wishlistServiceKitsError: string;
  visibleWishlistServiceKits: ServiceKitViewModel[];
  serviceKitPreviewByCode: Map<string, ServiceKitPreviewViewModel>;
  wishlistSelectedKitCode: string;
  setWishlistSelectedKitCode: (code: string) => void;
  onAddServiceKit: (kit: ServiceKitViewModel) => void;
  wishlistAddingKitCode: string;
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

export function PartPickerShell(props: PartPickerShellProps) {
  const {
    isOpen,
    initialTab,
    title,
    onClose,
    vehicleLabel,
    wishlistForm,
    setWishlistForm,
    wishlistNodeOptions,
    wishlistNodeRequiredError,
    wishlistEditingId,
    wishlistEditingSourceItem,
    wishlistSkuQuery,
    setWishlistSkuQuery,
    wishlistSkuResults,
    wishlistSkuLoading,
    wishlistSkuFetchError,
    wishlistSkuPickedPreview,
    setWishlistSkuPickedPreview,
    wishlistRecommendationsLoading,
    wishlistRecommendationsError,
    wishlistRecommendationGroups,
    onAddRecommendedSku,
    wishlistAddingRecommendedSkuId,
    wishlistServiceKitsLoading,
    wishlistServiceKitsError,
    visibleWishlistServiceKits,
    serviceKitPreviewByCode,
    wishlistSelectedKitCode,
    setWishlistSelectedKitCode,
    onAddServiceKit,
    wishlistAddingKitCode,
    wishlistFormError,
    onSubmit,
    isWishlistSaving,
  } = props;

  const [tab, setTab] = useState<PartPickerTab>(initialTab);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const u = () => setIsNarrow(mq.matches);
    u();
    mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);

  const stickySelectionLabel = useMemo(() => {
    if (wishlistSelectedKitCode.trim()) {
      const kit = visibleWishlistServiceKits.find((k) => k.code === wishlistSelectedKitCode);
      return kit ? `Комплект: ${kit.title}` : "Комплект выбран";
    }
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
  }, [
    wishlistSelectedKitCode,
    visibleWishlistServiceKits,
    wishlistForm.skuId,
    wishlistSkuPickedPreview,
    wishlistEditingSourceItem,
  ]);

  if (!isOpen) {
    return null;
  }

  const tabs: { id: PartPickerTab; label: string }[] = [
    { id: "search", label: "Поиск (SKU)" },
    { id: "recommendations", label: "Рекомендации" },
    { id: "kits", label: "Комплекты" },
  ];

  const tabRow = (
    <div
      className="flex gap-0 overflow-x-auto border-b"
      style={{ borderColor: productSemanticColors.borderStrong }}
    >
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="relative shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium transition"
            style={{
              color: active ? productSemanticColors.textPrimary : productSemanticColors.textMuted,
            }}
          >
            {t.label}
            {active ? (
              <span
                className="absolute inset-x-3 bottom-0 h-0.5 rounded-full"
                style={{ backgroundColor: productSemanticColors.primaryAction }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );

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
        <ul className="max-h-[min(40vh,320px)] space-y-1 overflow-y-auto rounded-[12px] border p-1" style={{ borderColor: productSemanticColors.borderStrong, backgroundColor: productSemanticColors.cardSubtle }}>
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

  const centerRecommendations =
    !wishlistForm.nodeId.trim() ? (
      <p className="text-sm" style={{ color: productSemanticColors.textMuted }}>
        Выберите узел — появятся рекомендации каталога для этой позиции.
      </p>
    ) : (
      <div className="min-h-0 min-w-0 overflow-y-auto">
        {wishlistRecommendationsError ? (
          <p className="text-xs" style={{ color: productSemanticColors.error }}>
            {wishlistRecommendationsError}
          </p>
        ) : null}
        {wishlistRecommendationsLoading ? (
          <p className="text-xs" style={{ color: productSemanticColors.textMuted }}>
            Загружаем рекомендации…
          </p>
        ) : null}
        {!wishlistRecommendationsLoading && wishlistRecommendationGroups.length === 0 ? (
          <p className="text-xs" style={{ color: productSemanticColors.textMuted }}>
            Для этого узла пока нет рекомендаций из каталога
          </p>
        ) : null}
        {!wishlistRecommendationsLoading && wishlistRecommendationGroups.length > 0 ? (
          <div className="space-y-3">
            {wishlistRecommendationGroups.map((group) => (
              <div key={group.recommendationType}>
                <p className="text-[11px] font-semibold" style={{ color: productSemanticColors.textPrimary }}>
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
                        className="rounded-md border px-2 py-2"
                        style={{
                          borderColor: isVerify ? productSemanticColors.primaryAction : productSemanticColors.borderStrong,
                          backgroundColor: productSemanticColors.cardMuted,
                        }}
                      >
                        <p className="text-xs font-medium" style={{ color: productSemanticColors.textPrimary }}>
                          {rec.canonicalName}
                        </p>
                        <p className="text-[11px]" style={{ color: productSemanticColors.textSecondary }}>
                          {rec.brandName}
                        </p>
                        {primaryNo ? (
                          <p className="text-[11px]" style={{ color: productSemanticColors.textMuted }}>
                            Арт.: {primaryNo}
                          </p>
                        ) : null}
                        {rec.priceAmount != null ? (
                          <p className="text-[11px]" style={{ color: productSemanticColors.textMuted }}>
                            {`${formatExpenseAmountRu(rec.priceAmount)} ${rec.currency?.trim() || ""}`.trim()}
                          </p>
                        ) : null}
                        <p className="text-[11px]" style={{ color: productSemanticColors.textSecondary }}>
                          {rec.recommendationLabel}
                        </p>
                        {warn ? (
                          <p className={`text-[11px] ${isVerify ? "font-medium" : ""}`} style={{ color: productSemanticColors.textSecondary }}>
                            {warn}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onAddRecommendedSku(rec)}
                          disabled={wishlistAddingRecommendedSkuId === rec.skuId}
                          className="mt-2 inline-flex rounded-[12px] border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-60"
                          style={{
                            borderColor: productSemanticColors.borderStrong,
                            backgroundColor: productSemanticColors.cardSubtle,
                            color: productSemanticColors.textPrimary,
                          }}
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
    );

  const centerKits =
    !wishlistForm.nodeId.trim() || wishlistEditingId ? (
      <p className="text-sm" style={{ color: productSemanticColors.textMuted }}>
        {wishlistEditingId
          ? "Комплекты доступны только при создании новой позиции."
          : "Выберите узел, чтобы увидеть комплекты обслуживания."}
      </p>
    ) : (
      <div className="min-h-0 min-w-0 overflow-y-auto">
        {wishlistServiceKitsError ? (
          <p className="text-xs" style={{ color: productSemanticColors.error }}>
            {wishlistServiceKitsError}
          </p>
        ) : null}
        {wishlistServiceKitsLoading ? (
          <p className="text-xs" style={{ color: productSemanticColors.textMuted }}>
            Загружаем комплекты…
          </p>
        ) : null}
        {!wishlistServiceKitsLoading && visibleWishlistServiceKits.length === 0 ? (
          <p className="text-xs" style={{ color: productSemanticColors.textMuted }}>
            Для этого узла пока нет подходящих комплектов.
          </p>
        ) : null}
        {visibleWishlistServiceKits.length > 0 ? (
          <ul className="space-y-2">
            {visibleWishlistServiceKits.map((kit) => {
              const preview = serviceKitPreviewByCode.get(kit.code);
              const isSelectedKit = kit.code === wishlistSelectedKitCode;
              return (
                <li
                  key={kit.code}
                  className="rounded-md border p-2"
                  style={{
                    borderColor: isSelectedKit ? productSemanticColors.primaryAction : productSemanticColors.borderStrong,
                    backgroundColor: productSemanticColors.cardMuted,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setWishlistSelectedKitCode(kit.code)}
                    className="w-full text-left"
                  >
                    <p className="text-xs font-semibold" style={{ color: productSemanticColors.textPrimary }}>
                      {kit.title}
                      {isSelectedKit ? (
                        <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: productSemanticColors.cardSubtle }}>
                          выбран
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[11px]" style={{ color: productSemanticColors.textSecondary }}>
                      {kit.description}
                    </p>
                  </button>
                  <ul className="mt-1 space-y-1">
                    {(preview?.items ?? []).map((item) => (
                      <li
                        key={item.itemKey}
                        className="rounded border px-2 py-1 text-[11px]"
                        style={{
                          borderColor: productSemanticColors.border,
                          backgroundColor: productSemanticColors.cardSubtle,
                          color: productSemanticColors.textSecondary,
                        }}
                      >
                        <p style={{ color: productSemanticColors.textPrimary }}>
                          {item.title}
                          {item.matchedSkuTitle ? ` — ${item.matchedSkuTitle}` : ""}
                        </p>
                        <p className="mt-0.5">
                          {item.nodeName ? `Узел: ${item.nodeName}` : `Узел: ${item.nodeCode}`}
                          {item.costAmount != null
                            ? ` · ${formatExpenseAmountRu(item.costAmount)} ${item.currency ?? ""}`.trim()
                            : ""}
                        </p>
                        <p className="mt-0.5 font-medium">{getServiceKitPreviewItemStatusLabel(item.status)}</p>
                      </li>
                    ))}
                  </ul>
                  {preview ? (
                    <p className="mt-1 text-[11px]" style={{ color: productSemanticColors.textMuted }}>
                      Доступно: {preview.addableCount} · Уже есть: {preview.duplicateCount} · Пропуск:{" "}
                      {preview.invalidCount}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void onAddServiceKit(kit)}
                    disabled={wishlistAddingKitCode === kit.code || (preview ? !preview.canAddAny : false)}
                    className="mt-2 inline-flex rounded-[12px] border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      borderColor: productSemanticColors.borderStrong,
                      backgroundColor: productSemanticColors.cardSubtle,
                      color: productSemanticColors.textPrimary,
                    }}
                  >
                    {wishlistAddingKitCode === kit.code ? "Добавление комплекта…" : "Добавить доступные позиции"}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );

  const centerPanel = tab === "search" ? centerSearch : tab === "recommendations" ? centerRecommendations : centerKits;

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
          Выберите SKU в поиске или через рекомендации.
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
        {isWishlistSaving ? "Сохранение…" : wishlistEditingId ? "Сохранить" : "Добавить деталь"}
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
      <section className="rounded-[14px] border p-3" style={{ borderColor: productSemanticColors.borderStrong, backgroundColor: productSemanticColors.cardMuted }}>
        {leftContext}
      </section>
      <section className="min-h-[160px] rounded-[14px] border p-3" style={{ borderColor: productSemanticColors.borderStrong, backgroundColor: productSemanticColors.cardMuted }}>
        {centerPanel}
      </section>
      <section className="rounded-[14px] border p-3" style={{ borderColor: productSemanticColors.borderStrong, backgroundColor: productSemanticColors.cardMuted }}>
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
        {centerPanel}
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
              Подбор детали · {vehicleLabel}
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
        {!isNarrow ? (
          <div className="px-6 pt-3">
            {tabRow}
          </div>
        ) : (
          <div className="px-4 pt-2">{tabRow}</div>
        )}
        {mainGrid}
        {stickyBar}
        {bottomActions}
      </div>
    </div>
  );
}
