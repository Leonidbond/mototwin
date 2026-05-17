import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../_shared/current-user-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUserContext();
    const { id } = await context.params;
    const subscription = await prisma.pushSubscription.findFirst({
      where: { id, userId: currentUser.userId },
      select: { id: true },
    });
    if (!subscription) {
      return NextResponse.json({ error: "Push subscription not found" }, { status: 404 });
    }
    await prisma.pushSubscription.update({
      where: { id },
      data: {
        enabled: false,
        invalidatedAt: new Date(),
      },
    });
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    const userContextError = toCurrentUserContextErrorResponse(error);
    if (userContextError) return userContextError;
    console.error("Failed to delete push subscription:", error);
    return NextResponse.json({ error: "Failed to delete push subscription" }, { status: 500 });
  }
}
