import type { PartCompatibilityReportWire } from "@mototwin/types";
import { formatFitmentConfidenceStatusRu } from "./picker-fitment-labels";
import { deriveDominantFitmentResult, fitmentReportResultHeadlineRu } from "./part-compatibility-report-logic";
import {
  ownerCountLabelRu,
  sourcePriorityVariantLabelRu,
  verdictSupportParagraphsRu,
} from "./part-compatibility-report-labels";

export type WishlistDetailCompatibilitySummary = {
  verdictTitle: string;
  verdictSubline: string;
  dominantLine: string | null;
  reportsLine: string;
  sourceLine: string;
  catalogLine: string | null;
  supportLines: string[];
};

export function buildWishlistDetailCompatibilitySummary(
  data: PartCompatibilityReportWire
): WishlistDetailCompatibilitySummary {
  const verdictTitle =
    data.confidence != null
      ? formatFitmentConfidenceStatusRu(data.confidence.status)
      : data.sourcePriority.titleRu;

  const verdictSubline =
    data.confidence != null
      ? data.confidence.tierLabelRu
      : data.breakdown.totalReports === 0
        ? "Нет отчётов владельцев"
        : "Оценка по отчётам владельцев";

  const dominant = deriveDominantFitmentResult(data.breakdown);
  const dominantLine = dominant
    ? `Преобладающий результат: ${fitmentReportResultHeadlineRu(dominant)}`
    : null;

  const reportsLine = `${ownerCountLabelRu(data.uniqueAuthorCount)} · всего записей ${data.breakdown.totalReports}`;

  return {
    verdictTitle,
    verdictSubline,
    dominantLine,
    reportsLine,
    sourceLine: sourcePriorityVariantLabelRu(data.sourcePriority.kind),
    catalogLine: data.structured.catalogLineRu?.trim() || null,
    supportLines: verdictSupportParagraphsRu(data).slice(0, 2),
  };
}
