import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { calculateTrashExpiresAt } from "@mototwin/domain";
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

const DEFAULT_RETENTION_DAYS = 30;

function resolveRetentionDays(value: unknown): 7 | 14 | 30 | 60 | 90 {
  if (value === 7 || value === 14 || value === 30 || value === 60 || value === 90) {
    return value;
  }
  return DEFAULT_RETENTION_DAYS;
}

export async function POST(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUserContext();
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        garageId: currentUser.garageId,
        garage: {
          ownerUserId: currentUser.userId,
        },
      },
      include: {
        brand: true,
        model: true,
        modelVariant: true,
        rideProfile: true,
      },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    if (vehicle.trashedAt && vehicle.trashExpiresAt) {
      return NextResponse.json({ vehicle });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: currentUser.userId },
      select: { vehicleTrashRetentionDays: true },
    });
    const retentionDays = resolveRetentionDays(settings?.vehicleTrashRetentionDays);
    const trashedAt = new Date();
    const trashExpiresAt = calculateTrashExpiresAt(trashedAt, retentionDays);
    const updated = await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { trashedAt, trashExpiresAt },
      include: {
        brand: true,
        model: true,
        modelVariant: true,
        rideProfile: true,
      },
    });
    return NextResponse.json({ vehicle: updated });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to move vehicle to trash:", error);
    return NextResponse.json({ error: "Failed to move vehicle to trash" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUserContext();
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        garageId: currentUser.garageId,
        garage: {
          ownerUserId: currentUser.userId,
        },
      },
      select: { id: true, trashedAt: true },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    if (!vehicle.trashedAt) {
      return NextResponse.json(
        { error: "Vehicle must be moved to trash before permanent delete." },
        { status: 400 }
      );
    }

    await prisma.vehicle.delete({
      where: { id: vehicle.id },
    });
    return NextResponse.json({ deleted: true, vehicleId: vehicle.id });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "Невозможно удалить мотоцикл: есть связанные записи." },
        { status: 400 }
      );
    }
    console.error("Failed to permanently delete vehicle:", error);
    return NextResponse.json({ error: "Failed to permanently delete vehicle" }, { status: 500 });
  }
}
