import type { NodeTreeItem, TopServiceNodeItem } from "@mototwin/types";
import { findNodePathById, findNodeTreeItemById } from "./node-tree";
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
  const ordered = cards.flatMap((card) => card.nodes.map((node) => node.id));
  return ordered
    .filter((id) => findNodeTreeItemById(nodeTree, id) != null)
    .slice(0, limit);
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
