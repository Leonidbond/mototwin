"use client";

import { useCallback, useState, type CSSProperties } from "react";
import type { PickerDraftCart, PickerDraftItem, PickerDraftItemKit } from "@mototwin/types";
import { getDraftTotals } from "@mototwin/domain";
import { KitCompositionDetails } from "./KitCompositionDetails";
import { pickerColors } from "./picker-styles";

export function PickerDraftCartPanel(props: {
  draft: PickerDraftCart;
  onRemove: (draftId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  isSubmitting: boolean;
  /** Без sticky — для нижней панели на узком экране. */
  variant?: "sidebar" | "dock";
}) {
  const totals = getDraftTotals(props.draft);
  const isEmpty = props.draft.items.length === 0;
  const isDock = props.variant === "dock";
  const panelMerged: CSSProperties = {
    ...panelStyle,
    ...(isDock
      ? {
          position: "static" as const,
          top: undefined,
          alignSelf: "stretch",
          maxHeight: "min(52vh, 420px)",
        }
      : {}),
  };

  return (
    <div style={panelMerged}>
      <header style={headerStyle}>
        <span style={titleStyle}>Корзина</span>
        <span style={countStyle}>
          ({totals.positionsCount} {positionsLabel(totals.positionsCount)})
        </span>
      </header>

      {isEmpty ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 28 }} aria-hidden>🛒</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: pickerColors.text, marginTop: 8 }}>
            Корзина пуста
          </div>
          <div style={{ fontSize: 12, color: pickerColors.textMuted, marginTop: 4 }}>
            Добавьте позиции из рекомендаций или комплектов.
          </div>
        </div>
      ) : (
        <ul style={listStyle}>
          {props.draft.items.map((item) => (
            <DraftItemRow key={item.draftId} item={item} onRemove={() => props.onRemove(item.draftId)} />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={props.onClear}
        disabled={isEmpty}
        style={{
          ...clearButtonStyle,
          opacity: isEmpty ? 0.4 : 1,
          cursor: isEmpty ? "default" : "pointer",
        }}
      >
        Очистить корзину
      </button>

      <div style={dividerStyle} />

      <div style={totalRowStyle}>
        <span style={{ color: pickerColors.textMuted, fontSize: 13 }}>Сумма</span>
        <span style={{ color: pickerColors.text, fontSize: 18, fontWeight: 800 }}>
          {totals.currency
            ? formatPriceRu(totals.totalAmount, totals.currency)
            : "—"}
        </span>
      </div>
      {!totals.currency && totals.positionsCount > 0 ? (
        <div style={{ fontSize: 11, color: pickerColors.textMuted, marginTop: -8 }}>
          Цены в разных валютах — итог считается на оформлении.
        </div>
      ) : null}

      <button
        type="button"
        onClick={props.onCheckout}
        disabled={isEmpty || props.isSubmitting}
        style={{
          ...checkoutButtonStyle,
          opacity: isEmpty || props.isSubmitting ? 0.6 : 1,
          cursor: isEmpty || props.isSubmitting ? "default" : "pointer",
        }}
      >
        {props.isSubmitting ? "Оформляем..." : "Перейти к оформлению"}
      </button>
    </div>
  );
}

function DraftItemRow(props: { item: PickerDraftItem; onRemove: () => void }) {
  const { item } = props;
  if (item.kind === "sku") {
    const price = formatPriceRu(item.sku.priceAmount ?? 0, item.sku.currency);
    return (
      <li style={itemRowStyle}>
        <div style={itemImageStyle} aria-hidden>🛞</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={itemTitleStyle}>
            {item.sku.brandName} {item.sku.canonicalName}
          </div>
          {item.sku.partType ? (
            <div style={itemMetaStyle}>{item.sku.partType.replaceAll("_", " ")}</div>
          ) : null}
          <div style={itemQtyRowStyle}>
            <span>{item.quantity} шт.</span>
            <span style={{ marginLeft: "auto", color: pickerColors.text, fontWeight: 700 }}>
              {price}
            </span>
          </div>
        </div>
        <button type="button" onClick={props.onRemove} aria-label="Удалить" style={removeButtonStyle}>
          ×
        </button>
      </li>
    );
  }

  return <DraftKitCartRow item={item} onRemove={props.onRemove} />;
}

function DraftKitCartRow(props: { item: PickerDraftItemKit; onRemove: () => void }) {
  const { item } = props;
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const totalAmount = item.kit.items.reduce(
    (acc, ki) =>
      acc +
      (ki.matchedPriceAmount != null && Number.isFinite(ki.matchedPriceAmount)
        ? ki.matchedPriceAmount * Math.max(ki.quantity, 1)
        : 0),
    0
  );
  const currency = item.kit.items.find((ki) => ki.matchedCurrency)?.matchedCurrency ?? null;
  const itemsCount = item.kit.items.length;

  return (
    <li style={{ ...itemRowStyle, flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={open}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            flex: 1,
            minWidth: 0,
            cursor: "pointer",
            borderRadius: 8,
            padding: 2,
            margin: -2,
          }}
        >
          <div style={itemImageStyle} aria-hidden>
            🛠
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={itemTitleStyle}>{item.kit.title}</div>
            <div style={itemMetaStyle}>
              {itemsCount} {positionsLabel(itemsCount)}
              <span style={{ color: pickerColors.textSecondary, fontWeight: 600 }}>
                {" "}
                · {open ? "Скрыть состав" : "Показать состав"}
              </span>
            </div>
            <div style={itemQtyRowStyle}>
              <span>1 шт.</span>
              <span style={{ marginLeft: "auto", color: pickerColors.text, fontWeight: 700 }}>
                {totalAmount > 0 ? formatPriceRu(totalAmount, currency) : "—"}
              </span>
            </div>
          </div>
        </div>
        <button type="button" onClick={props.onRemove} aria-label="Удалить" style={removeButtonStyle}>
          ×
        </button>
      </div>
      {open ? (
        <div style={{ paddingLeft: 54 }}>
          <KitCompositionDetails kit={item.kit} heading="Состав в корзине" />
        </div>
      ) : null}
    </li>
  );
}

function positionsLabel(n: number): string {
  if (n === 1) return "позиция";
  if (n >= 2 && n <= 4) return "позиции";
  return "позиций";
}

function formatPriceRu(amount: number, currency: string | null): string {
  if (amount <= 0) return "—";
  const numFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  const cur = currency?.trim().toUpperCase();
  const sym = cur === "RUB" ? "₽" : cur === "USD" ? "$" : cur === "EUR" ? "€" : (cur || "");
  return sym ? `${numFmt} ${sym}` : numFmt;
}

const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  borderRadius: 18,
  backgroundColor: pickerColors.surface,
  border: `1px solid ${pickerColors.border}`,
  position: "sticky",
  top: 16,
  alignSelf: "flex-start",
  maxHeight: "calc(100vh - 32px)",
  overflow: "auto",
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
};

const titleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: pickerColors.text,
};

const countStyle: CSSProperties = {
  fontSize: 13,
  color: pickerColors.textMuted,
};

const emptyStyle: CSSProperties = {
  padding: 16,
  textAlign: "center",
  borderRadius: 12,
  border: `1px dashed ${pickerColors.border}`,
};

const listStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const itemRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: 10,
  borderRadius: 12,
  backgroundColor: pickerColors.surfaceMuted,
  border: `1px solid ${pickerColors.border}`,
};

const itemImageStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 10,
  backgroundColor: pickerColors.surfaceSubtle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  color: pickerColors.textMuted,
  flexShrink: 0,
};

const itemTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: pickerColors.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const itemMetaStyle: CSSProperties = {
  marginTop: 2,
  fontSize: 11,
  color: pickerColors.textMuted,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const itemQtyRowStyle: CSSProperties = {
  marginTop: 4,
  display: "flex",
  fontSize: 12,
  color: pickerColors.textMuted,
};

const removeButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: pickerColors.textMuted,
  fontSize: 18,
  cursor: "pointer",
  padding: "0 4px",
  lineHeight: 1,
};

const clearButtonStyle: CSSProperties = {
  marginTop: 4,
  padding: "8px 12px",
  borderRadius: 10,
  background: "transparent",
  border: `1px solid ${pickerColors.border}`,
  color: pickerColors.textMuted,
  fontSize: 12,
  fontWeight: 600,
};

const dividerStyle: CSSProperties = {
  height: 1,
  backgroundColor: pickerColors.border,
  margin: "8px 0",
};

const totalRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
};

const checkoutButtonStyle: CSSProperties = {
  marginTop: 4,
  padding: "12px 16px",
  borderRadius: 12,
  backgroundColor: pickerColors.primary,
  color: pickerColors.onPrimary,
  border: "none",
  fontSize: 14,
  fontWeight: 700,
};
