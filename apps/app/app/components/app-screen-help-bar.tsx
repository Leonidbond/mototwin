import { StyleSheet, View } from "react-native";
import { HelpTriggerButton } from "../../src/components/app-help-fab";
import { productSemanticColors as c } from "@mototwin/design-tokens";

/** Full-width top strip: "?" in the top-right, separate from other actions (garage, vehicle, etc.). */
export function AppScreenHelpBar() {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <HelpTriggerButton size={32} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 4,
    backgroundColor: c.canvas,
  },
});
