import type { Prisma, PartMasterStatus } from "@prisma/client";
import type {
  AdminPartDetailWire,
  AdminPartListFilters,
  AdminPartListItemWire,
  AdminPartListResponse,
  AdminPartStatusWire,
} from "@mototwin/types";
import { normalizePartNumber } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 25;

export async function loadAdminPartList(params: {
  filters?: AdminPartListFilters;
  page?: number;
  pageSize?: number;
}): Promise<AdminPartListResponse> {
  const filters = params.filters ?? {};
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const page = Math.max(1, params.page ?? 1);
  const skip = (page - 1) * pageSize;

  const where: Prisma.PartMasterWhereInput = {};
  if (filters.q) {
    where.OR = [
      { sku: { contains: filters.q, mode: "insensitive" } },
      { brandName: { contains: filters.q, mode: "insensitive" } },
      { title: { contains: filters.q, mode: "insensitive" } },
      { aliases: { some: { normalized: { contains: normalizePartNumber(filters.q) } } } },
    ];
  }
  if (filters.status) where.status = filters.status as PartMasterStatus;
  if (filters.brand) where.brandNormalized = filters.brand.trim().toLowerCase();
  if (filters.source) where.source = filters.source;

  const [total, parts] = await Promise.all([
    prisma.partMaster.count({ where }),
    prisma.partMaster.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: pageSize,
      skip,
      include: {
        _count: {
          select: { aliases: true, fitmentReports: true, fitmentConfidences: true },
        },
        fitmentConfidences: { select: { status: true } },
      },
    }),
  ]);

  const items: AdminPartListItemWire[] = parts.map((part) => {
    const verified = part.fitmentConfidences.filter(
      (fc) => fc.status === "VERIFIED_BY_MOTOTWIN" || fc.status === "COMMUNITY_CONFIRMED"
    ).length;
    const conflicts = part.fitmentConfidences.filter((fc) => fc.status === "MIXED_REPORTS").length;
    return {
      id: part.id,
      brandName: part.brandName,
      sku: part.sku,
      title: part.title,
      subcategory: part.subcategory,
      status: part.status as AdminPartStatusWire,
      source: part.source,
      aliasCount: part._count.aliases,
      reportsCount: part._count.fitmentReports,
      verifiedCount: verified,
      conflictsCount: conflicts,
      createdAt: part.createdAt.toISOString(),
      updatedAt: part.updatedAt.toISOString(),
    };
  });

  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    items,
  };
}

export async function loadAdminPartDetail(partMasterId: string): Promise<AdminPartDetailWire | null> {
  const part = await prisma.partMaster.findUnique({
    where: { id: partMasterId },
    include: {
      aliases: { orderBy: { createdAt: "desc" } },
      fitmentConfidences: {
        include: {
          motorcycleGeneration: {
            include: {
              variant: { include: { family: { include: { brand: true } } } },
            },
          },
          node: { select: { name: true } },
        },
      },
      _count: {
        select: { fitmentReports: true, fitmentConfidences: true, aliases: true },
      },
      fitmentReports: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          node: true,
          motorcycleGeneration: {
            include: {
              variant: { include: { family: { include: { brand: true } } } },
            },
          },
        },
      },
    },
  });
  if (!part) return null;

  const verified = part.fitmentConfidences.filter(
    (fc) => fc.status === "VERIFIED_BY_MOTOTWIN" || fc.status === "COMMUNITY_CONFIRMED"
  ).length;
  const conflicts = part.fitmentConfidences.filter((fc) => fc.status === "MIXED_REPORTS").length;

  const duplicates = await findDuplicates(part);

  return {
    id: part.id,
    brandName: part.brandName,
    sku: part.sku,
    title: part.title,
    subcategory: part.subcategory,
    description: part.description,
    imageUrl: part.imageUrl,
    status: part.status as AdminPartStatusWire,
    source: part.source,
    createdAt: part.createdAt.toISOString(),
    updatedAt: part.updatedAt.toISOString(),
    reportsCount: part._count.fitmentReports,
    verifiedCount: verified,
    conflictsCount: conflicts,
    aliases: part.aliases.map((a) => ({
      id: a.id,
      alias: a.alias,
      source: a.source,
      createdAt: a.createdAt.toISOString(),
    })),
    fitments: part.fitmentConfidences.map((fc) => ({
      motorcycleGenerationId: fc.motorcycleGenerationId,
      brandLabel: fc.motorcycleGeneration.variant.family.brand.name,
      modelFamilyLabel: fc.motorcycleGeneration.variant.family.name,
      variantLabel: fc.motorcycleGeneration.variant.name,
      generationLabel: fc.motorcycleGeneration.name,
      modelYear: fc.motorcycleGeneration.yearFrom,
      status: fc.status,
      reportCount: fc.reportCount,
      confidenceScore: fc.confidenceScore,
    })),
    recentReports: part.fitmentReports.map((r) => ({
      id: r.id,
      generationLabel: `${r.motorcycleGeneration.variant.family.brand.name} ${r.motorcycleGeneration.variant.family.name} ${r.motorcycleGeneration.variant.name} ${r.motorcycleGeneration.name}`.trim(),
      nodeLabel: r.node?.name ?? "—",
      fitmentResult: r.fitmentResult,
      moderationStatus: r.moderationStatus,
      createdAt: r.createdAt.toISOString(),
    })),
    duplicates,
  };
}

async function findDuplicates(part: { id: string; normalizedSku: string; brandNormalized: string }) {
  const candidates = await prisma.partMaster.findMany({
    where: {
      id: { not: part.id },
      OR: [
        { normalizedSku: part.normalizedSku },
        { aliases: { some: { normalized: part.normalizedSku } } },
      ],
    },
    take: 6,
    select: {
      id: true,
      brandName: true,
      sku: true,
      title: true,
      brandNormalized: true,
      normalizedSku: true,
    },
  });
  return candidates.map((candidate) => ({
    id: candidate.id,
    brandName: candidate.brandName,
    sku: candidate.sku,
    title: candidate.title,
    score:
      candidate.normalizedSku === part.normalizedSku && candidate.brandNormalized === part.brandNormalized
        ? 100
        : 80,
  }));
}

export function normalizeBrand(raw: string): string {
  return raw.trim().toLowerCase();
}
