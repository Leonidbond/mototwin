type FitmentRow = {
  motorcycleGenerationId: string | null;
  motorcycleVariantId: string | null;
  motorcycleModelFamilyId: string | null;
  motorcycleBrandId: string | null;
  fitmentType: string | null;
};

export type StructuredCatalogSignals = {
  catalogLineRu: string | null;
  provenanceLineRu: string | null;
  diagramHint: string | null;
  marketMismatch: boolean;
  hasExactGenerationFit: boolean;
  hasVariantFit: boolean;
  hasFamilyFit: boolean;
  hasBrandFit: boolean;
  hasGenericNodeFit: boolean;
  /**
   * @deprecated Renamed to {@link hasExactGenerationFit} after the unified motorcycle
   * model refactor (4-level hierarchy). Old callers can still consume this alias.
   */
  hasExactVariantFit: boolean;
  /**
   * @deprecated Renamed to {@link hasFamilyFit}; under the new hierarchy "model" =
   * `MotorcycleModelFamily`. Year ranges are now derived from generations.
   */
  hasModelYearFit: boolean;
};

/**
 * Analyses catalog `PartFitment` rows for the unified motorcycle hierarchy
 * (`MotorcycleBrand → MotorcycleModelFamily → MotorcycleVariant → MotorcycleGeneration`).
 * Buckets a SKU into one of {generation, variant, family, brand, generic} signals
 * based on which anchor IDs are filled and match the vehicle. Replaces the legacy
 * `(brandId, modelId, modelVariantId, yearFrom..yearTo)` analysis used before the
 * model standard refactor.
 */
export function analyzeStructuredCatalogSignals(
  fitmentRows: FitmentRow[],
  vehicle: {
    motorcycleBrandId: string;
    motorcycleModelFamilyId: string;
    motorcycleVariantId: string;
    motorcycleGenerationId: string;
  }
): StructuredCatalogSignals {
  let hasExactGenerationFit = false;
  let hasVariantFit = false;
  let hasFamilyFit = false;
  let hasBrandFit = false;
  let hasGenericNodeFit = false;

  for (const f of fitmentRows) {
    if (
      f.motorcycleGenerationId &&
      f.motorcycleGenerationId === vehicle.motorcycleGenerationId
    ) {
      hasExactGenerationFit = true;
    }
    if (
      !f.motorcycleGenerationId &&
      f.motorcycleVariantId &&
      f.motorcycleVariantId === vehicle.motorcycleVariantId
    ) {
      hasVariantFit = true;
    }
    if (
      !f.motorcycleGenerationId &&
      !f.motorcycleVariantId &&
      f.motorcycleModelFamilyId &&
      f.motorcycleModelFamilyId === vehicle.motorcycleModelFamilyId
    ) {
      hasFamilyFit = true;
    }
    if (
      !f.motorcycleGenerationId &&
      !f.motorcycleVariantId &&
      !f.motorcycleModelFamilyId &&
      f.motorcycleBrandId &&
      f.motorcycleBrandId === vehicle.motorcycleBrandId
    ) {
      hasBrandFit = true;
    }
    if ((f.fitmentType || "").toUpperCase() === "GENERIC_NODE") {
      hasGenericNodeFit = true;
    }
  }

  let catalogLineRu: string | null = null;
  if (hasExactGenerationFit) {
    catalogLineRu = "Каталог: зафиксирована применимость к вашему поколению.";
  } else if (hasVariantFit) {
    catalogLineRu = "Каталог: применимость к вашей модификации.";
  } else if (hasFamilyFit) {
    catalogLineRu = "Каталог: применимость к семейству модели.";
  } else if (hasBrandFit) {
    catalogLineRu = "Каталог: применимость к марке.";
  } else if (hasGenericNodeFit) {
    catalogLineRu = "Каталог: универсальная применимость по типу узла.";
  }

  return {
    catalogLineRu,
    provenanceLineRu: null,
    diagramHint: null,
    marketMismatch: false,
    hasExactGenerationFit,
    hasVariantFit,
    hasFamilyFit,
    hasBrandFit,
    hasGenericNodeFit,
    hasExactVariantFit: hasExactGenerationFit,
    hasModelYearFit: hasFamilyFit,
  };
}
