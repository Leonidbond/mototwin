import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "../../_shared/current-user-context";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUserContext();

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        userId: currentUser.userId,
        garageId: currentUser.garageId,
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

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error("Failed to fetch vehicle:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle" },
      { status: 500 }
    );
  }
}
