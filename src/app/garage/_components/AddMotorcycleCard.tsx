import Link from "next/link";
import type { CSSProperties } from "react";
import { Button, Card } from "@/components/ui";
import { productSemanticColors } from "@mototwin/design-tokens";

export function AddMotorcycleCard() {
  return (
    <Card
      padding="lg"
      style={{
        borderStyle: "dashed",
        borderColor: productSemanticColors.borderStrong,
        minHeight: 468,
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
        <div style={{ marginTop: 20 }}>
          <Link href="/onboarding" className="no-underline">
            <Button variant="ghost" style={outlineButtonStyle}>
              Добавить мотоцикл
            </Button>
          </Link>
        </div>
      </div>
    </Card>
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
  color: productSemanticColors.primaryAction,
  borderColor: productSemanticColors.primaryAction,
};
