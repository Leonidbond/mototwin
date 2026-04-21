import { NextResponse } from "next/server";
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

export async function POST(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUserContext();
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        garageId: currentUser.garageId,
        trashedAt: { not: null },
        garage: {
          ownerUserId: currentUser.userId,
        },
      },
      select: { id: true },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const restored = await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        trashedAt: null,
        trashExpiresAt: null,
      },
      include: {
        brand: true,
        model: true,
        modelVariant: true,
        rideProfile: true,
      },
    });
    return NextResponse.json({ vehicle: restored });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to restore vehicle:", error);
    return NextResponse.json({ error: "Failed to restore vehicle" }, { status: 500 });
  }
}
