import type {
  NodePathItemViewModel,
  NodeTreeItem,
  NodeTreeItemViewModel,
  SelectedNodePath,
} from "@mototwin/types";
import { getNodePathById, getNodeTreeItemReasonShortLine } from "./node-tree";
import { getNodeStatusLabel, getTopNodeStatusBadgeLabel } from "./status";

/**
 * `effectiveStatus === null` means no maintenance evidence for that node/subtree
 * (API must not send a placeholder OK). UI omits the status badge and must not
 * offer “open service log from status” for that row.
 */
export const NODE_TREE_PLAN_LOCKED_HINT_RU =
  "Для работы со всеми узлами перейдите на тариф Pro.";

export function nodeTreeHasPlanLockedNodes(nodes: NodeTreeItem[]): boolean {
  const stack = [...nodes];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    if (current.locked) return true;
    stack.push(...current.children);
  }
  return false;
}

/** Leaf not restricted by plan, or any descendant leaf that is active. */
function subtreeHasActiveLeaf(node: NodeTreeItem, children: NodeTreeItemViewModel[]): boolean {
  if (children.length === 0) {
    return node.locked !== true;
  }
  return children.some((child) => child.hasActiveLeafInSubtree);
}

export function buildNodeTreeItemViewModel(node: NodeTreeItem): NodeTreeItemViewModel {
  const children = node.children.map(buildNodeTreeItemViewModel);
  const hasChildren = children.length > 0;
  const effective = node.effectiveStatus;
  const leaf = !hasChildren;
  const hasActiveLeafInSubtree = subtreeHasActiveLeaf(node, children);
  /** Dim only when API locked and no active leaf below (ancestors on path to top stay normal). */
  const planLocked = node.locked === true && !hasActiveLeafInSubtree;
  const canAddServiceEvent = leaf && node.locked !== true;

  return {
    id: node.id,
    code: node.code,
    name: node.name,
    level: node.level,
    displayOrder: node.displayOrder,
    status: node.status,
    directStatus: node.directStatus,
    computedStatus: node.computedStatus,
    effectiveStatus: effective,
    statusLabel: effective ? getNodeStatusLabel(effective) : null,
    statusBadgeLabel: effective ? getTopNodeStatusBadgeLabel(effective) : null,
    shortExplanationLabel: getNodeTreeItemReasonShortLine(node),
    hasChildren,
    hasActiveLeafInSubtree,
    canAddServiceEvent,
    planLocked: planLocked || undefined,
    children,
    statusExplanation: node.statusExplanation,
    actions: { addServiceEventAvailable: canAddServiceEvent },
  };
}

export function buildNodeTreeViewModel(nodes: NodeTreeItem[]): NodeTreeItemViewModel[] {
  return nodes.map(buildNodeTreeItemViewModel);
}

export function canOpenNodeStatusExplanationModal(node: NodeTreeItemViewModel): boolean {
  return node.statusExplanation != null;
}

export function getNodePathItemViewModels(
  nodes: NodeTreeItem[],
  path: SelectedNodePath
): NodePathItemViewModel[] | null {
  const result: NodePathItemViewModel[] = [];
  let level = nodes;

  for (const id of path) {
    const node = level.find((n) => n.id === id);
    if (!node) {
      return null;
    }
    result.push({
      id: node.id,
      code: node.code,
      name: node.name,
      level: node.level,
    });
    level = node.children;
  }

  return result;
}

export function getNodePathItemViewModelsByNodeId(
  nodes: NodeTreeItem[],
  targetNodeId: string
): NodePathItemViewModel[] | null {
  const path = getNodePathById(nodes, targetNodeId);
  if (!path) {
    return null;
  }
  return getNodePathItemViewModels(nodes, path);
}
