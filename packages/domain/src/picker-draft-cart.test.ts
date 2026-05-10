import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PartSkuViewModel, PartWishlistItemStatus, ServiceKitViewModel } from "@mototwin/types";
import {
  addKitToDraft,
  addSkuToDraft,
  buildPickerSubmitPreview,
  clearDraft,
  computePickerSubmitPriceEstimate,
  computePickerSubmitWishlistPieceDelta,
  createEmptyDraftCart,
  getDraftTotals,
  isDraftEmpty,
  isKitInDraft,
  removeFromDraft,
  updateSkuDraftItemQuantity,
} from "./picker-draft-cart.ts";

function isoNow(): string {
  return new Date().toISOString();
}

function sku(over: Partial<PartSkuViewModel> = {}): PartSkuViewModel {
  const now = isoNow();
  return {
    id: "sku-1",
    seedKey: null,
    primaryNodeId: "node-a",
    brandName: "Motul",
    canonicalName: "Масло",
    partType: "Масло",
    description: null,
    category: null,
    priceAmount: 1200,
    currency: "RUB",
    sourceUrl: null,
    isOem: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    primaryNode: { id: "node-a", code: "oil", name: "Масло" },
    partNumbers: [],
    nodeLinks: [],
    fitments: [],
    offers: [],
    ...over,
  };
}

function kit(code: string, title: string): ServiceKitViewModel {
  return {
    id: `kit-${code}`,
    code,
    title,
    description: "",
    targetNodeCodes: [],
    items: [
      {
        key: "line-1",
        title: "Фильтр",
        nodeCode: "filt",
        partType: "",
        quantity: 1,
        role: "",
        required: true,
        matchedSkuId: "sku-f",
        matchedPartNumbers: ["HF-204"],
        matchedSkuTitle: null,
        matchedPriceAmount: 500,
        matchedCurrency: "RUB",
        recommendationType: null,
        warning: null,
      },
    ],
  };
}

describe("picker-draft-cart", () => {
  it("createEmptyDraftCart + isDraftEmpty", () => {
    const d = createEmptyDraftCart("veh-1");
    assert.equal(d.vehicleId, "veh-1");
    assert.ok(isDraftEmpty(d));
  });

  it("addSkuToDraft appends and preserves immutability of prior items array", () => {
    const a = createEmptyDraftCart("v");
    const b = addSkuToDraft(a, { sku: sku(), nodeId: "node-a", source: "search" });
    assert.equal(a.items.length, 0);
    assert.equal(b.items.length, 1);
    assert.equal(b.items[0]?.kind, "sku");
    if (b.items[0]?.kind === "sku") {
      assert.equal(b.items[0].sku.id, "sku-1");
      assert.equal(b.items[0].nodeId, "node-a");
    }
  });

  it("addKitToDraft dedupes by kit.code", () => {
    const k = kit("K1", "Комплект A");
    let d = createEmptyDraftCart("v");
    d = addKitToDraft(d, { kit: k, contextNodeId: "node-a" });
    d = addKitToDraft(d, { kit: k, contextNodeId: "node-a" });
    assert.equal(d.items.length, 1);
    assert.ok(isKitInDraft(d, "K1"));
  });

  it("updateSkuDraftItemQuantity clamps quantity", () => {
    let d = addSkuToDraft(createEmptyDraftCart("v"), {
      sku: sku({ priceAmount: 50, currency: "RUB" }),
      nodeId: "n",
      source: "search",
    });
    const id = d.items[0]!.draftId;
    d = updateSkuDraftItemQuantity(d, id, 4);
    assert.equal((d.items[0] as { kind: "sku" }).quantity, 4);
    const t = getDraftTotals(d);
    assert.equal(t.totalAmount, 200);
    d = updateSkuDraftItemQuantity(d, id, 0);
    assert.equal((d.items[0] as { kind: "sku" }).quantity, 1);
  });

  it("removeFromDraft + clearDraft", () => {
    let d = addSkuToDraft(createEmptyDraftCart("v"), {
      sku: sku({ id: "x" }),
      nodeId: "n",
      source: "recommendation",
    });
    const id = d.items[0]?.draftId;
    assert.ok(id);
    d = removeFromDraft(d, id!);
    assert.equal(d.items.length, 0);
    d = addSkuToDraft(d, { sku: sku(), nodeId: "n", source: "search" });
    d = clearDraft(d);
    assert.ok(isDraftEmpty(d));
  });

  it("getDraftTotals single currency sums SKU and kit lines", () => {
    let d = createEmptyDraftCart("v");
    d = addSkuToDraft(d, { sku: sku({ priceAmount: 100, currency: "RUB" }), nodeId: "n", source: "search" });
    d = addKitToDraft(d, { kit: kit("K", "K"), contextNodeId: "n" });
    const t = getDraftTotals(d);
    assert.equal(t.currency, "RUB");
    assert.equal(t.totalAmount, 600);
    assert.ok(t.positionsCount >= 2);
  });

  it("getDraftTotals returns zero total when mixed currencies", () => {
    let d = createEmptyDraftCart("v");
    d = addSkuToDraft(d, { sku: sku({ priceAmount: 10, currency: "USD" }), nodeId: "n", source: "search" });
    d = addSkuToDraft(d, { sku: sku({ id: "sku-2", priceAmount: 20, currency: "RUB" }), nodeId: "n", source: "search" });
    const t = getDraftTotals(d);
    assert.equal(t.currency, null);
    assert.equal(t.totalAmount, 0);
  });

  it("buildPickerSubmitPreview marks blocked SKU without node", () => {
    const s = sku({ primaryNodeId: null });
    let d = createEmptyDraftCart("v");
    d = addSkuToDraft(d, { sku: s, nodeId: null, source: "search" });
    const p = buildPickerSubmitPreview({ draft: d, activeWishlistItems: [] });
    assert.equal(p.blockedCount, 1);
    assert.equal(p.willAddCount, 0);
    assert.equal(p.willAddTotalPieces, 0);
    assert.equal(p.quantityUpgradeCount, 0);
    assert.equal(p.decisions[0]?.kind, "blocked");
  });

  it("buildPickerSubmitPreview quantityUpgrade when cart already has same qty as draft (user may add on top)", () => {
    const s = sku({ id: "dup-sku" });
    let d = createEmptyDraftCart("v");
    d = addSkuToDraft(d, { sku: s, nodeId: "node-a", source: "search" });
    const active = [
      {
        id: "wl-1",
        status: "NEEDED" as PartWishlistItemStatus,
        nodeId: "node-a",
        sku: { id: "dup-sku" },
        title: "t",
        vehicleId: "v",
        quantity: 1,
      },
    ];
    const p = buildPickerSubmitPreview({ draft: d, activeWishlistItems: active });
    assert.equal(p.duplicateCount, 0);
    assert.equal(p.quantityUpgradeCount, 1);
    assert.equal(p.willAddCount, 0);
    assert.equal(p.willAddTotalPieces, 0);
    assert.equal(p.quantityUpgradeExtraPieces, 1);
    const dec = p.decisions[0];
    assert.ok(dec && dec.kind === "quantityUpgrade");
    if (dec?.kind === "quantityUpgrade") {
      assert.equal(dec.addQty, 0);
      assert.equal(dec.reduceByQty, 0);
      assert.equal(dec.draftRequestedQty, 1);
      assert.equal(dec.existingQty, 1);
    }
  });

  it("buildPickerSubmitPreview quantityUpgrade when active has fewer pieces than draft", () => {
    const s = sku({ id: "dup-sku", priceAmount: 100, currency: "RUB" });
    let d = createEmptyDraftCart("v");
    d = addSkuToDraft(d, { sku: s, nodeId: "node-a", source: "search" });
    const id = d.items[0]!.draftId;
    d = updateSkuDraftItemQuantity(d, id, 3);
    const active = [
      {
        id: "wl-1",
        status: "NEEDED" as PartWishlistItemStatus,
        nodeId: "node-a",
        sku: { id: "dup-sku" },
        title: "t",
        vehicleId: "v",
        quantity: 1,
      },
    ];
    const p = buildPickerSubmitPreview({ draft: d, activeWishlistItems: active });
    assert.equal(p.duplicateCount, 0);
    assert.equal(p.quantityUpgradeCount, 1);
    assert.equal(p.quantityUpgradeExtraPieces, 3);
    assert.equal(p.willAddCount, 0);
    const dec = p.decisions[0];
    assert.ok(dec && dec.kind === "quantityUpgrade");
    if (dec?.kind === "quantityUpgrade") {
      assert.equal(dec.draftRequestedQty, 3);
      assert.equal(dec.existingQty, 1);
      assert.equal(dec.addQty, 2);
      assert.equal(dec.reduceByQty, 0);
      assert.equal(dec.existingWishlistItemId, "wl-1");
    }
  });

  it("buildPickerSubmitPreview quantityUpgrade when cart has more than draft (addQty 0, reduceByQty > 0)", () => {
    const s = sku({ id: "dup-sku", priceAmount: 50, currency: "RUB" });
    let d = createEmptyDraftCart("v");
    d = addSkuToDraft(d, { sku: s, nodeId: "node-a", source: "search" });
    const id = d.items[0]!.draftId;
    d = updateSkuDraftItemQuantity(d, id, 3);
    const active = [
      {
        id: "wl-1",
        status: "NEEDED" as PartWishlistItemStatus,
        nodeId: "node-a",
        sku: { id: "dup-sku" },
        title: "t",
        vehicleId: "v",
        quantity: 5,
      },
    ];
    const p = buildPickerSubmitPreview({ draft: d, activeWishlistItems: active });
    assert.equal(p.quantityUpgradeCount, 1);
    const dec = p.decisions[0];
    assert.ok(dec && dec.kind === "quantityUpgrade");
    if (dec?.kind === "quantityUpgrade") {
      assert.equal(dec.draftRequestedQty, 3);
      assert.equal(dec.existingQty, 5);
      assert.equal(dec.addQty, 0);
      assert.equal(dec.reduceByQty, 2);
    }
  });

  it("computePickerSubmitPriceEstimate for quantityUpgrade modes", () => {
    const s = sku({ id: "dup-sku", priceAmount: 100, currency: "RUB" });
    let d = createEmptyDraftCart("v");
    d = addSkuToDraft(d, { sku: s, nodeId: "node-a", source: "search" });
    const draftId = d.items[0]!.draftId;
    d = updateSkuDraftItemQuantity(d, draftId, 3);
    const active = [
      {
        id: "wl-1",
        status: "NEEDED" as PartWishlistItemStatus,
        nodeId: "node-a",
        sku: { id: "dup-sku" },
        title: "t",
        vehicleId: "v",
        quantity: 1,
      },
    ];
    const p = buildPickerSubmitPreview({ draft: d, activeWishlistItems: active });
    const addAll = computePickerSubmitPriceEstimate(d, p, { [draftId]: "addAllFromDraft" });
    assert.ok(addAll);
    assert.equal(addAll!.amount, 300);
    const setQty = computePickerSubmitPriceEstimate(d, p, { [draftId]: "setQtyToDraft" });
    assert.ok(setQty);
    assert.equal(setQty!.amount, 200);
    const activeMore = [
      {
        id: "wl-2",
        status: "NEEDED" as PartWishlistItemStatus,
        nodeId: "node-a",
        sku: { id: "dup-sku" },
        title: "t",
        vehicleId: "v",
        quantity: 5,
      },
    ];
    const pMore = buildPickerSubmitPreview({ draft: d, activeWishlistItems: activeMore });
    const setQtyNoAdd = computePickerSubmitPriceEstimate(d, pMore, { [draftId]: "setQtyToDraft" });
    assert.ok(setQtyNoAdd);
    assert.equal(setQtyNoAdd!.amount, 0);
  });

  it("computePickerSubmitWishlistPieceDelta respects resolution modes", () => {
    const s = sku({ id: "dup-sku" });
    let d = createEmptyDraftCart("v");
    d = addSkuToDraft(d, { sku: s, nodeId: "node-a", source: "search" });
    const draftId = d.items[0]!.draftId;
    d = updateSkuDraftItemQuantity(d, draftId, 3);
    const active = [
      {
        id: "wl-1",
        status: "NEEDED" as PartWishlistItemStatus,
        nodeId: "node-a",
        sku: { id: "dup-sku" },
        title: "t",
        vehicleId: "v",
        quantity: 1,
      },
    ];
    const p = buildPickerSubmitPreview({ draft: d, activeWishlistItems: active });
    assert.equal(computePickerSubmitWishlistPieceDelta(p, {}), null);
    assert.equal(computePickerSubmitWishlistPieceDelta(p, { [draftId]: "addAllFromDraft" }), 3);
    assert.equal(computePickerSubmitWishlistPieceDelta(p, { [draftId]: "setQtyToDraft" }), 2);
    const activeMore = [
      {
        id: "wl-2",
        status: "NEEDED" as PartWishlistItemStatus,
        nodeId: "node-a",
        sku: { id: "dup-sku" },
        title: "t",
        vehicleId: "v",
        quantity: 5,
      },
    ];
    const pMore = buildPickerSubmitPreview({ draft: d, activeWishlistItems: activeMore });
    assert.equal(computePickerSubmitWishlistPieceDelta(pMore, { [draftId]: "setQtyToDraft" }), 0);
  });

  it("buildPickerSubmitPreview willAdd kit without duplicate check", () => {
    let d = createEmptyDraftCart("v");
    d = addKitToDraft(d, { kit: kit("C1", "Kit"), contextNodeId: "node-a" });
    const p = buildPickerSubmitPreview({ draft: d, activeWishlistItems: [] });
    assert.equal(p.willAddCount, 1);
    assert.equal(p.willAddTotalPieces, 1);
    assert.equal(p.quantityUpgradeCount, 0);
    assert.equal(p.blockedCount, 0);
  });

  it("buildPickerSubmitPreview sums pieceCount for SKU quantity", () => {
    let d = addSkuToDraft(createEmptyDraftCart("v"), {
      sku: sku({ priceAmount: 10, currency: "RUB" }),
      nodeId: "n",
      source: "search",
    });
    const id = d.items[0]!.draftId;
    d = updateSkuDraftItemQuantity(d, id, 5);
    const p = buildPickerSubmitPreview({ draft: d, activeWishlistItems: [] });
    assert.equal(p.willAddCount, 1);
    assert.equal(p.willAddTotalPieces, 5);
    const dec = p.decisions[0];
    assert.ok(dec && dec.kind === "willAdd");
    if (dec?.kind === "willAdd") {
      assert.equal(dec.pieceCount, 5);
    }
  });
});
