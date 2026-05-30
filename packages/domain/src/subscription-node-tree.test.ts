import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSubscriptionCapabilities } from "./subscription";

describe("subscription node-tree routing", () => {
  it("PRO uses full tree (not top-only extract path)", () => {
    const pro = getSubscriptionCapabilities("PRO");
    assert.equal(pro.nodeAccessLevel, "FULL_TREE");
    assert.equal(pro.canSelectChildNode, true);
    assert.equal(pro.allowedEntryModes.includes("DETAILED"), true);
    assert.equal(pro.maxVehicles, null);
    assert.equal(pro.maxVisibleServiceEvents, null);
  });

  it("FREE and RIDER use restricted tree access", () => {
    const free = getSubscriptionCapabilities("FREE");
    const rider = getSubscriptionCapabilities("RIDER");
    assert.notEqual(free.nodeAccessLevel, "FULL_TREE");
    assert.notEqual(rider.nodeAccessLevel, "FULL_TREE");
    assert.equal(free.canSelectChildNode, false);
    assert.equal(rider.canSelectChildNode, false);
  });
});
