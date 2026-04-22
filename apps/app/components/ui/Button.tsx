import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps
  extends Omit<PressableProps, "children" | "style"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZE_HEIGHT: Record<ButtonSize, number> = { sm: 34, md: 44 };
const SIZE_PADDING_X: Record<ButtonSize, number> = { sm: 12, md: 16 };
const SIZE_FONT: Record<ButtonSize, number> = { sm: 13, md: 14 };

function variantContainer(variant: ButtonVariant): ViewStyle {
  switch (variant) {
    case "primary":
      return {
        backgroundColor: productSemanticColors.primaryAction,
        borderWidth: 1,
        borderColor: "transparent",
      };
    case "secondary":
      return {
        backgroundColor: productSemanticColors.card,
        borderWidth: 1,
        borderColor: productSemanticColors.borderStrong,
      };
    case "ghost":
    default:
      return {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: productSemanticColors.border,
      };
  }
}

function variantText(variant: ButtonVariant): TextStyle {
  switch (variant) {
    case "primary":
      return { color: productSemanticColors.onPrimaryAction };
    case "secondary":
    case "ghost":
    default:
      return { color: productSemanticColors.textPrimary };
  }
}

export function Button({
  variant = "secondary",
  size = "md",
  leadingIcon,
  trailingIcon,
  block = false,
  children,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: SIZE_HEIGHT[size],
    paddingHorizontal: SIZE_PADDING_X[size],
    borderRadius: radiusScale.md,
    alignSelf: block ? "stretch" : "flex-start",
    opacity: disabled ? 0.55 : 1,
    ...variantContainer(variant),
  };
  const textStyle: TextStyle = {
    fontSize: SIZE_FONT[size],
    fontWeight: "600",
    lineHeight: SIZE_FONT[size] + 2,
    ...variantText(variant),
  };
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [
        container,
        { opacity: pressed && !disabled ? 0.8 : container.opacity },
        style,
      ]}
    >
      {leadingIcon ? <View>{leadingIcon}</View> : null}
      {typeof children === "string" ? (
        <Text style={textStyle}>{children}</Text>
      ) : (
        children
      )}
      {trailingIcon ? <View>{trailingIcon}</View> : null}
    </Pressable>
  );
}
