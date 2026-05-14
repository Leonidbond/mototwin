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

/** 0–100: приоритет связи с выбранным узлом, иначе максимум по каталогу. */
export function getPickerSkuCatalogConfidencePercent(sku: PartSkuViewModel, nodeId: string | null): number {
  if (nodeId) {
    const link = sku.nodeLinks.find((l) => l.nodeId === nodeId);
    if (link != null) return Math.min(100, Math.max(0, Math.round(link.confidence)));
  }
  const linkMax = sku.nodeLinks.reduce((m, l) => Math.max(m, l.confidence), 0);
  const fitMax = sku.fitments.reduce((m, f) => Math.max(m, f.confidence), 0);
  return Math.min(100, Math.max(0, Math.round(Math.max(linkMax, fitMax, 0))));
}

/**
 * Одна строка для карточки в подборщике: слой совместимости, уверенность (сообщество или каталог %), число отчётов.
 */
export function getPickerRecommendationStatsLineRu(rec: PartRecommendationViewModel): string {
  const fit = getPickerFitmentShortLabelRu(rec);
  const conf =
    rec.communityStatus != null
      ? formatFitmentConfidenceStatusRu(rec.communityStatus)
      : `оценка каталога ${Math.min(100, Math.max(0, Math.round(rec.confidence)))}%`;
  const n = rec.communityReportCount;
  const installs = n === 0 ? "нет опубликованных отчётов" : `${n} ${pluralReportsShortRu(n)}`;
  return `${fit} · ${conf} · ${installs}`;
}

/** Строка поиска: каталог; число отчётов сообщества в этом списке не подгружается — см. отчёт по ссылке. */
export function getPickerSkuSearchStatsLineRu(sku: PartSkuViewModel, nodeId: string | null): string {
  const hint = getPickerSkuCatalogFitHintRu(sku);
  const pct = getPickerSkuCatalogConfidencePercent(sku, nodeId);
  return `${hint} · ${pct}% · см. отчёт`;
}

function pluralReportsShortRu(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "отчёт";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "отчёта";
  return "отчётов";
}
