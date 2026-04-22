import { Prisma, type PrismaClient } from "@prisma/client";

export type TopServiceNodeItem = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  level: number;
  displayOrder: number;
  serviceGroup: string | null;
  topNodeOrder: number | null;
};

export async function getTopServiceNodes(prisma: PrismaClient): Promise<TopServiceNodeItem[]> {
  return prisma.$queryRaw<TopServiceNodeItem[]>(Prisma.sql`
    SELECT
      id,
      code,
      name,
      "parentId" as "parentId",
      level,
      "displayOrder" as "displayOrder",
      "serviceGroup" as "serviceGroup",
      "topNodeOrder" as "topNodeOrder"
    FROM nodes
    WHERE
      "isActive" = true
      AND "isServiceRelevant" = true
      AND "isTopNode" = true
    ORDER BY
      "topNodeOrder" ASC,
      code ASC
  `);
}
