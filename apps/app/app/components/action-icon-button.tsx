import type { ReactNode } from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { productSemanticColors as c } from "@mototwin/design-tokens";

type ActionIconButtonVariant = "default" | "subtle" | "danger";

export function ActionIconButton(props: {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: ActionIconButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { icon, accessibilityLabel, onPress, variant = "default", disabled = false, style } = props;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        variant === "subtle" && styles.subtle,
        variant === "danger" && styles.danger,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  subtle: {
    backgroundColor: c.chipBackground,
  },
  danger: {
    borderColor: c.errorBorder,
    backgroundColor: c.errorSurface,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.6,
  },
});
