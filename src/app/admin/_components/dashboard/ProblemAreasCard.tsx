import Link from "next/link";
import { AlertTriangle } from "../icons";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import type { AdminProblemAreasResponse } from "@mototwin/types";
import { ruAdmin } from "../../_locales/ru";
import { DashboardSection } from "./DashboardSection";

interface ProblemAreasCardProps {
  data: AdminProblemAreasResponse;
}

export function ProblemAreasCard({ data }: ProblemAreasCardProps) {
  return (
    <DashboardSection
      title={ruAdmin.dashboard.problemAreas.title}
      seeAllLabel={ruAdmin.dashboard.problemAreas.seeAll}
      seeAllHref="/admin/reports"
    >
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {data.cards.map((card) => (
          <li
            key={card.id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "10px 12px",
              borderRadius: radiusScale.md,
              backgroundColor: productSemanticColors.cardMuted,
              border: `1px solid ${productSemanticColors.border}`,
            }}
          >
            <span aria-hidden style={iconWrap}>
              <AlertTriangle size={16} color="#FBBF24" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: productSemanticColors.textPrimary,
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: productSemanticColors.textSecondary,
                  marginTop: 2,
                }}
              >
                {card.description}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: productSemanticColors.textMuted,
                  marginTop: 4,
                }}
              >
                {card.recommendation}
              </div>
            </div>
            <Link
              href={card.ctaHref}
              prefetch={false}
              style={{
                color: productSemanticColors.primaryAction,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
                alignSelf: "center",
              }}
            >
              {card.ctaLabel} →
            </Link>
          </li>
        ))}
      </ul>
    </DashboardSection>
  );
}

const iconWrap: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: radiusScale.sm,
  backgroundColor: "rgba(251,191,36,0.12)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
