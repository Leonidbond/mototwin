import { NextRequest, NextResponse } from "next/server";
import { buildServiceKitViewModel, getServiceKitsForNode } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";
import { buildRecommendationsForNodeWithCommunity } from "@/lib/build-recommendations-for-node-with-community";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId")?.trim() || null;
    const vehicleId = searchParams.get("vehicleId")?.trim() || null;

    let contextNodeCode: string | null = null;
    if (nodeId) {
      const node = await prisma.node.findUnique({
        where: { id: nodeId },
        select: { id: true, code: true },
      });
      if (!node) {
        return NextResponse.json({ error: "Узел не найден." }, { status: 404 });
      }
      contextNodeCode = node.code;
    }

    const kits = getServiceKitsForNode(contextNodeCode);
    if (!vehicleId) {
      return NextResponse.json({
        kits: kits.map((kit) => buildServiceKitViewModel(kit)),
      });
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

    const nodeCodes = new Set<string>();
    for (const kit of kits) {
      for (const item of kit.items) {
        nodeCodes.add(item.nodeCode);
      }
    }
    const nodes = await prisma.node.findMany({
      where: { code: { in: [...nodeCodes] } },
      select: { id: true, code: true, serviceGroup: true },
    });

    const recommendationsByNodeCode = new Map<
      string,
      Awaited<ReturnType<typeof buildRecommendationsForNodeWithCommunity>>
    >();
    for (const node of nodes) {
      const recs = await buildRecommendationsForNodeWithCommunity(prisma, vehicle, node.id, {
        code: node.code,
        serviceGroup: node.serviceGroup,
      });
      recommendationsByNodeCode.set(node.code, recs);
    }

    return NextResponse.json({
      kits: kits.map((kit) => buildServiceKitViewModel(kit, recommendationsByNodeCode)),
    });
  } catch (error) {
    console.error("Failed to fetch service kits:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить комплекты обслуживания." },
      { status: 500 }
    );
  }
}
