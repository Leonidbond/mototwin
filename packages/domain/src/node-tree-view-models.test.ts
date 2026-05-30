import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNodeTreeItemViewModel } from "./node-tree-view-models";
import type { NodeTreeItem } from "@mototwin/types";

function item(
  code: string,
  opts: { locked?: boolean; children?: NodeTreeItem[] } = {}
): NodeTreeItem {
  return {
    id: `id-${code}`,
    code,
    name: code,
    level: 0,
    displayOrder: 0,
    status: null,
    directStatus: null,
    computedStatus: null,
    effectiveStatus: null,
    statusExplanation: null,
    note: null,
    updatedAt: null,
    locked: opts.locked,
    children: opts.children ?? [],
  };
}

describe("buildNodeTreeItemViewModel planLocked", () => {
  it("does not dim ancestors on path to an active top leaf", () => {
    const vm = buildNodeTreeItemViewModel(
      item("ENGINE", {
        locked: true,
        children: [
          item("ENGINE.LUBE", {
            locked: true,
            children: [item("ENGINE.LUBE.OIL", { locked: false })],
          }),
        ],
      })
    );
    assert.equal(vm.planLocked, undefined);
    assert.equal(vm.hasActiveLeafInSubtree, true);
    assert.equal(vm.children[0]?.planLocked, undefined);
    assert.equal(vm.children[0]?.children[0]?.planLocked, undefined);
  });

  it("dims locked branch without active leaves", () => {
    const vm = buildNodeTreeItemViewModel(
      item("ENGINE", {
        locked: true,
        children: [
          item("ENGINE.OTHER", {
            locked: true,
            children: [item("ENGINE.OTHER.X", { locked: true })],
          }),
        ],
      })
    );
    assert.equal(vm.planLocked, true);
    assert.equal(vm.children[0]?.planLocked, true);
  });
});
