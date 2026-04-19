import type {
  PartRecommendationGroup,
  PartRecommendationType,
  PartRecommendationViewModel,
  PartSkuNodeSummary,
  PartSkuViewModel,
} from "@mototwin/types";

type RecommendationInput = {
  sku: PartSkuViewModel;
  nodeId: string;
  relationType: string;
  confidence: number;
  hasExactFit: boolean;
  hasModelFit: boolean;
  hasGenericFitment: boolean;
  fitmentNote?: string | null;
};

/** Display order for recommendation groups (highest trust first). */
export const PART_RECOMMENDATION_GROUP_ORDER: readonly PartRecommendationType[] = [
  "EXACT_FIT",
  "MODEL_FIT",
  "GENERIC_NODE_MATCH",
  "RELATED_CONSUMABLE",
  "VERIFY_REQUIRED",
] as const;

const groupTitleMap: Record<PartRecommendationType, string> = {
  EXACT_FIT: "Подходит к этой модификации",
  MODEL_FIT: "Подходит к модели",
  GENERIC_NODE_MATCH: "Универсальная позиция для узла",
  RELATED_CONSUMABLE: "Сопутствующий расходник",
  VERIFY_REQUIRED: "Проверьте совместимость",
};

export function getPartRecommendationGroupTitle(type: PartRecommendationType): string {
  return groupTitleMap[type];
}

export function getPartRecommendationLabel(type: PartRecommendationType): string {
  return getPartRecommendationGroupTitle(type);
}

export function getPartRecommendationWarningLabelForType(
  type: PartRecommendationType
): string | null {
  if (type === "VERIFY_REQUIRED") {
    return "Требуется проверка совместимости по артикулу и параметрам.";
  }
  if (type === "RELATED_CONSUMABLE") {
    return "Проверьте применимость расходника к вашему сценарию обслуживания.";
  }
  return null;
}

export function getPartRecommendationWarningText(type: PartRecommendationType): string | null {
  return getPartRecommendationWarningLabelForType(type);
}

/** User-facing warning line for a recommendation row (framework-agnostic). */
export function getPartRecommendationWarningLabel(
  item: PartRecommendationViewModel
): string | null {
  return getPartRecommendationWarningLabelForType(item.recommendationType);
}

export function getPartRecommendationWhyText(type: PartRecommendationType): string {
  if (type === "EXACT_FIT") {
    return "Есть применимость к этой модификации мотоцикла";
  }
  if (type === "MODEL_FIT") {
    return "Есть применимость к модели мотоцикла";
  }
  if (type === "GENERIC_NODE_MATCH") {
    return "Позиция связана с этим узлом, но точная совместимость не подтверждена";
  }
  if (type === "RELATED_CONSUMABLE") {
    return "Может понадобиться при обслуживании этого узла";
  }
  return "Нет подтвержденной применимости к вашей модификации";
}

export function buildPartRecommendationExplanation(type: PartRecommendationType): {
  recommendationLabel: string;
  whyRecommended: string;
  compatibilityWarning: string | null;
} {
  return {
    recommendationLabel: getPartRecommendationLabel(type),
    whyRecommended: getPartRecommendationWhyText(type),
    compatibilityWarning: getPartRecommendationWarningText(type),
  };
}

export function classifyPartRecommendation(input: RecommendationInput): PartRecommendationType {
  const relationUpper = input.relationType.trim().toUpperCase();

  if (relationUpper === "RELATED_CONSUMABLE" || relationUpper === "TOOL_OR_CHEMICAL") {
    return "RELATED_CONSUMABLE";
  }
  if (input.hasExactFit) {
    return "EXACT_FIT";
  }
  if (input.hasModelFit) {
    return "MODEL_FIT";
  }
  if (input.hasGenericFitment || relationUpper === "PRIMARY" || relationUpper === "ALTERNATIVE") {
    return input.confidence >= 70 ? "GENERIC_NODE_MATCH" : "VERIFY_REQUIRED";
  }
  return "VERIFY_REQUIRED";
}

function getPrimaryPartNumbers(sku: PartSkuViewModel): string[] {
  return sku.partNumbers.map((p) => p.number.trim()).filter(Boolean).slice(0, 3);
}

export function buildPartRecommendationViewModel(
  input: RecommendationInput
): PartRecommendationViewModel {
  const recommendationType = classifyPartRecommendation(input);
  const explanation = buildPartRecommendationExplanation(recommendationType);
  return {
    skuId: input.sku.id,
    canonicalName: input.sku.canonicalName,
    brandName: input.sku.brandName,
    partType: input.sku.partType,
    partNumbers: getPrimaryPartNumbers(input.sku),
    priceAmount: input.sku.priceAmount,
    currency: input.sku.currency,
    primaryNode: input.sku.primaryNode as PartSkuNodeSummary | null,
    relationType: input.relationType,
    confidence: input.confidence,
    recommendationType,
    recommendationLabel: explanation.recommendationLabel,
    whyRecommended: explanation.whyRecommended,
    fitmentNote: input.fitmentNote?.trim() || null,
    compatibilityWarning: explanation.compatibilityWarning,
  };
}

function recommendationRank(type: PartRecommendationType): number {
  const idx = PART_RECOMMENDATION_GROUP_ORDER.indexOf(type);
  return idx === -1 ? PART_RECOMMENDATION_GROUP_ORDER.length : idx;
}

function relationRank(relationType: string): number {
  const t = relationType.trim().toUpperCase();
  if (t === "PRIMARY") return 0;
  if (t === "ALTERNATIVE") return 1;
  if (t === "KIT_COMPONENT") return 2;
  if (t === "RELATED_CONSUMABLE") return 3;
  return 4;
}

function hasOfferPrice(item: PartRecommendationViewModel): boolean {
  return item.priceAmount != null && Number.isFinite(item.priceAmount);
}

/** Sort recommendations inside one {@link PartRecommendationGroup}: confidence, price, stable name. */
export function sortPartRecommendationsWithinGroup(
  items: PartRecommendationViewModel[]
): PartRecommendationViewModel[] {
  return [...items].sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    const byPrice = Number(hasOfferPrice(b)) - Number(hasOfferPrice(a));
    if (byPrice !== 0) {
      return byPrice;
    }
    const byBrand = a.brandName.localeCompare(b.brandName, "ru");
    if (byBrand !== 0) {
      return byBrand;
    }
    const byName = a.canonicalName.localeCompare(b.canonicalName, "ru");
    if (byName !== 0) {
      return byName;
    }
    return a.skuId.localeCompare(b.skuId);
  });
}

/**
 * Bucket recommendations by {@link PartRecommendationType}.
 * Groups appear in {@link PART_RECOMMENDATION_GROUP_ORDER}; empty types are omitted.
 */
export function groupPartRecommendationsByType(
  recommendations: PartRecommendationViewModel[]
): PartRecommendationGroup[] {
  const buckets = new Map<PartRecommendationType, PartRecommendationViewModel[]>();
  for (const t of PART_RECOMMENDATION_GROUP_ORDER) {
    buckets.set(t, []);
  }
  for (const rec of recommendations) {
    const list = buckets.get(rec.recommendationType);
    if (list) {
      list.push(rec);
    } else {
      buckets.get("VERIFY_REQUIRED")!.push(rec);
    }
  }
  return PART_RECOMMENDATION_GROUP_ORDER.filter(
    (t) => (buckets.get(t)?.length ?? 0) > 0
  ).map((recommendationType) => ({
    recommendationType,
    items: buckets.get(recommendationType) ?? [],
  }));
}

/**
 * Order groups by {@link PART_RECOMMENDATION_GROUP_ORDER} and sort items inside each group
 * with {@link sortPartRecommendationsWithinGroup}.
 */
export function sortPartRecommendationGroups(
  groups: PartRecommendationGroup[]
): PartRecommendationGroup[] {
  return [...groups]
    .sort((a, b) => recommendationRank(a.recommendationType) - recommendationRank(b.recommendationType))
    .map((g) => ({
      ...g,
      items: sortPartRecommendationsWithinGroup(g.items),
    }));
}

/** Group, order sections, and sort rows — use in web/Expo for consistent UX. */
export function buildPartRecommendationGroupsForDisplay(
  recommendations: PartRecommendationViewModel[]
): PartRecommendationGroup[] {
  return sortPartRecommendationGroups(groupPartRecommendationsByType(recommendations));
}

function hasVisiblePriceLegacy(item: PartRecommendationViewModel): boolean {
  return item.priceAmount != null || Boolean(item.currency?.trim());
}

/** Flat sort for API or legacy lists: type, relation, confidence, price hint, name. */
export function sortPartRecommendations(
  recommendations: PartRecommendationViewModel[]
): PartRecommendationViewModel[] {
  return [...recommendations].sort((a, b) => {
    const byType = recommendationRank(a.recommendationType) - recommendationRank(b.recommendationType);
    if (byType !== 0) return byType;
    const byRelation = relationRank(a.relationType) - relationRank(b.relationType);
    if (byRelation !== 0) return byRelation;
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    const priceDiff = Number(hasVisiblePriceLegacy(b)) - Number(hasVisiblePriceLegacy(a));
    if (priceDiff !== 0) return priceDiff;
    return a.canonicalName.localeCompare(b.canonicalName, "ru");
  });
}
