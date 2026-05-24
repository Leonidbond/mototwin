import { NextResponse } from "next/server";
import { NotificationStatus } from "@prisma/client";
import { z } from "zod";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "@/app/api/_shared/current-user-context";
import { notificationSnoozeSchema } from "@/app/api/_shared/notifications-http";
import { serializeNotification, transitionNotificationStatus } from "@/lib/notifications";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";

type RouteContext = { params: Promise<{ notificationId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUserContext();
    const { notificationId } = await context.params;
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 1 * 1024 });
    const parsed = notificationSnoozeSchema.parse(raw);
    const notification = await transitionNotificationStatus({
      userId: currentUser.userId,
      notificationId,
      status: NotificationStatus.SNOOZED,
      snoozedUntil: parsed.snoozedUntil,
    });
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({ notification: serializeNotification(notification) });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const userContextError = toCurrentUserContextErrorResponse(error);
    if (userContextError) return userContextError;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid snooze payload" }, { status: 400 });
    }
    console.error("Failed to snooze notification:", error);
    return NextResponse.json({ error: "Failed to snooze notification" }, { status: 500 });
  }
}
