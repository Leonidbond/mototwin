import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
        select: { planType: true },
      }),
    ]);

    if (!user || !garage) {
      return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email ?? "",
        displayName: user.displayName,
      },
      garageId: garage.id,
      garageTitle: garage.title,
      planType: subscription?.planType === "PRO" ? "PRO" : "FREE",
    });
  } catch (error) {
    const ctxError = toCurrentUserContextErrorResponse(error);
    if (ctxError) return ctxError;
    console.error("Auth me failed:", error);
    return NextResponse.json({ error: "Не удалось загрузить сессию." }, { status: 500 });
  }
}
