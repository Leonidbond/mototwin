import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { HelpTriggerButton } from "../../src/components/app-help-fab";

export function ScreenHeader(props: {
  title?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  showHelp?: boolean;
}) {
  const router = useRouter();
  const { title, onBack, rightSlot, showHelp = true } = props;

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <View>
      {showHelp ? (
        <View style={styles.helpRow}>
          <HelpTriggerButton size={32} />
        </View>
      ) : null}
      <View style={styles.shell}>
        <Pressable
          onPress={handleBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <MaterialIcons name="chevron-left" size={22} color={c.textPrimary} />
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>
          {title ?? ""}
        </Text>
        <View style={styles.rightSlot}>{rightSlot ?? null}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  helpRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 2,
    backgroundColor: c.canvas,
  },
  shell: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: c.canvas,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    backgroundColor: c.cardMuted,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: c.textPrimary,
  },
  rightSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 32,
  },
});
