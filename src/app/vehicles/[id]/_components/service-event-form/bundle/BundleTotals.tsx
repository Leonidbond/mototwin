"use client";

import { productSemanticColors } from "@mototwin/design-tokens";

export type BundleTotalsProps = {
  partsLine: string;
  laborLine: string;
  totalLine: string;
  variant?: "fast" | "extended";
};

export function BundleTotals({ partsLine, laborLine, totalLine, variant = "extended" }: BundleTotalsProps) {
  if (variant === "fast") {
    return (
      <div
        className="mt-1 flex flex-wrap items-end justify-between gap-3 rounded-2xl border-t-2 px-4 py-3 sm:px-5 sm:py-3.5"
        style={{
          backgroundColor: productSemanticColors.cardSubtle,
          borderTopColor: productSemanticColors.primaryAction,
          borderLeftColor: productSemanticColors.border,
          borderRightColor: productSemanticColors.border,
          borderBottomColor: productSemanticColors.border,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1,
          borderTopWidth: 2,
          borderStyle: "solid",
        }}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-5 gap-y-2">
          <Cell label="Детали" value={partsLine} />
          <Cell label="Работа" value={laborLine} />
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: productSemanticColors.textMeta }}>
            Итого
          </p>
          <p
            className="mt-0.5 text-xl font-bold tabular-nums tracking-tight sm:text-2xl"
            style={{ color: productSemanticColors.primaryAction }}
          >
            {totalLine}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid items-baseline gap-4 rounded-2xl border px-5 py-4 sm:grid-cols-[auto_1fr_1fr_auto]"
      style={{
        backgroundColor: productSemanticColors.cardSubtle,
        borderColor: productSemanticColors.border,
      }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: productSemanticColors.textMeta }}
      >
        Итого по узлам
      </span>
      <Cell label="Детали" value={partsLine} />
      <Cell label="Работа" value={laborLine} />
      <div className="text-right">
        <p className="text-[11px] font-medium" style={{ color: productSemanticColors.textMuted }}>
          Итого
        </p>
        <p
          className="mt-0.5 text-xl font-bold tabular-nums tracking-tight"
          style={{ color: productSemanticColors.primaryAction }}
        >
          {totalLine}
        </p>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium" style={{ color: productSemanticColors.textMuted }}>
        {label}
      </p>
      <p
        className="mt-0.5 text-[15px] font-semibold tabular-nums"
        style={{ color: productSemanticColors.textPrimary }}
      >
        {value}
      </p>
    </div>
  );
}
