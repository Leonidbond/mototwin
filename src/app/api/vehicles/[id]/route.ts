import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  toVehicleDetailApiRecord,
  vehicleWireInclude,
} from "@/lib/vehicle-wire";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../_shared/current-user-context";
import { nextResponseFromUnexpectedRouteError } from "../../_shared/route-error-response";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { strictObject } from "@/lib/http/input-validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const updateVehicleProfileSchema = strictObject({
  nickname: z.string().trim().max(80).nullable(),
  vin: z.string().trim().max(32).nullable(),
  // MT-SEC-068: nested object also strict to block mass assignment.
  rideProfile: strictObject({
    usageType: z.enum(["CITY", "HIGHWAY", "MIXED", "OFFROAD"]),
    ridingStyle: z.enum(["CALM", "ACTIVE", "AGGRESSIVE"]),
    loadType: z.enum(["SOLO", "PASSENGER", "LUGGAGE", "PASSENGER_LUGGAGE"]),
    usageIntensity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  }),
});

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Vehicle id is required" }, { status: 400 });
    }
    const currentUser = await getCurrentUserContext();

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        garageId: currentUser.garageId,
        trashedAt: null,
        garage: {
          ownerUserId: currentUser.userId,
        },
      },
      include: vehicleWireInclude,
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ vehicle: toVehicleDetailApiRecord(vehicle) });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    return nextResponseFromUnexpectedRouteError(error, {
      fallbackMessage: "Не удалось загрузить данные мотоцикла",
      logLabel: "Failed to fetch vehicle:",
    });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Vehicle id is required" }, { status: 400 });
    }
    const json = await parseJsonBody<unknown>(request, { maxBytes: 4 * 1024 });
    const parsed = updateVehicleProfileSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Неверный формат профиля мотоцикла.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUserContext();
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        garageId: currentUser.garageId,
        trashedAt: null,
        garage: {
          ownerUserId: currentUser.userId,
        },
      },
      select: { id: true },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const data = parsed.data;
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        nickname: data.nickname || null,
        vin: data.vin ? data.vin.toUpperCase() : null,
        rideProfile: {
          upsert: {
            create: {
              usageType: data.rideProfile.usageType,
              ridingStyle: data.rideProfile.ridingStyle,
              loadType: data.rideProfile.loadType,
              usageIntensity: data.rideProfile.usageIntensity,
            },
            update: {
              usageType: data.rideProfile.usageType,
              ridingStyle: data.rideProfile.ridingStyle,
              loadType: data.rideProfile.loadType,
              usageIntensity: data.rideProfile.usageIntensity,
            },
          },
        },
      },
      include: vehicleWireInclude,
    });

    return NextResponse.json({
      vehicle: toVehicleDetailApiRecord(updatedVehicle),
    });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    return nextResponseFromUnexpectedRouteError(error, {
      fallbackMessage: "Не удалось сохранить профиль мотоцикла",
      logLabel: "Failed to update vehicle profile:",
    });
  }
}
