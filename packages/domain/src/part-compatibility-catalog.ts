import type { FitmentReportResultWire } from "@mototwin/types";

type FitmentRow = {
  modelVariantId: string | null;
  modelId: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  fitmentType: string | null;
};

export type StructuredCatalogSignals = {
  catalogLineRu: string | null;
  hasExactVariantFit: boolean;
  hasModelYearFit: boolean;
  hasGenericNodeFit: boolean;
};

/**
 * Анализ строк каталога (PartFitment) для связки vehicle model / variant / год.
 * Логика совпадает с прежним fitment-report-sheet.
 */
export function analyzeStructuredCatalogSignals(
  fitmentRows: FitmentRow[],
  vehicle: {
    modelVariantId: string | null;
    modelId: string;
    modelYear: number | null;
  }
): StructuredCatalogSignals {
  let hasExactVariantFit = false;
  let hasModelYearFit = false;
  let hasGenericNodeFit = false;
  const vy = vehicle.modelYear;
  for (const f of fitmentRows) {
    if (vehicle.modelVariantId && f.modelVariantId === vehicle.modelVariantId) {
      hasExactVariantFit = true;
    }
    if (f.modelId && f.modelId === vehicle.modelId) {
      if (vy == null) {
        hasModelYearFit = true;
      } else {
        const yf = f.yearFrom ?? Number.MIN_SAFE_INTEGER;
        const yt = f.yearTo ?? Number.MAX_SAFE_INTEGER;
        if (vy >= yf && vy <= yt) {
          hasModelYearFit = true;
        }
      }
    }
    if ((f.fitmentType || "").toUpperCase() === "GENERIC_NODE") {
      hasGenericNodeFit = true;
    }
  }
  let catalogLineRu: string | null = null;
  if (hasExactVariantFit) {
    catalogLineRu = "Каталог: зафиксирована применимость к вашей модификации.";
  } else if (hasModelYearFit) {
    catalogLineRu = "Каталог: применимость к модели (по годам и модификациям).";
  } else if (hasGenericNodeFit) {
    catalogLineRu = "Каталог: универсальная применимость по типу узла.";
  }
  return { catalogLineRu, hasExactVariantFit, hasModelYearFit, hasGenericNodeFit };
}
