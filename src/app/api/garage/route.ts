import { NextResponse } from "next/server";
import type { GarageVehiclesResponse } from "@mototwin/types";
import { computeGarageAttentionByVehicleId } from "@/lib/vehicle-node-tree-internal";
import { prisma } from "@/lib/prisma";
import { toGarageVehicleItem, vehicleWireInclude } from "@/lib/vehicle-wire";
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
      include: vehicleWireInclude,
    });

    const attentionById = await computeGarageAttentionByVehicleId(
      prisma,
      vehicles.map((v) => ({
        id: v.id,
        odometer: v.odometer,
        engineHours: v.engineHours,
      }))
    );

    const vehiclesPayload: GarageVehiclesResponse = {
      vehicles: vehicles.map((row) => ({
        ...toGarageVehicleItem(row),
        attentionSummary: attentionById.get(row.id) ?? {
          totalCount: 0,
          overdueCount: 0,
          soonCount: 0,
        },
      })),
    };

    return NextResponse.json(vehiclesPayload);
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
