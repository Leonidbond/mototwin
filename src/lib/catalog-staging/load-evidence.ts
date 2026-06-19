import type { CatalogEvidenceWire } from "@mototwin/types";
import type { PrismaClient } from "@prisma/client";
import { mapCatalogApplicationToEvidenceWire } from "./evidence-wire";

export async function loadCatalogEvidenceBySkuIds(
  prisma: PrismaClient,
  input: {
    skuIds: string[];
    nodeId: string;
    generationId: string;
    reviewStatuses?: Array<"MANUAL_APPROVED" | "NEEDS_REVIEW" | "NEW">;
  }
): Promise<Map<string, CatalogEvidenceWire[]>> {
  const map = new Map<string, CatalogEvidenceWire[]>();
  if (input.skuIds.length === 0) return map;

  const rows = await prisma.partCatalogApplication.findMany({
    where: {
      promotedSkuId: { in: input.skuIds },
      nodeId: input.nodeId,
      motorcycleGenerationId: input.generationId,
      reviewStatus: input.reviewStatuses
        ? { in: input.reviewStatuses }
        : { in: ["MANUAL_APPROVED"] },
    },
    include: { source: true },
    orderBy: [{ confidence: "desc" }, { parsedAt: "desc" }],
  });

  for (const row of rows) {
    if (!row.promotedSkuId) continue;
    const wire = mapCatalogApplicationToEvidenceWire({ ...row, source: row.source });
    const list = map.get(row.promotedSkuId) ?? [];
    list.push(wire);
    map.set(row.promotedSkuId, list);
  }
  return map;
}

export async function loadNotApplicableNodeIdsForGeneration(
  prisma: PrismaClient,
  generationId: string,
  nodeIds: string[]
): Promise<Set<string>> {
  if (nodeIds.length === 0) return new Set();
  const rows = await prisma.partCatalogApplication.findMany({
    where: {
      motorcycleGenerationId: generationId,
      nodeId: { in: nodeIds },
      nodeApplicability: "NOT_APPLICABLE",
      reviewStatus: { in: ["MANUAL_APPROVED", "NOT_APPLICABLE"] },
    },
    select: { nodeId: true },
  });
  return new Set(rows.map((r) => r.nodeId));
}
