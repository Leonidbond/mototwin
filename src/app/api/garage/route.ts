import { NextResponse } from "next/server";
import type { GarageVehiclesResponse } from "@mototwin/types";
import { computeGarageAttentionByVehicleId } from "@/lib/vehicle-node-tree-internal";
import { prisma } from "@/lib/prisma";
import { toGarageVehicleItem, vehicleWireInclude } from "@/lib/vehicle-wire";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../_shared/current-user-context";

const attentionCacheByGarageId = new Map<
  string,
  {
    expiresAt: number;
    value: Map<string, { totalCount: number; overdueCount: number; soonCount: number }>;
  }
>();

const ATTENTION_CACHE_TTL_MS = 20_000;

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUserContext();
    const includeAttention = new URL(request.url).searchParams.get("includeAttention") !== "0";

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

    let attentionById = new Map<string, { totalCount: number; overdueCount: number; soonCount: number }>();
    if (includeAttention) {
      const cached = attentionCacheByGarageId.get(currentUser.garageId);
      if (cached && cached.expiresAt > Date.now()) {
        attentionById = cached.value;
      } else {
        attentionById = await computeGarageAttentionByVehicleId(
          prisma,
          vehicles.map((v) => ({
            id: v.id,
            odometer: v.odometer,
            engineHours: v.engineHours,
          }))
        );
        attentionCacheByGarageId.set(currentUser.garageId, {
          value: attentionById,
          expiresAt: Date.now() + ATTENTION_CACHE_TTL_MS,
        });
      }
    }

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
