import { StyleSheet, Text, View } from "react-native";
import { Card } from "../ui";
import { productSemanticColors as c } from "@mototwin/design-tokens";

const LEGEND_COLORS = {
  ok: "#2ED267",
  soon: "#F6C453",
  overdue: "#FF5A4D",
  recently: "#45B6FF",
} as const;

type LegendItem = {
  color: string;
  value: number;
  label: string;
};

export function GarageScore(props: {
  score: number | null;
  okCount: number;
  soonCount: number;
  overdueCount: number;
  recentlyCount: number;
}) {
  const scoreColor = getScoreColor(props.score);
  const legendItems: LegendItem[] = [
    { color: LEGEND_COLORS.ok, value: props.okCount, label: "В норме" },
    { color: LEGEND_COLORS.soon, value: props.soonCount, label: "Скоро" },
    { color: LEGEND_COLORS.overdue, value: props.overdueCount, label: "Просрочено" },
  ];
  if (props.recentlyCount > 0) {
    legendItems.push({
      color: LEGEND_COLORS.recently,
      value: props.recentlyCount,
      label: "Недавно",
    });
  }

  return (
    <Card variant="muted" padding="sm" style={styles.card}>
      <Text style={styles.label}>Garage Score</Text>
      <Text style={[styles.valueLine, { color: scoreColor }]}>
        {props.score ?? "—"}
        <Text style={styles.unit}> /100</Text>
      </Text>
      <View style={styles.legendGrid}>
        {legendItems.map((item) => (
          <LegendCell key={item.label} color={item.color} value={item.value} label={item.label} />
        ))}
      </View>
    </Card>
  );
}

function LegendCell(props: { color: string; value: number; label: string }) {
  return (
    <View style={styles.legendCell}>
      <View style={[styles.legendDot, { backgroundColor: props.color }]} />
      <Text style={[styles.legendValue, { color: props.color }]}>{props.value}</Text>
      <Text style={styles.legendLabel} numberOfLines={1}>
        {props.label}
      </Text>
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
    width: 118,
    alignSelf: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  label: {
    color: c.textMuted,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  valueLine: {
    marginTop: 2,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  unit: {
    color: c.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  legendGrid: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 4,
    rowGap: 3,
  },
  legendCell: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  legendDot: { width: 6, height: 6, borderRadius: 999, flexShrink: 0 },
  legendValue: { fontSize: 12, fontWeight: "700", minWidth: 14, flexShrink: 0 },
  legendLabel: { color: c.textSecondary, fontSize: 10, flex: 1, minWidth: 0 },
});
