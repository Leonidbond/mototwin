"use client";

import { useMemo, type CSSProperties } from "react";
import type { PickerDraftCart, PickerSubmitDecision, PickerSubmitPreview } from "@mototwin/types";
import {
  arePickerQuantityResolutionsComplete,
  computePickerSubmitPriceEstimate,
  computePickerSubmitWishlistPieceDelta,
  getPickerWillAddPieceCountLabel,
} from "@mototwin/domain";
import { pickerColors } from "./picker-styles";

function quantityUpgradeOutcomeLine(
  d: Extract<PickerSubmitDecision, { kind: "quantityUpgrade" }>,
  mode: "addAllFromDraft" | "setQtyToDraft"
): string {
  if (mode === "addAllFromDraft") {
    return `К этой строке прибавится +${d.draftRequestedQty} шт. из подбора. В списке станет ${d.existingQty + d.draftRequestedQty} шт.`;
  }
  const dlt = d.draftRequestedQty - d.existingQty;
  if (dlt > 0) {
    return `К строке прибавится +${dlt} шт. В списке станет ${d.draftRequestedQty} шт.`;
  }
  return "Строка в списке не изменится: в подборе не больше, чем уже есть — ничего не добавим.";
}

function setQtyChipLabel(d: Extract<PickerSubmitDecision, { kind: "quantityUpgrade" }>): string {
  if (d.addQty > 0) {
    return `В списке ровно ${d.draftRequestedQty} шт. (+${d.addQty})`;
  }
  return "Не добавлять (в списке уже не меньше подбора)";
}

export function PickerSubmitPreviewModal(props: {
  draft: PickerDraftCart;
  preview: PickerSubmitPreview;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  quantityResolutionByDraftId: Record<string, "addAllFromDraft" | "setQtyToDraft" | undefined>;
  onQuantityResolutionChange: (draftId: string, mode: "addAllFromDraft" | "setQtyToDraft") => void;
}) {
  const canConfirm =
    (props.preview.willAddCount > 0 || props.preview.quantityUpgradeCount > 0) &&
    (props.preview.quantityUpgradeCount === 0 ||
      arePickerQuantityResolutionsComplete(props.preview, props.quantityResolutionByDraftId));

  const pieceDelta = useMemo(
    () => computePickerSubmitWishlistPieceDelta(props.preview, props.quantityResolutionByDraftId),
    [props.preview, props.quantityResolutionByDraftId]
  );

  const priceEst = useMemo(
    () => computePickerSubmitPriceEstimate(props.draft, props.preview, props.quantityResolutionByDraftId),
    [props.draft, props.preview, props.quantityResolutionByDraftId]
  );

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="submit-preview-title">
      <div style={dialogStyle}>
        <h2 id="submit-preview-title" style={titleStyle}>
          Подтвердите состав
        </h2>

        <div style={summaryGridStyle}>
          <SummaryItem label="Новые позиции" count={props.preview.willAddCount} color={pickerColors.successText} />
          <SummaryItem
            label="Обновить кол-во"
            count={props.preview.quantityUpgradeCount}
            color={pickerColors.warning}
          />
          <SummaryItem label="Уже достаточно" count={props.preview.duplicateCount} color={pickerColors.info} />
          <SummaryItem label="Не получится" count={props.preview.blockedCount} color={pickerColors.warning} />
        </div>

        <ul style={listStyle}>
          {props.preview.decisions.map((decision) => (
            <li key={decision.draftId} style={listItemStyle}>
              <DecisionDot kind={decision.kind} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: pickerColors.text }}>{decision.label}</div>
                {decision.kind === "willAdd" && getPickerWillAddPieceCountLabel(decision) ? (
                  <div style={{ fontSize: 11, color: pickerColors.textMuted, marginTop: 2 }}>
                    {getPickerWillAddPieceCountLabel(decision)}
                  </div>
                ) : null}
                {decision.kind === "quantityUpgrade" ? (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 11, color: pickerColors.textMuted, margin: "0 0 8px" }}>
                      Совпадает со строкой в списке: сейчас <strong>{decision.existingQty}</strong> шт., в подборе —{" "}
                      <strong>{decision.draftRequestedQty}</strong> шт. Выберите вариант — ниже появится итог.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <ChoiceChip
                        label={`Прибавить ${decision.draftRequestedQty} шт. из подбора к строке`}
                        selected={props.quantityResolutionByDraftId[decision.draftId] === "addAllFromDraft"}
                        onClick={() => props.onQuantityResolutionChange(decision.draftId, "addAllFromDraft")}
                        disabled={props.isSubmitting}
                      />
                      <ChoiceChip
                        label={setQtyChipLabel(decision)}
                        selected={props.quantityResolutionByDraftId[decision.draftId] === "setQtyToDraft"}
                        onClick={() => props.onQuantityResolutionChange(decision.draftId, "setQtyToDraft")}
                        disabled={props.isSubmitting}
                      />
                    </div>
                    {props.quantityResolutionByDraftId[decision.draftId] ? (
                      <p
                        style={{
                          fontSize: 12,
                          color: pickerColors.text,
                          margin: "10px 0 0",
                          padding: "8px 10px",
                          borderRadius: 10,
                          backgroundColor: pickerColors.surfaceMuted,
                          border: `1px solid ${pickerColors.border}`,
                        }}
                      >
                        {quantityUpgradeOutcomeLine(
                          decision,
                          props.quantityResolutionByDraftId[decision.draftId]!
                        )}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {decision.kind === "duplicate" || decision.kind === "blocked" ? (
                  <div style={{ fontSize: 11, color: pickerColors.textMuted, marginTop: 2 }}>
                    {decision.reason}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {props.preview.quantityUpgradeCount > 0 && pieceDelta === null ? (
          <div style={totalStyle}>
            Суммарное изменение количества в списке: укажите варианты для строк со совпадением — затем здесь
            отобразится итог.
          </div>
        ) : pieceDelta !== null ? (
          <div style={totalStyle}>
            Суммарное изменение количества в списке покупок:{" "}
            <strong>
              {pieceDelta >= 0 ? "+" : "−"}
              {Math.abs(pieceDelta)}
            </strong>{" "}
            шт. (с учётом выбора).
            {priceEst != null && Number.isFinite(priceEst.amount) ? (
              <span style={{ display: "block", marginTop: 6 }}>
                Ориентир по сумме: ≈ {formatPriceRu(priceEst.amount, priceEst.currency)}
              </span>
            ) : props.preview.quantityUpgradeCount > 0 && priceEst == null ? (
              <span style={{ display: "block", marginTop: 6, fontWeight: 500 }}>
                Ориентир по сумме — после выбора всех вариантов или при одной валюте по позициям.
              </span>
            ) : null}
          </div>
        ) : null}

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
            disabled={props.isSubmitting || !canConfirm}
            style={{
              ...primaryButtonStyle,
              opacity: props.isSubmitting || !canConfirm ? 0.6 : 1,
              cursor: props.isSubmitting || !canConfirm ? "default" : "pointer",
            }}
          >
            {props.isSubmitting ? "Сохраняем..." : "Подтвердить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChoiceChip(props: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: `1px solid ${props.selected ? pickerColors.primary : pickerColors.border}`,
        backgroundColor: props.selected ? "rgba(255,122,0,0.12)" : pickerColors.surfaceMuted,
        color: pickerColors.text,
        fontSize: 12,
        fontWeight: 600,
        cursor: props.disabled ? "default" : "pointer",
        textAlign: "left",
        maxWidth: "100%",
      }}
    >
      {props.label}
    </button>
  );
}

function SummaryItem({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={summaryItemStyle}>
      <span style={{ fontSize: 10, color: pickerColors.textMuted, textAlign: "center" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color }}>{count}</span>
    </div>
  );
}

function DecisionDot({
  kind,
}: {
  kind: "willAdd" | "duplicate" | "blocked" | "quantityUpgrade";
}) {
  const color =
    kind === "willAdd"
      ? pickerColors.successStrong
      : kind === "duplicate"
        ? pickerColors.info
        : kind === "quantityUpgrade"
          ? pickerColors.warning
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

function formatPriceRu(amount: number, currency: string | null): string {
  const numFmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  const cur = currency?.trim().toUpperCase();
  const sym = cur === "RUB" ? "₽" : cur === "USD" ? "$" : cur === "EUR" ? "€" : cur || "";
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

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
