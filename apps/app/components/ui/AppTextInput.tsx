import { forwardRef } from "react";
import { TextInput as RNTextInput, type TextInputProps } from "react-native";
import { productSemanticColors as c } from "@mototwin/design-tokens";

/** TextInput with dark-theme defaults (RN defaults to black text). */
export const AppTextInput = forwardRef<RNTextInput, TextInputProps>(function AppTextInput(
  { style, placeholderTextColor, selectionColor, keyboardAppearance, ...props },
  ref
) {
  return (
    <RNTextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? c.textMuted}
      selectionColor={selectionColor ?? c.primaryAction}
      keyboardAppearance={keyboardAppearance ?? "dark"}
      style={[{ color: c.textPrimary }, style]}
      {...props}
    />
  );
});
