import { Card } from "@/components/ui";
import { productSemanticColors, typeScale } from "@mototwin/design-tokens";

export function GarageScore(props: { score: number | null }) {
  return (
    <Card variant="subtle" padding="sm" className="inline-flex min-w-[108px]">
      <div style={labelStyle}>Garage Score</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span style={valueStyle}>{props.score ?? "—"}</span>
        <span style={unitStyle}>/ 100</span>
      </div>
    </Card>
  );
}

const labelStyle = {
  color: productSemanticColors.textMuted,
  fontSize: typeScale.overline.fontSize,
  lineHeight: `${typeScale.overline.lineHeight}px`,
  fontWeight: Number(typeScale.overline.weight),
  textTransform: "uppercase" as const,
};

const valueStyle = {
  color: productSemanticColors.textPrimary,
  fontSize: 18,
  fontWeight: 700,
  lineHeight: "20px",
};

const unitStyle = {
  color: productSemanticColors.textMuted,
  fontSize: 12,
  fontWeight: 500,
};
