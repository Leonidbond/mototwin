import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Card } from "@/components/ui";
import { productSemanticColors } from "@mototwin/design-tokens";
import type { GarageVehicleItem } from "@mototwin/types";
import brakesIcon from "../../../../images/top-node-icons/from-cards/brakes.png";
import engineCoolingIcon from "../../../../images/top-node-icons/from-cards/engine_cooling.png";
import tiresIcon from "../../../../images/top-node-icons/from-cards/tires.png";

type TaskIconKind = "brake" | "engine" | "tire";

const TASK_ICONS = {
  brake: brakesIcon,
  engine: engineCoolingIcon,
  tire: tiresIcon,
} as const;

type TaskItem = {
  key: string;
  icon: TaskIconKind;
  caption: string;
  title: string;
  meta: string;
  metaTone: "muted" | "danger";
};

const ICON_CYCLE: TaskIconKind[] = ["brake", "engine", "tire"];

export function GarageTasksStrip(props: { vehicles: GarageVehicleItem[] }) {
  const items: TaskItem[] = props.vehicles.slice(0, 3).map((vehicle, index) => {
    const overdueCount = vehicle.attentionSummary?.overdueCount ?? 0;
    const soonCount = vehicle.attentionSummary?.soonCount ?? 0;
    const icon = ICON_CYCLE[index % ICON_CYCLE.length];

    if (overdueCount > 0) {
      return {
        key: vehicle.id,
        icon,
        caption: iconCaption(icon),
        title: iconDefaultTitle(icon),
        meta: "Просрочено",
        metaTone: "danger",
      };
    }
    if (soonCount > 0) {
      return {
        key: vehicle.id,
        icon,
        caption: iconCaption(icon),
        title: iconDefaultTitle(icon),
        meta: "через 450 км",
        metaTone: "muted",
      };
    }
    return {
      key: vehicle.id,
      icon,
      caption: iconCaption(icon),
      title: "Все в порядке",
      meta: "ближайшее ТО через 1 200 км",
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
        <Link href="/service-log" className="no-underline" style={linkStyle}>
          Смотреть все задачи <span aria-hidden>›</span>
        </Link>
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
              style={{ width: 36, height: 36, objectFit: "contain", flex: "0 0 auto" }}
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

function iconCaption(kind: TaskIconKind): string {
  if (kind === "brake") return "Тормоза";
  if (kind === "engine") return "Двигатель";
  return "Шины";
}

function iconDefaultTitle(kind: TaskIconKind): string {
  if (kind === "brake") return "Проверить колодки";
  if (kind === "engine") return "Замена масла";
  return "Задняя шина";
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
