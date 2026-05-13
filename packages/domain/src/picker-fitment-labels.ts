import type { FitmentConfidenceStatus, PartRecommendationViewModel, PartSkuViewModel } from "@mototwin/types";

/** Короткая подпись уровня совместимости для карточки в подборщике (каталог + слой сообщества). */
export function getPickerFitmentShortLabelRu(rec: PartRecommendationViewModel): string {
  if (rec.trustBadge === "VERIFIED_BY_MOTOTWIN") {
    return "Проверено MotoTwin";
  }
  if (rec.trustBadge === "COMMUNITY_CONFIRMED") {
    return "Подтверждено сообществом";
  }
  if (rec.trustBadge === "COMMUNITY_SIGNAL") {
    return "Отзывы владельцев";
  }
  switch (rec.recommendationType) {
    case "EXACT_FIT":
      return "Каталог: эта модификация";
    case "MODEL_FIT":
      return "Каталог: модель";
    case "GENERIC_NODE_MATCH":
      return "Каталог: узел";
    case "RELATED_CONSUMABLE":
      return "Сопутствующий расходник";
    case "VERIFY_REQUIRED":
    default:
      return "Нужна проверка";
  }
}

export function formatFitmentConfidenceStatusRu(status: FitmentConfidenceStatus): string {
  switch (status) {
    case "VERIFIED_BY_MOTOTWIN":
      return "Проверено MotoTwin";
    case "COMMUNITY_CONFIRMED":
      return "Подтверждено сообществом";
    case "FITS_WITH_MODIFICATION":
      return "Подходит с доработкой";
    case "MIXED_REPORTS":
      return "Разные отчёты";
    case "LOW_CONFIDENCE":
      return "Мало данных";
    case "REJECTED_LIKELY_INCOMPATIBLE":
      return "Высокий риск несовместимости";
    default:
      return status;
  }
}

/** Для строки поиска в подборщике: только сигнал по данным каталога SKU. */
export function getPickerSkuCatalogFitHintRu(sku: PartSkuViewModel): string {
  const linkMax = sku.nodeLinks.reduce((m, l) => Math.max(m, l.confidence), 0);
  const fitMax = sku.fitments.reduce((m, f) => Math.max(m, f.confidence), 0);
  const c = Math.max(linkMax, fitMax, 0);
  if (c >= 85) return "Каталог: высокая уверенность";
  if (c >= 60) return "Каталог: средняя уверенность";
  if (c > 0) return "Каталог: низкая уверенность";
  return "Каталог: проверьте применимость";
}
