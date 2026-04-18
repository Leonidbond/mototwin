import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { buildPartSkuViewModel, normalizePartNumber } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";

const listInclude = {
  primaryNode: { select: { id: true, code: true, name: true } },
  partNumbers: { orderBy: { createdAt: "asc" as const } },
  nodeLinks: {
    include: { node: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  fitments: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.PartSkuInclude;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId")?.trim() || undefined;
    const searchRaw = searchParams.get("search")?.trim() || "";
    const activeOnly = searchParams.get("isActive") !== "false";

    const where: Prisma.PartSkuWhereInput = {};
    if (activeOnly) {
      where.isActive = true;
    }

    if (nodeId) {
      where.OR = [{ primaryNodeId: nodeId }, { nodeLinks: { some: { nodeId } } }];
    }

    if (searchRaw.length > 0) {
      const norm = normalizePartNumber(searchRaw);
      const searchClause: Prisma.PartSkuWhereInput = {
        OR: [
          { canonicalName: { contains: searchRaw, mode: "insensitive" } },
          { brandName: { contains: searchRaw, mode: "insensitive" } },
          { partNumbers: { some: { normalizedNumber: { contains: norm } } } },
        ],
      };
      const prevAnd = where.AND;
      where.AND = [
        ...(Array.isArray(prevAnd) ? prevAnd : prevAnd ? [prevAnd] : []),
        searchClause,
      ];
    }

    const rows = await prisma.partSku.findMany({
      where,
      include: listInclude,
      orderBy: [{ brandName: "asc" }, { canonicalName: "asc" }],
      take: 100,
    });

    const skus = rows.map((row) =>
      buildPartSkuViewModel({
        ...row,
        offers: [],
      })
    );

    return NextResponse.json({ skus });
  } catch (error) {
    console.error("Failed to list part SKUs:", error);
    return NextResponse.json({ error: "Не удалось загрузить каталог запчастей." }, { status: 500 });
  }
}
