import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";
import { getVehicleInCurrentContext } from "@/app/api/_shared/vehicle-context";

type RouteContext = { params: Promise<{ id: string }> };

function catalogLineFromFitments(
  fitmentRows: Array<{
    modelVariantId: string | null;
    modelId: string | null;
    yearFrom: number | null;
    yearTo: number | null;
    fitmentType: string | null;
  }>,
  vehicle: {
    modelVariantId: string | null;
    modelId: string;
    modelYear: number | null;
  }
): string | null {
  let hasExact = false;
  let hasModel = false;
  let hasGeneric = false;
  const vy = vehicle.modelYear;
  for (const f of fitmentRows) {
    if (vehicle.modelVariantId && f.modelVariantId === vehicle.modelVariantId) {
      hasExact = true;
    }
    if (f.modelId && f.modelId === vehicle.modelId) {
      if (vy == null) {
        hasModel = true;
      } else {
        const yf = f.yearFrom ?? Number.MIN_SAFE_INTEGER;
        const yt = f.yearTo ?? Number.MAX_SAFE_INTEGER;
        if (vy >= yf && vy <= yt) {
          hasModel = true;
        }
      }
    }
    if ((f.fitmentType || "").toUpperCase() === "GENERIC_NODE") {
      hasGeneric = true;
    }
  }
  if (hasExact) {
    return "Каталог: зафиксирована применимость к вашей модификации.";
  }
  if (hasModel) {
    return "Каталог: применимость к модели (по годам и модификациям).";
  }
  if (hasGeneric) {
    return "Каталог: универсальная применимость по типу узла.";
  }
  return null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId")?.trim();
    const partMasterId = searchParams.get("partMasterId")?.trim();
    if (!nodeId || !partMasterId) {
      return NextResponse.json({ error: "Укажите nodeId и partMasterId." }, { status: 400 });
    }

    const vehicle = await getVehicleInCurrentContext(vehicleId, {
      id: true,
      modelId: true,
      modelVariantId: true,
      modelVariant: { select: { year: true } },
    });
    if (!vehicle?.modelVariantId) {
      return NextResponse.json({ error: "Мотоцикл не найден или без модификации." }, { status: 404 });
    }

    const [partMaster, node, confidence, skusForCatalog, reports] = await Promise.all([
      prisma.partMaster.findUnique({
        where: { id: partMasterId },
        select: { id: true, brandName: true, title: true, sku: true },
      }),
      prisma.node.findUnique({
        where: { id: nodeId },
        select: { id: true, code: true, name: true },
      }),
      prisma.fitmentConfidence.findUnique({
        where: {
          partMasterId_modelVariantId_nodeId: {
            partMasterId,
            modelVariantId: vehicle.modelVariantId,
            nodeId,
          },
        },
      }),
      prisma.partSku.findMany({
        where: { partMasterId, isActive: true },
        select: {
          fitments: {
            select: {
              modelVariantId: true,
              modelId: true,
              yearFrom: true,
              yearTo: true,
              fitmentType: true,
            },
          },
        },
        take: 24,
      }),
      prisma.fitmentReport.findMany({
        where: {
          partMasterId,
          modelVariantId: vehicle.modelVariantId,
          nodeId,
          moderationStatus: "PUBLISHED",
        },
        orderBy: { updatedAt: "desc" },
        take: 25,
        include: {
          votes: { select: { voteType: true } },
        },
      }),
    ]);

    if (!partMaster) {
      return NextResponse.json({ error: "Карточка детали не найдена." }, { status: 404 });
    }
    if (!node) {
      return NextResponse.json({ error: "Узел не найден." }, { status: 404 });
    }

    const flatFitments = skusForCatalog.flatMap((s) => s.fitments);
    const catalogLineRu = catalogLineFromFitments(flatFitments, {
      modelVariantId: vehicle.modelVariantId,
      modelId: vehicle.modelId,
      modelYear: vehicle.modelVariant?.year ?? null,
    });

    return NextResponse.json({
      partMaster,
      node,
      catalogLineRu,
      confidence: confidence
        ? {
            confidenceScore: confidence.confidenceScore,
            reportCount: confidence.reportCount,
            confirmationCount: confidence.confirmationCount,
            rejectionCount: confidence.rejectionCount,
            modificationCount: confidence.modificationCount,
            status: confidence.status,
            isStaffVerified: confidence.isStaffVerified,
          }
        : null,
      reports: reports.map((r) => ({
        id: r.id,
        fitmentResult: r.fitmentResult,
        installationStatus: r.installationStatus,
        modificationRequired: r.modificationRequired,
        modificationDetails: r.modificationDetails,
        comment: r.comment,
        updatedAt: r.updatedAt.toISOString(),
        votes: r.votes.map((v) => ({ voteType: v.voteType })),
      })),
    });
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    console.error("fitment-report-sheet GET:", error);
    return NextResponse.json({ error: "Не удалось загрузить сводку." }, { status: 500 });
  }
}
