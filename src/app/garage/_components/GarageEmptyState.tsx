import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { productSemanticColors, typeScale } from "@mototwin/design-tokens";

export function GarageEmptyState() {
  return (
    <Card padding="lg">
      <h2
        className="tracking-tight"
        style={{
          color: productSemanticColors.textPrimary,
          fontSize: typeScale.h2.fontSize,
          lineHeight: `${typeScale.h2.lineHeight}px`,
          fontWeight: Number(typeScale.h2.weight),
          letterSpacing: -0.2,
        }}
      >
        Личный гараж пока пуст
      </h2>
      <p
        className="mt-4 max-w-2xl"
        style={{
          color: productSemanticColors.textMuted,
          fontSize: typeScale.body.fontSize,
          lineHeight: `${typeScale.body.lineHeight}px`,
          fontWeight: Number(typeScale.body.weight),
        }}
      >
        Добавьте первый мотоцикл, чтобы начать вести обслуживание.
      </p>
      <div className="mt-8">
        <Link href="/onboarding" className="no-underline">
          <Button variant="primary">Добавить мотоцикл</Button>
        </Link>
      </div>
    </Card>
  );
}
