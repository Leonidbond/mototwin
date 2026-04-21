import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
      include: {
        brand: true,
        model: true,
        modelVariant: true,
        rideProfile: true,
      },
    });
    return NextResponse.json({ vehicles });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch trashed vehicles:", error);
    return NextResponse.json({ error: "Failed to fetch trashed vehicles" }, { status: 500 });
  }
}
