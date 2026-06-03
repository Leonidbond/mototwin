import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { resolveGarageAttentionIconKey, type GarageAttentionIconKey } from "@mototwin/domain";
import { Card } from "@/components/ui";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { GarageVehicleItem } from "@mototwin/types";
import brakesIcon from "../../../../images/top-node-icons-dark/brakes/brakes_front_pads.png";
import engineCoolingIcon from "../../../../images/top-node-icons-dark/engine_cooling/engine_cooling.png";
import tiresIcon from "../../../../images/top-node-icons-dark/tires/tires_rear.png";
import chainSprocketsIcon from "../../../../images/top-node-icons-dark/chain_sprockets/chain_sprockets.png";
import lubricationIcon from "../../../../images/top-node-icons-dark/lubrication/lubrication.png";
import suspensionIcon from "../../../../images/top-node-icons-dark/suspension/suspension.png";
import brakesFrontPadsIcon from "../../../../images/top-node-icons-dark/brakes/brakes_front_pads.png";
import tiresRearIcon from "../../../../images/top-node-icons-dark/tires/tires_rear.png";

const TASK_ICONS: Record<GarageAttentionIconKey, typeof brakesIcon> = {
  brakes: brakesIcon,
  brakes_front_pads: brakesFrontPadsIcon,
  chain_sprockets: chainSprocketsIcon,
  engine_cooling: engineCoolingIcon,
  lubrication: lubricationIcon,
  suspension: suspensionIcon,
  tires: tiresIcon,
  tires_rear: tiresRearIcon,
};

type TaskItem = {
  key: string;
  icon: GarageAttentionIconKey;
  caption: string;
  title: string;
  meta: string;
  metaTone: "muted" | "danger";
};

export function GarageTasksStrip(props: { vehicles: GarageVehicleItem[] }) {
  const serviceLogVehicle =
    props.vehicles.find((v) => (v.attentionSummary?.totalCount ?? 0) > 0) ?? props.vehicles[0];
  const serviceLogHref = serviceLogVehicle
    ? `/vehicles/${serviceLogVehicle.id}/service-log`
    : null;

  const items: TaskItem[] = props.vehicles.slice(0, 3).map((vehicle) => {
    const preview = vehicle.attentionSummary?.items?.[0];
    const vehicleLabel =
      vehicle.nickname?.trim() ||
      `${vehicle.motorcycleBrand.name} ${vehicle.motorcycleModelFamily.name}`;

    if (preview) {
      return {
        key: `${vehicle.id}-${preview.nodeId}`,
        icon: resolveGarageAttentionIconKey(preview.code),
        caption: vehicleLabel,
        title: preview.name,
        meta: preview.subtitle || preview.statusLabelRu,
        metaTone: preview.effectiveStatus === "OVERDUE" ? "danger" : "muted",
      };
    }

    const overdueCount = vehicle.attentionSummary?.overdueCount ?? 0;
    const soonCount = vehicle.attentionSummary?.soonCount ?? 0;
    if (overdueCount > 0 || soonCount > 0) {
      return {
        key: vehicle.id,
        icon: "lubrication" as GarageAttentionIconKey,
        caption: vehicleLabel,
        title: "Требует внимания",
        meta:
          overdueCount > 0
            ? `${overdueCount} просрочено`
            : `${soonCount} скоро потребует ТО`,
        metaTone: overdueCount > 0 ? "danger" : "muted",
      };
    }

    return {
      key: vehicle.id,
      icon: "lubrication" as GarageAttentionIconKey,
      caption: vehicleLabel,
      title: "Все в порядке",
      meta: "Нет просроченных задач",
      metaTone: "muted",
    };
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <Card variant="muted" padding="sm">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <h3 style={titleStyle}>Ближайшие задачи</h3>
        {serviceLogHref ? (
          <Link href={serviceLogHref} className="no-underline" style={linkStyle}>
            Смотреть все задачи <span aria-hidden>›</span>
          </Link>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gap: 0,
          gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        }}
      >
        {items.map((item, idx) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 12px",
              borderRight:
                idx === items.length - 1
                  ? "none"
                  : `1px solid ${productSemanticColors.border}`,
            }}
          >
            <Image
              src={TASK_ICONS[item.icon]}
              alt=""
              width={36}
              height={36}
              style={{
                width: 36,
                height: 36,
                objectFit: "contain",
                filter:
                  item.metaTone === "danger"
                    ? "drop-shadow(0 0 6px #F04F47)"
                    : "drop-shadow(0 0 6px #F6C453)",
                flex: "0 0 auto",
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={captionStyle}>{item.caption}</div>
              <div style={taskTitleStyle}>{item.title}</div>
              <div style={item.metaTone === "danger" ? dangerStyle : mutedStyle}>
                {item.meta}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const titleStyle: CSSProperties = {
  color: productSemanticColors.textPrimary,
  fontSize: 15,
  fontWeight: 700,
};

const linkStyle: CSSProperties = {
  color: productSemanticColors.primaryAction,
  fontSize: 13,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const captionStyle: CSSProperties = {
  color: productSemanticColors.textMuted,
  fontSize: 11,
  letterSpacing: 0.3,
};

const taskTitleStyle: CSSProperties = {
  color: productSemanticColors.textPrimary,
  fontSize: 14,
  fontWeight: 600,
  marginTop: 1,
};

const mutedStyle: CSSProperties = {
  color: productSemanticColors.textMuted,
  fontSize: 12,
  marginTop: 2,
};

const dangerStyle: CSSProperties = {
  color: "#F04F47",
  fontSize: 12,
  fontWeight: 600,
  marginTop: 2,
};

type GarageTasksStripProps = Parameters<typeof GarageTasksStrip>[0];
export type { GarageTasksStripProps };
