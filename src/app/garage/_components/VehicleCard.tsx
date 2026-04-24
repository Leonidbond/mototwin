import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  buildGarageCardProps,
  getVehicleSilhouetteClassLabel,
  resolveGarageVehicleSilhouette,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { GarageVehicleItem } from "@mototwin/types";
import { Button, Card } from "@/components/ui";
import { VehicleSilhouette } from "./VehicleSilhouette";
import brakesIcon from "../../../../images/top-node-icons/from-cards/brakes.png";
import chainSprocketsIcon from "../../../../images/top-node-icons/from-cards/chain_sprockets.png";
import engineCoolingIcon from "../../../../images/top-node-icons/from-cards/engine_cooling.png";
import lubricationIcon from "../../../../images/top-node-icons/from-cards/lubrication.png";
import suspensionIcon from "../../../../images/top-node-icons/from-cards/suspension.png";
import tiresIcon from "../../../../images/top-node-icons/from-cards/tires.png";

type TopNodeIconKey =
  | "brakes"
  | "chain_sprockets"
  | "engine_cooling"
  | "lubrication"
  | "suspension"
  | "tires";

const TOP_NODE_ICONS = {
  brakes: brakesIcon,
  chain_sprockets: chainSprocketsIcon,
  engine_cooling: engineCoolingIcon,
  lubrication: lubricationIcon,
  suspension: suspensionIcon,
  tires: tiresIcon,
} as const;

type Props = {
  vehicle: GarageVehicleItem;
};

const LEGEND_COLORS = {
  ok: "#22C55E",
  soon: "#F6C453",
  overdue: "#F04F47",
  recently: "#3AB8FF",
} as const;

export function VehicleCard({ vehicle }: Props) {
  const card = buildGarageCardProps(vehicle);
  const silhouetteKey = resolveGarageVehicleSilhouette(vehicle);
  const silhouetteClassLabel = getVehicleSilhouetteClassLabel(silhouetteKey);

  const attentionTotal = vehicle.attentionSummary?.totalCount ?? 0;
  const soonCount = vehicle.attentionSummary?.soonCount ?? 0;
  const overdueCount = vehicle.attentionSummary?.overdueCount ?? 0;
  const okCount = Math.max(0, 10 - attentionTotal);
  const recentlyCount = 0;

  const score = card.garageScore;
  const scoreColor = getScoreColor(score);

  const metaLine = [
    vehicle.modelVariant?.year,
    card.summary.odometerLine,
    vehicle.modelVariant?.versionName,
  ]
    .filter((chunk): chunk is string | number => Boolean(chunk))
    .join(" · ");

  return (
    <Card padding="md">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={titleStyle}>
            <Link href={`/vehicles/${vehicle.id}`} className="no-underline" style={{ color: "inherit" }}>
              {card.summary.title}
            </Link>
          </h2>
          <p style={{ marginTop: 2, ...metaStyle }}>{metaLine || card.summary.yearVersionLine}</p>
        </div>
        <button type="button" style={moreButtonStyle} aria-label="Меню карточки">
          <DotsIcon />
        </button>
      </div>

      <div
        style={{
          marginTop: 6,
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr 170px",
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <VehicleSilhouette vehicle={vehicle} silhouetteKey={silhouetteKey} />
          <p style={{ marginTop: 2, textAlign: "center", ...captionStyle }}>
            Схематичный вид &nbsp;•&nbsp; {silhouetteClassLabel}
          </p>
        </div>

        <div style={scorePanelStyle}>
          <div style={{ textAlign: "center", ...scoreLabelStyle }}>Garage Score</div>
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ ...scoreValueStyle, color: scoreColor }}>{score ?? "—"}</div>
            <div style={scoreUnitStyle}>/100</div>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
            <LegendRow color={LEGEND_COLORS.ok} value={okCount} label="В норме" />
            <LegendRow color={LEGEND_COLORS.soon} value={soonCount} label="Скоро" />
            <LegendRow color={LEGEND_COLORS.overdue} value={overdueCount} label="Просрочено" />
            <LegendRow
              color={LEGEND_COLORS.recently}
              value={recentlyCount}
              label="Недавно"
              labelColor={LEGEND_COLORS.recently}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        {attentionTotal > 0 ? (
          <>
            <div style={attentionTitleStyle}>Требует внимания</div>
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
              {overdueCount > 0 ? (
                <AttentionRow
                  tone="overdue"
                  iconKey="tires"
                  title="Задняя шина"
                  badgeLabel="Просрочено"
                  subtitle="Рекомендуется замена"
                />
              ) : null}
              {soonCount > 0 ? (
                <AttentionRow
                  tone="soon"
                  iconKey="brakes"
                  title="Тормозные колодки"
                  badgeLabel="Скоро"
                  subtitle="Проверить через 450 км"
                />
              ) : null}
            </div>
          </>
        ) : (
          <HealthyRow />
        )}
      </div>

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Link href={`/vehicles/${vehicle.id}`} className="no-underline">
          <Button variant="primary">Открыть</Button>
        </Link>
        <Link href={`/vehicles/${vehicle.id}?open=service-event`} className="no-underline">
          <Button variant="ghost" leadingIcon={<ClipboardIcon />}>Добавить ТО</Button>
        </Link>
        <Link href={`/vehicles/${vehicle.id}/service-log?open=expense`} className="no-underline">
          <Button variant="ghost" leadingIcon={<WalletIcon />}>Расход</Button>
        </Link>
      </div>
    </Card>
  );
}

function getScoreColor(score: number | null): string {
  if (score === null) return productSemanticColors.textMuted;
  if (score >= 75) return LEGEND_COLORS.ok;
  if (score >= 50) return LEGEND_COLORS.soon;
  if (score >= 25) return "#F97316";
  return LEGEND_COLORS.overdue;
}

function LegendRow({
  color,
  value,
  label,
  labelColor,
}: {
  color: string;
  value: number;
  label: string;
  labelColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
      <span style={{ ...legendValueStyle, color }}>{value}</span>
      <span style={{ ...legendLabelStyle, color: labelColor ?? legendLabelStyle.color }}>
        {label}
      </span>
    </div>
  );
}

type AttentionTone = "overdue" | "soon";

function AttentionRow({
  tone,
  iconKey,
  title,
  badgeLabel,
  subtitle,
}: {
  tone: AttentionTone;
  iconKey: TopNodeIconKey;
  title: string;
  badgeLabel: string;
  subtitle: string;
}) {
  const accent = tone === "overdue" ? LEGEND_COLORS.overdue : LEGEND_COLORS.soon;
  return (
    <div style={attentionRowStyle}>
      <TopNodeIconMask iconKey={iconKey} color={accent} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={attentionTitleRowStyle}>{title}</span>
          <PillBadge color={accent}>{badgeLabel}</PillBadge>
        </div>
        <div style={attentionSubStyle}>{subtitle}</div>
      </div>
      <ChevronRightIcon />
    </div>
  );
}

function HealthyRow() {
  return (
    <div style={attentionRowStyle}>
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          flex: "0 0 auto",
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          color: LEGEND_COLORS.ok,
        }}
      >
        <CheckIcon />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...attentionTitleRowStyle, color: productSemanticColors.textPrimary }}>
          Все в порядке
        </div>
        <div style={attentionSubStyle}>Следующее ТО через 1 200 км</div>
      </div>
    </div>
  );
}

function TopNodeIconMask({
  iconKey,
  color,
}: {
  iconKey: TopNodeIconKey;
  color: string;
}) {
  const maskUrl = `url(${TOP_NODE_ICONS[iconKey].src})`;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        flex: "0 0 auto",
        width: 36,
        height: 36,
        backgroundColor: color,
        maskImage: maskUrl,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
        WebkitMaskImage: maskUrl,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

function PillBadge({ color, children }: { color: string; children: ReactNode }) {
  const style: CSSProperties = {
    color,
    backgroundColor: `${color}26`,
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 999,
    lineHeight: "14px",
    letterSpacing: 0.2,
  };
  return <span style={style}>{children}</span>;
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke={productSemanticColors.textMuted}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="6" y="5" width="12" height="16" rx="2" />
      <path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 11h6M9 15h6" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
      <path d="M4 7V6a2 2 0 0 1 2-2h9l1 3" />
      <circle cx="16.5" cy="13" r="1.2" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="5 12 10 17 19 7" />
    </svg>
  );
}

const titleStyle: CSSProperties = {
  color: productSemanticColors.textPrimary,
  fontSize: 22,
  lineHeight: "28px",
  fontWeight: 700,
  letterSpacing: -0.3,
};

const metaStyle: CSSProperties = {
  color: productSemanticColors.textMuted,
  fontSize: 13,
  lineHeight: "18px",
  fontWeight: 500,
};

const moreButtonStyle: CSSProperties = {
  display: "inline-flex",
  width: 32,
  height: 32,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.cardSubtle,
  color: productSemanticColors.textMuted,
  cursor: "pointer",
  flexShrink: 0,
};

const attentionRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.06)",
  backgroundColor: productSemanticColors.cardMuted,
  padding: "6px 10px",
};

const captionStyle: CSSProperties = {
  color: productSemanticColors.textMuted,
  fontSize: 12,
};

const scorePanelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: 8,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.06)",
  backgroundColor: productSemanticColors.cardMuted,
};

const scoreLabelStyle: CSSProperties = {
  color: productSemanticColors.textMuted,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: 0.2,
};

const scoreValueStyle: CSSProperties = {
  fontSize: 42,
  lineHeight: "42px",
  fontWeight: 800,
  letterSpacing: -1,
};

const scoreUnitStyle: CSSProperties = {
  color: productSemanticColors.textMuted,
  fontSize: 11,
  fontWeight: 500,
  marginTop: 2,
};

const legendValueStyle: CSSProperties = {
  color: productSemanticColors.textPrimary,
  fontSize: 15,
  fontWeight: 700,
  minWidth: 14,
  textAlign: "right",
};

const legendLabelStyle: CSSProperties = {
  color: productSemanticColors.textSecondary,
  fontSize: 12,
};

const attentionTitleStyle: CSSProperties = {
  color: productSemanticColors.textPrimary,
  fontSize: 14,
  fontWeight: 700,
};

const attentionTitleRowStyle: CSSProperties = {
  color: productSemanticColors.textPrimary,
  fontSize: 14,
  fontWeight: 700,
};

const attentionSubStyle: CSSProperties = {
  marginTop: 2,
  color: productSemanticColors.textMuted,
  fontSize: 12,
};
