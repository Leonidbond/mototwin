import type { ReactNode } from "react";
import Link from "next/link";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";

interface DashboardSectionProps {
  title: string;
  /** Optional secondary action (text link with arrow) shown below content. */
  seeAllLabel?: string;
  seeAllHref?: string;
  /** Right-aligned slot in the header (e.g. tabs or dropdown). */
  rightSlot?: ReactNode;
  children: ReactNode;
  /** When provided, padding around children is removed (e.g. flush tables). */
  flush?: boolean;
  /** Optional explicit min height for content area. */
  minHeight?: number;
}

/** Single section card on the dashboard — title + content + see-all footer. */
export function DashboardSection({
  title,
  seeAllLabel,
  seeAllHref,
  rightSlot,
  children,
  flush = false,
  minHeight,
}: DashboardSectionProps) {
  return (
    <section
      style={{
        backgroundColor: productSemanticColors.card,
        border: `1px solid ${productSemanticColors.border}`,
        borderRadius: radiusScale.lg,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 18px 0",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: productSemanticColors.textPrimary,
            letterSpacing: 0,
          }}
        >
          {title}
        </h2>
        <div style={{ marginLeft: "auto" }}>{rightSlot}</div>
      </header>
      <div
        style={{
          flex: 1,
          padding: flush ? "12px 0 0" : "12px 18px 0",
          minWidth: 0,
        }}
      >
        {children}
      </div>
      {seeAllLabel && seeAllHref ? (
        <Link
          href={seeAllHref}
          prefetch={false}
          style={{
            padding: "12px 18px",
            color: productSemanticColors.primaryAction,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          {seeAllLabel} →
        </Link>
      ) : null}
    </section>
  );
}
