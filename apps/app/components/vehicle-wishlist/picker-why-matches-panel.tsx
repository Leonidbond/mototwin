import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { productSemanticColors as c } from "@mototwin/design-tokens";

export function PickerWhyMatchesPanel(props: { reasons: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (props.reasons.length === 0) {
    return null;
  }
  return (
    <View style={styles.section}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.title}>Почему это подходит</Text>
        <MaterialIcons
          name={expanded ? "expand-less" : "expand-more"}
          size={20}
          color={c.textMuted}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.list}>
          {props.reasons.map((reason, i) => (
            <View key={i} style={styles.row}>
              <MaterialIcons name="check" size={14} color={c.successStrong} style={styles.icon} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerPressed: { opacity: 0.85 },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
  },
  list: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  icon: { marginTop: 2 },
  reasonText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
});
