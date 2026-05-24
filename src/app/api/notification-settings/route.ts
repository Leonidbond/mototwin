import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../_shared/current-user-context";
import { notificationSettingsPatchSchema } from "../_shared/notifications-http";
import { getOrCreateUserNotificationSettings } from "@/lib/notifications";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";

export async function GET() {
  try {
    const currentUser = await getCurrentUserContext();
    const settings = await getOrCreateUserNotificationSettings(currentUser.userId);
    return NextResponse.json({ settings });
  } catch (error) {
    const userContextError = toCurrentUserContextErrorResponse(error);
    if (userContextError) return userContextError;
    console.error("Failed to load notification settings:", error);
    return NextResponse.json({ error: "Failed to load notification settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUserContext();
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 4 * 1024 });
    const parsed = notificationSettingsPatchSchema.parse(raw);
    await getOrCreateUserNotificationSettings(currentUser.userId);
    const settings = await prisma.userNotificationSettings.update({
      where: { userId: currentUser.userId },
      data: parsed,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const userContextError = toCurrentUserContextErrorResponse(error);
    if (userContextError) return userContextError;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid notification settings payload" }, { status: 400 });
    }
    console.error("Failed to update notification settings:", error);
    return NextResponse.json({ error: "Failed to update notification settings" }, { status: 500 });
  }
}
