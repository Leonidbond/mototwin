import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recalculateFitmentConfidenceForKey } from "@/lib/fitment-confidence-prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";
import { getVehicleInCurrentContext } from "@/app/api/_shared/vehicle-context";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import {
  boundedInt,
  boundedText,
  boundedTextOptional,
  parseSearchParamText,
  strictObject,
} from "@/lib/http/input-validation";

type RouteContext = { params: Promise<{ id: string }> };

const rideProfileBodySchema = strictObject({
  usageType: z.enum(["CITY", "HIGHWAY", "MIXED", "OFFROAD"]),
  ridingStyle: z.enum(["CALM", "ACTIVE", "AGGRESSIVE"]),
  loadType: z.enum(["SOLO", "PASSENGER", "LUGGAGE", "PASSENGER_LUGGAGE"]),
  usageIntensity: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

// MT-SEC-068 + MT-SEC-070: strict + capped strings/numerics for user-submitted reports.
const createReportSchema = strictObject({
  partMasterId: boundedText({ max: 64 }),
  nodeId: boundedText({ max: 64 }),
  fitmentResult: z.enum([
    "DIRECT_FIT",
    "FIT_WITH_MODIFICATION",
    "PARTIAL_FIT",
    "DOES_NOT_FIT",
    "OEM_REPLACEMENT",
  ]),
  installationStatus: z.enum(["INSTALLED", "PURCHASED_NOT_INSTALLED", "TESTED_NOT_INSTALLED"]),
  modificationRequired: z.boolean().optional(),
  modificationDetails: boundedTextOptional({ max: 2_000 }),
  comment: boundedTextOptional({ max: 2_000 }),
  serviceEventId: boundedTextOptional({ max: 64 }),
  installedAtMileage: boundedInt({ min: 0, max: 10_000_000 }).optional().nullable(),
  installedAtHours: boundedInt({ min: 0, max: 1_000_000 }).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  rideProfile: rideProfileBodySchema.optional().nullable(),
});

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;
    const { searchParams } = new URL(request.url);
    // MT-SEC-071: validate search params.
    const nodeId = parseSearchParamText(searchParams.get("nodeId"), { max: 64 });
    const partMasterIdFilter = parseSearchParamText(searchParams.get("partMasterId"), { max: 64 });
    if (!nodeId) {
      return NextResponse.json({ error: "nodeId обязателен." }, { status: 400 });
    }
    const vehicle = await getVehicleInCurrentContext(vehicleId, {
      id: true,
      motorcycleGenerationId: true,
    });
    if (!vehicle?.motorcycleGenerationId) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }
    const reports = await prisma.fitmentReport.findMany({
      where: {
        vehicleId,
        nodeId,
        motorcycleGenerationId: vehicle.motorcycleGenerationId,
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
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 16 * 1024 });
    const body = createReportSchema.parse(raw);

    const vehicle = await getVehicleInCurrentContext(vehicleId, {
      id: true,
      motorcycleGenerationId: true,
    });
    if (!vehicle?.motorcycleGenerationId) {
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

    let rideProfileSnapshot: Record<string, string> | null = null;
    if (body.rideProfile) {
      rideProfileSnapshot = {
        usageType: body.rideProfile.usageType,
        ridingStyle: body.rideProfile.ridingStyle,
        loadType: body.rideProfile.loadType,
        usageIntensity: body.rideProfile.usageIntensity,
      };
    } else {
      const fromGarage = await prisma.rideProfile.findUnique({
        where: { vehicleId },
        select: {
          usageType: true,
          ridingStyle: true,
          loadType: true,
          usageIntensity: true,
        },
      });
      if (fromGarage) {
        rideProfileSnapshot = {
          usageType: fromGarage.usageType,
          ridingStyle: fromGarage.ridingStyle,
          loadType: fromGarage.loadType,
          usageIntensity: fromGarage.usageIntensity,
        };
      }
    }

    const report = await prisma.fitmentReport.create({
      data: {
        partMasterId: body.partMasterId,
        vehicleId,
        motorcycleGenerationId: vehicle.motorcycleGenerationId,
        nodeId: body.nodeId,
        fitmentResult: body.fitmentResult,
        installationStatus: body.installationStatus,
        modificationRequired: body.modificationRequired ?? false,
        modificationDetails: body.modificationDetails?.trim() || null,
        comment: body.comment?.trim() || null,
        installedAtMileage: body.installedAtMileage ?? null,
        installedAtHours: body.installedAtHours ?? null,
        rating: body.rating ?? null,
        ...(rideProfileSnapshot ? { rideProfileSnapshot } : {}),
        serviceEventId: body.serviceEventId?.trim() || null,
        /** Сразу виден на странице отчёта совместимости и в агрегатах; модератор может скрыть позже. */
        moderationStatus: "PUBLISHED",
        createdByUserId: userCtx.userId,
      },
    });

    try {
      await recalculateFitmentConfidenceForKey(prisma, {
        partMasterId: body.partMasterId,
        motorcycleGenerationId: vehicle.motorcycleGenerationId,
        nodeId: body.nodeId,
      });
    } catch (recalcErr) {
      console.error("fitment-reports POST: confidence recalc failed:", recalcErr);
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("fitment-reports POST:", error);
    return NextResponse.json({ error: "Не удалось создать отчёт." }, { status: 500 });
  }
}
