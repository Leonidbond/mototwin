import {
  filterFavoriteNodeCodesToCatalogLeaves,
  type ServiceCatalogNodeRef,
} from "@mototwin/domain";
import type { PrismaClient } from "@prisma/client";
import { MAX_FAVORITE_NODE_CODES } from "@mototwin/types";

export async function loadActiveServiceCatalogNodes(
  prisma: PrismaClient
): Promise<ServiceCatalogNodeRef[]> {
  return prisma.node.findMany({
    where: { isActive: true, isServiceRelevant: true },
    select: { id: true, code: true, parentId: true },
    orderBy: [{ level: "asc" }, { displayOrder: "asc" }, { code: "asc" }],
  });
}

export function sanitizeFavoriteNodeCodes(
  codes: string[],
  catalogNodes: ServiceCatalogNodeRef[]
): string[] {
  return filterFavoriteNodeCodesToCatalogLeaves(codes, catalogNodes).slice(
    0,
    MAX_FAVORITE_NODE_CODES
  );
}
