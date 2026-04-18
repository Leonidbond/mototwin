import type {
  FlattenedNodeSelectOption,
  NodeTreeItem,
  SelectedNodePath,
} from "@mototwin/types";

export function flattenNodeTreeToSelectOptions(
  nodes: NodeTreeItem[],
  parentId: string | null = null,
  path: SelectedNodePath = []
): FlattenedNodeSelectOption[] {
  return nodes.flatMap((node) => {
    const nextPath = [...path, node.id];
    const current: FlattenedNodeSelectOption = {
      id: node.id,
      parentId,
      name: node.name,
      level: node.level,
      hasChildren: node.children.length > 0,
      path: nextPath,
    };

    return [
      current,
      ...flattenNodeTreeToSelectOptions(node.children, node.id, nextPath),
    ];
  });
}

export function findNodeTreeItemById(
  nodes: NodeTreeItem[],
  targetNodeId: string
): NodeTreeItem | null {
  for (const node of nodes) {
    if (node.id === targetNodeId) {
      return node;
    }
    const found = findNodeTreeItemById(node.children, targetNodeId);
    if (found) {
      return found;
    }
  }
  return null;
}

export function findNodePathById(
  nodes: NodeTreeItem[],
  targetNodeId: string,
  path: SelectedNodePath = []
): SelectedNodePath | null {
  for (const node of nodes) {
    const nextPath = [...path, node.id];

    if (node.id === targetNodeId) {
      return nextPath;
    }

    if (node.children.length > 0) {
      const result = findNodePathById(node.children, targetNodeId, nextPath);
      if (result) {
        return result;
      }
    }
  }

  return null;
}

export function getNodeSelectLevels(
  nodes: NodeTreeItem[],
  selectedPath: SelectedNodePath
): NodeTreeItem[][] {
  const levels: NodeTreeItem[][] = [];
  let currentLevelNodes = nodes;
  let levelIndex = 0;

  while (currentLevelNodes.length > 0) {
    levels.push(currentLevelNodes);
    const selectedNodeId = selectedPath[levelIndex];

    if (!selectedNodeId) {
      break;
    }

    const selectedNode = currentLevelNodes.find((node) => node.id === selectedNodeId);

    if (!selectedNode || selectedNode.children.length === 0) {
      break;
    }

    currentLevelNodes = selectedNode.children;
    levelIndex += 1;
  }

  return levels;
}

export function getAvailableChildrenForSelectedPath(
  nodes: NodeTreeItem[],
  selectedPath: SelectedNodePath
): NodeTreeItem[] {
  if (selectedPath.length === 0) {
    return nodes;
  }

  let currentLevelNodes = nodes;
  let selectedNode: NodeTreeItem | null = null;

  for (const nodeId of selectedPath) {
    const current = currentLevelNodes.find((node) => node.id === nodeId);

    if (!current) {
      return [];
    }

    selectedNode = current;
    currentLevelNodes = current.children;
  }

  return selectedNode?.children || [];
}

export function getSelectedNodeFromPath(
  nodes: NodeTreeItem[],
  selectedPath: SelectedNodePath
): NodeTreeItem | null {
  let currentLevelNodes = nodes;
  let selectedNode: NodeTreeItem | null = null;

  for (const nodeId of selectedPath) {
    const current = currentLevelNodes.find((node) => node.id === nodeId);

    if (!current) {
      break;
    }

    selectedNode = current;
    currentLevelNodes = current.children;
  }

  return selectedNode;
}

export function getLeafStatusReasonShort(node: NodeTreeItem): string | null {
  if (node.children.length > 0) {
    return null;
  }

  return node.statusExplanation?.reasonShort || null;
}

/** @see findNodePathById */
export const getNodePathById = findNodePathById;

export function isLeafNode(node: Pick<NodeTreeItem, "children">): boolean {
  return node.children.length === 0;
}

export function flattenNodeTreeForSelection(
  nodes: NodeTreeItem[],
  parentId: string | null = null,
  path: SelectedNodePath = []
): FlattenedNodeSelectOption[] {
  return flattenNodeTreeToSelectOptions(nodes, parentId, path);
}

export function getLeafNodeOptions(nodes: NodeTreeItem[]): FlattenedNodeSelectOption[] {
  return flattenNodeTreeToSelectOptions(nodes).filter((option) => !option.hasChildren);
}

export function getTopLevelNodes(nodes: NodeTreeItem[]): NodeTreeItem[] {
  return nodes;
}

export function getProblematicNodes(nodes: NodeTreeItem[]): NodeTreeItem[] {
  const result: NodeTreeItem[] = [];

  function walk(node: NodeTreeItem) {
    const effective = node.effectiveStatus;
    if (effective === "OVERDUE" || effective === "SOON") {
      result.push(node);
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  for (const root of nodes) {
    walk(root);
  }

  return result;
}

export function getNodeShortExplanationLabel(node: NodeTreeItem): string | null {
  return getLeafStatusReasonShort(node);
}

/** `statusExplanation.reasonShort` when the API attached an explanation (any depth). */
export function getNodeTreeItemReasonShortLine(node: NodeTreeItem): string | null {
  return node.statusExplanation?.reasonShort ?? null;
}
