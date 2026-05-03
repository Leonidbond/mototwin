"use client";

import { useCallback, useState, type CSSProperties } from "react";
import type { ServiceKitViewModel } from "@mototwin/types";
import { getServiceKitTagRu } from "@mototwin/domain";
import { KitCompositionDetails } from "./KitCompositionDetails";
import { pickerColors } from "./picker-styles";

const KIT_TAG_BG: Record<string, string> = {
  POPULAR: "#1F2C3A",
  BEST_VALUE: "#2A2310",
  RECOMMENDED: "#1A2A1F",
};

const KIT_TAG_FG: Record<string, string> = {
  POPULAR: "#A1C8E8",
  BEST_VALUE: "#FFD66B",
  RECOMMENDED: "#7CD9A2",
};

export function ServiceKitRow(props: {
  kit: ServiceKitViewModel;
  isInDraft: boolean;
  isAdding?: boolean;
  onAddKit: () => void;
}) {
  const [compositionOpen, setCompositionOpen] = useState(false);
  const tag = getServiceKitTagRu(props.kit);
  const totalAmount = computeKitTotalAmount(props.kit);
  const currency = pickKitCurrency(props.kit);
  const itemsCount = props.kit.items.length;
  const isDisabled = props.isInDraft || props.isAdding;

  const toggleComposition = useCallback(() => {
    setCompositionOpen((v) => !v);
  }, []);

  return (
    <article style={articleStyle}>
      <div style={topRowStyle}>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={compositionOpen}
          onClick={toggleComposition}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleComposition();
            }
          }}
          style={cardClickableStyle}
        >
          <div style={imageStyle} aria-hidden>
            🛠
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
                flexWrap: "wrap",
              }}
            >
              <h3 style={titleStyle}>{props.kit.title}</h3>
              {tag ? (
                <span
                  style={{
                    ...tagStyle,
                    backgroundColor: KIT_TAG_BG[tag.kind],
                    color: KIT_TAG_FG[tag.kind],
                  }}
                >
                  {tag.labelRu}
                </span>
              ) : null}
            </div>
            {props.kit.description ? (
              <p style={descriptionStyle}>{props.kit.description}</p>
            ) : null}
            <div style={metaStyle}>
              Включает {itemsCount} {itemsLabel(itemsCount)}
              <span style={chevronHintStyle}> · {compositionOpen ? "Скрыть состав" : "Показать состав"}</span>
            </div>
          </div>
          <div style={{ textAlign: "right", minWidth: 88, flexShrink: 0 }}>
            <div style={priceStyle}>{formatPriceRu(totalAmount, currency)}</div>
            <div style={fitsStyle}>✓ Подходит</div>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onAddKit();
          }}
          disabled={isDisabled}
          style={{
            ...addButtonStyle,
            backgroundColor: props.isInDraft ? pickerColors.surfaceMuted : pickerColors.primary,
            color: props.isInDraft ? pickerColors.textMuted : pickerColors.onPrimary,
            cursor: isDisabled ? "default" : "pointer",
            opacity: props.isAdding ? 0.7 : 1,
          }}
        >
          {props.isInDraft ? "В корзине ✓" : props.isAdding ? "Добавляем..." : "Добавить комплект"}
        </button>
      </div>
      {compositionOpen ? <KitCompositionDetails kit={props.kit} /> : null}
    </article>
  );
}

function itemsLabel(n: number): string {
  if (n === 1) return "позицию";
  if (n >= 2 && n <= 4) return "позиции";
  return "позиций";
}

function computeKitTotalAmount(kit: ServiceKitViewModel): number {
  let total = 0;
  for (const item of kit.items) {
    if (item.matchedPriceAmount != null && Number.isFinite(item.matchedPriceAmount)) {
      total += item.matchedPriceAmount * Math.max(item.quantity, 1);
    }
  }
  return total;
}

function pickKitCurrency(kit: ServiceKitViewModel): string | null {
  for (const item of kit.items) {
    const c = item.matchedCurrency?.trim();
    if (c) return c;
  }
  return null;
}

function formatPriceRu(amount: number, currency: string | null): string {
  if (amount <= 0) return "Цена по запросу";
  const numFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  const cur = currency?.trim().toUpperCase();
  const sym = cur === "RUB" ? "₽" : cur === "USD" ? "$" : cur === "EUR" ? "€" : (cur || "");
  return sym ? `${numFmt} ${sym}` : numFmt;
}

const articleStyle: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  backgroundColor: pickerColors.surface,
  border: `1px solid ${pickerColors.border}`,
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const topRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  width: "100%",
};

const cardClickableStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  flex: "1 1 220px",
  minWidth: 0,
  cursor: "pointer",
  borderRadius: 10,
  margin: -6,
  padding: 6,
  border: "none",
  background: "transparent",
  textAlign: "left",
  color: "inherit",
  font: "inherit",
};

const chevronHintStyle: CSSProperties = {
  color: pickerColors.textSecondary,
  fontWeight: 600,
};

const imageStyle: CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 12,
  backgroundColor: pickerColors.surfaceSubtle,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 28,
  color: pickerColors.textMuted,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  color: pickerColors.text,
  minWidth: 0,
  overflowWrap: "anywhere",
};

const tagStyle: CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
};

const descriptionStyle: CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: 12,
  color: pickerColors.textMuted,
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflowWrap: "anywhere",
};

const metaStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  color: pickerColors.textMuted,
};

const priceStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: pickerColors.text,
};

const fitsStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: pickerColors.successText,
};

const addButtonStyle: CSSProperties = {
  flexShrink: 0,
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
};
