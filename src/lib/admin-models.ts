import type { Prisma, ModelSupportLevel } from "@prisma/client";
import type {
  AdminModelDetailWire,
  AdminModelListItemWire,
  AdminModelListResponse,
  AdminSupportLevel,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 25;

interface ModelListFilters {
  q?: string;
  brandId?: string;
  supportLevel?: AdminSupportLevel;
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

  const where: Prisma.ModelVariantWhereInput = {};
  if (filters.brandId) where.model = { is: { brandId: filters.brandId } };
  if (filters.q) {
    where.OR = [
      { versionName: { contains: filters.q, mode: "insensitive" } },
      { model: { name: { contains: filters.q, mode: "insensitive" } } },
      { model: { brand: { name: { contains: filters.q, mode: "insensitive" } } } },
    ];
  }
  if (filters.supportLevel) {
    where.supportLevel = filters.supportLevel as ModelSupportLevel;
  }

  const [total, variants] = await Promise.all([
    prisma.modelVariant.count({ where }),
    prisma.modelVariant.findMany({
      where,
      orderBy: [{ year: "desc" }, { versionName: "asc" }],
      take: pageSize,
      skip,
      include: {
        model: { include: { brand: true } },
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

  const items: AdminModelListItemWire[] = variants.map((variant) => {
    const verified = variant.fitmentConfidences.filter(
      (fc) => fc.status === "VERIFIED_BY_MOTOTWIN" || fc.status === "COMMUNITY_CONFIRMED"
    ).length;
    const conflicts = variant.fitmentConfidences.filter((fc) => fc.status === "MIXED_REPORTS").length;
    const overrideLevel = (variant.supportLevel as AdminSupportLevel | null) ?? null;
    const supportLevel: AdminSupportLevel =
      overrideLevel ??
      inferSupportLevel({
        garageCount: variant._count.vehicles,
        reports: variant._count.fitmentReports,
        verified,
        mixed: conflicts,
      });
    return {
      modelVariantId: variant.id,
      brandLabel: variant.model.brand.name,
      brandId: variant.model.brand.id,
      modelLabel: variant.model.name,
      modelId: variant.model.id,
      year: variant.year,
      versionName: variant.versionName,
      garageCount: variant._count.vehicles,
      reportsCount: variant._count.fitmentReports,
      verifiedCount: verified,
      conflictsCount: conflicts,
      supportLevel,
      supportLevelOverride: overrideLevel,
    };
  });

  const summary = items.reduce(
    (acc, item) => {
      if (item.supportLevel === "FULL_SUPPORT") acc.full += 1;
      else if (item.supportLevel === "COMMUNITY_SUPPORT") acc.community += 1;
      else if (item.supportLevel === "EARLY_BETA") acc.earlyBeta += 1;
      else acc.noData += 1;
      return acc;
    },
    { full: 0, community: 0, earlyBeta: 0, noData: 0 }
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

export async function loadAdminModelDetail(modelVariantId: string): Promise<AdminModelDetailWire | null> {
  const variant = await prisma.modelVariant.findUnique({
    where: { id: modelVariantId },
    include: {
      model: { include: { brand: true } },
      _count: {
        select: { vehicles: true, fitmentReports: true },
      },
      fitmentConfidences: {
        include: { node: { select: { id: true, name: true } } },
      },
    },
  });
  if (!variant) return null;

  const verified = variant.fitmentConfidences.filter(
    (fc) => fc.status === "VERIFIED_BY_MOTOTWIN" || fc.status === "COMMUNITY_CONFIRMED"
  ).length;
  const conflicts = variant.fitmentConfidences.filter((fc) => fc.status === "MIXED_REPORTS").length;

  const nodeBuckets = new Map<
    string,
    { nodeLabel: string; verified: number; reports: number; conflicts: number }
  >();
  for (const fc of variant.fitmentConfidences) {
    const node = fc.node;
    const bucket = nodeBuckets.get(node.id) ?? {
      nodeLabel: node.name,
      verified: 0,
      reports: 0,
      conflicts: 0,
    };
    bucket.reports += fc.reportCount;
    if (fc.status === "VERIFIED_BY_MOTOTWIN" || fc.status === "COMMUNITY_CONFIRMED") {
      bucket.verified += 1;
    }
    if (fc.status === "MIXED_REPORTS") bucket.conflicts += 1;
    nodeBuckets.set(node.id, bucket);
  }

  const overrideLevel = (variant.supportLevel as AdminSupportLevel | null) ?? null;
  const supportLevel: AdminSupportLevel =
    overrideLevel ??
    inferSupportLevel({
      garageCount: variant._count.vehicles,
      reports: variant._count.fitmentReports,
      verified,
      mixed: conflicts,
    });

  return {
    modelVariantId: variant.id,
    brandLabel: variant.model.brand.name,
    modelLabel: variant.model.name,
    year: variant.year,
    versionName: variant.versionName,
    generation: variant.generation,
    market: variant.market,
    engineType: variant.engineType,
    coolingType: variant.coolingType,
    wheelSizes: variant.wheelSizes,
    brakeSystem: variant.brakeSystem,
    chainPitch: variant.chainPitch,
    stockSprockets: variant.stockSprockets,
    supportLevel,
    supportLevelOverride: overrideLevel,
    supportLevelReason: variant.supportLevelReason ?? null,
    garageCount: variant._count.vehicles,
    reportsCount: variant._count.fitmentReports,
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

export function inferSupportLevel(stats: {
  garageCount: number;
  reports: number;
  verified: number;
  mixed: number;
}): AdminSupportLevel {
  if (stats.verified >= 5 && stats.mixed === 0 && stats.garageCount >= 100) return "FULL_SUPPORT";
  if (stats.verified >= 1 || stats.reports >= 10) return "COMMUNITY_SUPPORT";
  if (stats.reports >= 1 || stats.garageCount >= 5) return "EARLY_BETA";
  if (stats.garageCount === 0) return "NO_DATA";
  return "EARLY_BETA";
}
