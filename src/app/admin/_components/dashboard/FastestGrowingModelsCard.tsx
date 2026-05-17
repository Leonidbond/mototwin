import { productSemanticColors } from "@mototwin/design-tokens";
import type { AdminFastestModelsResponse } from "@mototwin/types";
import { ruAdmin, formatNumber } from "../../_locales/ru";
import { DashboardSection } from "./DashboardSection";
import { SupportLevelChip } from "./StatusChip";

interface FastestGrowingModelsCardProps {
  data: AdminFastestModelsResponse;
}

export function FastestGrowingModelsCard({ data }: FastestGrowingModelsCardProps) {
  return (
    <DashboardSection
      title={ruAdmin.dashboard.fastestModels.title}
      seeAllLabel={ruAdmin.dashboard.fastestModels.seeAll}
      seeAllHref="/admin/models"
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 28 }}>{ruAdmin.dashboard.fastestModels.columns.rank}</th>
            <th style={thStyle}>{ruAdmin.dashboard.fastestModels.columns.model}</th>
            <th style={thStyleNumeric}>{ruAdmin.dashboard.fastestModels.columns.garages}</th>
            <th style={thStyleNumeric}>{ruAdmin.dashboard.fastestModels.columns.active}</th>
            <th style={thStyleNumeric}>{ruAdmin.dashboard.fastestModels.columns.reports}</th>
            <th style={thStyle}>{ruAdmin.dashboard.fastestModels.columns.support}</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.modelVariantId} style={{ borderBottom: `1px solid ${productSemanticColors.border}` }}>
              <td style={tdStyle}>
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: productSemanticColors.textMuted,
                    fontSize: 13,
                  }}
                >
                  {row.rank}
                </span>
              </td>
              <td style={tdStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span aria-hidden style={thumbStyle}>
                    {row.brandLabel.charAt(0)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: productSemanticColors.textPrimary,
                      }}
                    >
                      {row.modelLabel}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: productSemanticColors.textMuted,
                      }}
                    >
                      {row.brandLabel}
                    </div>
                  </div>
                </div>
              </td>
              <NumericCell value={row.garageCount} delta={row.garageDelta} />
              <NumericCell value={row.activeOwners} delta={row.activeOwnersDelta} />
              <NumericCell value={row.reports} delta={row.reportsDelta} />
              <td style={tdStyle}>
                <SupportLevelChip level={row.supportLevel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardSection>
  );
}

function NumericCell({ value, delta }: { value: number; delta: number }) {
  return (
    <td style={{ ...tdStyle, textAlign: "right" }}>
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          color: productSemanticColors.textPrimary,
          fontWeight: 600,
        }}
      >
        {formatNumber(value)}
      </span>
      {delta !== 0 ? (
        <span
          style={{
            marginLeft: 6,
            fontSize: 11,
            color: delta > 0 ? "#22C55E" : "#F87171",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {delta > 0 ? "+" : ""}
          {delta}%
        </span>
      ) : null}
    </td>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: productSemanticColors.textMuted,
  borderBottom: `1px solid ${productSemanticColors.border}`,
};

const thStyleNumeric: React.CSSProperties = { ...thStyle, textAlign: "right" };

const tdStyle: React.CSSProperties = {
  padding: "10px 8px",
  fontSize: 13,
  verticalAlign: "middle",
};

const thumbStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textSecondary,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 700,
};
