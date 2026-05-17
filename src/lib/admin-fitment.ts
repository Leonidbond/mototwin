import type {
  AdminFitmentMatrixCellWire,
  AdminFitmentMatrixResponse,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";

const TOP_BRANDS = 12;
const TOP_NODES = 14;

export async function loadAdminFitmentMatrix(): Promise<AdminFitmentMatrixResponse> {
  const [topBrands, topNodes, confidences] = await Promise.all([
    prisma.brand.findMany({
      take: TOP_BRANDS,
      orderBy: { models: { _count: "desc" } },
      select: { id: true, name: true },
    }),
    prisma.node.findMany({
      where: { parentId: null },
      take: TOP_NODES,
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.fitmentConfidence.findMany({
      where: { partMaster: { status: "ACTIVE" } },
      include: {
        modelVariant: { include: { model: { select: { brandId: true } } } },
        node: { select: { id: true } },
      },
    }),
  ]);

  const cellMap = new Map<string, AdminFitmentMatrixCellWire>();
  const brandLookup = new Map(topBrands.map((b) => [b.id, b.name]));
  const nodeLookup = new Map(topNodes.map((n) => [n.id, n.name]));

  for (const fc of confidences) {
    const brandId = fc.modelVariant.model.brandId;
    const nodeId = fc.node.id;
    if (!brandLookup.has(brandId) || !nodeLookup.has(nodeId)) continue;
    const key = `${brandId}::${nodeId}`;
    const bucket = cellMap.get(key) ?? {
      brandId,
      brandLabel: brandLookup.get(brandId)!,
      nodeId,
      nodeLabel: nodeLookup.get(nodeId)!,
      verified: 0,
      reports: 0,
      conflicts: 0,
    };
    bucket.reports += fc.reportCount;
    if (fc.status === "VERIFIED_BY_MOTOTWIN" || fc.status === "COMMUNITY_CONFIRMED") {
      bucket.verified += 1;
    }
    if (fc.status === "MIXED_REPORTS") bucket.conflicts += 1;
    cellMap.set(key, bucket);
  }

  return {
    brands: topBrands.map((b) => ({ id: b.id, label: b.name })),
    nodes: topNodes.map((n) => ({ id: n.id, label: n.name })),
    cells: Array.from(cellMap.values()),
  };
}
