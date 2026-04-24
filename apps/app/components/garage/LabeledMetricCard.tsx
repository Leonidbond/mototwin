import { StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Card } from "../ui";

type MetricCardVariant = "default" | "muted" | "subtle";

type LabeledMetricCardProps = {
  label: string;
  value: string;
  variant?: MetricCardVariant;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
};

export function LabeledMetricCard({
  label,
  value,
  variant = "subtle",
  containerStyle,
  labelStyle,
  valueStyle,
}: LabeledMetricCardProps) {
  return (
    <Card variant={variant} padding="sm" style={containerStyle}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <Text style={[styles.value, valueStyle]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  value: {
    marginTop: 4,
    fontWeight: "600",
  },
});
