import type { FitmentConfidenceStatus, PartRecommendationType, PartRecommendationViewModel, TrustBadgeWire } from "@mototwin/types";

/** Service groups treated as safety-critical for community-vs-deterministic policy (spec §526). */
const SAFETY_CRITICAL_SERVICE_GROUPS = new Set<string>([
  "BRAKES",
  "FRONT_SUSPENSION",
  "REAR_SUSPENSION",
  "ENGINE_SERVICE",
]);

export function isSafetyCriticalNodeContext(input: {
  serviceGroup: string | null | undefined;
  nodeCode: string | null | undefined;
}): boolean {
  const g = input.serviceGroup?.trim();
  if (g && SAFETY_CRITICAL_SERVICE_GROUPS.has(g)) {
    return true;
  }
  const code = (input.nodeCode ?? "").toUpperCase();
  if (code.startsWith("BRAKES.") || code.startsWith("SUSPENSION.")) {
    return true;
  }
  if (code.startsWith("ELECTRICS.")) {
    return true;
  }
  return false;
}

export type CommunityFitmentMergeInput = {
  partMasterId: string | null;
  /** Aggregated row for this (master, modelVariant, node); null if none. */
  confidence: {
    confidenceScore: number;
    reportCount: number;
    confirmationCount: number;
    rejectionCount: number;
    modificationCount: number;
    status: FitmentConfidenceStatus;
    isStaffVerified: boolean;
  } | null;
  /**
   * Опубликованные отчёты владельцев по той же связке (модификация + узел + part master).
   * Нужен, чтобы UI не показывал «0 отчётов», если агрегат {@link input.confidence} ещё не пересчитан.
   */
  publishedFitmentReportCount?: number;
  nodeServiceGroup: string | null | undefined;
  nodeCode: string | null | undefined;
};

/**
 * Merges community confidence into a deterministic recommendation row.
 * Does not change {@link PartRecommendationType} buckets — adjusts badges, copy, and sort hints.
 */
export function mergeCommunityFitmentIntoRecommendation(
  base: PartRecommendationViewModel,
  input: CommunityFitmentMergeInput
): PartRecommendationViewModel {
  const safety = isSafetyCriticalNodeContext({
    serviceGroup: input.nodeServiceGroup,
    nodeCode: input.nodeCode,
  });
  const c = input.confidence;
  const published = Math.max(0, input.publishedFitmentReportCount ?? 0);
  const communityReportCount = Math.max(c?.reportCount ?? 0, published);

  let trustBadge: TrustBadgeWire = null;
  let communityScore = c?.confidenceScore ?? 0;
  let communityStatus: FitmentConfidenceStatus | null = c?.status ?? null;
  let communityLineRu: string | null = null;

  if (c?.isStaffVerified && c.status === "VERIFIED_BY_MOTOTWIN") {
    trustBadge = "VERIFIED_BY_MOTOTWIN";
    communityLineRu = "Проверено MotoTwin";
  } else if (communityReportCount > 0) {
    const strongCommunity =
      c != null && (c.status === "COMMUNITY_CONFIRMED" || c.confirmationCount >= 2);
    if (strongCommunity) {
      trustBadge = safety && base.recommendationType === "VERIFY_REQUIRED" ? "COMMUNITY_SIGNAL" : "COMMUNITY_CONFIRMED";
    } else {
      trustBadge = "COMMUNITY_SIGNAL";
    }
    if (trustBadge === "COMMUNITY_CONFIRMED") {
      communityLineRu = "Подтверждено владельцами такой же модели";
    } else if (trustBadge === "COMMUNITY_SIGNAL") {
      communityLineRu = "Есть отзывы владельцев; проверьте применимость к вашей комплектации";
    }
    if (c == null && published > 0) {
      communityStatus = "LOW_CONFIDENCE";
      communityScore = 0;
    }
  }

  let compatibilityWarning = base.compatibilityWarning;
  if (safety && base.recommendationType === "VERIFY_REQUIRED") {
    // Community must not remove the deterministic warning on safety-critical nodes.
    trustBadge = trustBadge === "COMMUNITY_CONFIRMED" ? "COMMUNITY_SIGNAL" : trustBadge;
    if (!compatibilityWarning) {
      compatibilityWarning = "Для этой системы мотоцикла проверьте совместимость по каталогу и спецификации.";
    }
  }

  return {
    ...base,
    partMasterId: input.partMasterId ?? base.partMasterId ?? null,
    trustBadge,
    communityReportCount,
    communityScore,
    communityStatus,
    communityLineRu,
    compatibilityWarning,
    /** Used only for sorting inside a recommendation group (0–100). */
    communitySortBoost: Math.min(
      100,
      communityScore + (c?.confirmationCount ?? 0) * 3 + (published > 0 && !c ? published * 2 : 0)
    ),
  };
}

/**
 * Secondary sort: higher community signal after deterministic keys.
 * Returns negative if a should come before b.
 */
export function compareRecommendationsWithCommunity(a: PartRecommendationViewModel, b: PartRecommendationViewModel): number {
  const boostDiff = (b.communitySortBoost ?? 0) - (a.communitySortBoost ?? 0);
  if (boostDiff !== 0) return boostDiff;
  return 0;
}

export function recommendationTypeRank(t: PartRecommendationType): number {
  const order: PartRecommendationType[] = [
    "EXACT_FIT",
    "MODEL_FIT",
    "GENERIC_NODE_MATCH",
    "RELATED_CONSUMABLE",
    "VERIFY_REQUIRED",
  ];
  const idx = order.indexOf(t);
  return idx === -1 ? order.length : idx;
}
