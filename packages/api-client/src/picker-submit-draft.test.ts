import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PickerDraftCart } from "@mototwin/types";
import { submitPickerDraft } from "./picker-submit-draft.ts";

function emptyDraft(vehicleId: string): PickerDraftCart {
  return { vehicleId, items: [] };
}

describe("submitPickerDraft", () => {
  it("skips SKU when no node id can be resolved", async () => {
    const now = new Date().toISOString();
    const draft: PickerDraftCart = {
      vehicleId: "v1",
      items: [
        {
          kind: "sku",
          draftId: "d1",
          quantity: 1,
          nodeId: null,
          source: "search",
          sku: {
            id: "s1",
            seedKey: null,
            primaryNodeId: null,
            brandName: "B",
            canonicalName: "X",
            partType: "",
            description: null,
            category: null,
            priceAmount: null,
            currency: null,
            sourceUrl: null,
            isOem: false,
            isActive: true,
            createdAt: now,
            updatedAt: now,
            primaryNode: null,
            partNumbers: [],
            nodeLinks: [],
            fitments: [],
            offers: [],
          },
        },
      ],
    };
    const api = {
      async createWishlistItem() {
        throw new Error("should not be called");
      },
      async addServiceKitToWishlist() {
        throw new Error("should not be called");
      },
    };
    const result = await submitPickerDraft(api, draft);
    assert.equal(result.createdWishlistItemIds.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.match(result.skipped[0]?.reason ?? "", /узел/i);
  });

  it("creates wishlist item for SKU and records id", async () => {
    const now = new Date().toISOString();
    const draft: PickerDraftCart = {
      vehicleId: "v1",
      items: [
        {
          kind: "sku",
          draftId: "d1",
          quantity: 2,
          nodeId: "node-1",
          source: "search",
          sku: {
            id: "s1",
            seedKey: null,
            primaryNodeId: null,
            brandName: "B",
            canonicalName: "X",
            partType: "",
            description: null,
            category: null,
            priceAmount: 10,
            currency: "RUB",
            sourceUrl: null,
            isOem: false,
            isActive: true,
            createdAt: now,
            updatedAt: now,
            primaryNode: null,
            partNumbers: [],
            nodeLinks: [],
            fitments: [],
            offers: [],
          },
        },
      ],
    };
    let seen: {
      nodeId: string;
      skuId: string;
      quantity: number;
      status: string;
      costAmount: number | null;
      currency: string | null;
    } | null = null;
    const api = {
      async createWishlistItem(
        _vid: string,
        input: {
          nodeId: string;
          skuId: string;
          quantity: number;
          status: string;
          costAmount: number | null;
          currency: string | null;
        }
      ) {
        seen = input;
        return { item: { id: "wl-99" } };
      },
      async addServiceKitToWishlist() {
        throw new Error("should not be called");
      },
    };
    const result = await submitPickerDraft(api, draft);
    assert.deepEqual(seen, {
      nodeId: "node-1",
      skuId: "s1",
      quantity: 2,
      status: "NEEDED",
      costAmount: 10,
      currency: "RUB",
    });
    assert.ok(result.createdWishlistItemIds.includes("wl-99"));
    assert.equal(result.createdSkuIds.length, 1);
  });

  it("maps createWishlistItem failure to skipped entry", async () => {
    const now = new Date().toISOString();
    const draft: PickerDraftCart = {
      vehicleId: "v1",
      items: [
        {
          kind: "sku",
          draftId: "d1",
          quantity: 1,
          nodeId: "n",
          source: "search",
          sku: {
            id: "s1",
            seedKey: null,
            primaryNodeId: "n",
            brandName: "B",
            canonicalName: "N",
            partType: "",
            description: null,
            category: null,
            priceAmount: null,
            currency: null,
            sourceUrl: null,
            isOem: false,
            isActive: true,
            createdAt: now,
            updatedAt: now,
            primaryNode: null,
            partNumbers: [],
            nodeLinks: [],
            fitments: [],
            offers: [],
          },
        },
      ],
    };
    const api = {
      async createWishlistItem() {
        throw new Error("network down");
      },
      async addServiceKitToWishlist() {
        throw new Error("no");
      },
    };
    const result = await submitPickerDraft(api, draft);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0]?.reason, "network down");
  });

  it("submits kit and merges created wishlist ids and per-line skips", async () => {
    const draft: PickerDraftCart = {
      vehicleId: "v1",
      items: [
        {
          kind: "kit",
          draftId: "k1",
          contextNodeId: "ctx",
          kit: {
            id: "kid",
            code: "OIL_KIT",
            title: "Масляный комплект",
            description: "",
            targetNodeCodes: [],
            items: [],
          },
        },
      ],
    };
    const api = {
      async createWishlistItem() {
        throw new Error("no");
      },
      async addServiceKitToWishlist() {
        return {
          result: {
            createdItems: [{ id: "a1" }, { id: "a2" }],
            skippedItems: [
              { itemKey: "x", title: "Фильтр", reason: "DUPLICATE_ACTIVE_ITEM", message: "Уже есть" },
            ],
            warnings: ["Проверьте узел"],
          },
        };
      },
    };
    const result = await submitPickerDraft(api, draft);
    assert.ok(result.createdKitCodes.includes("OIL_KIT"));
    assert.deepEqual(result.createdWishlistItemIds, ["a1", "a2"]);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.warnings.length, 1);
  });

  it("returns empty result for empty draft", async () => {
    const api = {
      async createWishlistItem() {
        throw new Error("no");
      },
      async addServiceKitToWishlist() {
        throw new Error("no");
      },
    };
    const result = await submitPickerDraft(api, emptyDraft("v"));
    assert.deepEqual(result.createdSkuIds, []);
    assert.deepEqual(result.createdKitCodes, []);
    assert.deepEqual(result.skipped, []);
  });
});
