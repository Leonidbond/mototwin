import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCapabilities } from "@/lib/subscription/capabilities";
import { isTrialActive } from "@/lib/subscription/resolve-plan";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../_shared/current-user-context";

export async function GET() {
  try {
    const currentUser = await getCurrentUserContext();
    const [user, garage, subscription] = await Promise.all([
      prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: { id: true, email: true, displayName: true },
      }),
      prisma.garage.findUnique({
        where: { id: currentUser.garageId },
        select: { id: true, title: true },
      }),
      prisma.subscription.findUnique({
        where: { userId: currentUser.userId },
        select: { planType: true, trialEndsAt: true },
      }),
    ]);

    if (!user || !garage) {
      return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
    }

    const planType = subscription?.planType ?? "FREE";
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email ?? "",
        displayName: user.displayName,
      },
      garageId: garage.id,
      garageTitle: garage.title,
      planType,
      trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
      isTrialActive: isTrialActive(subscription?.trialEndsAt ?? null),
      capabilities: getCapabilities(planType),
    });
  } catch (error) {
    const ctxError = toCurrentUserContextErrorResponse(error);
    if (ctxError) return ctxError;
    console.error("Auth me failed:", error);
    return NextResponse.json({ error: "Не удалось загрузить сессию." }, { status: 500 });
  }
}
