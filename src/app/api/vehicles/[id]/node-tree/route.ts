import { NextRequest, NextResponse } from "next/server";
import {
  annotateMaintenanceTreeAccess,
  loadVehicleNodeTreeJson,
} from "@/lib/vehicle-node-tree-internal";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TOP_SERVICE_NODE_CODES } from "@/lib/top-service-nodes";
import { getCapabilities } from "@/lib/subscription/capabilities";
import { getOrCreateUserSubscription } from "@/lib/subscription/resolve-plan";
import { isVehicleInCurrentContext } from "../../../_shared/vehicle-context";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../../_shared/current-user-context";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUserContext();
    const allowed = await isVehicleInCurrentContext(id);
    if (!allowed) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    const result = await loadVehicleNodeTreeJson(prisma, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const subscription = await getOrCreateUserSubscription(currentUser.userId);
    const capabilities = getCapabilities(subscription.plan);

    if (capabilities.nodeAccessLevel === "FULL_TREE") {
      return NextResponse.json({ nodeTree: result.nodeTree });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: currentUser.userId },
      select: { favoriteNodeCodes: true },
    });
    const topCodes =
      capabilities.canCustomizeFavoriteNodes &&
      settings?.favoriteNodeCodes &&
      settings.favoriteNodeCodes.length > 0
        ? settings.favoriteNodeCodes
        : [...DEFAULT_TOP_SERVICE_NODE_CODES];

    const restrictedTree = annotateMaintenanceTreeAccess(result.nodeTree, topCodes, {
      selectable: capabilities.nodeAccessLevel === "TOP_SELECTABLE",
    });
    return NextResponse.json({ nodeTree: restrictedTree });
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
