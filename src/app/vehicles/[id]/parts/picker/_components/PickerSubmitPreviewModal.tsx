"use client";

import type { CSSProperties } from "react";
import type { PickerSubmitPreview } from "@mototwin/types";
import { pickerColors } from "./picker-styles";

export function PickerSubmitPreviewModal(props: {
  preview: PickerSubmitPreview;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="submit-preview-title">
      <div style={dialogStyle}>
        <h2 id="submit-preview-title" style={titleStyle}>Подтвердите состав</h2>

        <div style={summaryStyle}>
          <SummaryItem label="Будет добавлено" count={props.preview.willAddCount} color={pickerColors.successText} />
          <SummaryItem label="Уже в списке" count={props.preview.duplicateCount} color={pickerColors.info} />
          <SummaryItem label="Не получится" count={props.preview.blockedCount} color={pickerColors.warning} />
        </div>

        <ul style={listStyle}>
          {props.preview.decisions.map((decision) => (
            <li key={decision.draftId} style={listItemStyle}>
              <DecisionDot kind={decision.kind} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: pickerColors.text }}>{decision.label}</div>
                {decision.kind !== "willAdd" ? (
                  <div style={{ fontSize: 11, color: pickerColors.textMuted, marginTop: 2 }}>
                    {decision.reason}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {props.preview.estimatedTotal != null ? (
          <div style={totalStyle}>
            Будет добавлено: {props.preview.willAddCount} {positionsLabel(props.preview.willAddCount)},
            ≈ {formatPriceRu(props.preview.estimatedTotal, props.preview.estimatedCurrency)}
          </div>
        ) : (
          <div style={totalStyle}>
            Будет добавлено: {props.preview.willAddCount} {positionsLabel(props.preview.willAddCount)}
          </div>
        )}

        <div style={actionsStyle}>
          <button
            type="button"
            onClick={props.onCancel}
            disabled={props.isSubmitting}
            style={secondaryButtonStyle}
          >
            Назад
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            disabled={props.isSubmitting || props.preview.willAddCount === 0}
            style={{
              ...primaryButtonStyle,
              opacity: props.isSubmitting || props.preview.willAddCount === 0 ? 0.6 : 1,
              cursor: props.isSubmitting || props.preview.willAddCount === 0 ? "default" : "pointer",
            }}
          >
            {props.isSubmitting ? "Сохраняем..." : "Подтвердить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={summaryItemStyle}>
      <span style={{ fontSize: 11, color: pickerColors.textMuted }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 800, color }}>{count}</span>
    </div>
  );
}

function DecisionDot({ kind }: { kind: "willAdd" | "duplicate" | "blocked" }) {
  const color =
    kind === "willAdd"
      ? pickerColors.successStrong
      : kind === "duplicate"
        ? pickerColors.info
        : pickerColors.error;
  return (
    <span
      style={{
        flexShrink: 0,
        marginTop: 6,
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: color,
      }}
      aria-hidden
    />
  );
}

function positionsLabel(n: number): string {
  if (n === 1) return "позиция";
  if (n >= 2 && n <= 4) return "позиции";
  return "позиций";
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

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 60,
};

const dialogStyle: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  maxHeight: "calc(100vh - 32px)",
  overflow: "auto",
  borderRadius: 24,
  padding: 20,
  backgroundColor: pickerColors.surface,
  border: `1px solid ${pickerColors.border}`,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  color: pickerColors.text,
};

const summaryStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
};

const summaryItemStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  padding: 10,
  borderRadius: 12,
  backgroundColor: pickerColors.surfaceMuted,
  border: `1px solid ${pickerColors.border}`,
};

const listStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  maxHeight: 280,
  overflow: "auto",
};

const listItemStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  padding: "8px 4px",
  borderBottom: `1px solid ${pickerColors.border}`,
};

const totalStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: pickerColors.text,
  textAlign: "right",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  background: "transparent",
  border: `1px solid ${pickerColors.border}`,
  color: pickerColors.text,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const primaryButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  backgroundColor: pickerColors.primary,
  color: pickerColors.onPrimary,
  border: "none",
  fontSize: 13,
  fontWeight: 700,
};
