import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PartRecommendationViewModel } from "@mototwin/types";
import { classifyRecommendationsForPicker } from "./picker-merchandising.ts";

function rec(
  skuId: string,
  type: PartRecommendationViewModel["recommendationType"],
  price: number | null,
  confidence = 0.9,
  relationType = "PRIMARY"
): PartRecommendationViewModel {
  return {
    skuId,
    recommendationType: type,
    recommendationLabel: "",
    whyRecommended: "",
    brandName: "B",
    canonicalName: `Part ${skuId}`,
    partType: "",
    partNumbers: [],
    priceAmount: price,
    currency: price != null ? "RUB" : null,
    confidence,
    primaryNode: { id: "n1", code: "c1", name: "Node" },
    relationType,
    fitmentNote: null,
    compatibilityWarning: null,
  };
}

describe("picker-merchandising", () => {
  it("classifyRecommendationsForPicker picks best fit among EXACT/MODEL", () => {
    const r = classifyRecommendationsForPicker([
      rec("a", "MODEL_FIT", 500, 0.5),
      rec("b", "EXACT_FIT", 900, 0.95),
    ]);
    assert.equal(r.bestFit?.skuId, "b");
  });

  it("classifyRecommendationsForPicker picks cheaper among fits for best value", () => {
    const r = classifyRecommendationsForPicker([
      rec("cheap", "EXACT_FIT", 100, 0.9),
      rec("dear", "EXACT_FIT", 500, 0.95),
    ]);
    assert.equal(r.bestFit?.skuId, "dear");
    assert.equal(r.bestValue?.skuId, "cheap");
  });

  it("classifyRecommendationsForPicker puts unfeatured into alternatives", () => {
    const r = classifyRecommendationsForPicker([
      rec("f1", "EXACT_FIT", 10, 0.99),
      rec("f2", "EXACT_FIT", 20, 0.5),
      rec("alt", "VERIFY_REQUIRED", null, 0.3),
    ]);
    assert.ok(r.bestFit);
    assert.ok(r.alternatives.some((x) => x.skuId === "alt"));
  });
});
