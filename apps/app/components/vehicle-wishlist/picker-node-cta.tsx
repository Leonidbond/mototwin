import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { productSemanticColors as c } from "@mototwin/design-tokens";

export function PickerNodeCtaBar(props: {
  hasSelectedNode: boolean;
  nodeName: string | null;
  onPickNode: () => void;
}) {
  if (!props.hasSelectedNode) {
    return (
      <Pressable
        onPress={props.onPickNode}
        style={({ pressed }) => [styles.pickNodeCta, pressed && styles.pickNodeCtaPressed]}
        accessibilityRole="button"
      >
        <MaterialIcons name="device-hub" size={20} color={c.primaryAction} />
        <View style={styles.pickNodeCol}>
          <Text style={styles.pickNodeTitle}>Выберите узел мотоцикла</Text>
          <Text style={styles.pickNodeSubtitle}>
            Чтобы увидеть BEST FIT / BEST VALUE / FOR YOUR RIDE
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={c.textMuted} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={props.onPickNode}
      style={({ pressed }) => [styles.changeNodeCta, pressed && styles.changeNodeCtaPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Изменить узел. Сейчас: ${props.nodeName ?? ""}`}
    >
      <MaterialIcons name="device-hub" size={20} color={c.primaryAction} />
      <View style={styles.pickNodeCol}>
        <Text style={styles.changeNodeLabel}>Узел</Text>
        <Text style={styles.changeNodeValue} numberOfLines={2}>
          {props.nodeName ?? "—"}
        </Text>
      </View>
      <Text style={styles.changeNodeAction}>Изменить</Text>
      <MaterialIcons name="chevron-right" size={22} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pickNodeCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
  },
  pickNodeCtaPressed: { opacity: 0.9 },
  pickNodeCol: { flex: 1, minWidth: 0 },
  pickNodeTitle: { fontSize: 14, fontWeight: "700", color: c.textPrimary },
  pickNodeSubtitle: { marginTop: 2, fontSize: 12, color: c.textMuted },
  changeNodeCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  changeNodeCtaPressed: { opacity: 0.92 },
  changeNodeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: c.textMuted,
    textTransform: "uppercase",
  },
  changeNodeValue: { marginTop: 2, fontSize: 14, fontWeight: "700", color: c.textPrimary },
  changeNodeAction: { fontSize: 13, fontWeight: "700", color: c.primaryAction },
});
