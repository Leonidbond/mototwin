"use client";

import type { BundleItemFormValues } from "@mototwin/types";
import type { CSSProperties } from "react";
import { FIELD_BASE, FOCUS_RING, LABEL_STYLE, SERVICE_EVENT_PARTS_UI } from "../styles";

export type BundleNodePartRowProps = {
  row: BundleItemFormValues;
  currency: string;
  onPatch: (patch: Partial<BundleItemFormValues>) => void;
  onSetSkuRow: () => void;
  onClear: () => void;
  /** `flat` — строка в списке как в быстром режиме, без «карточки». */
  variant?: "card" | "flat";
};

const flatNumericInput: CSSProperties = {
  ...FIELD_BASE,
  marginTop: 2,
  padding: "5px 8px",
  fontSize: "0.75rem",
  lineHeight: 1.25,
  borderRadius: 6,
  caretColor: SERVICE_EVENT_PARTS_UI.orange,
};

/** Поля «название / SKU»: явная рамка, мягкое скругление (курсор не «теряется» в большом radius), заметный caret. */
const bundlePartLineInputBase: CSSProperties = {
  width: "100%",
  minHeight: 36,
  boxSizing: "border-box",
  borderRadius: 6,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: SERVICE_EVENT_PARTS_UI.border,
  backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceControl,
  color: SERVICE_EVENT_PARTS_UI.text,
  padding: "8px 10px",
  outline: "none",
  caretColor: SERVICE_EVENT_PARTS_UI.orange,
};

const bundlePartLineLabel: CSSProperties = {
  ...LABEL_STYLE,
  fontSize: "10px",
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  marginBottom: 4,
};

export function BundleNodePartRow({
  row,
  onPatch,
  onSetSkuRow,
  onClear,
  variant = "card",
}: BundleNodePartRowProps) {
  const isFlat = variant === "flat";

  const partLineInputClass =
    "w-full transition-[border-color,box-shadow] duration-150 placeholder:text-[#6b7280] " +
    "focus-visible:border-[#ff6b00] focus-visible:shadow-[0_0_0_2px_rgba(255,107,0,0.22)]";

  return (
    <div
      className={`items-start px-0 ${isFlat ? "py-1" : "py-2 sm:py-2.5"} ${isFlat ? "" : "rounded-xl border px-3 py-2.5"}`}
      style={{
        display: "grid",
        gridTemplateColumns: isFlat
          ? "36px minmax(0, 1fr) minmax(56px, 72px) minmax(64px, 84px) 28px"
          : "44px minmax(0, 1fr) minmax(76px, 92px) minmax(86px, 110px) 32px",
        gap: isFlat ? "0.5rem" : "0.75rem",
        ...(isFlat
          ? {
              backgroundColor: "transparent",
            }
          : {
              borderColor: SERVICE_EVENT_PARTS_UI.border,
              backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
            }),
      }}
    >
      <span
        className={`inline-flex shrink-0 self-start items-center justify-center overflow-hidden rounded-md ${
          isFlat ? "h-9 w-9" : "h-11 w-11 rounded-lg"
        }`}
        style={{
          backgroundColor: SERVICE_EVENT_PARTS_UI.surface,
          color: SERVICE_EVENT_PARTS_UI.textSubtle,
          border: `1px solid ${SERVICE_EVENT_PARTS_UI.border}`,
        }}
        aria-hidden
      >
        <svg
          width={isFlat ? 18 : 22}
          height={isFlat ? 18 : 22}
          viewBox="0 0 24 24"
          fill="none"
        >
          <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="9" cy="12" r="1.5" fill="currentColor" />
          <path d="M21 16l-4-4-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <div className="min-w-0 flex-[1.2]">
        <div className="flex min-w-0 flex-col gap-2">
          <label className="block min-w-0">
            <span className="block" style={bundlePartLineLabel}>
              Наименование запчасти
            </span>
            <input
              value={row.partName}
              onChange={(e) => onPatch({ partName: e.target.value })}
              placeholder="Введите название или оставьте пустым"
              maxLength={500}
              style={{
                ...bundlePartLineInputBase,
                fontWeight: 600,
                fontSize: isFlat ? "0.8125rem" : "0.875rem",
                lineHeight: 1.35,
              }}
              className={`${partLineInputClass} truncate`}
            />
          </label>
          <label className="block min-w-0">
            <span className="block" style={bundlePartLineLabel}>
              Артикул (SKU)
            </span>
            <input
              value={row.sku}
              onChange={(e) => onPatch({ sku: e.target.value })}
              onFocus={onSetSkuRow}
              placeholder="Введите артикул или выберите из поиска ниже"
              maxLength={200}
              autoComplete="off"
              style={{
                ...bundlePartLineInputBase,
                fontSize: isFlat ? "0.75rem" : "0.8125rem",
                lineHeight: 1.35,
              }}
              className={partLineInputClass}
            />
          </label>
        </div>
      </div>

      <label
        className={`min-w-0 self-end font-medium ${isFlat ? "text-[10px] leading-tight" : "text-[11px]"}`}
        style={LABEL_STYLE}
      >
        Количество
        <input
          value={row.quantity}
          onChange={(e) => onPatch({ quantity: e.target.value })}
          inputMode="numeric"
          placeholder="1"
          style={isFlat ? flatNumericInput : { ...FIELD_BASE, marginTop: 4, borderRadius: 6, caretColor: SERVICE_EVENT_PARTS_UI.orange }}
          className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
        />
      </label>

      <label
        className={`min-w-0 self-end font-medium ${isFlat ? "text-[10px] leading-tight" : "text-[11px]"}`}
        style={LABEL_STYLE}
      >
        Цена
        <input
          value={row.partCost}
          onChange={(e) => onPatch({ partCost: e.target.value })}
          inputMode="decimal"
          placeholder="0"
          style={isFlat ? flatNumericInput : { ...FIELD_BASE, marginTop: 4, borderRadius: 6, caretColor: SERVICE_EVENT_PARTS_UI.orange }}
          className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
        />
      </label>

      <button
        type="button"
        onClick={onClear}
        aria-label="Очистить деталь"
        className={`inline-flex shrink-0 self-end items-center justify-center rounded-md border transition hover:opacity-90 ${
          isFlat ? "h-7 w-7" : "h-8 w-8 rounded-lg"
        }`}
        style={{
          borderColor: SERVICE_EVENT_PARTS_UI.border,
          color: SERVICE_EVENT_PARTS_UI.textMuted,
          backgroundColor: SERVICE_EVENT_PARTS_UI.surface,
        }}
      >
        <svg width={isFlat ? 12 : 14} height={isFlat ? 12 : 14} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
