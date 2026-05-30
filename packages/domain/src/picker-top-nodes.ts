import type { NodeTreeItem, TopServiceNodeItem } from "@mototwin/types";
import { findNodePathById, findNodeTreeItemByCode, findNodeTreeItemById } from "./node-tree";
import { buildTopNodeOverviewCards } from "./top-node-overview";

/** Same cap as «Топ-узлы» on the vehicle node tree (web + Expo). */
export const PICKER_MODAL_TOP_NODES_LIMIT = 15;

/**
 * Ordered ids of curated top service nodes that exist in `nodeTree`, up to `limit`
 * (same source order as «Состояния узлов» overview cards).
 */
export function getOrderedTopNodeIdsPresentInNodeTree(
  nodeTree: NodeTreeItem[],
  topServiceNodes: TopServiceNodeItem[],
  limit = PICKER_MODAL_TOP_NODES_LIMIT
): string[] {
  const cards = buildTopNodeOverviewCards(topServiceNodes, new Map());
  const orderedCatalogNodes = cards.flatMap((card) => card.nodes);
  const codeByCatalogId = new Map(topServiceNodes.map((node) => [node.id, node.code]));

  const resolved: string[] = [];
  const seen = new Set<string>();

  for (const catalogNode of orderedCatalogNodes) {
    if (resolved.length >= limit) {
      break;
    }
    const byId = findNodeTreeItemById(nodeTree, catalogNode.id);
    const code = catalogNode.code || codeByCatalogId.get(catalogNode.id);
    const inTree = byId ?? (code ? findNodeTreeItemByCode(nodeTree, code) : null);
    if (!inTree || seen.has(inTree.id)) {
      continue;
    }
    seen.add(inTree.id);
    resolved.push(inTree.id);
  }

  return resolved;
}

type HasId = { id: string };

/**
 * Keeps leaf options whose path from root intersects `topAncestorIdsOrdered`
 * (ancestor or self). Sorts by earliest top-id in that order, then stable within ties.
 */
export function filterLeafOptionsUnderTopNodeAncestors<T extends HasId>(
  nodeTree: NodeTreeItem[],
  leafOptions: T[],
  topAncestorIdsOrdered: string[]
): T[] {
  if (!topAncestorIdsOrdered.length) {
    return [];
  }
  const ancestorsSet = new Set(topAncestorIdsOrdered);
  const rank = new Map(topAncestorIdsOrdered.map((id, i) => [id, i]));

  const scored = leafOptions.map((opt) => {
    const path = findNodePathById(nodeTree, opt.id);
    if (!path?.length) {
      return { opt, minRank: Number.POSITIVE_INFINITY };
    }
    let minRank = Number.POSITIVE_INFINITY;
    for (const pathId of path) {
      if (ancestorsSet.has(pathId)) {
        const r = rank.get(pathId);
        if (r !== undefined && r < minRank) {
          minRank = r;
        }
      }
    }
    return { opt, minRank };
  });

  const originalIndex = new Map(leafOptions.map((opt, i) => [opt, i]));

  return scored
    .filter((x) => Number.isFinite(x.minRank))
    .sort((a, b) => {
      if (a.minRank !== b.minRank) {
        return a.minRank - b.minRank;
      }
      return (originalIndex.get(a.opt) ?? 0) - (originalIndex.get(b.opt) ?? 0);
    })
    .map((x) => x.opt);
}
