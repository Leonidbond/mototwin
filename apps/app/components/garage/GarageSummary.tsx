import { StyleSheet, Text, View } from "react-native";
import { Card } from "../ui";
import { productSemanticColors as c } from "@mototwin/design-tokens";

export function GarageSummary(props: {
  motorcyclesCount: number;
  motorcyclesWithAttentionCount: number;
  attentionItemsTotalCount: number;
}) {
  return (
    <View style={styles.row}>
      <Metric label="Мотоциклы" value={String(props.motorcyclesCount)} />
      <Metric label="Требуют внимания" value={String(props.motorcyclesWithAttentionCount)} />
      <Metric label="Сигналы внимания" value={String(props.attentionItemsTotalCount)} />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="muted" padding="sm" style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginTop: 10 },
  metric: { flex: 1 },
  label: { fontSize: 11, color: c.textMuted, fontWeight: "600", textTransform: "uppercase" },
  value: { marginTop: 6, fontSize: 16, color: c.textPrimary, fontWeight: "700" },
});
