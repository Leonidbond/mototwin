import type { MotorcycleCatalogRequest } from "@prisma/client";
import type { MotorcycleCatalogRequestWire } from "@mototwin/types";
import { resolveCatalogRequestFields } from "@/lib/motorcycle-catalog-request-approve";

export function toMotorcycleCatalogRequestWire(
  row: MotorcycleCatalogRequest & {
    motorcycleBrand?: { id: string; name: string } | null;
    motorcycleModelFamily?: { id: string; name: string } | null;
    submittedBy?: { id: string; displayName: string | null; email: string | null } | null;
    _count?: { vehicles: number };
  }
): MotorcycleCatalogRequestWire {
  const displayBrand =
    row.brandName?.trim() || row.motorcycleBrand?.name || "—";
  const displayFamily =
    row.familyName?.trim() || row.motorcycleModelFamily?.name || "—";

  return {
    id: row.id,
    status: row.status,
    motorcycleBrandId: row.motorcycleBrandId,
    motorcycleModelFamilyId: row.motorcycleModelFamilyId,
    brandName: row.brandName,
    familyName: row.familyName,
    variantName: row.variantName,
    yearFrom: row.yearFrom,
    yearTo: row.yearTo,
    userComment: row.userComment,
    resolvedBrandName: row.resolvedBrandName,
    resolvedFamilyName: row.resolvedFamilyName,
    resolvedVariantName: row.resolvedVariantName,
    resolvedYearFrom: row.resolvedYearFrom,
    resolvedYearTo: row.resolvedYearTo,
    moderationComment: row.moderationComment,
    resolvedGenerationId: row.resolvedGenerationId,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    displayLabel: `${displayBrand} ${displayFamily} ${row.variantName}`.trim(),
    vehicleCount: row._count?.vehicles ?? 0,
    submittedBy: row.submittedBy
      ? {
          id: row.submittedBy.id,
          displayName: row.submittedBy.displayName,
          email: row.submittedBy.email,
        }
      : null,
  };
}

export function getCatalogRequestEditableFields(
  request: MotorcycleCatalogRequest & {
    motorcycleBrand?: { name: string } | null;
    motorcycleModelFamily?: { name: string } | null;
  }
): {
  brandName: string;
  familyName: string;
  variantName: string;
  yearFrom: number;
  yearTo: number | null;
} {
  const resolved = resolveCatalogRequestFields(request, undefined, {
    brandName: request.motorcycleBrand?.name ?? null,
    familyName: request.motorcycleModelFamily?.name ?? null,
  });
  return resolved;
}

export function getCatalogRequestDisplayNames(input: {
  brandName?: string | null;
  familyName?: string | null;
  variantName: string;
  yearFrom: number;
  yearTo?: number | null;
  resolvedBrandName?: string | null;
  resolvedFamilyName?: string | null;
  resolvedVariantName?: string | null;
  resolvedYearFrom?: number | null;
  resolvedYearTo?: number | null;
  motorcycleBrand?: { name: string } | null;
  motorcycleModelFamily?: { name: string } | null;
}): {
  brandName: string;
  familyName: string;
  variantName: string;
  yearsLabel: string;
} {
  const brandName = (
    input.resolvedBrandName ??
    input.brandName ??
    input.motorcycleBrand?.name ??
    ""
  ).trim();
  const familyName = (
    input.resolvedFamilyName ??
    input.familyName ??
    input.motorcycleModelFamily?.name ??
    ""
  ).trim();
  const variantName = (input.resolvedVariantName ?? input.variantName).trim();
  const yearFrom = input.resolvedYearFrom ?? input.yearFrom;
  const yearTo =
    input.resolvedYearTo !== null && input.resolvedYearTo !== undefined
      ? input.resolvedYearTo
      : input.yearTo ?? null;
  const yearsLabel =
    yearTo != null && yearTo !== yearFrom ? `${yearFrom}–${yearTo}` : `${yearFrom}–`;
  return { brandName, familyName, variantName, yearsLabel };
}
