import type { PartRecommendationViewModel, PartSkuViewModel } from "@mototwin/types";

export function normalizePartNumberForLookup(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function buildPartSkuViewModelFromRecommendation(
  rec: PartRecommendationViewModel
): PartSkuViewModel {
  const now = new Date().toISOString();
  return {
    id: rec.skuId,
    seedKey: null,
    primaryNodeId: rec.primaryNode?.id ?? null,
    brandName: rec.brandName,
    canonicalName: rec.canonicalName,
    partType: rec.partType,
    description: null,
    category: null,
    priceAmount: rec.priceAmount,
    currency: rec.currency,
    sourceUrl: null,
    isOem: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    primaryNode: rec.primaryNode,
    nodeLinks: [],
    fitments: [],
    offers: [],
    partNumbers: rec.partNumbers.map((number, idx) => ({
      id: `${rec.skuId}-${idx}`,
      skuId: rec.skuId,
      number,
      normalizedNumber: normalizePartNumberForLookup(number),
      numberType: "MANUFACTURER" as const,
      brandName: rec.brandName,
      createdAt: now,
    })),
  };
}
