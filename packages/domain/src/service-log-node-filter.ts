import type { NodeTreeItem, ServiceEventItem, ServiceLogNodeFilter } from "@mototwin/types";

/** All leaf node ids under `node` (excluding `node` itself). */
export function getDescendantLeafNodeIds(node: NodeTreeItem): string[] {
  if (node.children.length === 0) {
    return [];
  }
  const out: string[] = [];
  for (const child of node.children) {
    if (child.children.length === 0) {
      out.push(child.id);
    } else {
      out.push(...getDescendantLeafNodeIds(child));
    }
  }
  return out;
}

/** `node.id` plus every descendant id at any depth (full subtree). */
export function getNodeAndDescendantIds(node: NodeTreeItem): string[] {
  return [node.id, ...node.children.flatMap((c) => getNodeAndDescendantIds(c))];
}

/**
 * Leaf: only that node id. Parent: that id plus all descendant leaf ids (covers legacy events
 * attached directly to the parent node).
 */
export function createServiceLogNodeFilter(node: NodeTreeItem): ServiceLogNodeFilter {
  const leafIds = getDescendantLeafNodeIds(node);
  const nodeIds =
    leafIds.length > 0 ? [...new Set([node.id, ...leafIds])] : [node.id];
  return {
    nodeIds,
    displayLabel: node.name,
  };
}

export function applyServiceLogNodeFilter(
  serviceEvents: ServiceEventItem[],
  filter: Pick<ServiceLogNodeFilter, "nodeIds">
): ServiceEventItem[] {
  if (!filter.nodeIds.length) {
    return serviceEvents;
  }
  const allowed = new Set(filter.nodeIds);
  return serviceEvents.filter((e) => allowed.has(e.nodeId));
}
