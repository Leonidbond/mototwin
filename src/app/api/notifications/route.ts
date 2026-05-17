import { NextRequest, NextResponse } from "next/server";
import { toCurrentUserContextErrorResponse, getCurrentUserContext } from "../_shared/current-user-context";
import { listNotifications, serializeNotification } from "@/lib/notifications";
import { parseNotificationSeverity, parseNotificationStatus } from "../_shared/notifications-http";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserContext();
    const { searchParams } = new URL(request.url);
    const status = parseNotificationStatus(searchParams.get("status"));
    const severity = parseNotificationSeverity(searchParams.get("severity"));
    const includeResolved = searchParams.get("includeResolved") === "1";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "50"), 1), 200);

    const result = await listNotifications({
      userId: currentUser.userId,
      status,
      severity,
      includeResolved,
      limit,
    });

    return NextResponse.json({
      notifications: result.notifications.map((item) => serializeNotification(item)),
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    const userContextError = toCurrentUserContextErrorResponse(error);
    if (userContextError) return userContextError;
    console.error("Failed to load notifications:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
