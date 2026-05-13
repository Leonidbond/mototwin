import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildRecommendationsForNodeWithCommunity } from "@/lib/build-recommendations-for-node-with-community";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId")?.trim();
    const nodeId = searchParams.get("nodeId")?.trim();

    if (!vehicleId || !nodeId) {
      return NextResponse.json(
        { error: "Параметры vehicleId и nodeId обязательны." },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        modelId: true,
        modelVariantId: true,
        modelVariant: { select: { year: true } },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }

    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      select: { code: true, serviceGroup: true },
    });
    if (!node) {
      return NextResponse.json({ error: "Узел не найден." }, { status: 404 });
    }

    const recommendations = await buildRecommendationsForNodeWithCommunity(prisma, vehicle, nodeId, {
      code: node.code,
      serviceGroup: node.serviceGroup,
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Failed to load recommended SKUs:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить рекомендации по запчастям." },
      { status: 500 }
    );
  }
}
