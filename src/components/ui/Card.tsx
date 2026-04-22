import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

export type CardVariant = "default" | "muted" | "subtle";
export type CardPadding = "none" | "sm" | "md" | "lg";

const VARIANT_BG: Record<CardVariant, string> = {
  default: productSemanticColors.card,
  muted: productSemanticColors.cardMuted,
  subtle: productSemanticColors.cardSubtle,
};

const PADDING_STYLES: Record<CardPadding, string> = {
  none: "0",
  sm: "12px",
  md: "16px 18px",
  lg: "24px 26px",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: keyof typeof radiusScale;
  children?: ReactNode;
}

/**
 * Universal surface wrapper. Replaces the ad-hoc `InfoCard`/`SpecCard` duplicates.
 * Styling is driven by design tokens so every card inherits the dark theme
 * consistently without touching Tailwind gray-scales.
 */
export function Card({
  variant = "default",
  padding = "md",
  radius = "lg",
  style,
  children,
  ...rest
}: CardProps) {
  const merged: CSSProperties = {
    backgroundColor: VARIANT_BG[variant],
    border: `1px solid ${productSemanticColors.border}`,
    borderRadius: radiusScale[radius],
    padding: PADDING_STYLES[padding],
    color: productSemanticColors.textPrimary,
    ...style,
  };
  return (
    <div {...rest} style={merged}>
      {children}
    </div>
  );
}
