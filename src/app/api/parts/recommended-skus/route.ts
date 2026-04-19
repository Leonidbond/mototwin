import { NextRequest, NextResponse } from "next/server";
import { buildPartRecommendationViewModel, buildPartSkuViewModel, sortPartRecommendations } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";

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

    const recommendations = sortPartRecommendations(
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

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Failed to load recommended SKUs:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить рекомендации по запчастям." },
      { status: 500 }
    );
  }
}
