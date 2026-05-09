"use client";

import type { CSSProperties } from "react";
import { SERVICE_EVENT_PARTS_UI } from "../styles";

const extendedTotalsRowStyle: CSSProperties = {
  display: "grid",
  width: "100%",
  boxSizing: "border-box",
  gridTemplateColumns: "auto repeat(3, minmax(0, 1fr))",
  alignItems: "baseline",
  columnGap: "clamp(0.75rem, 2.5vw, 1.5rem)",
  rowGap: 0,
  paddingLeft: "clamp(0.5rem, 2vw, 1rem)",
  paddingRight: "clamp(0.5rem, 2vw, 1rem)",
  paddingTop: "0.5rem",
  borderTop: `1px solid ${SERVICE_EVENT_PARTS_UI.borderSubtle}`,
  WebkitOverflowScrolling: "touch",
};

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
    <div className="min-w-0" style={extendedTotalsRowStyle}>
      <span
        className="min-w-0 text-[11px] font-semibold tracking-wide"
        style={{ color: SERVICE_EVENT_PARTS_UI.textMuted, justifySelf: "start" }}
      >
        Итого по узлам
      </span>
      <div className="flex min-w-0 justify-center">
        <InlineMetric label="Детали" value={partsLine} />
      </div>
      <div className="flex min-w-0 justify-center">
        <InlineMetric label="Работа" value={laborLine} />
      </div>
      <div className="flex min-w-0 justify-end">
        <InlineMetric label="Итого" value={totalLine} valueEmphasis />
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
        {label}
      </p>
      <p
        className="mt-0.5 truncate text-[15px] font-semibold tabular-nums"
        style={{ color: SERVICE_EVENT_PARTS_UI.text }}
      >
        {value}
      </p>
    </div>
  );
}

function InlineMetric({
  label,
  value,
  valueEmphasis,
}: {
  label: string;
  value: string;
  valueEmphasis?: boolean;
}) {
  return (
    <span
      className="inline-flex max-w-full min-w-0 shrink-0 items-baseline whitespace-nowrap"
      style={{ gap: "0.5rem" }}
    >
      <span className="shrink-0 text-[11px] font-medium" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
        {label}
      </span>
      <span
        className={`min-w-0 truncate tabular-nums ${valueEmphasis ? "text-[15px] font-bold tracking-tight" : "text-[13px] font-semibold"}`}
        style={{ color: valueEmphasis ? SERVICE_EVENT_PARTS_UI.orange : SERVICE_EVENT_PARTS_UI.text }}
      >
        {value}
      </span>
    </span>
  );
}
