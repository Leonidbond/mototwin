"use client";

import { productSemanticColors } from "@mototwin/design-tokens";

export type PreliminarySummaryCardProps = {
  partsLine: string;
  laborLine: string;
  totalLine: string;
};

export function PreliminarySummaryCard({ partsLine, laborLine, totalLine }: PreliminarySummaryCardProps) {
  return (
    <div
      className="rounded-2xl border px-5 py-4"
      style={{
        backgroundColor: productSemanticColors.cardMuted,
        borderColor: productSemanticColors.border,
      }}
    >
      <p
        className="text-[13px] font-semibold tracking-tight"
        style={{ color: productSemanticColors.textPrimary }}
      >
        Предварительный итог
      </p>
      <dl className="mt-3 space-y-1.5">
        <div className="flex items-baseline justify-between">
          <dt className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
            Детали
          </dt>
          <dd
            className="text-[13px] font-semibold tabular-nums"
            style={{ color: productSemanticColors.textPrimary }}
          >
            {partsLine}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
            Работа
          </dt>
          <dd
            className="text-[13px] font-semibold tabular-nums"
            style={{ color: productSemanticColors.textPrimary }}
          >
            {laborLine}
          </dd>
        </div>
        <div
          className="mt-2 flex items-baseline justify-between border-t pt-2"
          style={{ borderTopColor: productSemanticColors.border }}
        >
          <dt
            className="text-[13px] font-semibold"
            style={{ color: productSemanticColors.textPrimary }}
          >
            Итого
          </dt>
          <dd
            className="text-lg font-bold tabular-nums tracking-tight"
            style={{ color: productSemanticColors.primaryAction }}
          >
            {totalLine}
          </dd>
        </div>
      </dl>
    </div>
  );
}
