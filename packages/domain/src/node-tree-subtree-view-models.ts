import type {
  NodeSubtreeModalViewModel,
  NodeTreeItemViewModel,
  TopLevelNodeSummaryViewModel,
} from "@mototwin/types";
import { buildNodeMaintenancePlanViewModel } from "./node-maintenance-plan";

function summarizeMaintenanceLine(node: NodeTreeItemViewModel): string | null {
  const summary = buildNodeMaintenancePlanViewModel(node)?.parentSummary;
  if (!summary) {
    return null;
  }
  const parts: string[] = [];
  if (summary.overdueCount > 0) parts.push(`Просрочено: ${summary.overdueCount}`);
  if (summary.soonCount > 0) parts.push(`Скоро: ${summary.soonCount}`);
  if (summary.plannedLaterCount > 0) parts.push(`Запланировано: ${summary.plannedLaterCount}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function buildTopLevelNodeSummaryViewModel(
  node: NodeTreeItemViewModel,
  options?: { maintenanceModeEnabled?: boolean }
): TopLevelNodeSummaryViewModel {
  const maintenanceModeEnabled = Boolean(options?.maintenanceModeEnabled);
  return {
    nodeId: node.id,
    nodeName: node.name,
    effectiveStatus: node.effectiveStatus,
    statusLabel: node.statusLabel,
    shortExplanationLabel: node.shortExplanationLabel,
    maintenanceSummaryLine: maintenanceModeEnabled ? summarizeMaintenanceLine(node) : null,
  };
}

export function buildNodeSubtreeModalViewModel(
  node: NodeTreeItemViewModel,
  options?: { maintenanceModeEnabled?: boolean }
): NodeSubtreeModalViewModel {
  const maintenanceModeEnabled = Boolean(options?.maintenanceModeEnabled);
  return {
    rootNodeId: node.id,
    rootNodeName: node.name,
    effectiveStatus: node.effectiveStatus,
    statusLabel: node.statusLabel,
    shortExplanationLabel: node.shortExplanationLabel,
    maintenanceSummaryLine: maintenanceModeEnabled ? summarizeMaintenanceLine(node) : null,
    childNodes: node.children,
    isLeafRoot: !node.hasChildren,
  };
}
