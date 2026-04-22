import type { ReactNode } from "react";
import {
  Text,
  type TextStyle,
  View,
  type ViewProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { productSemanticColors, radiusScale, typeScale } from "@mototwin/design-tokens";

export type ChipTone = "neutral" | "accent" | "muted";

export interface ChipProps extends Omit<ViewProps, "style"> {
  tone?: ChipTone;
  icon?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

function toneColors(tone: ChipTone): {
  background: string;
  border: string;
  color: string;
} {
  switch (tone) {
    case "accent":
      return {
        background: productSemanticColors.chipBackground,
        border: productSemanticColors.borderStrong,
        color: productSemanticColors.textPrimary,
      };
    case "muted":
      return {
        background: productSemanticColors.cardMuted,
        border: productSemanticColors.border,
        color: productSemanticColors.textMuted,
      };
    case "neutral":
    default:
      return {
        background: productSemanticColors.cardSubtle,
        border: productSemanticColors.border,
        color: productSemanticColors.textSecondary,
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
  const c = toneColors(tone);
  const container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    height: 24,
    paddingHorizontal: 10,
    borderRadius: radiusScale.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    gap: 6,
  };
  const textStyle: TextStyle = {
    fontSize: typeScale.overline.fontSize,
    lineHeight: typeScale.overline.lineHeight,
    fontWeight: typeScale.overline.weight,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: c.color,
  };
  return (
    <View {...rest} style={[container, style]}>
      {icon ? <View>{icon}</View> : null}
      {typeof children === "string" ? (
        <Text style={textStyle}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}
