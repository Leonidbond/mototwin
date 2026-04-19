import type { PartSkuNodeSummary } from "./part-catalog";

export type PartRecommendationType =
  | "EXACT_FIT"
  | "MODEL_FIT"
  | "GENERIC_NODE_MATCH"
  | "RELATED_CONSUMABLE"
  | "VERIFY_REQUIRED";

export type PartRecommendationFilters = {
  vehicleId: string;
  nodeId: string;
};

export type PartRecommendationViewModel = {
  skuId: string;
  canonicalName: string;
  brandName: string;
  partType: string;
  partNumbers: string[];
  priceAmount: number | null;
  currency: string | null;
  primaryNode: PartSkuNodeSummary | null;
  relationType: string;
  confidence: number;
  recommendationType: PartRecommendationType;
  recommendationLabel: string;
  compatibilityWarning: string | null;
};

/** Group of SKU recommendations sharing the same {@link PartRecommendationType} (UI sections). */
export type PartRecommendationGroup = {
  recommendationType: PartRecommendationType;
  items: PartRecommendationViewModel[];
};
