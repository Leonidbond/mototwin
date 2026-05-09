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
};

export function BundleNodePartRow({
  row,
  onPatch,
  onSetSkuRow,
  onClear,
  variant = "card",
}: BundleNodePartRowProps) {
  const isFlat = variant === "flat";

  return (
    <div
      className={`items-center px-0 ${isFlat ? "py-1" : "py-2 sm:py-2.5"} ${isFlat ? "" : "rounded-xl border px-3 py-2.5"}`}
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
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md ${
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
        <input
          value={row.partName}
          onChange={(e) => onPatch({ partName: e.target.value })}
          placeholder="Название детали"
          maxLength={500}
          style={{
            ...FIELD_BASE,
            marginTop: 0,
            border: "none",
            backgroundColor: "transparent",
            padding: "0",
            fontWeight: 600,
            fontSize: isFlat ? "0.8125rem" : undefined,
            lineHeight: isFlat ? 1.25 : undefined,
          }}
          className={`${FOCUS_RING} truncate`}
        />
        <input
          value={row.sku}
          onChange={(e) => onPatch({ sku: e.target.value })}
          onFocus={onSetSkuRow}
          placeholder="Артикул (SKU)"
          maxLength={200}
          autoComplete="off"
          style={{
            ...FIELD_BASE,
            marginTop: isFlat ? 1 : 2,
            border: "none",
            backgroundColor: "transparent",
            padding: "0",
            fontSize: isFlat ? "0.6875rem" : "0.75rem",
            lineHeight: isFlat ? 1.2 : undefined,
            color: SERVICE_EVENT_PARTS_UI.textMuted,
          }}
          className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
        />
      </div>

      <label
        className={`min-w-0 font-medium ${isFlat ? "text-[10px] leading-tight" : "text-[11px]"}`}
        style={LABEL_STYLE}
      >
        Количество
        <input
          value={row.quantity}
          onChange={(e) => onPatch({ quantity: e.target.value })}
          inputMode="numeric"
          placeholder="1"
          style={isFlat ? flatNumericInput : { ...FIELD_BASE, marginTop: 4 }}
          className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
        />
      </label>

      <label
        className={`min-w-0 font-medium ${isFlat ? "text-[10px] leading-tight" : "text-[11px]"}`}
        style={LABEL_STYLE}
      >
        Цена
        <input
          value={row.partCost}
          onChange={(e) => onPatch({ partCost: e.target.value })}
          inputMode="decimal"
          placeholder="0"
          style={isFlat ? flatNumericInput : { ...FIELD_BASE, marginTop: 4 }}
          className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
        />
      </label>

      <button
        type="button"
        onClick={onClear}
        aria-label="Очистить деталь"
        className={`inline-flex shrink-0 items-center justify-center rounded-md border transition hover:opacity-90 ${
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
