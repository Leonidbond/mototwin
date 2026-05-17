"use client";

import {
  AlertTriangle,
  CheckShield,
  FileText,
  ShieldCheck,
  Users,
  XOctagon,
  Bike,
} from "../icons";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import type { AdminKpiCardWire } from "@mototwin/types";
import { formatNumber } from "../../_locales/ru";
import { Sparkline } from "./Sparkline";

interface KpiCardProps {
  card: AdminKpiCardWire;
}

const TONES: Record<string, { fg: string; bg: string }> = {
  orange: { fg: "#F97316", bg: "rgba(249,115,22,0.12)" },
  blue: { fg: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  gray: { fg: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
  yellow: { fg: "#FBBF24", bg: "rgba(251,191,36,0.12)" },
  green: { fg: "#22C55E", bg: "rgba(34,197,94,0.14)" },
  red: { fg: "#F87171", bg: "rgba(248,113,113,0.14)" },
  violet: { fg: "#A78BFA", bg: "rgba(167,139,250,0.14)" },
};

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Users,
  Bike,
  FileText,
  AlertTriangle,
  ShieldCheck,
  CheckShield,
  XOctagon,
};

export function KpiCard({ card }: KpiCardProps) {
  const tone = TONES[card.tone] ?? TONES.gray;
  const Icon = ICONS[card.iconKey] ?? FileText;
  const valueLabel = card.valueLabel ?? formatNumber(card.value);
  const deltaColor =
    card.deltaDirection === "down"
      ? "#F87171"
      : card.deltaDirection === "up"
      ? "#22C55E"
      : productSemanticColors.textMuted;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <span
          aria-hidden
          style={{
            ...iconWrapStyle,
            backgroundColor: tone.bg,
            color: tone.fg,
          }}
        >
          <Icon size={22} color={tone.fg} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: productSemanticColors.textMuted,
            }}
          >
            {card.label}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 26,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: productSemanticColors.textPrimary,
              letterSpacing: -0.4,
            }}
          >
            {valueLabel}
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 12,
              fontWeight: 500,
              color: deltaColor,
            }}
          >
            {card.deltaLabel}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <Sparkline data={card.sparkline} color={tone.fg} />
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: productSemanticColors.card,
  border: `1px solid ${productSemanticColors.border}`,
  borderRadius: radiusScale.lg,
  padding: "16px 18px 12px",
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const iconWrapStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: radiusScale.md,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
