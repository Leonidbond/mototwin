import { StyleSheet, Text, View } from "react-native";
import { Card } from "../ui";
import { productSemanticColors as c } from "@mototwin/design-tokens";

export function GarageScore(props: { score: number | null }) {
  return (
    <Card variant="subtle" padding="sm" style={styles.card}>
      <Text style={styles.label}>Garage Score</Text>
      <View style={styles.row}>
        <Text style={styles.value}>{props.score ?? "—"}</Text>
        <Text style={styles.unit}>/ 100</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "flex-start",
    minWidth: 108,
  },
  label: {
    color: c.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  row: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  value: {
    color: c.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  unit: {
    color: c.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
});
