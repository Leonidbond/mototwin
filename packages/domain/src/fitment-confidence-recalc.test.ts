import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeFitmentConfidenceState } from "./fitment-confidence-recalc";

describe("computeFitmentConfidenceState", () => {
  it("returns LOW_CONFIDENCE for a single published report without confirmations", () => {
    const r = computeFitmentConfidenceState({
      publishedReports: { reportCount: 1, doesNotFitCount: 0, modificationCount: 0 },
      votes: { confirm: 0, reject: 0 },
    });
    assert.equal(r.status, "LOW_CONFIDENCE");
    assert.ok(r.confidenceScore >= 0);
  });

  it("returns COMMUNITY_CONFIRMED when confirmations dominate", () => {
    const r = computeFitmentConfidenceState({
      publishedReports: { reportCount: 2, doesNotFitCount: 0, modificationCount: 0 },
      votes: { confirm: 3, reject: 0 },
    });
    assert.equal(r.status, "COMMUNITY_CONFIRMED");
  });

  it("returns REJECTED_LIKELY_INCOMPATIBLE on repeated DOES_NOT_FIT", () => {
    const r = computeFitmentConfidenceState({
      publishedReports: { reportCount: 2, doesNotFitCount: 2, modificationCount: 0 },
      votes: { confirm: 0, reject: 0 },
    });
    assert.equal(r.status, "REJECTED_LIKELY_INCOMPATIBLE");
  });
});
