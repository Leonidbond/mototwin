import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { CreateVehicleResponse } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { toGarageVehicleItem, vehicleWireInclude } from "@/lib/vehicle-wire";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../_shared/current-user-context";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedInt, boundedText, boundedTextOptional, strictObject } from "@/lib/http/input-validation";

// MT-SEC-068 + MT-SEC-070: strictObject blocks mass assignment; nickname/vin
// length-capped; nested rideProfile object is also strict.
const createVehicleSchema = strictObject({
  motorcycleBrandId: boundedText({ max: 64 }),
  motorcycleModelFamilyId: boundedText({ max: 64 }),
  motorcycleVariantId: boundedText({ max: 64 }),
  motorcycleGenerationId: boundedText({ max: 64 }),
  nickname: boundedTextOptional({ max: 120 }),
  // VIN is 17 chars max per ISO 3779; allow some slack for legacy inputs.
  vin: boundedTextOptional({ max: 32 }),
  odometer: boundedInt({ min: 0, max: 10_000_000 }),
  engineHours: boundedInt({ min: 0, max: 1_000_000 }).nullable(),
  rideProfile: strictObject({
    usageType: z.enum(["CITY", "HIGHWAY", "MIXED", "OFFROAD"]),
    ridingStyle: z.enum(["CALM", "ACTIVE", "AGGRESSIVE"]),
    loadType: z.enum(["SOLO", "PASSENGER", "LUGGAGE", "PASSENGER_LUGGAGE"]),
    usageIntensity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const json = await parseJsonBody<unknown>(request, { maxBytes: 8 * 1024 });
    const data = createVehicleSchema.parse(json);
    const currentUser = await getCurrentUserContext();

    /** Validate the 4-level FK chain belongs together before creating the vehicle. */
    const generation = await prisma.motorcycleGeneration.findFirst({
      where: {
        id: data.motorcycleGenerationId,
        variantId: data.motorcycleVariantId,
        variant: {
          familyId: data.motorcycleModelFamilyId,
          family: { brandId: data.motorcycleBrandId },
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

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: currentUser.userId,
        garageId: currentUser.garageId,
        motorcycleBrandId: data.motorcycleBrandId,
        motorcycleModelFamilyId: data.motorcycleModelFamilyId,
        motorcycleVariantId: data.motorcycleVariantId,
        motorcycleGenerationId: data.motorcycleGenerationId,
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
