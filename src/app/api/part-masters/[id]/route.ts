import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const nodeId = new URL(request.url).searchParams.get("nodeId")?.trim() ?? "";

    const pm = await prisma.partMaster.findUnique({
      where: { id },
      select: { id: true, brandName: true, sku: true, title: true },
    });
    if (!pm) {
      return NextResponse.json({ error: "Деталь не найдена." }, { status: 404 });
    }

    let suggestedCategory = "";
    if (nodeId) {
      const skuForNode = await prisma.partSku.findFirst({
        where: {
          partMasterId: pm.id,
          isActive: true,
          OR: [{ primaryNodeId: nodeId }, { nodeLinks: { some: { nodeId } } }],
        },
        select: { partType: true },
      });
      suggestedCategory = skuForNode?.partType?.trim() ?? "";
    }
    if (!suggestedCategory) {
      const skuAny = await prisma.partSku.findFirst({
        where: { partMasterId: pm.id, isActive: true },
        select: { partType: true },
      });
      suggestedCategory = skuAny?.partType?.trim() ?? "";
    }

    return NextResponse.json({
      partMaster: pm,
      suggestedCategory,
    });
  } catch (error) {
    console.error("part-masters GET by id:", error);
    return NextResponse.json({ error: "Не удалось загрузить деталь." }, { status: 500 });
  }
}
