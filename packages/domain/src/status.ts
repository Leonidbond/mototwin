import type { NodeStatus } from "@mototwin/types";
import { statusBadgeLabelsEn, statusTextLabelsRu } from "@mototwin/design-tokens";

const STATUS_PRIORITY: Record<NodeStatus, number> = {
  OVERDUE: 4,
  SOON: 3,
  OK: 2,
  RECENTLY_REPLACED: 1,
};

export function getNodeStatusPriority(status: NodeStatus): number {
  return STATUS_PRIORITY[status];
}

export function compareNodeStatuses(
  left: NodeStatus,
  right: NodeStatus
): number {
  return getNodeStatusPriority(right) - getNodeStatusPriority(left);
}

export function getNodeStatusLabel(status: NodeStatus): string {
  return statusTextLabelsRu[status] ?? status;
}

export function getTopNodeStatusBadgeLabel(status: NodeStatus): string {
  return statusBadgeLabelsEn[status] ?? status;
}

export function getStatusExplanationTriggeredByLabel(
  triggeredBy: "km" | "hours" | "days" | null
): string {
  switch (triggeredBy) {
    case "km":
      return "Пробег";
    case "hours":
      return "Моточасы";
    case "days":
      return "Время";
    default:
      return "Время";
  }
}
