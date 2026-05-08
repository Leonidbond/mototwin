"use client";

import { SERVICE_EVENT_PARTS_UI } from "../styles";

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
        className="items-end px-4 pt-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
          gap: "1rem",
          borderTop: `1px solid ${SERVICE_EVENT_PARTS_UI.borderSubtle}`,
        }}
      >
        <Cell label="Детали" value={partsLine} />
        <Cell label="Работа" value={laborLine} />
        <div>
          <p className="text-[11px] font-medium" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
            Итого
          </p>
          <p
            className="mt-0.5 text-base font-bold tabular-nums tracking-tight"
            style={{ color: SERVICE_EVENT_PARTS_UI.orange }}
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
        backgroundColor: SERVICE_EVENT_PARTS_UI.surface,
        borderColor: SERVICE_EVENT_PARTS_UI.border,
      }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}
      >
        Итого по узлам
      </span>
      <Cell label="Детали" value={partsLine} />
      <Cell label="Работа" value={laborLine} />
      <div className="text-right">
        <p className="text-[11px] font-medium" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
          Итого
        </p>
        <p
          className="mt-0.5 text-xl font-bold tabular-nums tracking-tight"
          style={{ color: SERVICE_EVENT_PARTS_UI.orange }}
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
      <p className="text-[11px] font-medium" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
        {label}
      </p>
      <p
        className="mt-0.5 text-[15px] font-semibold tabular-nums"
        style={{ color: SERVICE_EVENT_PARTS_UI.text }}
      >
        {value}
      </p>
    </div>
  );
}
