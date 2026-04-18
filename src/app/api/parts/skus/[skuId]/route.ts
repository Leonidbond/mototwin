import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { buildPartSkuViewModel } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ skuId: string }>;
};

const detailInclude = {
  primaryNode: { select: { id: true, code: true, name: true } },
  partNumbers: { orderBy: { createdAt: "asc" as const } },
  nodeLinks: {
    include: { node: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  fitments: { orderBy: { createdAt: "asc" as const } },
  offers: { orderBy: { updatedAt: "desc" as const }, take: 25 },
} satisfies Prisma.PartSkuInclude;

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { skuId } = await context.params;
    const id = skuId?.trim();
    if (!id) {
      return NextResponse.json({ error: "Не указан SKU." }, { status: 400 });
    }

    const row = await prisma.partSku.findFirst({
      where: { id },
      include: detailInclude,
    });

    if (!row) {
      return NextResponse.json({ error: "Позиция каталога не найдена." }, { status: 404 });
    }

    return NextResponse.json({ sku: buildPartSkuViewModel(row) });
  } catch (error) {
    console.error("Failed to fetch part SKU:", error);
    return NextResponse.json({ error: "Не удалось загрузить позицию каталога." }, { status: 500 });
  }
}
