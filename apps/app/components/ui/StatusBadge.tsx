import type { ReactNode } from "react";
import {
  Text,
  type TextStyle,
  View,
  type ViewProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import type { NodeStatus, StatusSemanticKey } from "@mototwin/types";
import {
  productSemanticColors,
  radiusScale,
  statusSemanticTokens,
} from "@mototwin/design-tokens";

export type StatusBadgeSize = "sm" | "md";

export interface StatusBadgeProps extends Omit<ViewProps, "style"> {
  status: NodeStatus | StatusSemanticKey | null | undefined;
  label: ReactNode;
  size?: StatusBadgeSize;
  withDot?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZE_HEIGHT: Record<StatusBadgeSize, number> = { sm: 22, md: 28 };
const SIZE_FONT: Record<StatusBadgeSize, number> = { sm: 11, md: 12 };
const SIZE_PADDING_X: Record<StatusBadgeSize, number> = { sm: 8, md: 10 };

function resolveTokens(status: StatusBadgeProps["status"]) {
  if (!status) return statusSemanticTokens.UNKNOWN;
  return statusSemanticTokens[status];
}

export function getStatusBadgeColors(status: StatusBadgeProps["status"]) {
  const tokens = resolveTokens(status);
  return {
    background: tokens.background,
    border: tokens.border,
    foreground: tokens.foreground,
    accent: tokens.accent,
  };
}

export function StatusBadge({
  status,
  label,
  size = "md",
  withDot = true,
  style,
  ...rest
}: StatusBadgeProps) {
  const tokens = resolveTokens(status);
  const container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    height: SIZE_HEIGHT[size],
    paddingHorizontal: SIZE_PADDING_X[size],
    borderRadius: radiusScale.pill,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.background,
    gap: 6,
  };
  const textStyle: TextStyle = {
    fontSize: SIZE_FONT[size],
    lineHeight: SIZE_FONT[size] + 2,
    fontWeight: "600",
    color: tokens.foreground,
  };
  const dotStyle: ViewStyle = {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor:
      tokens.accent === "transparent" ? tokens.foreground : tokens.accent,
  };
  return (
    <View {...rest} style={[container, style]}>
      {withDot ? <View style={dotStyle} /> : null}
      {typeof label === "string" ? (
        <Text style={textStyle}>{label}</Text>
      ) : (
        label
      )}
    </View>
  );
}

export { productSemanticColors as __statusBadgeTokens };
