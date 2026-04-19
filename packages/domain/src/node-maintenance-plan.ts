import type {
  NodeMaintenancePlanSummaryViewModel,
  NodeMaintenancePlanViewModel,
  NodeTreeItemViewModel,
} from "@mototwin/types";

type NodeUsage = NonNullable<NodeTreeItemViewModel["statusExplanation"]>["usage"];
type NodeRule = NonNullable<NodeTreeItemViewModel["statusExplanation"]>["rule"];
type NodeLastService = NonNullable<NodeTreeItemViewModel["statusExplanation"]>["lastService"];

function hasScheduleData(node: NodeTreeItemViewModel): boolean {
  return Boolean(
    node.statusExplanation?.rule || node.statusExplanation?.usage || node.statusExplanation?.lastService
  );
}

function toRuDate(isoDate: string | null | undefined): string | null {
  const raw = isoDate?.trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("ru-RU");
}

function formatIntervals(rule: NodeRule | null): string | null {
  if (!rule) return null;
  const parts: string[] = [];
  if (rule.intervalKm != null) parts.push(`${rule.intervalKm} км`);
  if (rule.intervalHours != null) parts.push(`${rule.intervalHours} ч`);
  if (rule.intervalDays != null) parts.push(`${rule.intervalDays} дн`);
  if (parts.length === 0) return null;
  return `Интервал: ${parts.join(" / ")}`;
}

function formatLastService(lastService: NodeLastService | null): string | null {
  if (!lastService) return null;
  const chunks: string[] = [];
  const date = toRuDate(lastService.eventDate);
  if (date) chunks.push(date);
  if (lastService.odometer != null) chunks.push(`${lastService.odometer} км`);
  if (lastService.engineHours != null) chunks.push(`${lastService.engineHours} ч`);
  if (chunks.length === 0) return null;
  return `Последний сервис: ${chunks.join(" · ")}`;
}

export function getNodeMaintenanceDueText(
  metricLabelRu: string,
  remainingValue: number | null | undefined,
  unitLabelRu: string
): string | null {
  if (remainingValue == null || !Number.isFinite(remainingValue)) {
    return null;
  }
  const rounded = Math.abs(Math.round(remainingValue));
  if (remainingValue < 0) {
    return `${metricLabelRu}: Просрочено на ${rounded} ${unitLabelRu}`;
  }
  if (remainingValue > 0) {
    return `${metricLabelRu}: Осталось ${rounded} ${unitLabelRu}`;
  }
  return `${metricLabelRu}: Срок сейчас`;
}

function buildDueLines(usage: NodeUsage | null): string[] {
  if (!usage) return [];
  return [
    getNodeMaintenanceDueText("Пробег", usage.remainingKm, "км"),
    getNodeMaintenanceDueText("Моточасы", usage.remainingHours, "ч"),
    getNodeMaintenanceDueText("Дни", usage.remainingDays, "дн"),
  ].filter((line): line is string => Boolean(line));
}

export function getNodeMaintenancePlanShortText(node: NodeTreeItemViewModel): string | null {
  const reason = node.shortExplanationLabel?.trim();
  if (reason) return reason;
  if (node.statusLabel && hasScheduleData(node)) {
    return node.statusLabel;
  }
  return null;
}

export function buildNodeMaintenancePlanSummary(
  node: NodeTreeItemViewModel
): NodeMaintenancePlanSummaryViewModel | null {
  if (!node.hasChildren) {
    return null;
  }

  let overdueCount = 0;
  let soonCount = 0;
  let scheduledLeafCount = 0;
  const stack = [...node.children];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    if (current.hasChildren) {
      stack.push(...current.children);
      continue;
    }
    if (!hasScheduleData(current)) {
      continue;
    }
    scheduledLeafCount += 1;
    if (current.effectiveStatus === "OVERDUE") overdueCount += 1;
    if (current.effectiveStatus === "SOON") soonCount += 1;
  }

  if (scheduledLeafCount === 0) {
    return null;
  }

  return {
    overdueCount,
    soonCount,
    plannedLaterCount: Math.max(0, scheduledLeafCount - overdueCount - soonCount),
    scheduledLeafCount,
  };
}

export function buildNodeMaintenancePlanViewModel(
  node: NodeTreeItemViewModel
): NodeMaintenancePlanViewModel | null {
  const parentSummary = buildNodeMaintenancePlanSummary(node);
  const shortText = getNodeMaintenancePlanShortText(node);
  const dueLines = buildDueLines(node.statusExplanation?.usage ?? null);
  const lastServiceLine = formatLastService(node.statusExplanation?.lastService ?? null);
  const ruleIntervalLine = formatIntervals(node.statusExplanation?.rule ?? null);
  const hasMeaningfulData = Boolean(
    shortText || dueLines.length > 0 || lastServiceLine || ruleIntervalLine || parentSummary
  );

  if (!hasMeaningfulData) {
    return null;
  }

  return {
    nodeId: node.id,
    shortText,
    dueLines,
    lastServiceLine,
    ruleIntervalLine,
    parentSummary,
    hasMeaningfulData,
  };
}
