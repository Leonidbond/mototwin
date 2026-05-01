import type {
  AttentionActionSeverity,
  AttentionActionViewModel,
  AttentionEffectiveStatus,
  AttentionItemViewModel,
  AttentionSnoozeFilter,
  AttentionStatusGroupViewModel,
  AttentionSummaryViewModel,
  NodeTreeItem,
  StatusSemanticKey,
} from "@mototwin/types";
import { isNodeSnoozed } from "./node-snooze";
import { getNodeStatusLabel } from "./status";
import {
  getNodeTreeItemReasonShortLine,
  isLeafNode,
} from "./node-tree";
import { getNodeTightUiDisplayName } from "./node-tight-ui-name";

function isAttentionEffective(
  s: NodeTreeItem["effectiveStatus"]
): s is "OVERDUE" | "SOON" {
  return s === "OVERDUE" || s === "SOON";
}

/** Any descendant (recursive) has OVERDUE or SOON. */
function subtreeHasAttentionDescendant(node: NodeTreeItem): boolean {
  for (const c of node.children) {
    if (isAttentionEffective(c.effectiveStatus)) {
      return true;
    }
    if (subtreeHasAttentionDescendant(c)) {
      return true;
    }
  }
  return false;
}

type CollectedAttentionNode = {
  node: NodeTreeItem;
  topLevelRootName: string;
};

function collectAttentionNodesInner(
  node: NodeTreeItem,
  topLevelRootName: string,
  out: CollectedAttentionNode[]
): void {
  if (!isAttentionEffective(node.effectiveStatus)) {
    for (const c of node.children) {
      collectAttentionNodesInner(c, topLevelRootName, out);
    }
    return;
  }

  if (isLeafNode(node)) {
    out.push({ node, topLevelRootName });
    return;
  }

  if (subtreeHasAttentionDescendant(node)) {
    for (const c of node.children) {
      collectAttentionNodesInner(c, topLevelRootName, out);
    }
    return;
  }

  out.push({ node, topLevelRootName });
}

/**
 * Problematic nodes for the attention list: prefers leaves; skips a parent when a descendant
 * already carries OVERDUE/SOON (more specific row).
 */
export function getAttentionNodesFromNodeTree(roots: NodeTreeItem[]): CollectedAttentionNode[] {
  const out: CollectedAttentionNode[] = [];
  for (const root of roots) {
    collectAttentionNodesInner(root, root.name, out);
  }
  return out;
}

function mapCollectedToItem(entry: CollectedAttentionNode): AttentionItemViewModel {
  const { node, topLevelRootName } = entry;
  const effective = node.effectiveStatus;
  if (!isAttentionEffective(effective)) {
    throw new Error("Attention item must have OVERDUE or SOON");
  }

  const topLevelParentName =
    node.name === topLevelRootName ? null : topLevelRootName;

  return {
    nodeId: node.id,
    code: node.code,
    name: getNodeTightUiDisplayName(node.code, node.name),
    topLevelParentName,
    effectiveStatus: effective,
    statusLabelRu: getNodeStatusLabel(effective),
    shortExplanation: getNodeTreeItemReasonShortLine(node),
    canAddServiceEvent: isLeafNode(node),
    canOpenStatusExplanation: node.statusExplanation != null,
  };
}

export function getAttentionItemsFromNodeTree(roots: NodeTreeItem[]): AttentionItemViewModel[] {
  return getAttentionNodesFromNodeTree(roots).map(mapCollectedToItem);
}

export function sortAttentionItemsByPriority(
  items: AttentionItemViewModel[]
): AttentionItemViewModel[] {
  const overdue = items.filter((i) => i.effectiveStatus === "OVERDUE");
  const soon = items.filter((i) => i.effectiveStatus === "SOON");
  return [...overdue, ...soon];
}

export function getAttentionSnoozeFilterLabel(filter: AttentionSnoozeFilter): string {
  if (filter === "unsnoozed") {
    return "Без отложенных";
  }
  if (filter === "snoozed") {
    return "Только отложенные";
  }
  return "Все";
}

export function filterAttentionItemsBySnooze(
  items: AttentionItemViewModel[],
  filter: AttentionSnoozeFilter,
  getSnoozeUntilByNodeId: (nodeId: string) => string | null | undefined,
  currentDate?: Date | string
): AttentionItemViewModel[] {
  if (filter === "all") {
    return items;
  }
  const shouldIncludeSnoozed = filter === "snoozed";
  return items.filter((item) => {
    const isSnoozed = isNodeSnoozed(getSnoozeUntilByNodeId(item.nodeId), currentDate);
    return shouldIncludeSnoozed ? isSnoozed : !isSnoozed;
  });
}

export function groupAttentionItemsByStatus(
  items: AttentionItemViewModel[]
): AttentionStatusGroupViewModel[] {
  const sorted = sortAttentionItemsByPriority(items);
  const overdue = sorted.filter((i) => i.effectiveStatus === "OVERDUE");
  const soon = sorted.filter((i) => i.effectiveStatus === "SOON");
  const groups: AttentionStatusGroupViewModel[] = [];
  if (overdue.length > 0) {
    groups.push({
      status: "OVERDUE",
      sectionTitleRu: "Просрочено",
      items: overdue,
    });
  }
  if (soon.length > 0) {
    groups.push({
      status: "SOON",
      sectionTitleRu: "Скоро",
      items: soon,
    });
  }
  return groups;
}

/**
 * Worst attention status among items: OVERDUE beats SOON; empty tree → null.
 * Aligns with {@link getAttentionActionSeverity} / {@link buildAttentionActionViewModel}.
 */
export function getWorstAttentionStatus(
  summary: Pick<AttentionSummaryViewModel, "overdueCount" | "soonCount" | "totalCount">
): AttentionEffectiveStatus | null {
  if (summary.totalCount === 0) {
    return null;
  }
  if (summary.overdueCount > 0) {
    return "OVERDUE";
  }
  return "SOON";
}

/** Severity for coloring the «Требует внимания» control (neutral when nothing to show). */
export function getAttentionActionSeverity(
  summary: Pick<AttentionSummaryViewModel, "overdueCount" | "soonCount" | "totalCount">
): AttentionActionSeverity {
  if (summary.totalCount === 0) {
    return "neutral";
  }
  if (summary.overdueCount > 0) {
    return "OVERDUE";
  }
  return "SOON";
}

export function buildAttentionActionViewModel(
  summary: Pick<AttentionSummaryViewModel, "totalCount" | "overdueCount" | "soonCount">
): AttentionActionViewModel {
  const severity = getAttentionActionSeverity(summary);
  const semanticKey: StatusSemanticKey =
    severity === "neutral" ? "UNKNOWN" : severity;
  return {
    severity,
    totalCount: summary.totalCount,
    semanticKey,
  };
}

export function buildAttentionSummaryFromNodeTree(
  roots: NodeTreeItem[]
): AttentionSummaryViewModel {
  const items = sortAttentionItemsByPriority(getAttentionItemsFromNodeTree(roots));
  const overdueItems = items.filter((i) => i.effectiveStatus === "OVERDUE");
  const soonItems = items.filter((i) => i.effectiveStatus === "SOON");
  return {
    totalCount: items.length,
    overdueCount: overdueItems.length,
    soonCount: soonItems.length,
    items,
    overdueItems,
    soonItems,
    groups: groupAttentionItemsByStatus(items),
  };
}
