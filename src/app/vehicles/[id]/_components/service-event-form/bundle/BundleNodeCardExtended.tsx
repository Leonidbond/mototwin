"use client";

import { SERVICE_ACTION_TYPE_OPTIONS } from "@mototwin/domain";
import type { BundleItemFormValues, ServiceActionType } from "@mototwin/types";
import type { CSSProperties } from "react";
import { FIELD_BASE, FOCUS_RING, LABEL_STYLE, SERVICE_EVENT_PARTS_UI } from "../styles";
import { BundleNodeIndexIcon } from "./BundleNodeRowFast";
import { BundleNodePartRow } from "./BundleNodePartRow";

const detailCompactInput: CSSProperties = {
  ...FIELD_BASE,
  marginTop: 2,
  padding: "5px 8px",
  fontSize: "0.75rem",
  lineHeight: 1.25,
};

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
  /** Пустая строка узла — открыть общий `AddNodeSheet` (как в BASIC). */
  onPickNode: () => void;
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
    onPickNode,
    onToggleCollapsed,
    onChangeNodeId,
    onChangeActionType,
    onPatchRow,
    onSetSkuRow,
    onRemoveRow,
    onClearPart,
  } = props;

  const headerRow = (
    <div
      role={!hasNode ? "button" : undefined}
      tabIndex={!hasNode ? 0 : undefined}
      onClick={!hasNode ? onPickNode : undefined}
      onKeyDown={
        !hasNode
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onPickNode();
              }
            }
          : undefined
      }
      className="group relative items-center px-0 py-2 sm:py-2.5"
      style={{
        display: "grid",
        gridTemplateColumns: "36px minmax(0, 1fr) minmax(158px, min(28vw, 220px)) auto",
        gap: "0.75rem",
        borderBottom: collapsed
          ? `1px solid ${hasNode ? SERVICE_EVENT_PARTS_UI.borderSubtle : SERVICE_EVENT_PARTS_UI.orange}`
          : undefined,
        cursor: hasNode ? "default" : "pointer",
      }}
    >
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{
          color: SERVICE_EVENT_PARTS_UI.orange,
          backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
        }}
        aria-hidden
      >
        <BundleNodeIndexIcon index={index} />
      </span>
      <div className="min-w-0 flex-1">
        {hasNode ? (
          <p
            className="truncate text-[13px] font-semibold leading-tight"
            style={{ color: SERVICE_EVENT_PARTS_UI.text }}
          >
            {nodeTitle}
          </p>
        ) : (
          <p
            className="truncate text-[13px] font-semibold leading-tight"
            style={{ color: SERVICE_EVENT_PARTS_UI.orange }}
          >
            Выберите узел
          </p>
        )}
        {hasNode && crumb ? (
          <p className="mt-0.5 truncate text-[11px]" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
            {crumb}
          </p>
        ) : !hasNode ? (
          <p className="mt-0.5 truncate text-[11px]" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
            Узел не выбран
          </p>
        ) : null}
      </div>
      <div
        className="flex min-w-0 items-center gap-1.5 self-center"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="shrink-0 whitespace-nowrap text-[10px] font-medium leading-none"
          style={LABEL_STYLE}
          id={`bundle-row-action-label-${row.key}`}
        >
          Тип работы
        </span>
        <select
          value={row.actionType}
          onChange={(e) => onChangeActionType(e.target.value as ServiceActionType)}
          aria-labelledby={`bundle-row-action-label-${row.key}`}
          style={{
            ...FIELD_BASE,
            marginTop: 0,
            padding: "4px 6px",
            fontSize: "0.6875rem",
            lineHeight: 1.25,
            colorScheme: "dark",
            minWidth: 0,
            flex: "1 1 0%",
            maxWidth: "100%",
          }}
          className={FOCUS_RING}
        >
          {SERVICE_ACTION_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1">
        {hasNode ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChangeNodeId("");
            }}
            aria-label="Очистить узел"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition hover:opacity-90"
            style={{
              borderColor: SERVICE_EVENT_PARTS_UI.border,
              color: SERVICE_EVENT_PARTS_UI.textMuted,
              backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <span className="inline-block w-8 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapsed();
          }}
          aria-label={collapsed ? "Развернуть" : "Свернуть"}
          aria-expanded={!collapsed}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition hover:opacity-90"
          style={{
            borderColor: SERVICE_EVENT_PARTS_UI.border,
            color: SERVICE_EVENT_PARTS_UI.textMuted,
            backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
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
      {itemsCount > 1 ? (
        <button
          type="button"
          onClick={onRemoveRow}
          aria-label="Удалить строку"
          className="absolute right-28 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg border opacity-0 transition group-hover:opacity-100 hover:opacity-100 focus-visible:opacity-100 sm:right-32"
          style={{
            borderColor: SERVICE_EVENT_PARTS_UI.border,
            color: "#ef4444",
            backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    </div>
  );

  const detailIndent = { paddingLeft: "calc(36px + 0.75rem)" } as const;

  return (
    <div style={{ borderBottom: `1px solid ${SERVICE_EVENT_PARTS_UI.borderSubtle}` }}>
      {headerRow}
      {!collapsed ? (
        <div
          className="pb-8 pt-1.5"
          style={{
            ...detailIndent,
            borderTop: `1px solid ${SERVICE_EVENT_PARTS_UI.borderSubtle}`,
          }}
        >
          <BundleNodePartRow
            row={row}
            currency={currency}
            onPatch={onPatchRow}
            onSetSkuRow={onSetSkuRow}
            onClear={onClearPart}
            variant="flat"
          />

          <div
            className="mb-2 mt-2"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(88px, 1fr) minmax(100px, 1fr) minmax(0, 1.4fr)",
              gap: "0.5rem 0.625rem",
            }}
          >
            <div className="flex min-w-0 flex-col justify-end gap-px">
              <span className="text-[8px] font-medium leading-none" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
                Стоимость деталей
              </span>
              <span
                className="truncate text-[10px] font-semibold tabular-nums leading-tight"
                style={{ color: SERVICE_EVENT_PARTS_UI.text }}
              >
                {partsCostFormatted}
              </span>
            </div>
            <div className="min-w-0">
              <label className="block text-[10px] font-medium leading-tight" style={LABEL_STYLE}>
                Стоимость работы
                <input
                  value={row.laborCost}
                  onChange={(e) => onPatchRow({ laborCost: e.target.value })}
                  inputMode="decimal"
                  placeholder="0"
                  style={detailCompactInput}
                  className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
                />
              </label>
            </div>
            <label className="block min-w-0 text-[10px] font-medium leading-tight" style={LABEL_STYLE}>
              Комментарий к узлу
              <input
                value={row.comment}
                onChange={(e) => onPatchRow({ comment: e.target.value })}
                placeholder="Опционально"
                style={detailCompactInput}
                className={`[&::placeholder]:text-[#AAB4C0] ${FOCUS_RING}`}
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
