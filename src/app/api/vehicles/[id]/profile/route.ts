import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../../_shared/current-user-context";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const updateVehicleProfileSchema = z.object({
  nickname: z.string().trim().nullable(),
  vin: z.string().trim().nullable(),
  rideProfile: z.object({
    usageType: z.enum(["CITY", "HIGHWAY", "MIXED", "OFFROAD"]),
    ridingStyle: z.enum(["CALM", "ACTIVE", "AGGRESSIVE"]),
    loadType: z.enum(["SOLO", "PASSENGER", "LUGGAGE", "PASSENGER_LUGGAGE"]),
    usageIntensity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  }),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const json = await request.json();
    const data = updateVehicleProfileSchema.parse(json);
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

    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        nickname: data.nickname || null,
        vin: data.vin || null,
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
      include: {
        brand: true,
        model: true,
        modelVariant: true,
        rideProfile: true,
      },
    });

    return NextResponse.json({ vehicle: updatedVehicle });
  } catch (error) {
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

    console.error("Failed to update vehicle profile:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle profile" },
      { status: 500 }
    );
  }
}
