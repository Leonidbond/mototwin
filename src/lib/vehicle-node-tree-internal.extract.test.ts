import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  annotateMaintenanceTreeAccess,
  extractMaintenanceNodesByCodes,
  pruneMaintenanceTreeToTargetCodes,
  type MaintenanceTreeNode,
} from "./vehicle-node-tree-internal";

function node(
  code: string,
  children: MaintenanceTreeNode[] = []
): MaintenanceTreeNode {
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
    children,
  };
}

describe("extractMaintenanceNodesByCodes", () => {
  it("finds top-service leaf codes under skeleton roots, not only root-level codes", () => {
    const tree: MaintenanceTreeNode[] = [
      node("ENGINE", [
        node("ENGINE.LUBE", [node("ENGINE.LUBE.OIL"), node("ENGINE.LUBE.FILTER")]),
      ]),
      node("BRAKES", [node("BRAKES.FRONT.PADS")]),
    ];
    const extracted = extractMaintenanceNodesByCodes(tree, [
      "ENGINE.LUBE.OIL",
      "BRAKES.FRONT.PADS",
    ]);
    assert.equal(extracted.length, 2);
    assert.equal(extracted[0]?.code, "ENGINE.LUBE.OIL");
    assert.equal(extracted[1]?.code, "BRAKES.FRONT.PADS");
    assert.deepEqual(extracted[0]?.children, []);
  });

  it("returns empty when top codes are only on skeleton roots (old bug shape)", () => {
    const tree: MaintenanceTreeNode[] = [
      node("ENGINE", [node("ENGINE.LUBE.OIL")]),
      node("BRAKES"),
    ];
    const wrongFilter = tree.filter((n) => n.code === "ENGINE.LUBE.OIL");
    assert.equal(wrongFilter.length, 0);

    const extracted = extractMaintenanceNodesByCodes(tree, ["ENGINE.LUBE.OIL", "BRAKES.FRONT.PADS"]);
    assert.equal(extracted.length, 1);
    assert.equal(extracted[0]?.code, "ENGINE.LUBE.OIL");
  });
});

describe("pruneMaintenanceTreeToTargetCodes", () => {
  it("keeps ancestor path and drops unrelated branches", () => {
    const tree: MaintenanceTreeNode[] = [
      node("ENGINE", [
        node("ENGINE.LUBE", [node("ENGINE.LUBE.OIL"), node("ENGINE.LUBE.FILTER")]),
        node("ENGINE.OTHER", [node("ENGINE.OTHER.X")]),
      ]),
      node("BRAKES", [node("BRAKES.FRONT.PADS")]),
    ];
    const pruned = pruneMaintenanceTreeToTargetCodes(tree, ["ENGINE.LUBE.OIL", "BRAKES.FRONT.PADS"]);
    assert.equal(pruned.length, 2);
    assert.equal(pruned[0]?.code, "ENGINE");
    assert.equal(pruned[0]?.children.length, 1);
    assert.equal(pruned[0]?.children[0]?.code, "ENGINE.LUBE");
    assert.equal(pruned[0]?.children[0]?.children[0]?.code, "ENGINE.LUBE.OIL");
    assert.equal(pruned[0]?.children[0]?.children.length, 1);
    assert.equal(pruned[1]?.children[0]?.code, "BRAKES.FRONT.PADS");
  });

  it("annotates only target codes as selectable on Rider", () => {
    const tree: MaintenanceTreeNode[] = [
      node("ENGINE", [node("ENGINE.LUBE", [node("ENGINE.LUBE.OIL")])]),
    ];
    const pruned = pruneMaintenanceTreeToTargetCodes(tree, ["ENGINE.LUBE.OIL"]);
    const annotated = annotateMaintenanceTreeAccess(pruned, ["ENGINE.LUBE.OIL"], {
      selectable: true,
    });
    assert.equal(annotated[0]?.selectable, false);
    assert.equal(annotated[0]?.locked, true);
    assert.equal(annotated[0]?.children[0]?.selectable, false);
    assert.equal(annotated[0]?.children[0]?.children[0]?.selectable, true);
    assert.equal(annotated[0]?.children[0]?.children[0]?.locked, false);
  });
});
