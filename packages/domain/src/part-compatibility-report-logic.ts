import type {
  CompatibilityConfidenceTierWire,
  FitmentConfidenceStatus,
  FitmentReportResultWire,
  PartCompatibilityBreakdownWire,
  PartCompatibilitySourcePriorityWire,
} from "@mototwin/types";

/** Заголовок исхода отчёта для UI (спека §6). */
export function fitmentReportResultHeadlineRu(result: FitmentReportResultWire): string {
  switch (result) {
    case "DIRECT_FIT":
      return "Подошла без доработок";
    case "FIT_WITH_MODIFICATION":
      return "Подошла с доработкой";
    case "PARTIAL_FIT":
      return "Подошла частично / не уверен";
    case "DOES_NOT_FIT":
      return "Не подошла";
    case "OEM_REPLACEMENT":
      return "OEM-замена / полный аналог";
    default:
      return result;
  }
}

export function compatibilityConfidenceTierLabelRu(tier: CompatibilityConfidenceTierWire): string {
  switch (tier) {
    case "high":
      return "Высокая уверенность";
    case "medium":
      return "Средняя уверенность";
    case "low":
      return "Низкая уверенность";
    default:
      return tier;
  }
}

/** Спека §13: факторы для tooltip (не технический score как главный элемент). */
export const COMPATIBILITY_CONFIDENCE_TOOLTIP_LINES_RU: readonly string[] = [
  "Количество опубликованных отчётов по этой модификации и узлу",
  "Совпадение модели и узла",
  "Наличие фото и доказательств в отчётах",
  "Связь с сервисными событиями",
  "Подтверждения и опровержения других владельцев",
  "Противоречивые отчёты снижают уверенность",
  "Данные каталога MotoTwin (structured fitment)",
];

export function deriveCompatibilityConfidenceTier(input: {
  status: FitmentConfidenceStatus;
  publishedReportTotal: number;
}): CompatibilityConfidenceTierWire {
  const { status, publishedReportTotal } = input;
  if (status === "VERIFIED_BY_MOTOTWIN") return "high";
  if (status === "REJECTED_LIKELY_INCOMPATIBLE") return "medium";
  if (status === "LOW_CONFIDENCE") return "low";
  if (status === "MIXED_REPORTS") return "medium";
  if (status === "FITS_WITH_MODIFICATION") {
    return publishedReportTotal >= 5 ? "medium" : "low";
  }
  if (status === "COMMUNITY_CONFIRMED") {
    return publishedReportTotal >= 5 ? "high" : "medium";
  }
  return "low";
}

function countFor(
  breakdown: Pick<
    PartCompatibilityBreakdownWire,
    | "directFitCount"
    | "fitWithModificationCount"
    | "partialFitCount"
    | "doesNotFitCount"
    | "oemReplacementCount"
  >,
  r: FitmentReportResultWire
): number {
  switch (r) {
    case "DIRECT_FIT":
      return breakdown.directFitCount;
    case "FIT_WITH_MODIFICATION":
      return breakdown.fitWithModificationCount;
    case "PARTIAL_FIT":
      return breakdown.partialFitCount;
    case "DOES_NOT_FIT":
      return breakdown.doesNotFitCount;
    case "OEM_REPLACEMENT":
      return breakdown.oemReplacementCount;
    default:
      return 0;
  }
}

/** Доминирующий исход по числу отчётов; при равенстве — фиксированный приоритет типов. */
export function deriveDominantFitmentResult(
  breakdown: PartCompatibilityBreakdownWire
): FitmentReportResultWire | null {
  if (breakdown.totalReports <= 0) return null;
  const order: FitmentReportResultWire[] = [
    "DIRECT_FIT",
    "OEM_REPLACEMENT",
    "FIT_WITH_MODIFICATION",
    "PARTIAL_FIT",
    "DOES_NOT_FIT",
  ];
  let best: FitmentReportResultWire | null = null;
  let bestN = -1;
  for (const r of order) {
    const n = countFor(breakdown, r);
    if (n > bestN) {
      bestN = n;
      best = r;
    }
  }
  return best;
}

export function buildCompatibilityBreakdown(
  counts: Partial<Record<FitmentReportResultWire, number>>
): PartCompatibilityBreakdownWire {
  const directFitCount = counts.DIRECT_FIT ?? 0;
  const fitWithModificationCount = counts.FIT_WITH_MODIFICATION ?? 0;
  const partialFitCount = counts.PARTIAL_FIT ?? 0;
  const doesNotFitCount = counts.DOES_NOT_FIT ?? 0;
  const oemReplacementCount = counts.OEM_REPLACEMENT ?? 0;
  const totalReports =
    directFitCount +
    fitWithModificationCount +
    partialFitCount +
    doesNotFitCount +
    oemReplacementCount;
  const pct = (n: number) => (totalReports === 0 ? 0 : Math.round((1000 * n) / totalReports) / 10);
  return {
    directFitCount,
    fitWithModificationCount,
    partialFitCount,
    doesNotFitCount,
    oemReplacementCount,
    totalReports,
    directFitPercent: pct(directFitCount),
    fitWithModificationPercent: pct(fitWithModificationCount),
    partialFitPercent: pct(partialFitCount),
    doesNotFitPercent: pct(doesNotFitCount),
    oemReplacementPercent: pct(oemReplacementCount),
  };
}

export function deriveSourcePriority(input: {
  structured: {
    hasExactVariantFit: boolean;
    hasModelYearFit: boolean;
    catalogLineRu: string | null;
  };
  breakdown: PartCompatibilityBreakdownWire;
  dominant: FitmentReportResultWire | null;
}): PartCompatibilitySourcePriorityWire {
  const { structured, breakdown, dominant } = input;
  const structuredPositive = structured.hasExactVariantFit || structured.hasModelYearFit;
  const structuredAnyHint = Boolean(structured.catalogLineRu);
  const total = breakdown.totalReports;

  if (total === 0) {
    if (structuredPositive || structuredAnyHint) {
      return {
        kind: "structured_only",
        titleRu: "Проверено по правилам совместимости MotoTwin",
        detailRu: "Пользовательских отчётов по этой комбинации пока нет.",
      };
    }
    return {
      kind: "insufficient_data",
      titleRu: "Недостаточно данных",
      detailRu: "Нет ни каталоговой применимости, ни опубликованных отчётов владельцев.",
    };
  }

  if (!dominant) {
    return {
      kind: "community_only",
      titleRu: "Подтверждено отчётами владельцев",
      detailRu: null,
    };
  }

  const negativeDominant = dominant === "DOES_NOT_FIT";
  const positiveDominant =
    dominant === "DIRECT_FIT" || dominant === "OEM_REPLACEMENT" || dominant === "FIT_WITH_MODIFICATION";

  if (structuredPositive && negativeDominant) {
    return {
      kind: "conflict",
      titleRu: "Есть расхождение между правилами и отчётами владельцев",
      detailRu:
        "Каталог указывает на применимость к модификации, но часть отчётов сообщает о несовместимости. Проверьте конфигурацию и артикул.",
    };
  }

  if (structuredPositive && positiveDominant) {
    return {
      kind: "hybrid",
      titleRu: "Совпадает с правилами MotoTwin и подтверждено владельцами",
      detailRu: null,
    };
  }

  if (structuredPositive && !positiveDominant && !negativeDominant) {
    return {
      kind: "hybrid",
      titleRu: "Каталог + отчёты владельцев",
      detailRu: "Есть и каталоговая применимость, и отчёты с промежуточными исходами.",
    };
  }

  return {
    kind: "community_only",
    titleRu: "Подтверждено отчётами владельцев",
    detailRu: structuredAnyHint
      ? "Каталог даёт общий ориентир; итог опирается на опубликованные отчёты."
      : null,
  };
}
