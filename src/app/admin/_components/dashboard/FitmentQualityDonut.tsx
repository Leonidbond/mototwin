"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { AdminFitmentQualityResponse } from "@mototwin/types";
import { ruAdmin, formatNumber, formatPercent } from "../../_locales/ru";
import { DashboardSection } from "./DashboardSection";

interface FitmentQualityDonutProps {
  data: AdminFitmentQualityResponse;
}

export function FitmentQualityDonut({ data }: FitmentQualityDonutProps) {
  return (
    <DashboardSection
      title={ruAdmin.dashboard.fitmentQuality.title}
      seeAllLabel={ruAdmin.dashboard.fitmentQuality.seeAll}
      seeAllHref="/admin/reports"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "4px 0" }}>
        <div style={{ position: "relative", width: 168, height: 168, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.slices}
                dataKey="count"
                nameKey="label"
                innerRadius={56}
                outerRadius={80}
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {data.slices.map((slice) => (
                  <Cell key={slice.key} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: productSemanticColors.textPrimary,
              }}
            >
              {formatNumber(data.total)}
            </div>
            <div
              style={{
                fontSize: 11,
                color: productSemanticColors.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                fontWeight: 600,
              }}
            >
              {ruAdmin.dashboard.fitmentQuality.total}
            </div>
          </div>
        </div>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          {data.slices.map((slice) => (
            <li
              key={slice.key}
              style={{
                display: "grid",
                gridTemplateColumns: "12px 1fr auto auto",
                columnGap: 10,
                alignItems: "center",
                fontSize: 13,
                color: productSemanticColors.textPrimary,
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: slice.color,
                }}
              />
              <span style={{ color: productSemanticColors.textSecondary }}>{slice.label}</span>
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 600,
                }}
              >
                {formatPercent(slice.percent)}
              </span>
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: productSemanticColors.textMuted,
                  minWidth: 36,
                  textAlign: "right",
                }}
              >
                {formatNumber(slice.count)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardSection>
  );
}
