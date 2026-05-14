import {
  buildPartRecommendationViewModel,
  buildPartSkuViewModel,
  mergeCommunityFitmentIntoRecommendation,
  sortPartRecommendations,
} from "@mototwin/domain";
import type { PrismaClient } from "@prisma/client";
import type { FitmentConfidenceStatus, PartRecommendationViewModel } from "@mototwin/types";

export type VehicleFitmentContext = {
  id: string;
  modelId: string;
  modelVariantId: string | null;
  modelVariant: { year: number } | null;
};

/**
 * Prisma `Vehicle` rows may have nullable `modelId` / `year`; recommendations need a strict context.
 */
export function narrowVehicleFitmentContext(vehicle: {
  id: string;
  modelId: string | null;
  modelVariantId: string | null;
  modelVariant: { year: number | null } | null;
}): VehicleFitmentContext | null {
  if (!vehicle.modelId?.trim()) {
    return null;
  }
  return {
    id: vehicle.id,
    modelId: vehicle.modelId,
    modelVariantId: vehicle.modelVariantId,
    modelVariant:
      vehicle.modelVariant?.year != null && Number.isFinite(vehicle.modelVariant.year)
        ? { year: vehicle.modelVariant.year }
        : null,
  };
}

/**
 * Loads SKU recommendations for a node and merges published {@link FitmentConfidence} for the vehicle variant.
 */
export async function buildRecommendationsForNodeWithCommunity(
  prisma: PrismaClient,
  vehicle: VehicleFitmentContext,
  nodeId: string,
  nodeMeta: { code: string; serviceGroup: string | null }
): Promise<PartRecommendationViewModel[]> {
  const rows = await prisma.partSku.findMany({
    where: {
      isActive: true,
      OR: [{ primaryNodeId: nodeId }, { nodeLinks: { some: { nodeId } } }],
    },
    include: {
      primaryNode: { select: { id: true, code: true, name: true } },
      partNumbers: { orderBy: { createdAt: "asc" as const } },
      nodeLinks: {
        include: { node: { select: { id: true, code: true, name: true } } },
        where: { nodeId },
        orderBy: { confidence: "desc" },
      },
      fitments: { orderBy: { confidence: "desc" } },
      offers: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    take: 60,
  });

  const masterIds = [...new Set(rows.map((r) => r.partMasterId).filter((id): id is string => Boolean(id)))];
  const publishedCountByMasterId = new Map<string, number>();
  const confidenceByMasterId = new Map<
    string,
    {
      confidenceScore: number;
      reportCount: number;
      confirmationCount: number;
      rejectionCount: number;
      modificationCount: number;
      status: import("@mototwin/types").FitmentConfidenceStatus;
      isStaffVerified: boolean;
    }
  >();

  if (masterIds.length > 0 && vehicle.modelVariantId) {
    const [confRows, publishedGroups] = await Promise.all([
      prisma.fitmentConfidence.findMany({
        where: {
          modelVariantId: vehicle.modelVariantId,
          nodeId,
          partMasterId: { in: masterIds },
        },
      }),
      prisma.fitmentReport.groupBy({
        by: ["partMasterId"],
        where: {
          modelVariantId: vehicle.modelVariantId,
          nodeId,
          partMasterId: { in: masterIds },
          moderationStatus: "PUBLISHED",
        },
        _count: { id: true },
      }),
    ]);
    for (const g of publishedGroups) {
      publishedCountByMasterId.set(g.partMasterId, g._count.id);
    }
    for (const c of confRows) {
      confidenceByMasterId.set(c.partMasterId, {
        confidenceScore: c.confidenceScore,
        reportCount: c.reportCount,
        confirmationCount: c.confirmationCount,
        rejectionCount: c.rejectionCount,
        modificationCount: c.modificationCount,
        status: c.status as FitmentConfidenceStatus,
        isStaffVerified: c.isStaffVerified,
      });
    }
  }

  const recommendations = rows.map((row) => {
    const sku = buildPartSkuViewModel(row);

    const relation = row.nodeLinks[0];
    const relationType =
      relation?.relationType?.trim() || (row.primaryNodeId === nodeId ? "PRIMARY" : "ALTERNATIVE");
    const relationConfidence = relation?.confidence ?? 60;

    const hasExactFit = row.fitments.some(
      (fitment) =>
        fitment.modelVariantId &&
        vehicle.modelVariantId &&
        fitment.modelVariantId === vehicle.modelVariantId
    );
    const hasModelFit = row.fitments.some((fitment) => {
      if (!fitment.modelId || fitment.modelId !== vehicle.modelId) {
        return false;
      }
      const vehicleYear = vehicle.modelVariant?.year ?? null;
      if (!vehicleYear) {
        return true;
      }
      const yearFrom = fitment.yearFrom ?? Number.MIN_SAFE_INTEGER;
      const yearTo = fitment.yearTo ?? Number.MAX_SAFE_INTEGER;
      return vehicleYear >= yearFrom && vehicleYear <= yearTo;
    });
    const hasGenericFitment = row.fitments.some(
      (fitment) => (fitment.fitmentType || "").toUpperCase() === "GENERIC_NODE"
    );
    const matchingFitment =
      row.fitments.find(
        (fitment) =>
          fitment.modelVariantId &&
          vehicle.modelVariantId &&
          fitment.modelVariantId === vehicle.modelVariantId
      ) ??
      row.fitments.find((fitment) => fitment.modelId && fitment.modelId === vehicle.modelId) ??
      row.fitments.find((fitment) => (fitment.fitmentType || "").toUpperCase() === "GENERIC_NODE") ??
      row.fitments[0] ??
      null;
    const fitmentConfidence = row.fitments[0]?.confidence ?? 0;
    const confidence = Math.max(relationConfidence, fitmentConfidence);

    const base = buildPartRecommendationViewModel({
      sku,
      nodeId,
      relationType,
      confidence,
      hasExactFit,
      hasModelFit,
      hasGenericFitment,
      fitmentNote: matchingFitment?.note ?? null,
    });

    const cRow = row.partMasterId ? confidenceByMasterId.get(row.partMasterId) ?? null : null;
    const published = row.partMasterId ? publishedCountByMasterId.get(row.partMasterId) ?? 0 : 0;

    return mergeCommunityFitmentIntoRecommendation(base, {
      partMasterId: row.partMasterId,
      confidence: cRow,
      nodeServiceGroup: nodeMeta.serviceGroup,
      nodeCode: nodeMeta.code,
      publishedFitmentReportCount: published,
    });
  });

  return sortPartRecommendations(recommendations);
}
