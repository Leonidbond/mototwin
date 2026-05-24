import { NextResponse } from "next/server";
import { z } from "zod";
import { getVehicleInCurrentContext } from "../../../_shared/vehicle-context";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../../_shared/current-user-context";
import { usageUpdateSchema } from "../../../_shared/notifications-http";
import { applyVehicleUsageUpdate } from "@/lib/notifications";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUserContext();
    const { id: vehicleId } = await context.params;
    const vehicle = await getVehicleInCurrentContext(vehicleId, { id: true });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const raw = await parseJsonBody<unknown>(request, { maxBytes: 2 * 1024 });
    const parsed = usageUpdateSchema.parse(raw);
    const result = await applyVehicleUsageUpdate({
      userId: currentUser.userId,
      vehicleId,
      mileageKm: parsed.mileageKm,
      engineHours: parsed.engineHours,
      recalculateReminders: parsed.recalculateReminders ?? true,
      source: "MANUAL",
    });
    if (!result) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      vehicle: {
        ...result.vehicle,
        updatedAt: result.vehicle.updatedAt.toISOString(),
      },
      resolvedNotifications: result.resolvedNotifications,
    });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const userContextError = toCurrentUserContextErrorResponse(error);
    if (userContextError) return userContextError;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid usage update payload" }, { status: 400 });
    }
    console.error("Failed to process usage update:", error);
    return NextResponse.json({ error: "Failed to process usage update" }, { status: 500 });
  }
}
