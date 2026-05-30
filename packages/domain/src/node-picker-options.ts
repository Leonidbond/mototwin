import type { NodeTreeItem, TopServiceNodeItem } from "@mototwin/types";
import {
  flattenNodeTreeToSelectOptions,
  findNodeTreeItemById,
  resolveNodePickerPathLabelRu,
  type CatalogPathNode,
} from "./node-tree";
import {
  filterLeafOptionsUnderTopNodeAncestors,
  getOrderedTopNodeIdsPresentInNodeTree,
} from "./picker-top-nodes";

export type NodePickerOptionRow = {
  id: string;
  code: string;
  name: string;
  level?: number;
  pathLabel?: string;
  planLocked?: boolean;
};

export function buildLeafNodePickerOptionsFromVehicleTree(
  nodeTree: NodeTreeItem[],
  catalogNodes: CatalogPathNode[]
): NodePickerOptionRow[] {
  return flattenNodeTreeToSelectOptions(nodeTree)
    .filter((option) => !option.hasChildren)
    .map((option) => {
      const raw = findNodeTreeItemById(nodeTree, option.id);
      const planLocked = raw?.locked === true;
      return {
        id: option.id,
        code: option.code,
        name: option.name,
        level: option.level,
        pathLabel: resolveNodePickerPathLabelRu(nodeTree, catalogNodes, option.id),
        planLocked: planLocked || undefined,
      };
    });
}

export function buildRestrictedPlanVehicleLeafPickerSets(params: {
  nodeTree: NodeTreeItem[];
  catalogNodes: CatalogPathNode[];
  topServiceNodes: TopServiceNodeItem[];
  canSelectChildNode: boolean;
}): {
  allLeaves: NodePickerOptionRow[];
  topLeaves: NodePickerOptionRow[];
  selectableLeaves: NodePickerOptionRow[];
  showTopToggle: boolean;
  hasPlanLockedLeaves: boolean;
} {
  const allLeaves = buildLeafNodePickerOptionsFromVehicleTree(
    params.nodeTree,
    params.catalogNodes
  );
  const topIds = getOrderedTopNodeIdsPresentInNodeTree(params.nodeTree, params.topServiceNodes);
  let topLeaves = filterLeafOptionsUnderTopNodeAncestors(
    params.nodeTree,
    allLeaves,
    topIds
  ) as NodePickerOptionRow[];
  if (topLeaves.length === 0 && !params.canSelectChildNode && allLeaves.length > 0) {
    topLeaves = allLeaves.filter((leaf) => !leaf.planLocked);
  }
  const selectableLeaves = params.canSelectChildNode ? allLeaves : topLeaves;
  const hasPlanLockedLeaves = allLeaves.some((leaf) => leaf.planLocked);
  const showTopToggle =
    !params.canSelectChildNode &&
    allLeaves.length > 0 &&
    topLeaves.length > 0 &&
    hasPlanLockedLeaves;

  return {
    allLeaves,
    topLeaves,
    selectableLeaves,
    showTopToggle,
    hasPlanLockedLeaves,
  };
}
