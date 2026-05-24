import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toGarageVehicleItem, vehicleWireInclude } from "@/lib/vehicle-wire";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../_shared/current-user-context";

export async function GET() {
  try {
    const currentUser = await getCurrentUserContext();
    const vehicles = await prisma.vehicle.findMany({
      where: {
        garageId: currentUser.garageId,
        trashedAt: { not: null },
        garage: {
          ownerUserId: currentUser.userId,
        },
      },
      orderBy: [{ trashedAt: "desc" }],
      include: vehicleWireInclude,
    });
    return NextResponse.json({
      vehicles: vehicles.map((row) => toGarageVehicleItem(row)),
    });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch trashed vehicles:", error);
    return NextResponse.json({ error: "Failed to fetch trashed vehicles" }, { status: 500 });
  }
}
