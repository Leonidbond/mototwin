import type {
  AdminCatalogApplicationDetailWire,
  AdminCatalogApplicationListItemWire,
  ReviewStatus,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { approveAndPromoteCatalogApplication } from "@/lib/catalog-staging/promote";
import { parseRawNotesMetadata } from "@mototwin/domain";

export type CatalogStagingListFilters = {
  reviewStatus?: ReviewStatus;
  brand?: string;
  nodeCode?: string;
  importBatch?: string;
  page?: number;
  pageSize?: number;
};

export async function loadCatalogStagingList(filters: CatalogStagingListFilters): Promise<{
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  items: AdminCatalogApplicationListItemWire[];
}> {
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const page = Math.max(1, filters.page ?? 1);
  const where: {
    reviewStatus?: ReviewStatus;
    brand?: { contains: string; mode: "insensitive" };
    importBatch?: string;
    node?: { code?: string };
  } = {};

  if (filters.reviewStatus) where.reviewStatus = filters.reviewStatus;
  if (filters.brand?.trim()) where.brand = { contains: filters.brand.trim(), mode: "insensitive" };
  if (filters.importBatch?.trim()) where.importBatch = filters.importBatch.trim();
  if (filters.nodeCode?.trim()) where.node = { code: filters.nodeCode.trim() };

  const [total, rows] = await Promise.all([
    prisma.partCatalogApplication.count({ where }),
    prisma.partCatalogApplication.findMany({
      where,
      orderBy: [{ reviewStatus: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { node: { select: { code: true, name: true } }, source: true },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    items: rows.map((row) => ({
      id: row.id,
      brand: row.brand,
      modelFamily: row.modelFamily,
      variant: row.variant,
      generationCode: row.generationCode,
      nodeCode: row.node.code,
      nodeName: row.node.name,
      partNumber: row.partNumber,
      partName: row.partName,
      reviewStatus: row.reviewStatus,
      confidence: row.confidence,
      sourceRegion: row.source.sourceRegion,
      market: row.market,
      importBatch: row.importBatch,
      promotedAt: row.promotedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function loadCatalogStagingDetail(
  id: string
): Promise<AdminCatalogApplicationDetailWire | null> {
  const row = await prisma.partCatalogApplication.findUnique({
    where: { id },
    include: {
      node: { select: { code: true, name: true } },
      source: true,
    },
  });
  if (!row) return null;

  let resolveStatus: AdminCatalogApplicationDetailWire["resolveStatus"] = "ok";
  let resolveMessage: string | null = null;
  if (!row.motorcycleGenerationId) {
    resolveStatus = row.motorcycleVariantId ? "partial" : "failed";
    resolveMessage = "Поколение мотоцикла не разрешено";
  } else if (!row.motorcycleVariantId || !row.motorcycleModelFamilyId) {
    resolveStatus = "partial";
    resolveMessage = "Частичное разрешение иерархии мотоцикла";
  }

  return {
    id: row.id,
    brand: row.brand,
    modelFamily: row.modelFamily,
    variant: row.variant,
    generationCode: row.generationCode,
    nodeCode: row.node.code,
    nodeName: row.node.name,
    partNumber: row.partNumber,
    partName: row.partName,
    reviewStatus: row.reviewStatus,
    confidence: row.confidence,
    sourceRegion: row.source.sourceRegion,
    market: row.market,
    importBatch: row.importBatch,
    promotedAt: row.promotedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    yearFrom: row.yearFrom,
    yearTo: row.yearTo,
    nodeApplicability: row.nodeApplicability,
    partManufacturer: row.partManufacturer,
    normalizedPartNumber: row.normalizedPartNumber,
    partCategory: row.partCategory,
    isOem: row.isOem,
    applicationType: row.applicationType,
    sourceName: row.source.sourceName,
    sourceType: row.source.sourceType,
    sourceUrl: row.sourceUrl,
    diagramName: row.diagramName,
    diagramPosition: row.diagramPosition,
    rawQuantity: row.rawQuantity,
    rawNotes: row.rawNotes,
    safetyCritical: row.safetyCritical,
    parsedAt: row.parsedAt.toISOString(),
    stagingRowKey: row.stagingRowKey,
    sourceKey: row.sourceKey,
    sourceModelCode: row.sourceModelCode,
    sourceYear: row.sourceYear,
    verificationRegion: row.verificationRegion,
    evidenceLevel: row.evidenceLevel,
    regionMatchStatus: row.regionMatchStatus,
    supersessionStatus: row.supersessionStatus,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    parserVersion: row.parserVersion,
    promotedSkuId: row.promotedSkuId,
    promotedFitmentId: row.promotedFitmentId,
    resolveStatus,
    resolveMessage,
  };
}

export async function rejectCatalogStagingApplication(id: string): Promise<void> {
  await prisma.partCatalogApplication.update({
    where: { id },
    data: { reviewStatus: "REJECTED" },
  });
}

export async function approveCatalogStagingApplication(id: string): Promise<{
  skuId: string | null;
  fitmentId: string | null;
}> {
  return approveAndPromoteCatalogApplication(prisma, id);
}

export function formatStagingMetadataForAdmin(
  rawNotes: string | null,
  explicit?: {
    sourceModelCode?: string | null;
    verificationRegion?: string | null;
    evidenceLevel?: string | null;
    regionMatchStatus?: string | null;
    parserVersion?: string | null;
    importBatch?: string | null;
  }
): string {
  const meta = parseRawNotesMetadata(rawNotes);
  const skip = new Set<string>();
  if (explicit?.sourceModelCode) skip.add("source_model_code");
  if (explicit?.verificationRegion) skip.add("verification_region");
  if (explicit?.evidenceLevel) skip.add("evidence_level");
  if (explicit?.regionMatchStatus) skip.add("region_match_status");
  if (explicit?.parserVersion) skip.add("parser_version");
  if (explicit?.importBatch) skip.add("import_batch");

  const keys = [
    "evidence_level",
    "region_match_status",
    "verification_region",
    "source_model_code",
    "import_batch",
    "parser_version",
  ];
  return keys
    .filter((k) => !skip.has(k) && meta[k])
    .map((k) => `${k}=${meta[k]}`)
    .join("; ");
}
