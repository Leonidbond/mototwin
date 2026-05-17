import { NextResponse } from "next/server";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../_shared/current-user-context";
import { listNotifications, recalculateNotificationsForUser, serializeNotification } from "@/lib/notifications";

export async function POST() {
  try {
    const currentUser = await getCurrentUserContext();
    const createdCount = await recalculateNotificationsForUser(currentUser.userId);
    const list = await listNotifications({
      userId: currentUser.userId,
      includeResolved: false,
      limit: 50,
    });
    return NextResponse.json({
      createdCount,
      notifications: list.notifications.map((item) => serializeNotification(item)),
    });
  } catch (error) {
    const userContextError = toCurrentUserContextErrorResponse(error);
    if (userContextError) return userContextError;
    console.error("Failed to recalculate notifications:", error);
    return NextResponse.json({ error: "Failed to recalculate notifications" }, { status: 500 });
  }
}
