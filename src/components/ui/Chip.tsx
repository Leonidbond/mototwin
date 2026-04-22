import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { productSemanticColors, radiusScale, typeScale } from "@mototwin/design-tokens";

export type ChipTone = "neutral" | "accent" | "muted";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  icon?: ReactNode;
  children?: ReactNode;
}

function toneStyle(tone: ChipTone): CSSProperties {
  switch (tone) {
    case "accent":
      return {
        backgroundColor: productSemanticColors.chipBackground,
        color: productSemanticColors.textPrimary,
        borderColor: productSemanticColors.borderStrong,
      };
    case "muted":
      return {
        backgroundColor: productSemanticColors.cardMuted,
        color: productSemanticColors.textMuted,
        borderColor: productSemanticColors.border,
      };
    case "neutral":
    default:
      return {
        backgroundColor: productSemanticColors.cardSubtle,
        color: productSemanticColors.textSecondary,
        borderColor: productSemanticColors.border,
      };
  }
}

export function Chip({
  tone = "neutral",
  icon,
  children,
  style,
  ...rest
}: ChipProps) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 24,
    padding: "0 10px",
    borderRadius: radiusScale.pill,
    borderWidth: 1,
    borderStyle: "solid",
    fontSize: typeScale.overline.fontSize,
    lineHeight: `${typeScale.overline.lineHeight}px`,
    fontWeight: Number(typeScale.overline.weight),
    letterSpacing: 0.4,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    ...toneStyle(tone),
    ...style,
  };
  return (
    <span {...rest} style={base}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}
