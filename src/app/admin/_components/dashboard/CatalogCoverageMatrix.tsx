import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import type { AdminCatalogCoverageResponse } from "@mototwin/types";
import { ruAdmin, formatPercent } from "../../_locales/ru";
import { DashboardSection } from "./DashboardSection";

interface CatalogCoverageMatrixProps {
  data: AdminCatalogCoverageResponse;
}

export function CatalogCoverageMatrix({ data }: CatalogCoverageMatrixProps) {
  return (
    <DashboardSection
      title={ruAdmin.dashboard.catalogCoverage.title}
      seeAllLabel={ruAdmin.dashboard.catalogCoverage.seeAll}
      seeAllHref="/admin/catalog"
    >
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={thNodeStyle}>{ruAdmin.dashboard.catalogCoverage.columns.node}</th>
            {data.brands.map((brand) => (
              <th key={brand.key} style={thBrandStyle}>
                {brand.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.label} style={{ borderTop: `1px solid ${productSemanticColors.border}` }}>
              <td style={tdNodeStyle}>{row.label}</td>
              {row.cells.map((cell) => (
                <td key={cell.brandKey} style={tdCellStyle}>
                  <CoverageCell percent={cell.percent} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardSection>
  );
}

function CoverageCell({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const tone =
    clamped >= 85
      ? "#22C55E"
      : clamped >= 65
      ? "#FBBF24"
      : clamped >= 40
      ? "#F97316"
      : "#F87171";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          minWidth: 36,
          borderRadius: 999,
          backgroundColor: productSemanticColors.cardSubtle,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: "100%",
            backgroundColor: tone,
            borderRadius: 999,
          }}
        />
      </div>
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          fontSize: 12,
          fontWeight: 600,
          color: productSemanticColors.textPrimary,
          minWidth: 38,
          textAlign: "right",
        }}
      >
        {formatPercent(clamped)}
      </span>
    </div>
  );
}

const thNodeStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: productSemanticColors.textMuted,
  width: 110,
};

const thBrandStyle: React.CSSProperties = {
  ...thNodeStyle,
  width: "auto",
};

const tdNodeStyle: React.CSSProperties = {
  padding: "10px 8px",
  fontSize: 13,
  color: productSemanticColors.textSecondary,
  whiteSpace: "nowrap",
};

const tdCellStyle: React.CSSProperties = {
  padding: "8px 8px",
  fontSize: 12,
  borderRadius: radiusScale.sm,
};
