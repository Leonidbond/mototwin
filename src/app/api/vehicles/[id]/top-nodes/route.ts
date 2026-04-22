import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTopServiceNodes } from "@/lib/top-service-nodes";
import { isVehicleInCurrentContext } from "../../../_shared/vehicle-context";
import { toCurrentUserContextErrorResponse } from "../../../_shared/current-user-context";

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

    const topServiceNodes = await getTopServiceNodes(prisma);
    const topNodeOrderById = new Map(
      topServiceNodes.map((node) => [node.id, node.topNodeOrder ?? Number.MAX_SAFE_INTEGER])
    );
    const topNodeIds = new Set(topServiceNodes.map((node) => node.id));

    const topNodes = await prisma.topNodeState.findMany({
      where: {
        vehicleId: id,
      },
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
    const filteredTopNodes = topNodes
      .filter((item) => topNodeIds.has(item.node.id))
      .sort((a, b) => {
        const left = topNodeOrderById.get(a.node.id) ?? Number.MAX_SAFE_INTEGER;
        const right = topNodeOrderById.get(b.node.id) ?? Number.MAX_SAFE_INTEGER;
        if (left !== right) {
          return left - right;
        }
        return a.node.code.localeCompare(b.node.code);
      });

    return NextResponse.json({ topNodes: filteredTopNodes });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch top nodes:", error);
    return NextResponse.json(
      { error: "Failed to fetch top nodes" },
      { status: 500 }
    );
  }
}
