"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { AdminActivityResponse } from "@mototwin/types";
import { ruAdmin } from "../../_locales/ru";
import { DashboardSection } from "./DashboardSection";
import { useChartContainerSize } from "./use-chart-container-size";

interface ActivitySignalsChartProps {
  data: AdminActivityResponse;
}

const SERIES = [
  { key: "newVehicles", label: ruAdmin.dashboard.activitySignals.legend.newVehicles, color: "#60A5FA" },
  { key: "serviceEvents", label: ruAdmin.dashboard.activitySignals.legend.serviceEvents, color: "#22C55E" },
  { key: "fitmentReports", label: ruAdmin.dashboard.activitySignals.legend.fitmentReports, color: "#F97316" },
] as const;

const CHART_HEIGHT = 220;

export function ActivitySignalsChart({ data }: ActivitySignalsChartProps) {
  const { ref, size } = useChartContainerSize(CHART_HEIGHT);

  return (
    <DashboardSection
      title={ruAdmin.dashboard.activitySignals.title}
      seeAllLabel={ruAdmin.dashboard.activitySignals.seeAll}
      seeAllHref="/admin/reports"
      rightSlot={
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {SERIES.map((s) => (
            <span key={s.key} style={legendItem}>
              <span style={{ ...legendDot, backgroundColor: s.color }} aria-hidden />
              {s.label}
            </span>
          ))}
        </div>
      }
    >
      <div ref={ref} style={{ height: CHART_HEIGHT, width: "100%", minWidth: 0 }}>
        {size ? (
          <LineChart
            width={size.width}
            height={size.height}
            data={data.points}
            margin={{ top: 12, right: 12, bottom: 4, left: -12 }}
          >
            <CartesianGrid stroke={productSemanticColors.border} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 11, fill: productSemanticColors.textMuted }}
              tickFormatter={formatDateTick}
              stroke={productSemanticColors.border}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              tick={{ fontSize: 11, fill: productSemanticColors.textMuted }}
              stroke={productSemanticColors.border}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: productSemanticColors.card,
                border: `1px solid ${productSemanticColors.borderStrong}`,
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: productSemanticColors.textMuted, fontSize: 11 }}
              labelFormatter={(label: unknown) =>
                formatTooltipLabel(typeof label === "string" ? label : String(label ?? ""))
              }
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
                name={s.label}
              />
            ))}
          </LineChart>
        ) : null}
      </div>
    </DashboardSection>
  );
}

function formatDateTick(value: string): string {
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(d);
  } catch {
    return value;
  }
}

function formatTooltipLabel(value: string): string {
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return value;
  }
}

const legendItem: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: productSemanticColors.textSecondary,
};

const legendDot: React.CSSProperties = {
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: 999,
};
