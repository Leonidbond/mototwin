import type {
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
};

const recommendationLabelMap: Record<PartRecommendationType, string> = {
  EXACT_FIT: "Подходит к этой модификации",
  MODEL_FIT: "Подходит к модели",
  GENERIC_NODE_MATCH: "Универсальная позиция для узла",
  RELATED_CONSUMABLE: "Сопутствующий расходник",
  VERIFY_REQUIRED: "Проверьте совместимость",
};

export function getPartRecommendationLabel(type: PartRecommendationType): string {
  return recommendationLabelMap[type];
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

function getWarning(type: PartRecommendationType): string | null {
  if (type === "VERIFY_REQUIRED") {
    return "Требуется проверка совместимости по артикулу и параметрам.";
  }
  if (type === "RELATED_CONSUMABLE") {
    return "Проверьте применимость расходника к вашему сценарию обслуживания.";
  }
  return null;
}

export function buildPartRecommendationViewModel(
  input: RecommendationInput
): PartRecommendationViewModel {
  const recommendationType = classifyPartRecommendation(input);
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
    recommendationLabel: getPartRecommendationLabel(recommendationType),
    compatibilityWarning: getWarning(recommendationType),
  };
}

function recommendationRank(type: PartRecommendationType): number {
  switch (type) {
    case "EXACT_FIT":
      return 0;
    case "MODEL_FIT":
      return 1;
    case "GENERIC_NODE_MATCH":
      return 2;
    case "RELATED_CONSUMABLE":
      return 3;
    default:
      return 4;
  }
}

function relationRank(relationType: string): number {
  const t = relationType.trim().toUpperCase();
  if (t === "PRIMARY") return 0;
  if (t === "ALTERNATIVE") return 1;
  if (t === "KIT_COMPONENT") return 2;
  if (t === "RELATED_CONSUMABLE") return 3;
  return 4;
}

function hasVisiblePrice(item: PartRecommendationViewModel): boolean {
  return item.priceAmount != null || Boolean(item.currency?.trim());
}

export function sortPartRecommendations(
  recommendations: PartRecommendationViewModel[]
): PartRecommendationViewModel[] {
  return [...recommendations].sort((a, b) => {
    const byType = recommendationRank(a.recommendationType) - recommendationRank(b.recommendationType);
    if (byType !== 0) return byType;
    const byRelation = relationRank(a.relationType) - relationRank(b.relationType);
    if (byRelation !== 0) return byRelation;
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    const priceDiff = Number(hasVisiblePrice(b)) - Number(hasVisiblePrice(a));
    if (priceDiff !== 0) return priceDiff;
    return a.canonicalName.localeCompare(b.canonicalName, "ru");
  });
}
