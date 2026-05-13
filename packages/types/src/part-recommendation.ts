import type { PartSkuNodeSummary } from "./part-catalog";
import type { FitmentConfidenceStatus, TrustBadgeWire } from "./fitment-community";

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
  /** Совпадает с {@link PartSku.partMasterId} у SKU; для ссылки на отчёт совместимости. */
  partMasterId: string | null;
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
  whyRecommended: string;
  fitmentNote: string | null;
  compatibilityWarning: string | null;
  /** Deterministic + staff/community trust signal for UI. */
  trustBadge: TrustBadgeWire;
  communityReportCount: number;
  communityScore: number;
  communityStatus: FitmentConfidenceStatus | null;
  /** Short Russian line derived from community layer (may be null). */
  communityLineRu: string | null;
  /** Tie-breaker for sorting within the same {@link PartRecommendationType}. */
  communitySortBoost: number;
};

/** Group of SKU recommendations sharing the same {@link PartRecommendationType} (UI sections). */
export type PartRecommendationGroup = {
  recommendationType: PartRecommendationType;
  items: PartRecommendationViewModel[];
};
