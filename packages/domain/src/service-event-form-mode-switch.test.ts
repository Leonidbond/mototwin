import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAddServiceEventCostBreakdownLines,
  createInitialAddServiceEventFromWishlistItem,
  switchAddServiceEventFormToAdvanced,
  switchAddServiceEventFormToBasic,
} from "./forms";
import { parseExpenseAmountInputToNumberOrNull } from "./expense-summary";
import type { PartWishlistItem } from "@mototwin/types";

function wishlistItem(costAmount: number): PartWishlistItem {
  return {
    id: "wl-1",
    vehicleId: "veh-1",
    nodeId: "node-1",
    title: "Фильтр масляный",
    status: "INSTALLED",
    quantity: 1,
    costAmount,
    currency: "RUB",
    comment: null,
    sku: null,
    skuId: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

function advancedTotal(form: ReturnType<typeof createInitialAddServiceEventFromWishlistItem>): string | null {
  return buildAddServiceEventCostBreakdownLines(form).total;
}

describe("service event form mode switch", () => {
  it("keeps ADVANCED total after ADVANCED → BASIC → ADVANCED (wishlist prefill)", () => {
    const initial = createInitialAddServiceEventFromWishlistItem(wishlistItem(1500), {
      odometer: 1000,
      engineHours: null,
    });
    const initialTotal = advancedTotal(initial);
    assert.ok(initialTotal);
    assert.match(initialTotal!, /1\s?500/);

    const basic = switchAddServiceEventFormToBasic(initial);
    assert.equal(basic.mode, "BASIC");
    assert.equal(parseExpenseAmountInputToNumberOrNull(basic.partsCost), 1500);
    assert.equal(basic.items[0]?.partCost, "");

    const back = switchAddServiceEventFormToAdvanced(basic);
    assert.equal(back.mode, "ADVANCED");
    assert.equal(back.partsCost, "");
    assert.equal(parseExpenseAmountInputToNumberOrNull(back.items[0]?.partCost ?? ""), 1500);

    const roundTripTotal = advancedTotal(back);
    assert.equal(roundTripTotal, initialTotal);
  });
});
