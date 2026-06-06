import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { attachMototwinSessionCookieIfNeeded } from "@/lib/auth/attach-web-session-cookie";
import { getCapabilities } from "@/lib/subscription/capabilities";
import { isTrialActive } from "@/lib/subscription/resolve-plan";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../_shared/current-user-context";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const cookieNames = cookieStore
      .getAll()
      .map((cookie) => cookie.name)
      .filter((name) => name.includes("next-auth") || name.includes("authjs") || name.includes("mototwin"));
    // #region agent log
    console.log(
      "[debug][auth-me] route-called",
      JSON.stringify({
        cookieNames,
      })
    );
    // #endregion
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
    const response = NextResponse.json({
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
    return attachMototwinSessionCookieIfNeeded(response, user.id);
  } catch (error) {
    const ctxError = toCurrentUserContextErrorResponse(error);
    if (ctxError) {
      // #region agent log
      console.log(
        "[debug][auth-me] ctx-error",
        JSON.stringify({
          status: ctxError.status,
        })
      );
      // #endregion
      return ctxError;
    }
    console.error("Auth me failed:", error);
    return NextResponse.json({ error: "Не удалось загрузить сессию." }, { status: 500 });
  }
}
