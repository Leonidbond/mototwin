import { NextResponse } from "next/server";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../_shared/current-user-context";
import { listNotifications, recalculateNotificationsForUser, serializeNotification } from "@/lib/notifications";
import { rateLimit, rateLimit429 } from "@/lib/http/rate-limit";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserContext();
    // MT-SEC-040: per-user cap — recalculation is expensive and one legitimate
    // user shouldn't need to call it more than a few times per minute.
    const decision = rateLimit({
      bucket: "notifications:recalculate",
      request,
      limit: 6,
      windowMs: 60_000,
      extraKey: currentUser.userId,
    });
    if (!decision.allowed) return rateLimit429(decision);

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
