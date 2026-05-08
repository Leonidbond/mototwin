"use client";

import { productSemanticColors } from "@mototwin/design-tokens";

export type BundleNodeRowFastProps = {
  index: number;
  nodeTitle: string;
  crumb: string;
  rowActionLabel: string;
  hasNode: boolean;
  canRemove: boolean;
  onRemove: () => void;
};

export function BundleNodeRowFast({
  index,
  nodeTitle,
  crumb,
  rowActionLabel,
  hasNode,
  canRemove,
  onRemove,
}: BundleNodeRowFastProps) {
  return (
    <div
      className="group flex items-center gap-2.5 px-0 py-2 sm:gap-3 sm:py-2.5"
      style={{ borderBottom: `1px solid ${productSemanticColors.border}` }}
    >
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          color: productSemanticColors.primaryAction,
          backgroundColor: productSemanticColors.cardSubtle,
        }}
        aria-hidden
      >
        <BundleIconForIndex index={index} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[13px] font-semibold leading-tight"
          style={{ color: productSemanticColors.textPrimary }}
        >
          {nodeTitle}
        </p>
        {crumb ? (
          <p
            className="mt-0.5 truncate text-[11px]"
            style={{ color: productSemanticColors.textMuted }}
          >
            {crumb}
          </p>
        ) : (
          <p
            className="mt-0.5 truncate text-[11px]"
            style={{ color: productSemanticColors.textMuted }}
          >
            Узел не выбран
          </p>
        )}
      </div>
      <span
        className="max-w-[5.5rem] shrink-0 truncate text-right text-[11px] font-medium sm:max-w-none sm:text-[13px]"
        style={{ color: productSemanticColors.textSecondary }}
      >
        {rowActionLabel}
      </span>
      <span
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
        style={
          hasNode
            ? {
                borderColor: productSemanticColors.successBorder,
                backgroundColor: productSemanticColors.successSurface,
                color: productSemanticColors.successText,
              }
            : {
                borderColor: productSemanticColors.border,
                backgroundColor: productSemanticColors.cardMuted,
                color: productSemanticColors.textMuted,
              }
        }
        aria-hidden
      >
        {hasNode ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      {canRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Удалить строку"
          className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border opacity-0 transition group-hover:opacity-100 hover:opacity-100 focus-visible:opacity-100"
          style={{
            borderColor: productSemanticColors.border,
            color: productSemanticColors.error,
            backgroundColor: productSemanticColors.cardSubtle,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
      <span
        className="ml-1 select-none text-[12px] leading-none"
        style={{ color: productSemanticColors.textMuted }}
        aria-hidden
      >
        ⋮⋮
      </span>
    </div>
  );
}

function BundleIconForIndex({ index }: { index: number }) {
  const icons = [
    <svg key="0" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8 2 5 5 5 9c0 3.5 3 5 3 9h8c0-4 3-5.5 3-9 0-4-3-7-7-7z" />
    </svg>,
    <svg key="1" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>,
    <svg key="2" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 18l3-9h10l3 9M4 18a2 2 0 002 2h12a2 2 0 002-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>,
    <svg key="3" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
