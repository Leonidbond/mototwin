import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTopServiceNodes } from "@/lib/top-service-nodes";
import { getCapabilities } from "@/lib/subscription/capabilities";
import { getOrCreateUserSubscription } from "@/lib/subscription/resolve-plan";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../_shared/current-user-context";

export async function GET() {
  try {
    const currentUser = await getCurrentUserContext();
    const subscription = await getOrCreateUserSubscription(currentUser.userId);
    const capabilities = getCapabilities(subscription.plan);
    const settings = await prisma.userSettings.findUnique({
      where: { userId: currentUser.userId },
      select: { favoriteNodeCodes: true },
    });
    const customCodes =
      capabilities.canCustomizeFavoriteNodes &&
      settings?.favoriteNodeCodes &&
      settings.favoriteNodeCodes.length > 0
        ? settings.favoriteNodeCodes
        : null;
    const nodes = await getTopServiceNodes(prisma, customCodes);
    return NextResponse.json({ nodes });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch top nodes:", error);
    return NextResponse.json({ error: "Failed to fetch top nodes" }, { status: 500 });
  }
}
