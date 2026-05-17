import type { ReactNode } from "react";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

interface ComingSoonPanelProps {
  title: string;
  description: string;
  bullets?: string[];
  cta?: ReactNode;
}

export function ComingSoonPanel({ title, description, bullets, cta }: ComingSoonPanelProps) {
  return (
    <div
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        padding: "28px 26px",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 22,
          padding: "0 10px",
          borderRadius: 999,
          backgroundColor: "rgba(251,191,36,0.14)",
          color: "#FBBF24",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        В планах
      </div>
      <h2
        style={{
          margin: "10px 0 0",
          fontSize: 20,
          fontWeight: 600,
          color: productSemanticColors.textPrimary,
        }}
      >
        {title}
      </h2>
      <p style={{ margin: "8px 0 0", color: productSemanticColors.textSecondary, fontSize: 13 }}>
        {description}
      </p>
      {bullets && bullets.length > 0 ? (
        <ul style={{ margin: "12px 0 0", paddingLeft: 20, color: productSemanticColors.textSecondary }}>
          {bullets.map((b) => (
            <li key={b} style={{ fontSize: 13, lineHeight: 1.6 }}>
              {b}
            </li>
          ))}
        </ul>
      ) : null}
      {cta ? <div style={{ marginTop: 18 }}>{cta}</div> : null}
    </div>
  );
}
