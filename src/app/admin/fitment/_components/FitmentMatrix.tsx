import type { AdminFitmentMatrixResponse } from "@mototwin/types";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

interface FitmentMatrixProps {
  data: AdminFitmentMatrixResponse;
}

export function FitmentMatrix({ data }: FitmentMatrixProps) {
  const cellByKey = new Map(data.cells.map((cell) => [`${cell.brandId}::${cell.nodeId}`, cell]));
  return (
    <div style={cardStyle}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Покрытие fitment</h3>
      <p style={{ margin: 0, fontSize: 12, color: productSemanticColors.textMuted }}>
        Зелёный — verified, жёлтый — есть конфликты, серый — мало данных.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", marginTop: 8, width: "100%" }}>
          <thead>
            <tr>
              <th style={thCornerStyle}>Бренд / узел</th>
              {data.nodes.map((node) => (
                <th key={node.id} style={thStyle}>
                  {node.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.brands.map((brand) => (
              <tr key={brand.id} style={{ borderTop: `1px solid ${productSemanticColors.border}` }}>
                <td style={tdBrandStyle}>{brand.label}</td>
                {data.nodes.map((node) => {
                  const cell = cellByKey.get(`${brand.id}::${node.id}`);
                  return (
                    <td key={node.id} style={cellStyle(cell)}>
                      {cell ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: productSemanticColors.textPrimary,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {cell.reports}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color:
                                cell.conflicts > 0
                                  ? "#FBBF24"
                                  : cell.verified > 0
                                  ? "#86EFAC"
                                  : productSemanticColors.textMuted,
                              fontWeight: 600,
                              letterSpacing: 0.4,
                              textTransform: "uppercase",
                            }}
                          >
                            {cell.conflicts > 0
                              ? `${cell.conflicts} ⚠`
                              : cell.verified > 0
                              ? `${cell.verified} ok`
                              : "—"}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: productSemanticColors.textMuted }}>
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function cellStyle(cell?: { verified: number; reports: number; conflicts: number }): React.CSSProperties {
  let bg: string = productSemanticColors.cardSubtle;
  if (cell) {
    if (cell.conflicts > 0) bg = "rgba(251,191,36,0.18)";
    else if (cell.verified > 0) bg = "rgba(34,197,94,0.14)";
    else if (cell.reports > 0) bg = "rgba(56,189,248,0.10)";
  }
  return {
    padding: "8px 10px",
    minWidth: 64,
    textAlign: "center",
    borderLeft: `1px solid ${productSemanticColors.border}`,
    backgroundColor: bg,
  };
}

const cardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const thCornerStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: productSemanticColors.textMuted,
  borderBottom: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardSubtle,
};

const thStyle: React.CSSProperties = {
  ...thCornerStyle,
  textAlign: "center",
  borderLeft: `1px solid ${productSemanticColors.border}`,
};

const tdBrandStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: productSemanticColors.textPrimary,
  whiteSpace: "nowrap",
  backgroundColor: productSemanticColors.cardSubtle,
  borderRight: `1px solid ${productSemanticColors.border}`,
};
