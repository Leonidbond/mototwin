import type { PrismaClient } from "@prisma/client";

export type MotorcycleResolverIndex = {
  brandIdByName: Map<string, string>;
  familyIdByBrandAndName: Map<string, string>;
  variantIdByFamilyAndName: Map<string, string>;
  generationIdByVariantAndName: Map<string, string>;
  generationIdsByVariantAndYear: Map<string, string[]>;
};

export type ResolvedMotorcycleRefs = {
  motorcycleBrandId: string | null;
  motorcycleModelFamilyId: string | null;
  motorcycleVariantId: string | null;
  motorcycleGenerationId: string | null;
  resolveStatus: "ok" | "partial" | "failed";
  resolveMessage: string | null;
};

export async function buildMotorcycleResolverIndex(
  prisma: PrismaClient
): Promise<MotorcycleResolverIndex> {
  const [brands, families, variants, generations] = await Promise.all([
    prisma.motorcycleBrand.findMany({ select: { id: true, name: true } }),
    prisma.motorcycleModelFamily.findMany({
      select: { id: true, brandId: true, name: true },
    }),
    prisma.motorcycleVariant.findMany({
      select: { id: true, familyId: true, name: true },
    }),
    prisma.motorcycleGeneration.findMany({
      select: { id: true, variantId: true, name: true, yearFrom: true, yearTo: true },
    }),
  ]);

  const brandIdByName = new Map(brands.map((b) => [b.name, b.id]));
  const familyIdByBrandAndName = new Map(
    families.map((f) => [`${f.brandId}\t${f.name}`, f.id])
  );
  const variantIdByFamilyAndName = new Map(
    variants.map((v) => [`${v.familyId}\t${v.name}`, v.id])
  );
  const generationIdByVariantAndName = new Map(
    generations.map((g) => [`${g.variantId}\t${g.name}`, g.id])
  );
  const generationIdsByVariantAndYear = new Map<string, string[]>();
  for (const g of generations) {
    const key = `${g.variantId}\t${g.yearFrom}`;
    const list = generationIdsByVariantAndYear.get(key) ?? [];
    list.push(g.id);
    generationIdsByVariantAndYear.set(key, list);
  }

  return {
    brandIdByName,
    familyIdByBrandAndName,
    variantIdByFamilyAndName,
    generationIdByVariantAndName,
    generationIdsByVariantAndYear,
  };
}

/**
 * Resolves staging motorcycle strings to FKs.
 * Falls back to year_from match when generation code (e.g. KA1) does not match generation name.
 */
export function resolveMotorcycleRefs(input: {
  brand: string;
  modelFamily: string;
  variant: string;
  generationCode: string;
  yearFrom: number;
  index: MotorcycleResolverIndex;
}): ResolvedMotorcycleRefs {
  const brandId = input.index.brandIdByName.get(input.brand.trim()) ?? null;
  if (!brandId) {
    return {
      motorcycleBrandId: null,
      motorcycleModelFamilyId: null,
      motorcycleVariantId: null,
      motorcycleGenerationId: null,
      resolveStatus: "failed",
      resolveMessage: `Brand not found: ${input.brand}`,
    };
  }

  const familyKey = `${brandId}\t${input.modelFamily.trim()}`;
  const familyId = input.index.familyIdByBrandAndName.get(familyKey) ?? null;

  let variantId: string | null = null;
  if (familyId) {
    const variantNames = [input.variant.trim(), input.modelFamily.trim()];
    for (const name of variantNames) {
      variantId = input.index.variantIdByFamilyAndName.get(`${familyId}\t${name}`) ?? null;
      if (variantId) break;
    }
  }

  let generationId: string | null = null;
  if (variantId) {
    const genName = input.generationCode.trim();
    generationId =
      input.index.generationIdByVariantAndName.get(`${variantId}\t${genName}`) ?? null;

    if (!generationId) {
      const yearCandidates =
        input.index.generationIdsByVariantAndYear.get(`${variantId}\t${input.yearFrom}`) ?? [];
      if (yearCandidates.length === 1) {
        generationId = yearCandidates[0]!;
      } else if (yearCandidates.length > 1) {
        generationId = yearCandidates[0]!;
      }
    }
  }

  const hasGeneration = Boolean(generationId);
  const hasVariant = Boolean(variantId);
  const hasFamily = Boolean(familyId);

  let resolveStatus: ResolvedMotorcycleRefs["resolveStatus"] = "ok";
  let resolveMessage: string | null = null;

  if (!hasFamily) {
    resolveStatus = "partial";
    resolveMessage = `Model family not found: ${input.modelFamily}`;
  } else if (!hasVariant) {
    resolveStatus = "partial";
    resolveMessage = `Variant not found: ${input.variant}`;
  } else if (!hasGeneration) {
    resolveStatus = "partial";
    resolveMessage = `Generation not resolved: ${input.generationCode} / ${input.yearFrom}`;
  }

  return {
    motorcycleBrandId: brandId,
    motorcycleModelFamilyId: familyId,
    motorcycleVariantId: variantId,
    motorcycleGenerationId: generationId,
    resolveStatus,
    resolveMessage,
  };
}

export function extractBaseUrl(sourceUrl: string): string {
  try {
    const url = new URL(sourceUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return sourceUrl.trim();
  }
}
