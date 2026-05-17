import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../_shared/current-user-context";
import { pushSubscriptionSchema } from "../_shared/notifications-http";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserContext();
    const parsed = pushSubscriptionSchema.parse(await request.json());
    const subscription = await prisma.pushSubscription.upsert({
      where: {
        userId_token: {
          userId: currentUser.userId,
          token: parsed.token,
        },
      },
      update: {
        channelType: parsed.channelType,
        provider: parsed.provider,
        platform: parsed.platform,
        endpoint: parsed.endpoint ?? null,
        p256dh: parsed.p256dh ?? null,
        auth: parsed.auth ?? null,
        userAgent: parsed.userAgent ?? null,
        deviceId: parsed.deviceId ?? null,
        deviceName: parsed.deviceName ?? null,
        appVersion: parsed.appVersion ?? null,
        osVersion: parsed.osVersion ?? null,
        locale: parsed.locale ?? null,
        timezone: parsed.timezone ?? null,
        enabled: parsed.enabled ?? true,
        lastSeenAt: new Date(),
        invalidatedAt: null,
      },
      create: {
        userId: currentUser.userId,
        channelType: parsed.channelType,
        provider: parsed.provider,
        platform: parsed.platform,
        token: parsed.token,
        endpoint: parsed.endpoint ?? null,
        p256dh: parsed.p256dh ?? null,
        auth: parsed.auth ?? null,
        userAgent: parsed.userAgent ?? null,
        deviceId: parsed.deviceId ?? null,
        deviceName: parsed.deviceName ?? null,
        appVersion: parsed.appVersion ?? null,
        osVersion: parsed.osVersion ?? null,
        locale: parsed.locale ?? null,
        timezone: parsed.timezone ?? null,
        enabled: parsed.enabled ?? true,
      },
    });
    return NextResponse.json({
      subscription: {
        ...subscription,
        lastSeenAt: subscription.lastSeenAt.toISOString(),
        invalidatedAt: subscription.invalidatedAt?.toISOString() ?? null,
        createdAt: subscription.createdAt.toISOString(),
        updatedAt: subscription.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const userContextError = toCurrentUserContextErrorResponse(error);
    if (userContextError) return userContextError;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid push subscription payload" }, { status: 400 });
    }
    console.error("Failed to upsert push subscription:", error);
    return NextResponse.json({ error: "Failed to upsert push subscription" }, { status: 500 });
  }
}
