import Link from "next/link";
import { Button, Chip, SectionHeader } from "@/components/ui";
import { productSemanticColors } from "@mototwin/design-tokens";

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function GarageHeader({ trashCount }: { trashCount: number }) {
  return (
    <SectionHeader
      titleVisual="page"
      eyebrow={<Chip tone="accent">MotoTwin | Личный гараж</Chip>}
      title="Мой гараж"
      subtitle="Все мотоциклы, обслуживание и покупки в одном месте."
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/trash" className="no-underline">
            <Button variant="secondary" size="sm">Свалка ({trashCount})</Button>
          </Link>
          <Link
            href="/profile"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{
              borderColor: productSemanticColors.borderStrong,
              backgroundColor: productSemanticColors.card,
              color: productSemanticColors.textPrimary,
            }}
            aria-label="Открыть профиль"
            title="Профиль"
          >
            <ProfileIcon />
          </Link>
          <Link href="/onboarding" className="no-underline">
            <Button variant="primary">Добавить мотоцикл</Button>
          </Link>
        </div>
      }
    />
  );
}
