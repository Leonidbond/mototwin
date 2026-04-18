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
export function buildNodeTreeItemViewModel(node: NodeTreeItem): NodeTreeItemViewModel {
  const hasChildren = node.children.length > 0;
  const effective = node.effectiveStatus;
  const leaf = !hasChildren;

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
    canAddServiceEvent: leaf,
    children: node.children.map(buildNodeTreeItemViewModel),
    statusExplanation: node.statusExplanation,
    actions: { addServiceEventAvailable: leaf },
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
