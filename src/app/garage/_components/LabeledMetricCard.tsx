import type { CSSProperties } from "react";
import { Card } from "@/components/ui";

type MetricCardVariant = "default" | "muted" | "subtle";

type LabeledMetricCardProps = {
  label: string;
  value: string;
  variant?: MetricCardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  containerClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  labelStyle?: CSSProperties;
  valueStyle?: CSSProperties;
};

export function LabeledMetricCard({
  label,
  value,
  variant = "subtle",
  padding = "sm",
  containerClassName,
  labelClassName = "uppercase tracking-wide",
  valueClassName = "mt-2",
  labelStyle,
  valueStyle,
}: LabeledMetricCardProps) {
  return (
    <Card variant={variant} padding={padding} className={containerClassName}>
      <div className={labelClassName} style={labelStyle}>
        {label}
      </div>
      <div className={valueClassName} style={valueStyle}>
        {value}
      </div>
    </Card>
  );
}
