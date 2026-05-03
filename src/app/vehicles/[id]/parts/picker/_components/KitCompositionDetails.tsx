"use client";

import type { CSSProperties } from "react";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { ServiceKitItemViewModel, ServiceKitViewModel } from "@mototwin/types";
import { pickerColors } from "./picker-styles";

export function formatPickerKitLinePriceRu(
  unitAmount: number | null | undefined,
  quantity: number,
  currency: string | null | undefined
): string {
  const q = Math.max(quantity, 1);
  if (unitAmount == null || !Number.isFinite(unitAmount) || unitAmount <= 0) {
    return "—";
  }
  const line = unitAmount * q;
  return formatPriceRu(line, currency ?? null);
}

function formatCatalogSkuNumbers(partNumbers: string[]): string {
  const parts = partNumbers.map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function formatPriceRu(amount: number, currency: string | null): string {
  const numFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  const cur = currency?.trim().toUpperCase();
  const sym = cur === "RUB" ? "₽" : cur === "USD" ? "$" : cur === "EUR" ? "€" : (cur || "");
  return sym ? `${numFmt} ${sym}` : numFmt;
}

function KitLineRow(props: { item: ServiceKitItemViewModel }) {
  const { item } = props;
  const lineTotal = formatPickerKitLinePriceRu(
    item.matchedPriceAmount,
    item.quantity,
    item.matchedCurrency
  );
  const catalogSku = formatCatalogSkuNumbers(item.matchedPartNumbers);
  const showPickName =
    Boolean(item.matchedSkuTitle?.trim()) &&
    item.matchedSkuTitle!.trim() !== item.title.trim();
  const nodeShort = item.nodeCode.replaceAll("_", "·");

  const summaryParts = [item.title];
  if (showPickName && item.matchedSkuTitle) {
    summaryParts.push(item.matchedSkuTitle);
  }
  summaryParts.push(`SKU ${catalogSku}`);
  summaryParts.push(nodeShort);
  const summaryText = summaryParts.join(" · ");

  return (
    <div style={lineWrapStyle}>
      <div style={lineBodyStyle}>
        <div style={lineTextStyle}>
          <span>{summaryText}</span>
          {item.warning ? (
            <>
              <span> · </span>
              <span style={{ color: productSemanticColors.error }}>{item.warning}</span>
            </>
          ) : null}
        </div>
        <div style={lineMetaRowStyle}>
          <span style={qtyStyle}>×{Math.max(item.quantity, 1)}</span>
          <span style={linePriceStyle}>{lineTotal}</span>
        </div>
      </div>
    </div>
  );
}

/** Состав комплекта: перенос текста, высота по содержимому. */
export function KitCompositionDetails(props: {
  kit: ServiceKitViewModel;
  /** Заголовок блока (по умолчанию «Состав комплекта»). */
  heading?: string;
}) {
  const heading = props.heading ?? "Состав комплекта";
  const desc = props.kit.description?.trim() ?? "";

  return (
    <div style={blockStyle} role="region" aria-label={heading}>
      <div style={headingStyle}>{heading}</div>
      {desc ? <p style={kitDescriptionStyle}>{desc}</p> : null}
      <div style={linesStyle}>
        {props.kit.items.map((item) => (
          <KitLineRow key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}

const blockStyle: CSSProperties = {
  width: "100%",
  marginTop: 10,
  paddingTop: 12,
  borderTop: `1px solid ${pickerColors.border}`,
  boxSizing: "border-box",
};

const headingStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: pickerColors.textMuted,
  marginBottom: 6,
};

const kitDescriptionStyle: CSSProperties = {
  margin: "0 0 10px 0",
  padding: 0,
  fontSize: 13,
  fontWeight: 400,
  lineHeight: 1.5,
  color: pickerColors.text,
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
};

const linesStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const lineWrapStyle: CSSProperties = {
  borderRadius: 8,
  backgroundColor: pickerColors.surfaceMuted,
  border: `1px solid ${pickerColors.border}`,
  overflow: "hidden",
};

const lineBodyStyle: CSSProperties = {
  padding: "8px 10px",
  boxSizing: "border-box",
};

const lineTextStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 400,
  lineHeight: 1.5,
  color: pickerColors.text,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const lineMetaRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "baseline",
  gap: 10,
  marginTop: 6,
};

const qtyStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 400,
  color: pickerColors.textMuted,
};

const linePriceStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 400,
  color: pickerColors.text,
};
