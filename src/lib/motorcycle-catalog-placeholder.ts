import type { PrismaClient } from "@prisma/client";
import { slugifyMotorcycleCatalogValue } from "@mototwin/domain";

export const PLACEHOLDER_BRAND_SLUG = "pending-catalog-review";
export const PLACEHOLDER_FAMILY_SLUG = "pending-catalog-review";
export const PLACEHOLDER_VARIANT_SLUG = "pending-catalog-review";
export const PLACEHOLDER_GENERATION_NAME = "pending";

export type CatalogPlaceholderRefs = {
  brandId: string;
  familyId: string;
  variantId: string;
  generationId: string;
};

/** Ensure the system placeholder catalog chain exists (idempotent). */
export async function ensureCatalogPlaceholder(
  prisma: Pick<
    PrismaClient,
    "motorcycleBrand" | "motorcycleModelFamily" | "motorcycleVariant" | "motorcycleGeneration"
  >
): Promise<CatalogPlaceholderRefs> {
  const brand = await prisma.motorcycleBrand.upsert({
    where: { slug: PLACEHOLDER_BRAND_SLUG },
    create: {
      name: "Ожидает модерации",
      slug: PLACEHOLDER_BRAND_SLUG,
      isCatalogPlaceholder: true,
    },
    update: { isCatalogPlaceholder: true },
    select: { id: true },
  });

  const family = await prisma.motorcycleModelFamily.upsert({
    where: {
      brandId_slug: { brandId: brand.id, slug: PLACEHOLDER_FAMILY_SLUG },
    },
    create: {
      brandId: brand.id,
      name: "Ожидает модерации",
      slug: PLACEHOLDER_FAMILY_SLUG,
    },
    update: {},
    select: { id: true },
  });

  const variant = await prisma.motorcycleVariant.upsert({
    where: {
      familyId_slug: { familyId: family.id, slug: PLACEHOLDER_VARIANT_SLUG },
    },
    create: {
      familyId: family.id,
      name: "Ожидает модерации",
      slug: PLACEHOLDER_VARIANT_SLUG,
    },
    update: {},
    select: { id: true },
  });

  const existingGeneration = await prisma.motorcycleGeneration.findFirst({
    where: {
      variantId: variant.id,
      name: PLACEHOLDER_GENERATION_NAME,
      yearFrom: 0,
    },
    select: { id: true },
  });

  const generation =
    existingGeneration ??
    (await prisma.motorcycleGeneration.create({
      data: {
        variantId: variant.id,
        name: PLACEHOLDER_GENERATION_NAME,
        yearFrom: 0,
        yearTo: null,
        yearsLabel: "—",
        marketRegion: "GLOBAL",
        segment: "unknown",
        supportLevel: "NO_FITMENT_DATA_YET",
        dataStatus: "catalog_placeholder",
      },
      select: { id: true },
    }));

  if (existingGeneration) {
    await prisma.motorcycleGeneration.update({
      where: { id: existingGeneration.id },
      data: {
        supportLevel: "NO_FITMENT_DATA_YET",
        dataStatus: "catalog_placeholder",
      },
    });
  }

  return {
    brandId: brand.id,
    familyId: family.id,
    variantId: variant.id,
    generationId: generation.id,
  };
}

export function isPlaceholderBrandSlug(slug: string): boolean {
  return slug === PLACEHOLDER_BRAND_SLUG;
}

export function buildUniqueCatalogSlug(base: string, suffix?: string): string {
  const slug = slugifyMotorcycleCatalogValue(base);
  if (!slug) {
    return suffix ? `entry-${suffix}` : "entry";
  }
  return suffix ? `${slug}-${suffix}` : slug;
}
