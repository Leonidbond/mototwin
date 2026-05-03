"use client";

import type { CSSProperties } from "react";
import type { PartRecommendationViewModel, PickerMerchandiseLabel } from "@mototwin/types";
import { MERCHANDISE_LABELS_RU } from "@mototwin/domain";
import { merchandiseAccentColor, pickerColors } from "./picker-styles";

const REASON_BULLET_LIMIT = 4;

export function RecommendationCard(props: {
  label: PickerMerchandiseLabel;
  recommendation: PartRecommendationViewModel;
  isInDraft: boolean;
  onAdd: () => void;
}) {
  const accent = merchandiseAccentColor[props.label];
  const labelText = MERCHANDISE_LABELS_RU[props.label];
  const rec = props.recommendation;
  const reasons = buildReasons(rec).slice(0, REASON_BULLET_LIMIT);
  const priceLabel = formatPriceRu(rec.priceAmount, rec.currency);

  return (
    <article style={{ ...cardStyle, borderColor: accent }}>
      <div
        style={{
          ...labelBadgeStyle,
          backgroundColor: accent,
          color: props.label === "BEST_VALUE" ? "#1A0F00" : pickerColors.onPrimary,
        }}
      >
        {labelText}
      </div>
      <div style={imagePlaceholderStyle} aria-hidden>
        🛞
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={brandLineStyle}>{rec.brandName}</div>
        <div style={nameLineStyle}>{rec.canonicalName}</div>
        {rec.partType ? (
          <div style={specsLineStyle}>{rec.partType.replaceAll("_", " ")}</div>
        ) : null}
      </div>
      {reasons.length > 0 ? (
        <ul style={reasonListStyle}>
          {reasons.map((r, i) => (
            <li key={i} style={reasonItemStyle}>
              <CheckIcon color={pickerColors.successStrong} />
              <span style={{ flex: 1 }}>{r}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div style={footerStyle}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={priceStyle}>{priceLabel}</div>
          <div style={fitsStyle}>
            <CheckIcon color={pickerColors.successStrong} /> Подходит
          </div>
        </div>
        <button
          type="button"
          onClick={props.onAdd}
          aria-label={props.isInDraft ? "Уже в корзине" : "Добавить в корзину"}
          disabled={props.isInDraft}
          style={{
            ...addButtonStyle,
            backgroundColor: props.isInDraft ? pickerColors.surfaceMuted : pickerColors.primary,
            color: props.isInDraft ? pickerColors.textMuted : pickerColors.onPrimary,
            cursor: props.isInDraft ? "default" : "pointer",
          }}
        >
          {props.isInDraft ? "✓" : "+"}
        </button>
      </div>
    </article>
  );
}

function buildReasons(rec: PartRecommendationViewModel): string[] {
  const list: string[] = [];
  if (rec.whyRecommended) list.push(rec.whyRecommended);
  if (rec.fitmentNote) list.push(rec.fitmentNote);
  if (rec.compatibilityWarning) list.push(rec.compatibilityWarning);
  return list;
}

function formatPriceRu(amount: number | null, currency: string | null): string {
  if (amount == null || !Number.isFinite(amount)) {
    return "Цена по запросу";
  }
  const numFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  const cur = currency?.trim().toUpperCase();
  const sym = cur === "RUB" ? "₽" : cur === "USD" ? "$" : cur === "EUR" ? "€" : (cur || "");
  return sym ? `${numFmt} ${sym}` : numFmt;
}

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: 16,
  borderRadius: 18,
  backgroundColor: pickerColors.surface,
  border: "2px solid",
  position: "relative",
  minHeight: 305,
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
  boxSizing: "border-box",
};

const labelBadgeStyle: CSSProperties = {
  alignSelf: "flex-start",
  padding: "4px 10px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.5,
};

const imagePlaceholderStyle: CSSProperties = {
  marginTop: 12,
  height: 55,
  borderRadius: 10,
  backgroundColor: pickerColors.surfaceSubtle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
  color: pickerColors.textMuted,
};

const brandLineStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: pickerColors.textMuted,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  overflowWrap: "anywhere",
};

const nameLineStyle: CSSProperties = {
  marginTop: 2,
  fontSize: 15,
  fontWeight: 700,
  color: pickerColors.text,
  lineHeight: 1.25,
  overflowWrap: "anywhere",
};

const specsLineStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: pickerColors.textMuted,
  overflowWrap: "anywhere",
};

const reasonListStyle: CSSProperties = {
  marginTop: 12,
  marginBottom: 0,
  paddingLeft: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  flex: 1,
};

const reasonItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
  fontSize: 12,
  color: pickerColors.textSecondary,
  lineHeight: 1.35,
};

const footerStyle: CSSProperties = {
  marginTop: 14,
  paddingTop: 12,
  borderTop: `1px solid ${pickerColors.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  minWidth: 0,
};

const priceStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: pickerColors.text,
  minWidth: 0,
  overflowWrap: "anywhere",
};

const fitsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  marginTop: 4,
  fontSize: 12,
  color: pickerColors.successText,
};

const addButtonStyle: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "none",
  fontSize: 22,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function CheckIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0, marginTop: 2 }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
