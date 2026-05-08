"use client";

import { productSemanticColors } from "@mototwin/design-tokens";
import type { BundleItemFormValues } from "@mototwin/types";
import { FIELD_BASE, FOCUS_RING, LABEL_STYLE } from "../styles";
import { currencySuffix } from "../utils";

export type BundleNodePartRowProps = {
  row: BundleItemFormValues;
  currency: string;
  onPatch: (patch: Partial<BundleItemFormValues>) => void;
  onSetSkuRow: () => void;
  onClear: () => void;
};

export function BundleNodePartRow({ row, currency, onPatch, onSetSkuRow, onClear }: BundleNodePartRowProps) {
  const suffix = currencySuffix(currency);
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
      style={{
        borderColor: productSemanticColors.border,
        backgroundColor: productSemanticColors.cardSubtle,
      }}
    >
      <span
        className="inline-flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg"
        style={{
          backgroundColor: productSemanticColors.cardMuted,
          color: productSemanticColors.textMuted,
          border: `1px solid ${productSemanticColors.border}`,
        }}
        aria-hidden
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
            marginTop: 2,
            border: "none",
            backgroundColor: "transparent",
            padding: "0",
            fontSize: "0.75rem",
            color: productSemanticColors.textMuted,
          }}
          className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
        />
      </div>

      <label className="text-[11px] font-medium" style={{ ...LABEL_STYLE, width: "5rem" }}>
        Количество
        <input
          value={row.quantity}
          onChange={(e) => onPatch({ quantity: e.target.value })}
          inputMode="numeric"
          placeholder="1"
          style={{ ...FIELD_BASE, marginTop: 4 }}
          className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
        />
      </label>

      <label className="text-[11px] font-medium" style={{ ...LABEL_STYLE, width: "6.5rem" }}>
        {`Цена, ${suffix}`}
        <input
          value={row.partCost}
          onChange={(e) => onPatch({ partCost: e.target.value })}
          inputMode="decimal"
          placeholder="0"
          style={{ ...FIELD_BASE, marginTop: 4 }}
          className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
        />
      </label>

      <button
        type="button"
        onClick={onClear}
        aria-label="Очистить деталь"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition hover:opacity-90"
        style={{
          borderColor: productSemanticColors.border,
          color: productSemanticColors.textMuted,
          backgroundColor: productSemanticColors.cardMuted,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
