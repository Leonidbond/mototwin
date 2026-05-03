import type {
  PartRecommendationType,
  PartRecommendationViewModel,
  PickerMerchandiseLabel,
  PickerMerchandiseRecommendations,
} from "@mototwin/types";
import { sortPartRecommendations } from "./part-recommendation";

const FITS_TYPES: ReadonlySet<PartRecommendationType> = new Set([
  "EXACT_FIT",
  "MODEL_FIT",
]);

const FITS_OR_GENERIC_TYPES: ReadonlySet<PartRecommendationType> = new Set([
  "EXACT_FIT",
  "MODEL_FIT",
  "GENERIC_NODE_MATCH",
]);

export const MERCHANDISE_LABELS_RU: Record<PickerMerchandiseLabel, string> = {
  BEST_FIT: "BEST FIT",
  BEST_VALUE: "BEST VALUE",
  FOR_YOUR_RIDE: "FOR YOUR RIDE",
};

function hasPrice(rec: PartRecommendationViewModel): boolean {
  return rec.priceAmount != null && Number.isFinite(rec.priceAmount);
}

function pickBestFit(
  recommendations: PartRecommendationViewModel[]
): PartRecommendationViewModel | null {
  const candidates = recommendations.filter((r) => FITS_TYPES.has(r.recommendationType));
  if (candidates.length === 0) {
    return null;
  }
  return sortPartRecommendations(candidates)[0] ?? null;
}

function pickBestValue(
  recommendations: PartRecommendationViewModel[],
  exclude: PartRecommendationViewModel | null
): PartRecommendationViewModel | null {
  const excludeId = exclude?.skuId ?? null;
  const priced = recommendations
    .filter((r) => FITS_TYPES.has(r.recommendationType))
    .filter((r) => hasPrice(r))
    .filter((r) => r.skuId !== excludeId);
  if (priced.length === 0) {
    return null;
  }
  return [...priced].sort((a, b) => {
    const priceDiff = (a.priceAmount ?? Number.POSITIVE_INFINITY) - (b.priceAmount ?? Number.POSITIVE_INFINITY);
    if (priceDiff !== 0) return priceDiff;
    return b.confidence - a.confidence;
  })[0] ?? null;
}

function pickForYourRide(
  recommendations: PartRecommendationViewModel[],
  exclude: ReadonlyArray<PartRecommendationViewModel | null>
): PartRecommendationViewModel | null {
  const excludeIds = new Set(exclude.filter(Boolean).map((r) => r!.skuId));
  const candidates = recommendations
    .filter((r) => FITS_OR_GENERIC_TYPES.has(r.recommendationType))
    .filter((r) => !excludeIds.has(r.skuId));
  if (candidates.length === 0) {
    return null;
  }
  return sortPartRecommendations(candidates)[0] ?? null;
}

/**
 * Раскладывает плоский список рекомендаций по 3 крупным merchandising-карточкам picker-страницы:
 * `BEST FIT` (лучший fitment), `BEST VALUE` (минимальная цена среди fits), `FOR YOUR RIDE` (следующий не bestFit/bestValue).
 *
 * Если для метки нет подходящего кандидата — соответствующее поле `null` (карточка скрывается).
 * Все остальные рекомендации возвращаются в `alternatives` для секции «Показать ещё рекомендации».
 */
export function classifyRecommendationsForPicker(
  recommendations: PartRecommendationViewModel[]
): PickerMerchandiseRecommendations {
  const bestFit = pickBestFit(recommendations);
  const bestValue = pickBestValue(recommendations, bestFit);
  const forYourRide = pickForYourRide(recommendations, [bestFit, bestValue]);
  const featuredIds = new Set(
    [bestFit, bestValue, forYourRide].filter(Boolean).map((r) => r!.skuId)
  );
  const alternatives = sortPartRecommendations(
    recommendations.filter((r) => !featuredIds.has(r.skuId))
  );
  return {
    bestFit,
    bestValue,
    forYourRide,
    alternatives,
  };
}
