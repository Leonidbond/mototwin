import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const topNodes = await prisma.topNodeState.findMany({
      where: { vehicleId: id },
      orderBy: {
        node: {
          displayOrder: "asc",
        },
      },
      select: {
        id: true,
        status: true,
        note: true,
        updatedAt: true,
        node: {
          select: {
            id: true,
            code: true,
            name: true,
            level: true,
            displayOrder: true,
          },
        },
      },
    });

    return NextResponse.json({ topNodes });
  } catch (error) {
    console.error("Failed to fetch top nodes:", error);
    return NextResponse.json(
      { error: "Failed to fetch top nodes" },
      { status: 500 }
    );
  }
}
