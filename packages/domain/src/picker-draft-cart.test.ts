import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PartSkuViewModel, PartWishlistItemStatus, ServiceKitViewModel } from "@mototwin/types";
import {
  addKitToDraft,
  addSkuToDraft,
  buildPickerSubmitPreview,
  clearDraft,
  createEmptyDraftCart,
  getDraftTotals,
  isDraftEmpty,
  isKitInDraft,
  removeFromDraft,
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
    assert.equal(p.decisions[0]?.kind, "blocked");
  });

  it("buildPickerSubmitPreview marks duplicate when active wishlist has same node+sku", () => {
    const s = sku({ id: "dup-sku" });
    let d = createEmptyDraftCart("v");
    d = addSkuToDraft(d, { sku: s, nodeId: "node-a", source: "search" });
    const active = [
      {
        status: "NEEDED" as PartWishlistItemStatus,
        nodeId: "node-a",
        sku: { id: "dup-sku" },
        title: "t",
        vehicleId: "v",
      },
    ];
    const p = buildPickerSubmitPreview({ draft: d, activeWishlistItems: active });
    assert.equal(p.duplicateCount, 1);
    assert.equal(p.willAddCount, 0);
  });

  it("buildPickerSubmitPreview willAdd kit without duplicate check", () => {
    let d = createEmptyDraftCart("v");
    d = addKitToDraft(d, { kit: kit("C1", "Kit"), contextNodeId: "node-a" });
    const p = buildPickerSubmitPreview({ draft: d, activeWishlistItems: [] });
    assert.equal(p.willAddCount, 1);
    assert.equal(p.blockedCount, 0);
  });
});
