import Link from "next/link";
import { filterMeaningfulGarageSpecHighlights, buildGarageCardProps } from "@mototwin/domain";
import { productSemanticColors, typeScale } from "@mototwin/design-tokens";
import type { GarageVehicleItem } from "@mototwin/types";
import { Button, Card, StatusBadge } from "@/components/ui";
import { VehicleSilhouette } from "./VehicleSilhouette";

type Props = {
  vehicle: GarageVehicleItem;
  isUsageProfileExpanded: boolean;
  isTechnicalSummaryExpanded: boolean;
  onToggleUsageProfile: () => void;
  onToggleTechnicalSummary: () => void;
};

export function VehicleCard({
  vehicle,
  isUsageProfileExpanded,
  isTechnicalSummaryExpanded,
  onToggleUsageProfile,
  onToggleTechnicalSummary,
}: Props) {
  const card = buildGarageCardProps(vehicle);
  const specHighlights = filterMeaningfulGarageSpecHighlights(card.specHighlights);

  return (
    <Card padding="lg" className="shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div
            style={{
              color: productSemanticColors.textMuted,
              fontSize: typeScale.caption.fontSize,
              lineHeight: `${typeScale.caption.lineHeight}px`,
              fontWeight: Number(typeScale.caption.weight),
            }}
          >
            {card.brandModelCaption}
          </div>
          <div className="mt-3 flex min-w-0 flex-nowrap items-center gap-2">
            <h2
              className="min-w-0 flex-1 tracking-tight"
              style={{
                color: productSemanticColors.textPrimary,
                fontSize: typeScale.cardTitle.fontSize,
                lineHeight: `${typeScale.cardTitle.lineHeight}px`,
                fontWeight: Number(typeScale.cardTitle.weight),
                letterSpacing: -0.2,
              }}
            >
              <Link
                href={`/vehicles/${vehicle.id}`}
                className="block truncate underline-offset-2 transition hover:underline hover:opacity-90"
                style={{ color: productSemanticColors.textPrimary }}
              >
                {card.summary.title}
              </Link>
            </h2>
            {card.attentionIndicator.isVisible ? (
              <Link href={`/vehicles/${vehicle.id}`} className="no-underline">
                <StatusBadge
                  status={card.attentionIndicator.semanticKey}
                  label={String(card.attentionIndicator.totalCount)}
                  size="sm"
                />
              </Link>
            ) : null}
          </div>

          <p
            className="mt-3"
            style={{
              color: productSemanticColors.textMuted,
              fontSize: typeScale.body.fontSize,
              lineHeight: `${typeScale.body.lineHeight}px`,
              fontWeight: Number(typeScale.body.weight),
            }}
          >
            {card.summary.yearVersionLine.replace(" · ", " | ")}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Пробег" value={card.summary.odometerLine} />
            <Metric
              label="Моточасы"
              value={card.summary.engineHoursLine !== null ? card.summary.engineHoursLine : "Не указаны"}
            />
            <Metric label="VIN" value={card.summary.vinLine || "Не указан"} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/vehicles/${vehicle.id}`} className="no-underline"><Button size="sm">Открыть</Button></Link>
            <Link href={`/vehicles/${vehicle.id}?open=service-event`} className="no-underline"><Button variant="ghost" size="sm">ТО</Button></Link>
            <Link href={`/vehicles/${vehicle.id}/service-log?open=expense`} className="no-underline"><Button variant="ghost" size="sm">Расход</Button></Link>
          </div>
        </div>

        <div className="space-y-3">
          <VehicleSilhouette vehicle={vehicle} />
          <Card variant="muted" padding="md">
            <button type="button" onClick={onToggleUsageProfile} className="flex w-full items-center justify-between gap-2 rounded-lg text-left" aria-expanded={isUsageProfileExpanded}>
              <h3
                style={{
                  color: productSemanticColors.textPrimary,
                  fontSize: typeScale.h3.fontSize,
                  lineHeight: `${typeScale.h3.lineHeight}px`,
                  fontWeight: Number(typeScale.h3.weight),
                }}
              >
                Профиль эксплуатации
              </h3>
              <span
                style={{
                  color: productSemanticColors.textMuted,
                  fontSize: typeScale.caption.fontSize,
                  lineHeight: `${typeScale.caption.lineHeight}px`,
                }}
                aria-hidden
              >
                {isUsageProfileExpanded ? "▾" : "▸"}
              </span>
            </button>
            {isUsageProfileExpanded ? (
              card.rideProfile ? (
                <div
                  className="mt-4 space-y-2"
                  style={{
                    color: productSemanticColors.textSecondary,
                    fontSize: typeScale.caption.fontSize,
                    lineHeight: `${typeScale.caption.lineHeight}px`,
                  }}
                >
                  <div>
                    <span style={rideLabelStyle}>Сценарий:</span> {card.rideProfile.usageType}
                  </div>
                  <div>
                    <span style={rideLabelStyle}>Стиль:</span> {card.rideProfile.ridingStyle}
                  </div>
                  <div>
                    <span style={rideLabelStyle}>Нагрузка:</span> {card.rideProfile.loadType}
                  </div>
                  <div>
                    <span style={rideLabelStyle}>Интенсивность:</span> {card.rideProfile.usageIntensity}
                  </div>
                </div>
              ) : (
                <p
                  className="mt-4"
                  style={{
                    color: productSemanticColors.textMuted,
                    fontSize: typeScale.caption.fontSize,
                    lineHeight: `${typeScale.caption.lineHeight}px`,
                  }}
                >
                  Профиль эксплуатации пока не задан.
                </p>
              )
            ) : null}
          </Card>
        </div>
      </div>

      <Card variant="muted" padding="md" className="mt-6">
        <button type="button" onClick={onToggleTechnicalSummary} className="flex w-full items-center justify-between gap-2 rounded-lg text-left" aria-expanded={isTechnicalSummaryExpanded}>
          <h3
            style={{
              color: productSemanticColors.textPrimary,
              fontSize: typeScale.h3.fontSize,
              lineHeight: `${typeScale.h3.lineHeight}px`,
              fontWeight: Number(typeScale.h3.weight),
            }}
          >
            Техническая сводка
          </h3>
          <span
            style={{
              color: productSemanticColors.textMuted,
              fontSize: typeScale.caption.fontSize,
              lineHeight: `${typeScale.caption.lineHeight}px`,
            }}
            aria-hidden
          >
            {isTechnicalSummaryExpanded ? "▾" : "▸"}
          </span>
        </button>
        {isTechnicalSummaryExpanded ? (
          specHighlights.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {specHighlights.map((spec) => (
                <Metric key={spec.label} label={spec.label} value={spec.value} />
              ))}
            </div>
          ) : (
            <p
              className="mt-3"
              style={{
                color: productSemanticColors.textMuted,
                fontSize: typeScale.caption.fontSize,
                lineHeight: `${typeScale.caption.lineHeight}px`,
              }}
            >
              Технические параметры пока не заполнены.
            </p>
          )
        ) : null}
      </Card>
    </Card>
  );
}

const rideLabelStyle = {
  color: productSemanticColors.textPrimary,
  fontWeight: Number(typeScale.bodyStrong.weight),
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="subtle" padding="sm">
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
          fontSize: typeScale.caption.fontSize,
          lineHeight: `${typeScale.caption.lineHeight}px`,
          fontWeight: Number(typeScale.bodyStrong.weight),
        }}
      >
        {value}
      </div>
    </Card>
  );
}
