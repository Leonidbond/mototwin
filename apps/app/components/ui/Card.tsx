import type { ReactNode } from "react";
import { View, type ViewProps, type ViewStyle, type StyleProp } from "react-native";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

export type CardVariant = "default" | "muted" | "subtle";
export type CardPadding = "none" | "sm" | "md" | "lg";

const VARIANT_BG: Record<CardVariant, string> = {
  default: productSemanticColors.card,
  muted: productSemanticColors.cardMuted,
  subtle: productSemanticColors.cardSubtle,
};

const PADDING: Record<CardPadding, ViewStyle> = {
  none: { padding: 0 },
  sm: { padding: 12 },
  md: { padding: 16 },
  lg: { padding: 20 },
};

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: keyof typeof radiusScale;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  variant = "default",
  padding = "md",
  radius = "lg",
  style,
  children,
  ...rest
}: CardProps) {
  const base: ViewStyle = {
    backgroundColor: VARIANT_BG[variant],
    borderColor: productSemanticColors.border,
    borderWidth: 1,
    borderRadius: radiusScale[radius],
    ...PADDING[padding],
  };
  return (
    <View {...rest} style={[base, style]}>
      {children}
    </View>
  );
}
