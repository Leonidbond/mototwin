import { NextResponse } from "next/server";
import {
  dispatchPendingNotificationDeliveriesForUser,
  recalculateNotificationsForUser,
} from "@/lib/notifications";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../_shared/current-user-context";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const currentUser = await getCurrentUserContext();
    await recalculateNotificationsForUser(currentUser.userId);
    await dispatchPendingNotificationDeliveriesForUser(currentUser.userId);
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: currentUser.userId,
        enabled: true,
        invalidatedAt: null,
      },
      select: { id: true },
    });
    return NextResponse.json({
      ok: true,
      testedSubscriptionIds: subscriptions.map((item) => item.id),
    });
  } catch (error) {
    const userContextError = toCurrentUserContextErrorResponse(error);
    if (userContextError) return userContextError;
    console.error("Failed to test push subscriptions:", error);
    return NextResponse.json({ error: "Failed to test push subscriptions" }, { status: 500 });
  }
}
