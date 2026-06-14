import type { MotorcycleCatalogRequest, PrismaClient } from "@prisma/client";
import {
  buildMotorcycleGenerationName,
  buildMotorcycleYearsLabel,
  normalizeMotorcycleCatalogName,
  slugifyMotorcycleCatalogValue,
} from "@mototwin/domain";
import { buildUniqueCatalogSlug } from "@/lib/motorcycle-catalog-placeholder";

export type CatalogRequestResolvedFields = {
  brandName: string;
  familyName: string;
  variantName: string;
  yearFrom: number;
  yearTo: number | null;
};

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

export function resolveCatalogRequestFields(
  request: MotorcycleCatalogRequest,
  overrides?: Partial<CatalogRequestResolvedFields>,
  fallbacks?: { brandName?: string | null; familyName?: string | null }
): CatalogRequestResolvedFields {
  const brandName = (
    overrides?.brandName ??
    request.resolvedBrandName ??
    request.brandName ??
    fallbacks?.brandName ??
    ""
  ).trim();
  const familyName = (
    overrides?.familyName ??
    request.resolvedFamilyName ??
    request.familyName ??
    fallbacks?.familyName ??
    ""
  ).trim();
  const variantName = (
    overrides?.variantName ??
    request.resolvedVariantName ??
    request.variantName ??
    ""
  ).trim();
  const yearFrom = overrides?.yearFrom ?? request.resolvedYearFrom ?? request.yearFrom;
  const yearTo =
    overrides?.yearTo !== undefined
      ? overrides.yearTo
      : request.resolvedYearTo !== null && request.resolvedYearTo !== undefined
        ? request.resolvedYearTo
        : request.yearTo;

  if (!brandName || !familyName || !variantName) {
    throw new Error("Не заполнены марка, модель или модификация.");
  }
  if (yearTo != null && yearTo < yearFrom) {
    throw new Error("Год окончания не может быть раньше года начала.");
  }

  return { brandName, familyName, variantName, yearFrom, yearTo };
}

async function upsertBrand(tx: TxClient, brandName: string) {
  const slug = slugifyMotorcycleCatalogValue(brandName);
  const existing = await tx.motorcycleBrand.findFirst({
    where: {
      OR: [{ slug }, { name: { equals: brandName, mode: "insensitive" } }],
      isCatalogPlaceholder: false,
    },
  });
  if (existing) {
    return existing;
  }
  return tx.motorcycleBrand.create({
    data: {
      name: brandName.trim(),
      slug: slug || buildUniqueCatalogSlug(brandName, "brand"),
    },
  });
}

async function upsertFamily(tx: TxClient, brandId: string, familyName: string) {
  const slug = slugifyMotorcycleCatalogValue(familyName);
  const existing = await tx.motorcycleModelFamily.findFirst({
    where: {
      brandId,
      OR: [{ slug }, { name: { equals: familyName, mode: "insensitive" } }],
    },
  });
  if (existing) {
    return existing;
  }
  return tx.motorcycleModelFamily.create({
    data: {
      brandId,
      name: familyName.trim(),
      slug: slug || buildUniqueCatalogSlug(familyName, "family"),
    },
  });
}

async function upsertVariant(tx: TxClient, familyId: string, variantName: string) {
  const slug = slugifyMotorcycleCatalogValue(variantName);
  const existing = await tx.motorcycleVariant.findFirst({
    where: {
      familyId,
      OR: [{ slug }, { name: { equals: variantName, mode: "insensitive" } }],
    },
  });
  if (existing) {
    return existing;
  }
  return tx.motorcycleVariant.create({
    data: {
      familyId,
      name: variantName.trim(),
      slug: slug || buildUniqueCatalogSlug(variantName, "variant"),
    },
  });
}

async function upsertGeneration(
  tx: TxClient,
  variantId: string,
  fields: CatalogRequestResolvedFields
) {
  const name = buildMotorcycleGenerationName(fields.yearFrom, fields.yearTo);
  const yearsLabel = buildMotorcycleYearsLabel(fields.yearFrom, fields.yearTo);

  const existing = await tx.motorcycleGeneration.findFirst({
    where: {
      variantId,
      yearFrom: fields.yearFrom,
      yearTo: fields.yearTo,
      name,
    },
    include: {
      variant: { include: { family: { include: { brand: true } } } },
    },
  });
  if (existing) {
    return existing;
  }

  return tx.motorcycleGeneration.create({
    data: {
      variantId,
      name,
      yearFrom: fields.yearFrom,
      yearTo: fields.yearTo,
      yearsLabel,
      marketRegion: "GLOBAL",
      segment: "unknown",
      supportLevel: "EARLY_BETA",
      dataStatus: "community_user_request",
    },
    include: {
      variant: { include: { family: { include: { brand: true } } } },
    },
  });
}

export async function upsertCatalogFromResolvedFields(
  tx: TxClient,
  request: MotorcycleCatalogRequest,
  overrides?: Partial<CatalogRequestResolvedFields>
) {
  const fields = resolveCatalogRequestFields(request, overrides);

  let brandId = request.motorcycleBrandId;
  let familyId = request.motorcycleModelFamilyId;

  if (brandId) {
    const brand = await tx.motorcycleBrand.findUnique({ where: { id: brandId } });
    if (!brand || brand.isCatalogPlaceholder) {
      brandId = null;
    }
  }

  if (familyId) {
    const family = await tx.motorcycleModelFamily.findUnique({ where: { id: familyId } });
    if (!family || (brandId && family.brandId !== brandId)) {
      familyId = null;
    }
  }

  const brand = brandId
    ? await tx.motorcycleBrand.findUniqueOrThrow({ where: { id: brandId } })
    : await upsertBrand(tx, fields.brandName);

  const family = familyId
    ? await tx.motorcycleModelFamily.findUniqueOrThrow({ where: { id: familyId } })
    : await upsertFamily(tx, brand.id, fields.familyName);

  const variant = await upsertVariant(tx, family.id, fields.variantName);
  const generation = await upsertGeneration(tx, variant.id, fields);

  return { fields, generation, brand, family, variant };
}

export function catalogRequestIdentityKey(input: {
  brandName?: string | null;
  familyName?: string | null;
  variantName: string;
  yearFrom: number;
  yearTo?: number | null;
  motorcycleBrandId?: string | null;
  motorcycleModelFamilyId?: string | null;
}): string {
  return [
    input.motorcycleBrandId ?? normalizeMotorcycleCatalogName(input.brandName ?? ""),
    input.motorcycleModelFamilyId ?? normalizeMotorcycleCatalogName(input.familyName ?? ""),
    normalizeMotorcycleCatalogName(input.variantName),
    String(input.yearFrom),
    input.yearTo != null ? String(input.yearTo) : "",
  ].join("|");
}
