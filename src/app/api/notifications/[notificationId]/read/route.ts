import { NextResponse } from "next/server";
import { NotificationStatus } from "@prisma/client";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "@/app/api/_shared/current-user-context";
import { serializeNotification, transitionNotificationStatus } from "@/lib/notifications";

type RouteContext = { params: Promise<{ notificationId: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUserContext();
    const { notificationId } = await context.params;
    const notification = await transitionNotificationStatus({
      userId: currentUser.userId,
      notificationId,
      status: NotificationStatus.READ,
    });
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({ notification: serializeNotification(notification) });
  } catch (error) {
    const userContextError = toCurrentUserContextErrorResponse(error);
    if (userContextError) return userContextError;
    console.error("Failed to mark notification as read:", error);
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
  }
}
