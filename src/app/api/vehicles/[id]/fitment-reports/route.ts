import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";
import { getVehicleInCurrentContext } from "@/app/api/_shared/vehicle-context";

type RouteContext = { params: Promise<{ id: string }> };

const createReportSchema = z.object({
  partMasterId: z.string().trim().min(1),
  nodeId: z.string().trim().min(1),
  fitmentResult: z.enum([
    "DIRECT_FIT",
    "FIT_WITH_MODIFICATION",
    "PARTIAL_FIT",
    "DOES_NOT_FIT",
    "OEM_REPLACEMENT",
  ]),
  installationStatus: z.enum(["INSTALLED", "PURCHASED_NOT_INSTALLED", "TESTED_NOT_INSTALLED"]),
  modificationRequired: z.boolean().optional(),
  modificationDetails: z.string().trim().optional().nullable(),
  comment: z.string().trim().optional().nullable(),
  serviceEventId: z.string().trim().optional().nullable(),
  installedAtMileage: z.number().int().optional().nullable(),
  installedAtHours: z.number().int().optional().nullable(),
});

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId")?.trim();
    const partMasterIdFilter = searchParams.get("partMasterId")?.trim();
    if (!nodeId) {
      return NextResponse.json({ error: "nodeId обязателен." }, { status: 400 });
    }
    const vehicle = await getVehicleInCurrentContext(vehicleId, {
      id: true,
      modelVariantId: true,
    });
    if (!vehicle?.modelVariantId) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }
    const reports = await prisma.fitmentReport.findMany({
      where: {
        vehicleId,
        nodeId,
        modelVariantId: vehicle.modelVariantId,
        moderationStatus: "PUBLISHED",
        ...(partMasterIdFilter ? { partMasterId: partMasterIdFilter } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
      include: {
        partMaster: { select: { id: true, brandName: true, sku: true, title: true } },
        votes: { select: { id: true, voteType: true, userId: true } },
      },
    });
    return NextResponse.json({ reports });
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    console.error("fitment-reports GET:", error);
    return NextResponse.json({ error: "Не удалось загрузить отчёты." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userCtx = await getCurrentUserContext();
    const { id: vehicleId } = await context.params;
    const body = createReportSchema.parse(await request.json());

    const vehicle = await getVehicleInCurrentContext(vehicleId, {
      id: true,
      modelVariantId: true,
    });
    if (!vehicle?.modelVariantId) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }

    const master = await prisma.partMaster.findUnique({
      where: { id: body.partMasterId },
      select: { id: true },
    });
    if (!master) {
      return NextResponse.json({ error: "Деталь не найдена." }, { status: 404 });
    }

    const node = await prisma.node.findUnique({
      where: { id: body.nodeId },
      select: { id: true },
    });
    if (!node) {
      return NextResponse.json({ error: "Узел не найден." }, { status: 404 });
    }

    if (body.serviceEventId) {
      const ev = await prisma.serviceEvent.findFirst({
        where: { id: body.serviceEventId, vehicleId },
        select: { id: true },
      });
      if (!ev) {
        return NextResponse.json({ error: "Сервисное событие не найдено." }, { status: 404 });
      }
    }

    const report = await prisma.fitmentReport.create({
      data: {
        partMasterId: body.partMasterId,
        vehicleId,
        modelVariantId: vehicle.modelVariantId,
        nodeId: body.nodeId,
        fitmentResult: body.fitmentResult,
        installationStatus: body.installationStatus,
        modificationRequired: body.modificationRequired ?? false,
        modificationDetails: body.modificationDetails?.trim() || null,
        comment: body.comment?.trim() || null,
        installedAtMileage: body.installedAtMileage ?? null,
        installedAtHours: body.installedAtHours ?? null,
        serviceEventId: body.serviceEventId?.trim() || null,
        moderationStatus: "PENDING",
        createdByUserId: userCtx.userId,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("fitment-reports POST:", error);
    return NextResponse.json({ error: "Не удалось создать отчёт." }, { status: 500 });
  }
}
