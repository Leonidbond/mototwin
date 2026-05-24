import type { Prisma, ModelSupportLevel } from "@prisma/client";
import type {
  AdminModelDetailWire,
  AdminModelListItemWire,
  AdminModelListResponse,
  AdminModelSupportSummaryWire,
  AdminSupportLevel,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 25;

interface ModelListFilters {
  q?: string;
  motorcycleBrandId?: string;
  supportLevel?: AdminSupportLevel;
}

const EMPTY_SUMMARY: AdminModelSupportSummaryWire = {
  mvpCore: 0,
  mvpCoreLegacy: 0,
  community: 0,
  earlyBeta: 0,
  noFitmentDataYet: 0,
};

function bumpSummary(
  summary: AdminModelSupportSummaryWire,
  level: AdminSupportLevel
): AdminModelSupportSummaryWire {
  switch (level) {
    case "MVP_CORE":
      return { ...summary, mvpCore: summary.mvpCore + 1 };
    case "MVP_CORE_LEGACY":
      return { ...summary, mvpCoreLegacy: summary.mvpCoreLegacy + 1 };
    case "COMMUNITY_SUPPORT":
      return { ...summary, community: summary.community + 1 };
    case "EARLY_BETA":
      return { ...summary, earlyBeta: summary.earlyBeta + 1 };
    case "NO_FITMENT_DATA_YET":
      return { ...summary, noFitmentDataYet: summary.noFitmentDataYet + 1 };
    default:
      return summary;
  }
}

export async function loadAdminModelList(params: {
  filters?: ModelListFilters;
  page?: number;
  pageSize?: number;
}): Promise<AdminModelListResponse> {
  const filters = params.filters ?? {};
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const page = Math.max(1, params.page ?? 1);
  const skip = (page - 1) * pageSize;

  const where: Prisma.MotorcycleGenerationWhereInput = {};
  if (filters.motorcycleBrandId) {
    where.variant = {
      family: { brandId: filters.motorcycleBrandId },
    };
  }
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { variant: { name: { contains: filters.q, mode: "insensitive" } } },
      {
        variant: {
          family: { name: { contains: filters.q, mode: "insensitive" } },
        },
      },
      {
        variant: {
          family: {
            brand: { name: { contains: filters.q, mode: "insensitive" } },
          },
        },
      },
    ];
  }
  if (filters.supportLevel) {
    where.supportLevel = filters.supportLevel as ModelSupportLevel;
  }

  const [total, generations] = await Promise.all([
    prisma.motorcycleGeneration.count({ where }),
    prisma.motorcycleGeneration.findMany({
      where,
      orderBy: [{ yearFrom: "desc" }, { name: "asc" }],
      take: pageSize,
      skip,
      include: {
        variant: {
          include: {
            family: { include: { brand: true } },
          },
        },
        _count: {
          select: {
            vehicles: true,
            fitmentReports: true,
            fitmentConfidences: true,
          },
        },
        fitmentConfidences: { select: { status: true } },
      },
    }),
  ]);

  const items: AdminModelListItemWire[] = generations.map((generation) => {
    const variant = generation.variant;
    const family = variant.family;
    const brand = family.brand;
    const verified = generation.fitmentConfidences.filter(
      (fc) =>
        fc.status === "VERIFIED_BY_MOTOTWIN" ||
        fc.status === "COMMUNITY_CONFIRMED"
    ).length;
    const conflicts = generation.fitmentConfidences.filter(
      (fc) => fc.status === "MIXED_REPORTS"
    ).length;
    const overrideLevel = generation.supportLevel as AdminSupportLevel | null;
    return {
      motorcycleGenerationId: generation.id,
      motorcycleBrandId: brand.id,
      motorcycleModelFamilyId: family.id,
      motorcycleVariantId: variant.id,
      brandLabel: brand.name,
      modelFamilyLabel: family.name,
      variantLabel: variant.name,
      generationLabel: generation.name,
      modelYear: null,
      productionYearFrom: generation.yearFrom,
      productionYearTo: generation.yearTo ?? null,
      garageCount: generation._count.vehicles,
      reportsCount: generation._count.fitmentReports,
      verifiedCount: verified,
      conflictsCount: conflicts,
      supportLevel: (generation.supportLevel as AdminSupportLevel) ?? "EARLY_BETA",
      supportLevelOverride: overrideLevel,
    };
  });

  const summary = items.reduce<AdminModelSupportSummaryWire>(
    (acc, item) => bumpSummary(acc, item.supportLevel),
    { ...EMPTY_SUMMARY }
  );

  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    summary,
    items,
  };
}

export async function loadAdminModelDetail(
  motorcycleGenerationId: string
): Promise<AdminModelDetailWire | null> {
  const generation = await prisma.motorcycleGeneration.findUnique({
    where: { id: motorcycleGenerationId },
    include: {
      variant: {
        include: {
          family: { include: { brand: true } },
        },
      },
      technicalSpecs: true,
      _count: {
        select: { vehicles: true, fitmentReports: true },
      },
      fitmentConfidences: {
        include: { node: { select: { id: true, name: true } } },
      },
    },
  });
  if (!generation) return null;

  const verified = generation.fitmentConfidences.filter(
    (fc) =>
      fc.status === "VERIFIED_BY_MOTOTWIN" || fc.status === "COMMUNITY_CONFIRMED"
  ).length;
  const conflicts = generation.fitmentConfidences.filter(
    (fc) => fc.status === "MIXED_REPORTS"
  ).length;

  const nodeBuckets = new Map<
    string,
    { nodeLabel: string; verified: number; reports: number; conflicts: number }
  >();
  for (const fc of generation.fitmentConfidences) {
    const node = fc.node;
    const bucket = nodeBuckets.get(node.id) ?? {
      nodeLabel: node.name,
      verified: 0,
      reports: 0,
      conflicts: 0,
    };
    bucket.reports += fc.reportCount;
    if (
      fc.status === "VERIFIED_BY_MOTOTWIN" ||
      fc.status === "COMMUNITY_CONFIRMED"
    ) {
      bucket.verified += 1;
    }
    if (fc.status === "MIXED_REPORTS") bucket.conflicts += 1;
    nodeBuckets.set(node.id, bucket);
  }

  const overrideLevel = generation.supportLevel as AdminSupportLevel | null;
  const variant = generation.variant;
  const family = variant.family;
  const brand = family.brand;
  const specs = generation.technicalSpecs;

  return {
    motorcycleGenerationId: generation.id,
    motorcycleBrandId: brand.id,
    motorcycleModelFamilyId: family.id,
    motorcycleVariantId: variant.id,
    brandLabel: brand.name,
    modelFamilyLabel: family.name,
    variantLabel: variant.name,
    generationLabel: generation.name,
    modelYear: null,
    productionYearFrom: generation.yearFrom,
    productionYearTo: generation.yearTo ?? null,
    marketRegion: generation.marketRegion ? String(generation.marketRegion) : null,
    /** Closest schema field for the curated «engine type» plaque cell. */
    engineType: specs?.engine?.trim() || null,
    /** Not surfaced on the unified technical-master schema yet. */
    coolingType: null,
    wheelSizes: null,
    brakeSystem: null,
    chainPitch: null,
    stockSprockets: null,
    supportLevel: (generation.supportLevel as AdminSupportLevel) ?? "EARLY_BETA",
    supportLevelOverride: overrideLevel,
    supportLevelReason: generation.supportLevelReason ?? null,
    garageCount: generation._count.vehicles,
    reportsCount: generation._count.fitmentReports,
    verifiedCount: verified,
    conflictsCount: conflicts,
    nodeCoverage: Array.from(nodeBuckets.entries())
      .map(([nodeId, bucket]) => ({
        nodeId,
        nodeLabel: bucket.nodeLabel,
        verified: bucket.verified,
        reports: bucket.reports,
        conflicts: bucket.conflicts,
      }))
      .sort((a, b) => b.reports - a.reports)
      .slice(0, 12),
  };
}
