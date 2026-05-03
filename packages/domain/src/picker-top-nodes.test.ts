import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NodeTreeItem, TopServiceNodeItem } from "@mototwin/types";
import {
  filterLeafOptionsUnderTopNodeAncestors,
  getOrderedTopNodeIdsPresentInNodeTree,
} from "./picker-top-nodes";

function leafTree(
  id: string,
  code: string,
  name: string,
  children: NodeTreeItem[] = []
): NodeTreeItem {
  return {
    id,
    code,
    name,
    level: 0,
    displayOrder: 0,
    status: null,
    directStatus: null,
    computedStatus: null,
    effectiveStatus: null,
    statusExplanation: null,
    note: null,
    updatedAt: null,
    children,
  };
}

describe("picker-top-nodes", () => {
  it("filterLeafOptionsUnderTopNodeAncestors keeps leaves under top ancestors and sorts by top order", () => {
    const tree: NodeTreeItem[] = [
      leafTree("root", "ROOT", "Root", [
        leafTree("mid-a", "A", "Mid A", [leafTree("leaf-a1", "LA1", "Leaf A1")]),
        leafTree("mid-b", "B", "Mid B", [leafTree("leaf-b1", "LB1", "Leaf B1")]),
      ]),
    ];
    const options = [
      { id: "leaf-b1", name: "B1" },
      { id: "leaf-a1", name: "A1" },
      { id: "orphan", name: "X" },
    ];
    const filtered = filterLeafOptionsUnderTopNodeAncestors(tree, options, [
      "mid-b",
      "mid-a",
    ]);
    assert.deepEqual(
      filtered.map((o) => o.id),
      ["leaf-b1", "leaf-a1"]
    );
  });

  it("getOrderedTopNodeIdsPresentInNodeTree returns only ids present in tree, capped", () => {
    const tree: NodeTreeItem[] = [
      leafTree("oil", "ENGINE.LUBE.OIL", "Oil", []),
      leafTree("filt", "ENGINE.LUBE.FILTER", "Filter", []),
    ];
    const top: TopServiceNodeItem[] = [
      {
        id: "oil",
        code: "ENGINE.LUBE.OIL",
        name: "Oil",
        parentId: null,
        level: 2,
        displayOrder: 0,
        serviceGroup: null,
        topNodeOrder: 1,
      },
      {
        id: "filt",
        code: "ENGINE.LUBE.FILTER",
        name: "Filter",
        parentId: null,
        level: 2,
        displayOrder: 1,
        serviceGroup: null,
        topNodeOrder: 2,
      },
      {
        id: "missing",
        code: "INTAKE.FILTER",
        name: "Intake",
        parentId: null,
        level: 2,
        displayOrder: 2,
        serviceGroup: null,
        topNodeOrder: 3,
      },
    ];
    const ordered = getOrderedTopNodeIdsPresentInNodeTree(tree, top, 15);
    assert.ok(ordered.includes("oil"));
    assert.ok(ordered.includes("filt"));
    assert.ok(!ordered.includes("missing"));
  });
});
