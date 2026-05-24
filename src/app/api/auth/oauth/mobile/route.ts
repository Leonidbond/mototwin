import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMobileTokens, resolveOrCreateOAuthUser, AuthServiceError } from "@/lib/auth/session-service";
import { resolveMobileOAuthProfile } from "@/lib/auth/oauth-mobile";
import { getPrimaryGarage } from "@/lib/auth/user-bootstrap";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      provider?: "google" | "apple" | "yandex";
      idToken?: string;
      accessToken?: string;
    };
    const provider = body.provider;
    if (provider !== "google" && provider !== "apple" && provider !== "yandex") {
      return NextResponse.json({ error: "Неподдерживаемый OAuth-провайдер." }, { status: 400 });
    }

    const profile = await resolveMobileOAuthProfile({
      provider,
      idToken: body.idToken,
      accessToken: body.accessToken,
    });
    const user = await resolveOrCreateOAuthUser(profile);
    const [tokens, garage] = await Promise.all([
      createMobileTokens(user.userId),
      getPrimaryGarage(user.userId),
    ]);

    if (!garage) {
      return NextResponse.json({ error: "Гараж не найден." }, { status: 503 });
    }

    const freshUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, email: true, displayName: true },
    });

    return NextResponse.json({
      user: {
        id: freshUser?.id ?? user.userId,
        email: freshUser?.email ?? user.email ?? "",
        displayName: freshUser?.displayName ?? user.displayName,
      },
      garageId: garage.id,
      garageTitle: garage.title,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.accessExpiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Mobile OAuth failed:", error);
    return NextResponse.json({ error: "Не удалось выполнить OAuth-вход." }, { status: 500 });
  }
}
