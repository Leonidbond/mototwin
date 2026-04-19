import type {
  NodeTreeSearchActionViewModel,
  NodeTreeSearchOptions,
  NodeTreeSearchResultViewModel,
} from "@mototwin/types";

type SearchableNode = {
  id: string;
  name: string;
  code: string;
  children: SearchableNode[];
  effectiveStatus: NodeTreeSearchResultViewModel["effectiveStatus"];
  statusLabel: NodeTreeSearchResultViewModel["statusLabel"];
  shortExplanationLabel: NodeTreeSearchResultViewModel["shortExplanationLabel"];
};

function normalizeSearchText(input: string): string {
  return input.trim().toLocaleLowerCase("ru");
}

function collectPathNodes(
  nodes: SearchableNode[],
  targetNodeId: string,
  path: SearchableNode[] = []
): SearchableNode[] | null {
  for (const node of nodes) {
    const nextPath = [...path, node];
    if (node.id === targetNodeId) {
      return nextPath;
    }
    const nested = collectPathNodes(node.children, targetNodeId, nextPath);
    if (nested) {
      return nested;
    }
  }
  return null;
}

export function buildNodePathLabel(pathNames: string[]): string {
  return pathNames.join(" → ");
}

export function getTopLevelAncestorForNode(
  nodes: SearchableNode[],
  targetNodeId: string
): SearchableNode | null {
  const path = collectPathNodes(nodes, targetNodeId);
  return path?.[0] ?? null;
}

export function getAncestorIdsForNode(nodes: SearchableNode[], targetNodeId: string): string[] {
  const path = collectPathNodes(nodes, targetNodeId);
  if (!path || path.length <= 1) {
    return [];
  }
  return path.slice(0, -1).map((node) => node.id);
}

function hasChildren(node: SearchableNode): boolean {
  return node.children.length > 0;
}

function matchScore(node: SearchableNode, queryNormalized: string): number {
  const name = normalizeSearchText(node.name);
  const code = normalizeSearchText(node.code);
  const exactName = name === queryNormalized ? 200 : 0;
  const exactCode = code === queryNormalized ? 180 : 0;
  const nameStarts = name.startsWith(queryNormalized) ? 120 : 0;
  const codeStarts = code.startsWith(queryNormalized) ? 100 : 0;
  const nameIncludes = name.includes(queryNormalized) ? 70 : 0;
  const codeIncludes = code.includes(queryNormalized) ? 60 : 0;
  return exactName + exactCode + nameStarts + codeStarts + nameIncludes + codeIncludes;
}

export function searchNodeTree(
  nodes: SearchableNode[],
  options: NodeTreeSearchOptions
): NodeTreeSearchResultViewModel[] {
  const queryNormalized = normalizeSearchText(options.query);
  const limit = options.limit ?? 10;
  const minQueryLength = options.minQueryLength ?? 2;
  if (queryNormalized.length < minQueryLength) {
    return [];
  }

  const rows: Array<NodeTreeSearchResultViewModel & { _score: number; _depth: number }> = [];
  const stack: Array<{ node: SearchableNode; path: SearchableNode[] }> = nodes.map((node) => ({
    node,
    path: [node],
  }));

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const { node, path } = current;
    const score = matchScore(node, queryNormalized);
    if (score > 0) {
      rows.push({
        nodeId: node.id,
        topLevelNodeId: path[0]?.id ?? node.id,
        nodeName: node.name,
        nodeCode: node.code,
        pathLabel: buildNodePathLabel(path.map((p) => p.name)),
        effectiveStatus: node.effectiveStatus,
        statusLabel: node.statusLabel,
        shortExplanationLabel: node.shortExplanationLabel,
        isLeaf: !hasChildren(node),
        ancestorIds: path.slice(0, -1).map((p) => p.id),
        _score: score,
        _depth: path.length,
      });
    }
    for (const child of node.children) {
      stack.push({ node: child, path: [...path, child] });
    }
  }

  return rows
    .sort((a, b) => {
      const byLeaf = Number(b.isLeaf) - Number(a.isLeaf);
      if (byLeaf !== 0) return byLeaf;
      if (b._score !== a._score) return b._score - a._score;
      if (a._depth !== b._depth) return a._depth - b._depth;
      return a.pathLabel.localeCompare(b.pathLabel, "ru");
    })
    .slice(0, limit)
    .map((item) => ({
      nodeId: item.nodeId,
      topLevelNodeId: item.topLevelNodeId,
      nodeName: item.nodeName,
      nodeCode: item.nodeCode,
      pathLabel: item.pathLabel,
      effectiveStatus: item.effectiveStatus,
      statusLabel: item.statusLabel,
      shortExplanationLabel: item.shortExplanationLabel,
      isLeaf: item.isLeaf,
      ancestorIds: item.ancestorIds,
    }));
}

export function isNodeSearchBuyActionAvailable(result: NodeTreeSearchResultViewModel): boolean {
  return result.isLeaf;
}

export function buildNodeSearchResultActions(
  result: NodeTreeSearchResultViewModel
): NodeTreeSearchActionViewModel[] {
  const actions: NodeTreeSearchActionViewModel[] = [
    { key: "open", label: "Открыть" },
    { key: "service_log", label: "Журнал" },
  ];

  if (isNodeSearchBuyActionAvailable(result)) {
    actions.push({ key: "buy", label: "Купить" });
  }

  return actions;
}
