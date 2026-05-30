import Link from "next/link";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { SubscriptionPlan } from "@mototwin/types";

type SubscriptionLockProps = {
  title: string;
  description: string;
  requiredPlan: Exclude<SubscriptionPlan, "FREE">;
  actionLabel?: string;
  /** Тёмная карточка в стиле гаража / дерева узлов (не amber alert). */
  variant?: "default" | "surface";
};

export function SubscriptionLock({
  title,
  description,
  requiredPlan,
  actionLabel = "Сравнить тарифы",
  variant = "default",
}: SubscriptionLockProps) {
  if (variant === "surface") {
    return (
      <div
        className="rounded-xl border px-3 py-2.5 text-sm"
        style={{
          borderColor: productSemanticColors.border,
          backgroundColor: productSemanticColors.cardMuted,
          color: productSemanticColors.textPrimary,
        }}
      >
        <p className="font-semibold" style={{ color: productSemanticColors.textPrimary }}>
          {title}
        </p>
        <p className="mt-1 text-xs leading-5" style={{ color: productSemanticColors.textSecondary }}>
          {description}
        </p>
        <p className="mt-2 text-xs" style={{ color: productSemanticColors.textMuted }}>
          Требуется тариф:{" "}
          <strong style={{ color: productSemanticColors.textPrimary }}>{requiredPlan}</strong>
        </p>
        <Link
          href="/subscription"
          className="mt-2 inline-block text-xs font-semibold hover:opacity-90"
          style={{ color: productSemanticColors.primaryAction }}
        >
          {actionLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs">{description}</p>
      <p className="mt-2 text-xs">
        Требуется тариф: <strong>{requiredPlan}</strong>
      </p>
      <Link href="/subscription" className="mt-2 inline-block text-xs font-semibold text-amber-800 hover:text-amber-900">
        {actionLabel}
      </Link>
    </div>
  );
}
