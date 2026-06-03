import Link from "next/link";
import type { CSSProperties } from "react";
import { Card } from "@/components/ui";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

export function AddMotorcycleCard() {
  return (
    <Link href="/onboarding" className="no-underline" style={{ display: "block", minWidth: 0 }}>
      <Card
        padding="lg"
        style={{
          borderStyle: "dashed",
          borderColor: productSemanticColors.borderStrong,
          minHeight: 468,
          cursor: "pointer",
          transition: "border-color 0.15s ease, background-color 0.15s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div style={plusCircleStyle}>
            <PlusIcon />
          </div>
          <h3 style={titleStyle}>Добавить мотоцикл</h3>
          <p style={{ marginTop: 10, maxWidth: 260, ...textStyle }}>
            Расширяйте гараж и держите всю технику под контролем.
          </p>
          <span style={outlineButtonStyle}>Добавить мотоцикл</span>
        </div>
      </Card>
    </Link>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

const plusCircleStyle: CSSProperties = {
  display: "inline-flex",
  width: 64,
  height: 64,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
  borderRadius: 999,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
};

const titleStyle: CSSProperties = {
  color: productSemanticColors.textPrimary,
  fontSize: 20,
  lineHeight: "26px",
  fontWeight: 700,
};

const textStyle: CSSProperties = {
  color: productSemanticColors.textMuted,
  fontSize: 13,
  lineHeight: "18px",
};

const outlineButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 20,
  height: 34,
  padding: "0 12px",
  borderRadius: radiusScale.md,
  fontWeight: 600,
  fontSize: 13,
  color: productSemanticColors.primaryAction,
  border: `1px solid ${productSemanticColors.primaryAction}`,
};
