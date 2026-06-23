import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPartWishlistNextStatus,
  getPartWishlistNextStatusActionLabelRu,
  partWishlistStatusLabelsRu,
} from "./part-wishlist.ts";

describe("getPartWishlistNextStatusActionLabelRu", () => {
  it("returns action verbs, not target status labels", () => {
    assert.equal(getPartWishlistNextStatusActionLabelRu("NEEDED"), "Заказать");
    assert.equal(getPartWishlistNextStatusActionLabelRu("ORDERED"), "Купить");
    assert.equal(getPartWishlistNextStatusActionLabelRu("BOUGHT"), "Установить");
    assert.notEqual(getPartWishlistNextStatusActionLabelRu("ORDERED"), partWishlistStatusLabelsRu.BOUGHT);
  });

  it("returns null for terminal or inactive statuses", () => {
    assert.equal(getPartWishlistNextStatusActionLabelRu("INSTALLED"), null);
    assert.equal(getPartWishlistNextStatusActionLabelRu("REJECTED"), null);
  });
});

describe("getPartWishlistNextStatus", () => {
  it("maps active statuses to the next lifecycle step", () => {
    assert.equal(getPartWishlistNextStatus("NEEDED"), "ORDERED");
    assert.equal(getPartWishlistNextStatus("ORDERED"), "BOUGHT");
    assert.equal(getPartWishlistNextStatus("BOUGHT"), "INSTALLED");
    assert.equal(getPartWishlistNextStatus("INSTALLED"), null);
  });
});
