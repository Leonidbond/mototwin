import {
  buildPartRecommendationViewModel,
  buildPartSkuViewModel,
  mergeCommunityFitmentIntoRecommendation,
  sortPartRecommendations,
} from "@mototwin/domain";
import type { PrismaClient } from "@prisma/client";
import type { FitmentConfidenceStatus, PartRecommendationViewModel } from "@mototwin/types";

/**
 * Vehicle anchor used to classify catalog rows for a node.
 * The four optional FKs match the unified motorcycle hierarchy
 * (Brand → ModelFamily → Variant → Generation).
 */
export type VehicleFitmentContext = {
  id: string;
  motorcycleBrandId: string;
  motorcycleModelFamilyId: string;
  motorcycleVariantId: string;
  motorcycleGenerationId: string;
};

/**
 * Narrow a Prisma `Vehicle` row to the strict context required by the recommender.
 * All four motorcycle FKs are now non-null on the schema, so this only validates the shape.
 */
export function narrowVehicleFitmentContext(vehicle: {
  id: string;
  motorcycleBrandId: string | null;
  motorcycleModelFamilyId: string | null;
  motorcycleVariantId: string | null;
  motorcycleGenerationId: string | null;
}): VehicleFitmentContext | null {
  if (
    !vehicle.motorcycleBrandId ||
    !vehicle.motorcycleModelFamilyId ||
    !vehicle.motorcycleVariantId ||
    !vehicle.motorcycleGenerationId
  ) {
    return null;
  }
  return {
    id: vehicle.id,
    motorcycleBrandId: vehicle.motorcycleBrandId,
    motorcycleModelFamilyId: vehicle.motorcycleModelFamilyId,
    motorcycleVariantId: vehicle.motorcycleVariantId,
    motorcycleGenerationId: vehicle.motorcycleGenerationId,
  };
}

/**
 * Loads SKU recommendations for a node and merges published {@link FitmentConfidence} for the vehicle generation.
 *
 * Catalog rows are classified into one of six progressive buckets based on the deepest non-null FK
 * that matches the vehicle:
 *   - EXACT     : `motorcycleGenerationId` matches the vehicle's generation.
 *   - VARIANT   : `motorcycleVariantId` matches and generation FK is null on the row.
 *   - FAMILY    : `motorcycleModelFamilyId` matches.
 *   - BRAND     : `motorcycleBrandId` matches.
 *   - GENERIC   : `fitmentType = GENERIC_NODE` (universal across all bikes).
 *   - VERIFY    : the row is anchored to a different brand/family/variant/generation — show only as
 *                 "verify required" merchandise, not as a confident match.
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

  if (masterIds.length > 0) {
    const [confRows, publishedGroups] = await Promise.all([
      prisma.fitmentConfidence.findMany({
        where: {
          motorcycleGenerationId: vehicle.motorcycleGenerationId,
          nodeId,
          partMasterId: { in: masterIds },
        },
      }),
      prisma.fitmentReport.groupBy({
        by: ["partMasterId"],
        where: {
          motorcycleGenerationId: vehicle.motorcycleGenerationId,
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

    // Bucket classification: walk the fitment rows and find the deepest level that
    // matches the vehicle. Anchors at deeper levels override broader matches.
    let hasExactFit = false;
    let hasVariantFit = false;
    let hasFamilyFit = false;
    let hasBrandFit = false;
    let hasGenericFitment = false;
    let hasMismatchedAnchor = false;

    for (const fitment of row.fitments) {
      const isGeneric = (fitment.fitmentType || "").toUpperCase() === "GENERIC_NODE";
      if (isGeneric) {
        hasGenericFitment = true;
      }

      // Match levels: deepest non-null wins. We only count a level as "matched"
      // if every level above it either matches or is null on the fitment row.
      const brandOk =
        fitment.motorcycleBrandId == null ||
        fitment.motorcycleBrandId === vehicle.motorcycleBrandId;
      const familyOk =
        fitment.motorcycleModelFamilyId == null ||
        fitment.motorcycleModelFamilyId === vehicle.motorcycleModelFamilyId;
      const variantOk =
        fitment.motorcycleVariantId == null ||
        fitment.motorcycleVariantId === vehicle.motorcycleVariantId;
      const generationOk =
        fitment.motorcycleGenerationId == null ||
        fitment.motorcycleGenerationId === vehicle.motorcycleGenerationId;

      const allLevelsAlignWithVehicle = brandOk && familyOk && variantOk && generationOk;
      if (!allLevelsAlignWithVehicle && !isGeneric) {
        // Some FK on the row points to a different brand/family/variant/generation.
        hasMismatchedAnchor = true;
        continue;
      }

      if (fitment.motorcycleGenerationId === vehicle.motorcycleGenerationId) {
        hasExactFit = true;
      } else if (fitment.motorcycleVariantId === vehicle.motorcycleVariantId) {
        hasVariantFit = true;
      } else if (fitment.motorcycleModelFamilyId === vehicle.motorcycleModelFamilyId) {
        hasFamilyFit = true;
      } else if (fitment.motorcycleBrandId === vehicle.motorcycleBrandId) {
        hasBrandFit = true;
      }
    }

    // Pick a representative fitment row in priority order: deepest match → generic → first.
    const matchingFitment =
      row.fitments.find(
        (f) => f.motorcycleGenerationId === vehicle.motorcycleGenerationId
      ) ??
      row.fitments.find(
        (f) =>
          f.motorcycleVariantId === vehicle.motorcycleVariantId &&
          f.motorcycleGenerationId == null
      ) ??
      row.fitments.find(
        (f) =>
          f.motorcycleModelFamilyId === vehicle.motorcycleModelFamilyId &&
          f.motorcycleVariantId == null
      ) ??
      row.fitments.find(
        (f) =>
          f.motorcycleBrandId === vehicle.motorcycleBrandId &&
          f.motorcycleModelFamilyId == null
      ) ??
      row.fitments.find((f) => (f.fitmentType || "").toUpperCase() === "GENERIC_NODE") ??
      row.fitments[0] ??
      null;
    const fitmentConfidence = matchingFitment?.confidence ?? row.fitments[0]?.confidence ?? 0;
    const confidence = Math.max(relationConfidence, fitmentConfidence);

    // Map the buckets back to the legacy boolean inputs of the view-model builder.
    // Until packages/domain exposes a 6-bucket primitive, anything below "exact"
    // collapses to "model fit" — VARIANT / FAMILY / BRAND are all confident matches
    // for the same family lineage. GENERIC stays separate. VERIFY (mismatched anchor
    // with no other match) becomes a non-confident merch suggestion.
    const hasModelFit = hasExactFit || hasVariantFit || hasFamilyFit || hasBrandFit;
    const onlyMismatched =
      !hasExactFit && !hasVariantFit && !hasFamilyFit && !hasBrandFit && !hasGenericFitment;

    const base = buildPartRecommendationViewModel({
      sku,
      nodeId,
      relationType,
      confidence: onlyMismatched && hasMismatchedAnchor ? Math.min(confidence, 30) : confidence,
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
