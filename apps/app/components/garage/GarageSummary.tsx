import { StyleSheet, View } from "react-native";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { LabeledMetricCard } from "./LabeledMetricCard";

export function GarageSummary(props: {
  motorcyclesCount: number;
  motorcyclesWithAttentionCount: number;
  attentionItemsTotalCount: number;
  expensesLabel: string | null;
}) {
  const metrics = [
    { label: "Мотоциклы", value: String(props.motorcyclesCount) },
    { label: "Требуют внимания", value: String(props.motorcyclesWithAttentionCount) },
    { label: "Ближайшие задачи", value: String(props.attentionItemsTotalCount) },
    { label: "Расходы за месяц", value: props.expensesLabel ?? "—" },
  ];

  return (
    <View style={styles.row}>
      {metrics.map((metric) => (
        <LabeledMetricCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          variant="muted"
          containerStyle={styles.metric}
          labelStyle={styles.label}
          valueStyle={styles.value}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  metric: { width: "48%", flexGrow: 1 },
  label: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  value: { marginTop: 6, fontSize: 16, color: c.textPrimary, fontWeight: "700" },
});
