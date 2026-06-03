import Link from "next/link";
import { Plus, Upload, Combine, ShieldCheck, RefreshCcw } from "../icons";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { ruAdmin } from "../../_locales/ru";
import { DashboardSection } from "./DashboardSection";

interface ActionTile {
  label: string;
  href: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
}

const QUICK_ACTIONS: ActionTile[] = [
  { label: ruAdmin.dashboard.quickActions.addPart, href: "/admin/catalog", Icon: Plus, iconColor: "#F97316" },
  { label: ruAdmin.dashboard.quickActions.uploadCsv, href: "/admin/imports/new", Icon: Upload, iconColor: "#F97316" },
  { label: ruAdmin.dashboard.quickActions.createFitmentRule, href: "/admin/fitment", Icon: Combine, iconColor: "#F97316" },
  { label: ruAdmin.dashboard.quickActions.openModeration, href: "/admin/moderation", Icon: ShieldCheck, iconColor: "#F97316" },
];

export function QuickActionsCard() {
  return (
    <DashboardSection title={ruAdmin.dashboard.quickActions.title}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          paddingBottom: 6,
        }}
      >
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.href} href={action.href} prefetch={false} style={tileStyle}>
            <span aria-hidden style={{ ...iconWrapStyle, color: action.iconColor }}>
              <action.Icon size={16} color={action.iconColor} />
            </span>
            <span>{action.label}</span>
          </Link>
        ))}
      </div>
      <Link
        href="/admin/fitment"
        prefetch={false}
        style={{ ...tileStyle, marginTop: 10, gridColumn: "span 2" }}
      >
        <span aria-hidden style={{ ...iconWrapStyle, color: "#F97316" }}>
          <RefreshCcw size={16} color="#F97316" />
        </span>
        <span>{ruAdmin.dashboard.quickActions.recalculateConfidence}</span>
      </Link>
    </DashboardSection>
  );
}

const tileStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  borderRadius: radiusScale.md,
  backgroundColor: productSemanticColors.cardMuted,
  border: `1px solid ${productSemanticColors.border}`,
  color: productSemanticColors.textPrimary,
  fontSize: 13,
  fontWeight: 500,
  textDecoration: "none",
  minHeight: 48,
};

const iconWrapStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: radiusScale.sm,
  backgroundColor: "rgba(249,115,22,0.12)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
