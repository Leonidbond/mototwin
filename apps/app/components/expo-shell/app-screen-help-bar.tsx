import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HelpTriggerButton } from "../../src/components/app-help-fab";

/** Floating help trigger that does not consume vertical layout space. */
export function AppScreenHelpBar() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { top: Math.max(insets.top + 6, 14) }]} pointerEvents="box-none">
      <HelpTriggerButton size={28} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 12,
    zIndex: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
});
