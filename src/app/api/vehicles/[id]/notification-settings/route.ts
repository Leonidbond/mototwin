import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getVehicleInCurrentContext } from "../../../_shared/vehicle-context";
import { toCurrentUserContextErrorResponse } from "../../../_shared/current-user-context";
import {
  getOrCreateVehicleNotificationSettings,
  getOrCreateUserNotificationSettings,
} from "@/lib/notifications";
import { vehicleNotificationSettingsPatchSchema } from "../../../_shared/notifications-http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;
    const vehicle = await getVehicleInCurrentContext(vehicleId, { id: true, userId: true });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    await getOrCreateUserNotificationSettings(vehicle.userId);
    const settings = await getOrCreateVehicleNotificationSettings(vehicle.userId, vehicleId);
    return NextResponse.json({ settings });
  } catch (error) {
    const userContextError = toCurrentUserContextErrorResponse(error);
    if (userContextError) return userContextError;
    console.error("Failed to load vehicle notification settings:", error);
    return NextResponse.json(
      { error: "Failed to load vehicle notification settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;
    const vehicle = await getVehicleInCurrentContext(vehicleId, { id: true, userId: true });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const parsed = vehicleNotificationSettingsPatchSchema.parse(await request.json());
    await getOrCreateVehicleNotificationSettings(vehicle.userId, vehicleId);
    const settings = await prisma.vehicleNotificationSettings.update({
      where: { vehicleId },
      data: parsed,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    const userContextError = toCurrentUserContextErrorResponse(error);
    if (userContextError) return userContextError;
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid vehicle notification settings payload" },
        { status: 400 }
      );
    }
    console.error("Failed to update vehicle notification settings:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle notification settings" },
      { status: 500 }
    );
  }
}
