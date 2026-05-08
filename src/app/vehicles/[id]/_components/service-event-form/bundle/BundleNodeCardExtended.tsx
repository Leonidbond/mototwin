"use client";

import { SERVICE_ACTION_TYPE_OPTIONS } from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { BundleItemFormValues, ServiceActionType } from "@mototwin/types";
import { useState } from "react";
import { NodePickerModal, type SharedNodePickerOption } from "../../node-picker/NodePickerModal";
import { FIELD_BASE, FOCUS_RING, LABEL_STYLE } from "../styles";
import { BundleNodePartRow } from "./BundleNodePartRow";

export type BundleNodeCardExtendedProps = {
  index: number;
  row: BundleItemFormValues;
  nodeTitle: string;
  crumb: string;
  hasNode: boolean;
  itemsCount: number;
  collapsed: boolean;
  currency: string;
  partsCostFormatted: string;
  laborCostFormatted: string;
  availableLeafNodePickerOptions: SharedNodePickerOption[];
  onToggleCollapsed: () => void;
  onChangeNodeId: (nodeId: string) => void;
  onChangeActionType: (next: ServiceActionType) => void;
  onPatchRow: (patch: Partial<BundleItemFormValues>) => void;
  onSetSkuRow: () => void;
  onRemoveRow: () => void;
  onClearPart: () => void;
};

export function BundleNodeCardExtended(props: BundleNodeCardExtendedProps) {
  const {
    index,
    row,
    nodeTitle,
    crumb,
    hasNode,
    itemsCount,
    collapsed,
    currency,
    partsCostFormatted,
    laborCostFormatted,
    availableLeafNodePickerOptions,
    onToggleCollapsed,
    onChangeNodeId,
    onChangeActionType,
    onPatchRow,
    onSetSkuRow,
    onRemoveRow,
    onClearPart,
  } = props;
  const [nodePickerOpen, setNodePickerOpen] = useState(false);

  return (
    <div
      className="rounded-2xl border"
      style={{
        backgroundColor: productSemanticColors.cardSubtle,
        borderColor: productSemanticColors.border,
      }}
    >
      <div
        className="flex flex-wrap items-center gap-3 px-4 py-3"
        style={collapsed ? undefined : { borderBottom: `1px solid ${productSemanticColors.border}` }}
      >
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
          style={{
            backgroundColor: productSemanticColors.cardMuted,
            color: productSemanticColors.primaryAction,
          }}
          aria-hidden
        >
          {`${index + 1}.`}
        </span>
        <div className="min-w-0 flex-1">
          {hasNode ? (
            <p
              className="truncate text-[14px] font-semibold leading-tight"
              style={{ color: productSemanticColors.textPrimary }}
            >
              {nodeTitle}
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setNodePickerOpen(true)}
                style={{
                  ...FIELD_BASE,
                  marginTop: 0,
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer",
                }}
                className={FOCUS_RING}
              >
                Выберите узел
              </button>
              <NodePickerModal
                open={nodePickerOpen}
                options={availableLeafNodePickerOptions}
                selectedIds={row.nodeId ? new Set([row.nodeId]) : undefined}
                onClose={() => setNodePickerOpen(false)}
                onSelect={(nodeId) => {
                  onChangeNodeId(nodeId);
                  setNodePickerOpen(false);
                }}
              />
            </>
          )}
          {hasNode && crumb ? (
            <p
              className="mt-0.5 truncate text-[11px]"
              style={{ color: productSemanticColors.textMuted }}
            >
              {crumb}
            </p>
          ) : null}
        </div>

        <label className="text-[11px] font-medium" style={LABEL_STYLE}>
          Тип работы
          <select
            value={row.actionType}
            onChange={(e) => onChangeActionType(e.target.value as ServiceActionType)}
            style={{
              ...FIELD_BASE,
              marginTop: 4,
              colorScheme: "dark",
              minWidth: "8rem",
            }}
            className={FOCUS_RING}
          >
            {SERVICE_ACTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex shrink-0 items-center gap-1.5">
          {itemsCount > 1 ? (
            <button
              type="button"
              onClick={onRemoveRow}
              aria-label="Удалить узел"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition hover:opacity-90"
              style={{
                borderColor: productSemanticColors.border,
                color: productSemanticColors.error,
                backgroundColor: productSemanticColors.cardMuted,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Развернуть" : "Свернуть"}
            aria-expanded={!collapsed}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition hover:opacity-90"
            style={{
              borderColor: productSemanticColors.border,
              color: productSemanticColors.textMuted,
              backgroundColor: productSemanticColors.cardMuted,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className={collapsed ? "transition-transform" : "rotate-180 transition-transform"}
              aria-hidden
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {!collapsed ? (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <p
              className="text-xs font-semibold tracking-tight"
              style={{ color: productSemanticColors.textPrimary }}
            >
              Детали
            </p>
            <span
              className="text-[11px] font-medium"
              style={{ color: productSemanticColors.textMuted }}
            >
              {/* Placeholder for parity with reference; multi-part not implemented per plan §0. */}
            </span>
          </div>

          <div className="mt-2">
            <BundleNodePartRow
              row={row}
              currency={currency}
              onPatch={onPatchRow}
              onSetSkuRow={onSetSkuRow}
              onClear={onClearPart}
            />
          </div>

          <div
            className="mt-3 grid grid-cols-2 gap-4 border-t pt-3"
            style={{ borderTopColor: productSemanticColors.border }}
          >
            <div>
              <p
                className="text-[11px] font-medium"
                style={{ color: productSemanticColors.textMuted }}
              >
                Стоимость деталей
              </p>
              <p
                className="mt-0.5 text-[15px] font-semibold tabular-nums"
                style={{ color: productSemanticColors.textPrimary }}
              >
                {partsCostFormatted}
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-medium" style={LABEL_STYLE}>
                Стоимость работы
                <input
                  value={row.laborCost}
                  onChange={(e) => onPatchRow({ laborCost: e.target.value })}
                  inputMode="decimal"
                  placeholder="0"
                  style={{ ...FIELD_BASE, marginTop: 4 }}
                  className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
                />
              </label>
              {/* Read-only formatted value next to input. */}
              <p
                className="mt-1 text-[11px]"
                style={{ color: productSemanticColors.textMuted }}
              >
                {`≈ ${laborCostFormatted}`}
              </p>
            </div>
          </div>

          <label className="mt-3 block text-[11px] font-medium" style={LABEL_STYLE}>
            Комментарий к узлу
            <input
              value={row.comment}
              onChange={(e) => onPatchRow({ comment: e.target.value })}
              placeholder="Опционально"
              style={FIELD_BASE}
              className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
