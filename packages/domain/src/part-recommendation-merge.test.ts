import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PartRecommendationViewModel } from "@mototwin/types";
import { buildPartRecommendationViewModel } from "./part-recommendation";
import { mergeCommunityFitmentIntoRecommendation } from "./part-recommendation-merge";

function baseRec(): PartRecommendationViewModel {
  const sku = {
    id: "sku1",
    canonicalName: "Test pad",
    brandName: "EBC",
    partType: "BRAKE_PAD",
    partNumbers: [],
    priceAmount: null,
    currency: null,
    primaryNode: null,
    offers: [],
  };
  return buildPartRecommendationViewModel({
    sku: sku as never,
    nodeId: "n1",
    relationType: "PRIMARY",
    confidence: 80,
    hasExactFit: false,
    hasModelFit: false,
    hasGenericFitment: true,
    fitmentNote: null,
  });
}

describe("mergeCommunityFitmentIntoRecommendation", () => {
  it("adds community badge when confidence exists", () => {
    const merged = mergeCommunityFitmentIntoRecommendation(baseRec(), {
      partMasterId: "m1",
      confidence: {
        confidenceScore: 70,
        reportCount: 2,
        confirmationCount: 3,
        rejectionCount: 0,
        modificationCount: 0,
        status: "COMMUNITY_CONFIRMED",
        isStaffVerified: false,
      },
      nodeServiceGroup: "BODY_PROTECTION",
      nodeCode: "CHASSIS.PLASTICS",
    });
    assert.ok(merged.trustBadge);
    assert.ok(merged.communityLineRu);
  });

  it("downgrades community badge on safety-critical VERIFY_REQUIRED", () => {
    const base = buildPartRecommendationViewModel({
      sku: {
        id: "sku1",
        canonicalName: "Pad",
        brandName: "X",
        partType: "PAD",
        partNumbers: [],
        priceAmount: null,
        currency: null,
        primaryNode: null,
        offers: [],
      } as never,
      nodeId: "n1",
      relationType: "PRIMARY",
      confidence: 50,
      hasExactFit: false,
      hasModelFit: false,
      hasGenericFitment: false,
      fitmentNote: null,
    });
    const merged = mergeCommunityFitmentIntoRecommendation(base, {
      partMasterId: "m1",
      confidence: {
        confidenceScore: 90,
        reportCount: 5,
        confirmationCount: 10,
        rejectionCount: 0,
        modificationCount: 0,
        status: "COMMUNITY_CONFIRMED",
        isStaffVerified: false,
      },
      nodeServiceGroup: "BRAKES",
      nodeCode: "BRAKES.FRONT.PADS",
    });
    assert.equal(merged.recommendationType, "VERIFY_REQUIRED");
    assert.equal(merged.trustBadge, "COMMUNITY_SIGNAL");
    assert.ok(merged.compatibilityWarning);
  });

  it("uses published report count when confidence row is missing", () => {
    const merged = mergeCommunityFitmentIntoRecommendation(baseRec(), {
      partMasterId: "m1",
      confidence: null,
      publishedFitmentReportCount: 2,
      nodeServiceGroup: "BODY_PROTECTION",
      nodeCode: "CHASSIS.PLASTICS",
    });
    assert.equal(merged.communityReportCount, 2);
    assert.equal(merged.trustBadge, "COMMUNITY_SIGNAL");
    assert.equal(merged.communityStatus, "LOW_CONFIDENCE");
  });
});
