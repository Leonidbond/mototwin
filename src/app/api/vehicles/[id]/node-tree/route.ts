import { NextRequest, NextResponse } from "next/server";
import { loadVehicleNodeTreeJson } from "@/lib/vehicle-node-tree-internal";
import { prisma } from "@/lib/prisma";
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
    const result = await loadVehicleNodeTreeJson(prisma, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ nodeTree: result.nodeTree });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch node tree:", error);
    return NextResponse.json(
      { error: "Failed to fetch node tree" },
      { status: 500 }
    );
  }
}
