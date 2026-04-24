import Image from "next/image";
import type { CSSProperties } from "react";
import { Card } from "@/components/ui";
import { productSemanticColors } from "@mototwin/design-tokens";
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
  const metrics: Array<{ key: string; kind: MetricKind; value: string; label: string }> = [
    {
      key: "vehicles",
      kind: "vehicle",
      value: String(props.motorcyclesCount),
      label: "мотоцикла",
    },
    {
      key: "attention",
      kind: "warning",
      value: String(props.motorcyclesWithAttentionCount),
      label: "требует внимания",
    },
    {
      key: "tasks",
      kind: "clock",
      value: String(props.attentionItemsTotalCount),
      label: "ближайших задачи",
    },
    {
      key: "expenses",
      kind: "wallet",
      value: props.expensesLabel ?? "—",
      label: "расходы за сезон",
    },
  ];

  return (
    <section
      style={{
        display: "grid",
        gap: 10,
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
      }}
    >
      {metrics.map((metric) => (
        <Card
          key={metric.key}
          variant="muted"
          padding="none"
          style={{ padding: "6px 12px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IconBox kind={metric.kind} />
            <div style={{ minWidth: 0 }}>
              <div style={valueStyle}>{metric.value}</div>
              <div style={labelStyle}>{metric.label}</div>
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}

function IconBox({ kind }: { kind: MetricKind }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flex: "0 0 auto",
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        src={METRIC_ICONS[kind]}
        alt=""
        width={40}
        height={40}
        style={{ width: 40, height: 40, objectFit: "contain" }}
      />
    </span>
  );
}

const valueStyle: CSSProperties = {
  color: productSemanticColors.textPrimary,
  fontSize: 26,
  lineHeight: "28px",
  fontWeight: 800,
  letterSpacing: -0.4,
};

const labelStyle: CSSProperties = {
  color: productSemanticColors.textMuted,
  fontSize: 12,
  lineHeight: "14px",
  marginTop: 1,
};
