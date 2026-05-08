"use client";

import { SERVICE_EVENT_PARTS_UI } from "../styles";

export type BundleNodeRowFastProps = {
  index: number;
  nodeTitle: string;
  crumb: string;
  rowActionLabel: string;
  hasNode: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onPickNode: () => void;
  onClearNode: () => void;
};

export function BundleNodeRowFast({
  index,
  nodeTitle,
  crumb,
  rowActionLabel,
  hasNode,
  canRemove,
  onRemove,
  onPickNode,
  onClearNode,
}: BundleNodeRowFastProps) {
  return (
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
        gridTemplateColumns: "36px minmax(0, 1fr) minmax(72px, 120px) 32px",
        gap: "0.75rem",
        borderBottom: `1px solid ${SERVICE_EVENT_PARTS_UI.borderSubtle}`,
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
        <BundleIconForIndex index={index} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[13px] font-semibold leading-tight"
          style={{ color: SERVICE_EVENT_PARTS_UI.text }}
        >
          {nodeTitle}
        </p>
        {crumb ? (
          <p
            className="mt-0.5 truncate text-[11px]"
            style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}
          >
            {crumb}
          </p>
        ) : (
          <p
            className="mt-0.5 truncate text-[11px]"
            style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}
          >
            Узел не выбран
          </p>
        )}
      </div>
      <span
        className="max-w-[5.5rem] shrink-0 truncate text-right text-[11px] font-medium sm:max-w-none sm:text-[13px]"
        style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}
      >
        {rowActionLabel}
      </span>
      {hasNode ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClearNode();
          }}
          aria-label="Очистить узел"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center justify-self-end rounded-lg border transition hover:opacity-90"
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
        <span aria-hidden />
      )}
      {canRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Удалить строку"
          className="absolute right-7 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg border opacity-0 transition group-hover:opacity-100 hover:opacity-100 focus-visible:opacity-100"
          style={{
            borderColor: SERVICE_EVENT_PARTS_UI.border,
            color: "#ef4444",
            backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

function BundleIconForIndex({ index }: { index: number }) {
  const icons = [
    <svg key="0" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8 2 5 5 5 9c0 3.5 3 5 3 9h8c0-4 3-5.5 3-9 0-4-3-7-7-7z" />
    </svg>,
    <svg key="1" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>,
    <svg key="2" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 18l3-9h10l3 9M4 18a2 2 0 002 2h12a2 2 0 002-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>,
    <svg key="3" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l3 4h-2v4h2l-3 4-3-4h2V7H9l3-4zM5 19h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>,
  ];
  return icons[index % icons.length] ?? icons[0];
}
