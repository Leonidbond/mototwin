import type { ReactNode, Ref } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type KeyboardAwareScrollScreenProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
  scrollViewRef?: Ref<ScrollView>;
  scrollViewProps?: Omit<
    ScrollViewProps,
    "children" | "contentContainerStyle" | "keyboardShouldPersistTaps" | "keyboardDismissMode"
  >;
};

export function KeyboardAwareScrollScreen({
  children,
  contentContainerStyle,
  keyboardVerticalOffset = 8,
  scrollViewRef,
  scrollViewProps,
}: KeyboardAwareScrollScreenProps) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? keyboardVerticalOffset : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
