"use client";

import { SERVICE_EVENT_PARTS_UI } from "../styles";

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
        backgroundColor: SERVICE_EVENT_PARTS_UI.surface,
        borderColor: SERVICE_EVENT_PARTS_UI.border,
      }}
    >
      <p
        className="text-[13px] font-semibold tracking-tight"
        style={{ color: SERVICE_EVENT_PARTS_UI.text }}
      >
        Предварительный итог
      </p>
      <dl className="mt-3 space-y-1.5">
        <div className="flex items-baseline justify-between">
          <dt className="text-xs" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
            Детали
          </dt>
          <dd
            className="text-[13px] font-semibold tabular-nums"
            style={{ color: SERVICE_EVENT_PARTS_UI.text }}
          >
            {partsLine}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-xs" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
            Работа
          </dt>
          <dd
            className="text-[13px] font-semibold tabular-nums"
            style={{ color: SERVICE_EVENT_PARTS_UI.text }}
          >
            {laborLine}
          </dd>
        </div>
        <div
          className="mt-2 flex items-baseline justify-between border-t pt-2"
          style={{ borderTopColor: SERVICE_EVENT_PARTS_UI.borderSubtle }}
        >
          <dt
            className="text-[13px] font-semibold"
            style={{ color: SERVICE_EVENT_PARTS_UI.text }}
          >
            Итого
          </dt>
          <dd
            className="text-lg font-bold tabular-nums tracking-tight"
            style={{ color: SERVICE_EVENT_PARTS_UI.orange }}
          >
            {totalLine}
          </dd>
        </div>
      </dl>
    </div>
  );
}
