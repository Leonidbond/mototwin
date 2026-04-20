import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVehicleInCurrentContext } from "../../../_shared/vehicle-context";

const TOP_LEVEL_NODE_CODES = [
  "ENGINE",
  "FUEL",
  "COOLING",
  "EXHAUST",
  "ELECTRICS",
  "CHASSIS",
  "STEERING",
  "SUSPENSION",
  "WHEELS",
  "BRAKES",
  "DRIVETRAIN",
  "CONTROLS",
] as const;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const allowed = await isVehicleInCurrentContext(id);
    if (!allowed) {
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
            parentId: true,
            displayOrder: true,
          },
        },
      },
    });

    const filteredTopNodes = topNodes.filter(
      (topNode) =>
        topNode.node.level === 1 &&
        topNode.node.parentId === null &&
        TOP_LEVEL_NODE_CODES.includes(
          topNode.node.code as (typeof TOP_LEVEL_NODE_CODES)[number]
        )
    );

    return NextResponse.json({ topNodes: filteredTopNodes });
  } catch (error) {
    console.error("Failed to fetch top nodes:", error);
    return NextResponse.json(
      { error: "Failed to fetch top nodes" },
      { status: 500 }
    );
  }
}
