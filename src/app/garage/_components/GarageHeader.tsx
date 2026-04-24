import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/ui";
import { productSemanticColors } from "@mototwin/design-tokens";

export function GarageHeader({ trashCount }: { trashCount: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div>
        <h1 style={titleStyle}>Мой гараж</h1>
        <p style={{ marginTop: 2, ...subtitleStyle }}>
          Ваши мотоциклы, обслуживание и расходы в одном месте.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <IconLink
          href="/trash"
          label={`Открыть Свалку (${trashCount})`}
          badgeCount={trashCount}
        >
          <TrashIcon />
        </IconLink>
        <IconLink href="/notifications" label="Уведомления" badgeDot>
          <BellIcon />
        </IconLink>
        <IconLink href="/help" label="Помощь">
          <HelpIcon />
        </IconLink>
        <Link href="/onboarding" className="no-underline">
          <Button variant="primary" leadingIcon={<PlusIcon />}>
            Добавить мотоцикл
          </Button>
        </Link>
      </div>
    </div>
  );
}

function IconLink({
  href,
  label,
  badgeCount,
  badgeDot,
  children,
}: {
  href: string;
  label: string;
  badgeCount?: number;
  badgeDot?: boolean;
  children: ReactNode;
}) {
  const showBadge = (badgeCount ?? 0) > 0 || !!badgeDot;
  return (
    <Link href={href} className="no-underline" aria-label={label} title={label} style={iconLinkStyle}>
      <span style={iconLinkInnerStyle}>{children}</span>
      {showBadge ? (
        <span style={badgeStyle}>
          {badgeCount && badgeCount > 0 ? badgeCount : null}
        </span>
      ) : null}
    </Link>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 10v7M14 10v7" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

const titleStyle: CSSProperties = {
  color: productSemanticColors.textPrimary,
  fontSize: 32,
  lineHeight: "36px",
  fontWeight: 800,
  letterSpacing: -0.6,
};

const subtitleStyle: CSSProperties = {
  color: productSemanticColors.textMuted,
  fontSize: 14,
  lineHeight: "20px",
  fontWeight: 500,
};

const iconLinkStyle: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  width: 40,
  height: 40,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  border: `1px solid ${productSemanticColors.borderStrong}`,
  backgroundColor: productSemanticColors.card,
  color: productSemanticColors.textPrimary,
};

const iconLinkInnerStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const badgeStyle: CSSProperties = {
  position: "absolute",
  top: -4,
  right: -4,
  minWidth: 16,
  height: 16,
  paddingLeft: 4,
  paddingRight: 4,
  borderRadius: 999,
  backgroundColor: "#EF4444",
  color: "#fff",
  fontSize: 10,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: `2px solid ${productSemanticColors.canvas}`,
};
