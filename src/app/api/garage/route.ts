import { NextResponse } from "next/server";
import { computeGarageAttentionByVehicleId } from "@/lib/vehicle-node-tree-internal";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../_shared/current-user-context";

export async function GET() {
  try {
    const currentUser = await getCurrentUserContext();

    const vehicles = await prisma.vehicle.findMany({
      where: {
        garageId: currentUser.garageId,
        trashedAt: null,
        garage: {
          ownerUserId: currentUser.userId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        brand: true,
        model: true,
        modelVariant: true,
        rideProfile: true,
      },
    });

    const attentionById = await computeGarageAttentionByVehicleId(
      prisma,
      vehicles.map((v) => ({
        id: v.id,
        odometer: v.odometer,
        engineHours: v.engineHours,
      }))
    );

    const vehiclesPayload = vehicles.map((v) => ({
      ...v,
      attentionSummary: attentionById.get(v.id) ?? {
        totalCount: 0,
        overdueCount: 0,
        soonCount: 0,
      },
    }));

    return NextResponse.json({ vehicles: vehiclesPayload });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch garage:", error);
    return NextResponse.json(
      { error: "Failed to fetch garage" },
      { status: 500 }
    );
  }
}