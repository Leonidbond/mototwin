import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { CreateVehicleResponse } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { toGarageVehicleItem, vehicleWireInclude } from "@/lib/vehicle-wire";
import { getCapabilities } from "@/lib/subscription/capabilities";
import { subscriptionErrorResponse } from "@/lib/subscription/errors";
import { getOrCreateUserSubscription } from "@/lib/subscription/resolve-plan";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../_shared/current-user-context";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedInt, boundedText, boundedTextOptional, strictObject } from "@/lib/http/input-validation";
import { ensureCatalogPlaceholder } from "@/lib/motorcycle-catalog-placeholder";
import { createCatalogRequestSchema } from "@/lib/motorcycle-catalog-request-validation";
import {
  CatalogRequestAlreadyExistsError,
  CatalogRequestValidationError,
  createMotorcycleCatalogRequestForUser,
} from "@/lib/motorcycle-catalog-request-service";

const rideProfileSchema = strictObject({
  usageType: z.enum(["CITY", "HIGHWAY", "MIXED", "OFFROAD"]),
  ridingStyle: z.enum(["CALM", "ACTIVE", "AGGRESSIVE"]),
  loadType: z.enum(["SOLO", "PASSENGER", "LUGGAGE", "PASSENGER_LUGGAGE"]),
  usageIntensity: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

const createVehicleSchema = strictObject({
  motorcycleBrandId: boundedText({ max: 64 }).optional(),
  motorcycleModelFamilyId: boundedText({ max: 64 }).optional(),
  motorcycleVariantId: boundedText({ max: 64 }).optional(),
  motorcycleGenerationId: boundedText({ max: 64 }).optional(),
  catalogRequestId: boundedText({ max: 64 }).optional(),
  catalogRequest: createCatalogRequestSchema.optional(),
  nickname: boundedTextOptional({ max: 120 }),
  vin: boundedTextOptional({ max: 32 }),
  odometer: boundedInt({ min: 0, max: 10_000_000 }),
  engineHours: boundedInt({ min: 0, max: 1_000_000 }).nullable(),
  rideProfile: rideProfileSchema,
}).superRefine((data, ctx) => {
  const hasCatalogRequestId = Boolean(data.catalogRequestId?.trim());
  const hasCatalogRequestDraft = Boolean(data.catalogRequest);
  const hasTree =
    Boolean(data.motorcycleBrandId?.trim()) &&
    Boolean(data.motorcycleModelFamilyId?.trim()) &&
    Boolean(data.motorcycleVariantId?.trim()) &&
    Boolean(data.motorcycleGenerationId?.trim());

  const modeCount = [hasCatalogRequestId, hasCatalogRequestDraft, hasTree].filter(Boolean).length;
  if (modeCount !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Укажите либо catalogRequestId, либо catalogRequest, либо полный набор FK каталога.",
    });
  }
});

export async function POST(request: NextRequest) {
  try {
    const json = await parseJsonBody<unknown>(request, { maxBytes: 16 * 1024 });
    const data = createVehicleSchema.parse(json);
    const currentUser = await getCurrentUserContext();
    const subscription = await getOrCreateUserSubscription(currentUser.userId);
    const capabilities = getCapabilities(subscription.plan);

    if (capabilities.maxVehicles != null) {
      const existingCount = await prisma.vehicle.count({
        where: {
          garageId: currentUser.garageId,
          trashedAt: null,
        },
      });
      if (existingCount >= capabilities.maxVehicles) {
        return subscriptionErrorResponse({
          code: "VEHICLE_LIMIT_REACHED",
          requiredPlan: subscription.plan === "FREE" ? "RIDER" : "PRO",
          message:
            subscription.plan === "FREE"
              ? "Ваш тариф Free позволяет вести только 1 мотоцикл. Перейдите на Rider, чтобы добавить до 3."
              : "Ваш тариф Rider позволяет вести до 3 мотоциклов. Перейдите на Pro для неограниченного гаража.",
        });
      }
    }

    let motorcycleBrandId = data.motorcycleBrandId?.trim() ?? "";
    let motorcycleModelFamilyId = data.motorcycleModelFamilyId?.trim() ?? "";
    let motorcycleVariantId = data.motorcycleVariantId?.trim() ?? "";
    let motorcycleGenerationId = data.motorcycleGenerationId?.trim() ?? "";
    let pendingCatalogRequestId: string | null = null;

    const catalogRequestId = data.catalogRequestId?.trim();
    if (catalogRequestId) {
      const catalogRequest = await prisma.motorcycleCatalogRequest.findFirst({
        where: {
          id: catalogRequestId,
          submittedByUserId: currentUser.userId,
          status: "PENDING",
        },
      });
      if (!catalogRequest) {
        return NextResponse.json(
          { error: "Заявка на модель не найдена или уже обработана." },
          { status: 404 }
        );
      }

      const placeholder = await ensureCatalogPlaceholder(prisma);
      motorcycleBrandId = placeholder.brandId;
      motorcycleModelFamilyId = placeholder.familyId;
      motorcycleVariantId = placeholder.variantId;
      motorcycleGenerationId = placeholder.generationId;
      pendingCatalogRequestId = catalogRequest.id;
    } else if (data.catalogRequest) {
      const placeholder = await ensureCatalogPlaceholder(prisma);

      const vehicle = await prisma.$transaction(async (tx) => {
        const { request: catalogRequest } = await createMotorcycleCatalogRequestForUser({
          userId: currentUser.userId,
          body: data.catalogRequest!,
          tx,
        });

        return tx.vehicle.create({
          data: {
            userId: currentUser.userId,
            garageId: currentUser.garageId,
            motorcycleBrandId: placeholder.brandId,
            motorcycleModelFamilyId: placeholder.familyId,
            motorcycleVariantId: placeholder.variantId,
            motorcycleGenerationId: placeholder.generationId,
            pendingCatalogRequestId: catalogRequest.id,
            nickname: data.nickname || null,
            vin: data.vin || null,
            odometer: data.odometer,
            engineHours: data.engineHours,
            rideProfile: {
              create: {
                usageType: data.rideProfile.usageType,
                ridingStyle: data.rideProfile.ridingStyle,
                loadType: data.rideProfile.loadType,
                usageIntensity: data.rideProfile.usageIntensity,
              },
            },
          },
          include: vehicleWireInclude,
        });
      });

      const payload: CreateVehicleResponse = {
        vehicle: toGarageVehicleItem(vehicle),
      };
      return NextResponse.json(payload, { status: 201 });
    } else {
      const generation = await prisma.motorcycleGeneration.findFirst({
        where: {
          id: motorcycleGenerationId,
          variantId: motorcycleVariantId,
          variant: {
            familyId: motorcycleModelFamilyId,
            family: {
              brandId: motorcycleBrandId,
              brand: { isCatalogPlaceholder: false },
            },
          },
        },
        select: { id: true },
      });
      if (!generation) {
        return NextResponse.json(
          { error: "Указанные бренд/семейство/модификация/поколение не согласованы." },
          { status: 400 }
        );
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: currentUser.userId,
        garageId: currentUser.garageId,
        motorcycleBrandId,
        motorcycleModelFamilyId,
        motorcycleVariantId,
        motorcycleGenerationId,
        pendingCatalogRequestId,
        nickname: data.nickname || null,
        vin: data.vin || null,
        odometer: data.odometer,
        engineHours: data.engineHours,
        rideProfile: {
          create: {
            usageType: data.rideProfile.usageType,
            ridingStyle: data.rideProfile.ridingStyle,
            loadType: data.rideProfile.loadType,
            usageIntensity: data.rideProfile.usageIntensity,
          },
        },
      },
      include: vehicleWireInclude,
    });

    const payload: CreateVehicleResponse = {
      vehicle: toGarageVehicleItem(vehicle),
    };
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    if (error instanceof CatalogRequestAlreadyExistsError) {
      return NextResponse.json(
        { error: error.message, generationId: error.generationId },
        { status: 409 }
      );
    }
    if (error instanceof CatalogRequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to create vehicle:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
