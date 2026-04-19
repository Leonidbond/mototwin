import { NextRequest, NextResponse } from "next/server";
import {
  buildPartRecommendationViewModel,
  buildPartSkuViewModel,
  buildServiceKitViewModel,
  getServiceKitsForNode,
  sortPartRecommendations,
} from "@mototwin/domain";
import { prisma } from "@/lib/prisma";

async function buildRecommendationsForNode(
  vehicle: { modelId: string; modelVariantId: string | null; modelVariant: { year: number } | null },
  nodeId: string
) {
  const rows = await prisma.partSku.findMany({
    where: {
      isActive: true,
      OR: [{ primaryNodeId: nodeId }, { nodeLinks: { some: { nodeId } } }],
    },
    include: {
      primaryNode: { select: { id: true, code: true, name: true } },
      partNumbers: { orderBy: { createdAt: "asc" } },
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

  return sortPartRecommendations(
    rows.map((row) => {
      const sku = buildPartSkuViewModel(row);
      const relation = row.nodeLinks[0];
      const relationType =
        relation?.relationType?.trim() ||
        (row.primaryNodeId === nodeId ? "PRIMARY" : "ALTERNATIVE");
      const relationConfidence = relation?.confidence ?? 60;

      const hasExactFit = row.fitments.some(
        (fitment) =>
          fitment.modelVariantId &&
          vehicle.modelVariantId &&
          fitment.modelVariantId === vehicle.modelVariantId
      );
      const hasModelFit = row.fitments.some((fitment) => {
        if (!fitment.modelId || fitment.modelId !== vehicle.modelId) {
          return false;
        }
        const vehicleYear = vehicle.modelVariant?.year ?? null;
        if (!vehicleYear) {
          return true;
        }
        const yearFrom = fitment.yearFrom ?? Number.MIN_SAFE_INTEGER;
        const yearTo = fitment.yearTo ?? Number.MAX_SAFE_INTEGER;
        return vehicleYear >= yearFrom && vehicleYear <= yearTo;
      });
      const hasGenericFitment = row.fitments.some(
        (fitment) => (fitment.fitmentType || "").toUpperCase() === "GENERIC_NODE"
      );
      const matchingFitment =
        row.fitments.find(
          (fitment) =>
            fitment.modelVariantId &&
            vehicle.modelVariantId &&
            fitment.modelVariantId === vehicle.modelVariantId
        ) ??
        row.fitments.find((fitment) => fitment.modelId && fitment.modelId === vehicle.modelId) ??
        row.fitments.find((fitment) => (fitment.fitmentType || "").toUpperCase() === "GENERIC_NODE") ??
        row.fitments[0] ??
        null;
      const fitmentConfidence = row.fitments[0]?.confidence ?? 0;
      const confidence = Math.max(relationConfidence, fitmentConfidence);

      return buildPartRecommendationViewModel({
        sku,
        nodeId,
        relationType,
        confidence,
        hasExactFit,
        hasModelFit,
        hasGenericFitment,
        fitmentNote: matchingFitment?.note ?? null,
      });
    })
  );
}

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
      select: { id: true, code: true },
    });
    const nodeIdByCode = new Map(nodes.map((node) => [node.code, node.id]));

    const recommendationsByNodeCode = new Map<string, Awaited<ReturnType<typeof buildRecommendationsForNode>>>();
    for (const [code, resolvedNodeId] of nodeIdByCode) {
      const recs = await buildRecommendationsForNode(vehicle, resolvedNodeId);
      recommendationsByNodeCode.set(code, recs);
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
