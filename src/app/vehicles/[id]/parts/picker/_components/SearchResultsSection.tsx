"use client";

import type { CSSProperties } from "react";
import type { PartSkuViewModel } from "@mototwin/types";
import { getPartSkuViewModelDisplayLines } from "@mototwin/domain";
import { pickerColors, pickerSectionSubtitleStyle, pickerSectionTitleStyle } from "./picker-styles";

export function SearchResultsSection(props: {
  query: string;
  results: PartSkuViewModel[];
  /** Если больше, чем results.length — показываем «из N в ответе» (клиентский фильтр). */
  totalUnfiltered?: number;
  draftSkuIds: Set<string>;
  isLoading: boolean;
  error: string;
  onAddSku: (sku: PartSkuViewModel) => void;
  onResetSearch: () => void;
}) {
  return (
    <section style={sectionStyle}>
      <header style={headerStyle}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              ...pickerSectionTitleStyle,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Поиск: «{props.query}»
          </h2>
          <p style={pickerSectionSubtitleStyle}>
            {props.isLoading ? (
              "Ищем в каталоге..."
            ) : (
              <>
                Найдено: {props.results.length}
                {props.totalUnfiltered != null && props.totalUnfiltered > props.results.length ? (
                  <span style={{ color: pickerColors.textMuted }}>
                    {" "}
                    (из {props.totalUnfiltered} в ответе каталога)
                  </span>
                ) : null}
              </>
            )}
          </p>
        </div>
        <button type="button" onClick={props.onResetSearch} style={resetLinkStyle}>
          Сбросить поиск
        </button>
      </header>

      {props.error ? (
        <div style={errorStyle}>{props.error}</div>
      ) : !props.isLoading && props.results.length === 0 ? (
        <div style={emptyStyle}>
          Ничего не найдено. Попробуйте изменить запрос или фильтры.
        </div>
      ) : (
        <div style={listStyle}>
          {props.results.map((sku) => (
            <SearchResultRow
              key={sku.id}
              sku={sku}
              isInDraft={props.draftSkuIds.has(sku.id)}
              onAdd={() => props.onAddSku(sku)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SearchResultRow(props: { sku: PartSkuViewModel; isInDraft: boolean; onAdd: () => void }) {
  const lines = getPartSkuViewModelDisplayLines(props.sku);
  const price = formatPriceRu(props.sku.priceAmount, props.sku.currency);
  return (
    <div style={rowStyle}>
      <div style={imageStyle} aria-hidden>
        🛞
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: pickerColors.text,
            overflowWrap: "anywhere",
          }}
        >
          {lines.primaryLine}
        </div>
        {lines.secondaryLine ? (
          <div style={{ marginTop: 4, fontSize: 12, color: pickerColors.textMuted }}>
            {lines.secondaryLine}
          </div>
        ) : null}
      </div>
      <div style={{ textAlign: "right", minWidth: 72, flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: pickerColors.text }}>{price}</div>
      </div>
      <button
        type="button"
        onClick={props.onAdd}
        disabled={props.isInDraft}
        aria-label={props.isInDraft ? "Уже в корзине" : "Добавить"}
        style={{
          ...addBtn,
          backgroundColor: props.isInDraft ? pickerColors.surfaceMuted : pickerColors.primary,
          color: props.isInDraft ? pickerColors.textMuted : pickerColors.onPrimary,
          cursor: props.isInDraft ? "default" : "pointer",
        }}
      >
        {props.isInDraft ? "✓" : "+"}
      </button>
    </div>
  );
}

function formatPriceRu(amount: number | null, currency: string | null): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const numFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  const cur = currency?.trim().toUpperCase();
  const sym = cur === "RUB" ? "₽" : cur === "USD" ? "$" : cur === "EUR" ? "€" : (cur || "");
  return sym ? `${numFmt} ${sym}` : numFmt;
}

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  minWidth: 0,
  width: "100%",
};

const resetLinkStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: pickerColors.textSecondary,
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};

const listStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 12,
  borderRadius: 12,
  backgroundColor: pickerColors.surface,
  border: `1px solid ${pickerColors.border}`,
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const imageStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 10,
  backgroundColor: pickerColors.surfaceSubtle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  color: pickerColors.textMuted,
  flexShrink: 0,
};

const addBtn: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "none",
  fontSize: 20,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const emptyStyle: CSSProperties = {
  padding: 24,
  textAlign: "center",
  color: pickerColors.textMuted,
  fontSize: 13,
  border: `1px dashed ${pickerColors.border}`,
  borderRadius: 14,
};

const errorStyle: CSSProperties = {
  padding: 16,
  borderRadius: 12,
  backgroundColor: "#2A1010",
  border: "1px solid #7F1D1D",
  color: "#F87171",
  fontSize: 13,
};
