import { NextResponse } from "next/server";
import { computeGarageAttentionByVehicleId } from "@/lib/vehicle-node-tree-internal";
import { prisma } from "@/lib/prisma";

const DEMO_USER_EMAIL = "demo@mototwin.local";

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Demo user not found" },
        { status: 500 }
      );
    }

    const vehicles = await prisma.vehicle.findMany({
      where: {
        userId: user.id,
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
    console.error("Failed to fetch garage:", error);
    return NextResponse.json(
      { error: "Failed to fetch garage" },
      { status: 500 }
    );
  }
}