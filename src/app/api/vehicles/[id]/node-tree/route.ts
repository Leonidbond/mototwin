import { NextRequest, NextResponse } from "next/server";
import { loadVehicleNodeTreeJson } from "@/lib/vehicle-node-tree-internal";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await loadVehicleNodeTreeJson(prisma, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ nodeTree: result.nodeTree });
  } catch (error) {
    console.error("Failed to fetch node tree:", error);
    return NextResponse.json(
      { error: "Failed to fetch node tree" },
      { status: 500 }
    );
  }
}
