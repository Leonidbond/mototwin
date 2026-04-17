import type { NodeStatus } from "@mototwin/types";

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
  switch (status) {
    case "OVERDUE":
      return "Просрочено";
    case "SOON":
      return "Скоро";
    case "OK":
      return "ОК";
    case "RECENTLY_REPLACED":
      return "Недавно заменено";
    default:
      return status;
  }
}

export function getTopNodeStatusBadgeLabel(status: NodeStatus): string {
  switch (status) {
    case "OK":
      return "OK";
    case "SOON":
      return "Soon";
    case "OVERDUE":
      return "Overdue";
    case "RECENTLY_REPLACED":
      return "Recently replaced";
    default:
      return status;
  }
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
