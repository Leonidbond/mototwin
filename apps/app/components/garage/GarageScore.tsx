import { StyleSheet, Text, View } from "react-native";
import { Card } from "../ui";
import { productSemanticColors as c } from "@mototwin/design-tokens";

const LEGEND_COLORS = {
  ok: "#2ED267",
  soon: "#F6C453",
  overdue: "#FF5A4D",
  recently: "#45B6FF",
} as const;

export function GarageScore(props: {
  score: number | null;
  okCount: number;
  soonCount: number;
  overdueCount: number;
  recentlyCount: number;
}) {
  const scoreColor = getScoreColor(props.score);
  return (
    <Card variant="muted" padding="sm" style={styles.card}>
      <Text style={styles.label}>Garage Score</Text>
      <View style={styles.scoreBlock}>
        <Text style={[styles.value, { color: scoreColor }]}>{props.score ?? "—"}</Text>
        <Text style={styles.unit}>/100</Text>
      </View>
      <View style={styles.legend}>
        <LegendRow color={LEGEND_COLORS.ok} value={props.okCount} label="В норме" />
        <LegendRow color={LEGEND_COLORS.soon} value={props.soonCount} label="Скоро" />
        <LegendRow color={LEGEND_COLORS.overdue} value={props.overdueCount} label="Просрочено" />
        <LegendRow
          color={LEGEND_COLORS.recently}
          value={props.recentlyCount}
          label="Недавно"
        />
      </View>
    </Card>
  );
}

function LegendRow(props: { color: string; value: number; label: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: props.color }]} />
      <Text style={[styles.legendValue, { color: props.color }]}>{props.value}</Text>
      <Text style={styles.legendLabel}>{props.label}</Text>
    </View>
  );
}

function getScoreColor(score: number | null): string {
  if (score === null) return c.textMuted;
  if (score >= 75) return LEGEND_COLORS.ok;
  if (score >= 50) return LEGEND_COLORS.soon;
  if (score >= 25) return "#F97316";
  return LEGEND_COLORS.overdue;
}

const styles = StyleSheet.create({
  card: {
    width: 156,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    color: c.textMuted,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  scoreBlock: {
    marginTop: 6,
    alignItems: "center",
  },
  value: {
    fontSize: 42,
    lineHeight: 42,
    fontWeight: "800",
  },
  unit: {
    color: c.textMuted,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  legend: { marginTop: 10, gap: 4 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 999 },
  legendValue: { width: 20, fontSize: 14, fontWeight: "700" },
  legendLabel: { color: c.textSecondary, fontSize: 12 },
});
