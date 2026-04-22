import { Card } from "@/components/ui";
import { productSemanticColors, typeScale } from "@mototwin/design-tokens";

export function GarageSummary(props: {
  motorcyclesCount: number;
  motorcyclesWithAttentionCount: number;
  attentionItemsTotalCount: number;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <Metric label="Мотоциклы" value={String(props.motorcyclesCount)} />
      <Metric label="Требуют внимания" value={String(props.motorcyclesWithAttentionCount)} />
      <Metric label="Активные сигналы внимания" value={String(props.attentionItemsTotalCount)} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="muted" padding="md">
      <div
        className="uppercase tracking-wide"
        style={{
          color: productSemanticColors.textMuted,
          fontSize: typeScale.overline.fontSize,
          lineHeight: `${typeScale.overline.lineHeight}px`,
          fontWeight: Number(typeScale.overline.weight),
        }}
      >
        {label}
      </div>
      <div
        className="mt-2"
        style={{
          color: productSemanticColors.textPrimary,
          fontSize: typeScale.bodyStrong.fontSize,
          lineHeight: `${typeScale.bodyStrong.lineHeight}px`,
          fontWeight: Number(typeScale.bodyStrong.weight),
        }}
      >
        {value}
      </div>
    </Card>
  );
}
