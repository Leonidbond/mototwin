import type { ReactNode } from "react";
import {
  Text,
  type TextStyle,
  View,
  type ViewProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { productSemanticColors, typeScale } from "@mototwin/design-tokens";

export type SectionHeaderTitleVisual = "page" | "section";

export interface SectionHeaderProps extends Omit<ViewProps, "style"> {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  style?: StyleProp<ViewStyle>;
  titleVisual?: SectionHeaderTitleVisual;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  titleVisual = "section",
  style,
  ...rest
}: SectionHeaderProps) {
  const titleTs = titleVisual === "page" ? typeScale.h1 : typeScale.h2;
  const container: ViewStyle = {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  };
  const col: ViewStyle = {
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    gap: 4,
  };
  const eyebrowStyle: TextStyle = {
    fontSize: typeScale.overline.fontSize,
    lineHeight: typeScale.overline.lineHeight,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: productSemanticColors.textMuted,
  };
  const titleStyle: TextStyle = {
    fontSize: titleTs.fontSize,
    lineHeight: titleTs.lineHeight,
    fontWeight: titleTs.weight,
    color: productSemanticColors.textPrimary,
    letterSpacing: titleVisual === "page" ? -0.35 : -0.2,
  };
  const subtitleStyle: TextStyle = {
    fontSize: typeScale.caption.fontSize,
    lineHeight: typeScale.caption.lineHeight,
    color: productSemanticColors.textMuted,
  };
  const actionsStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  };
  return (
    <View {...rest} style={[container, style]}>
      <View style={col}>
        {eyebrow ? (
          typeof eyebrow === "string" ? (
            <Text style={eyebrowStyle}>{eyebrow}</Text>
          ) : (
            eyebrow
          )
        ) : null}
        {typeof title === "string" ? (
          <Text style={titleStyle}>{title}</Text>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === "string" ? (
            <Text style={subtitleStyle}>{subtitle}</Text>
          ) : (
            subtitle
          )
        ) : null}
      </View>
      {actions ? <View style={actionsStyle}>{actions}</View> : null}
    </View>
  );
}
