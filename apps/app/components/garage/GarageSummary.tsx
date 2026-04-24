import { Image, StyleSheet, Text, View } from "react-native";
import { Card } from "../ui";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import motorcyclesIcon from "../../../../images/garage-top-icons/motorcycles.png";
import attentionIcon from "../../../../images/garage-top-icons/attention.png";
import tasksIcon from "../../../../images/garage-top-icons/tasks.png";
import expensesIcon from "../../../../images/garage-top-icons/expenses.png";

type MetricKind = "vehicle" | "warning" | "clock" | "wallet";

const METRIC_ICONS = {
  vehicle: motorcyclesIcon,
  warning: attentionIcon,
  clock: tasksIcon,
  wallet: expensesIcon,
} as const;

export function GarageSummary(props: {
  motorcyclesCount: number;
  motorcyclesWithAttentionCount: number;
  attentionItemsTotalCount: number;
  expensesLabel: string | null;
}) {
  const metrics = [
    { label: "мотоцикла", value: String(props.motorcyclesCount), kind: "vehicle" as const },
    {
      label: "требует внимания",
      value: String(props.motorcyclesWithAttentionCount),
      kind: "warning" as const,
    },
    {
      label: "ближайших задачи",
      value: String(props.attentionItemsTotalCount),
      kind: "clock" as const,
    },
    { label: "расходы за сезон", value: props.expensesLabel ?? "—", kind: "wallet" as const },
  ];

  return (
    <View style={styles.row}>
      {metrics.map((metric) => (
        <Card key={metric.label} variant="muted" padding="none" style={styles.metric}>
          <View style={styles.metricInner}>
            <View style={styles.iconWrap}>
              <Image source={METRIC_ICONS[metric.kind]} style={styles.icon} resizeMode="contain" />
            </View>
            <View style={styles.metricText}>
              <Text style={styles.value}>{metric.value}</Text>
              <Text style={styles.label}>{metric.label}</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  metric: { width: "48%", flexGrow: 1, paddingHorizontal: 12, paddingVertical: 7 },
  metricInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  metricText: { flexShrink: 1 },
  iconWrap: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  icon: { width: 34, height: 34 },
  label: {
    fontSize: 11,
    color: c.textMuted,
    lineHeight: 14,
  },
  value: { fontSize: 24, lineHeight: 26, color: c.textPrimary, fontWeight: "800" },
});
