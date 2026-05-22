import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { MOBILE_CLIENT_HEADER, SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  AuthServiceError,
  createMobileTokens,
  createWebSession,
  verifyUserCredentials,
} from "@/lib/auth/session-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: "Укажите email и пароль." }, { status: 400 });
    }

    const user = await verifyUserCredentials(email, password);
    const garage = await prisma.garage.findFirst({
      where: { ownerUserId: user.userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    });
    if (!garage) {
      return NextResponse.json({ error: "Гараж не найден." }, { status: 503 });
    }

    const requestHeaders = await headers();
    const isMobile = requestHeaders.get(MOBILE_CLIENT_HEADER) === "expo";

    const userPayload = {
      id: user.userId,
      email: user.email,
      displayName: user.displayName,
    };

    if (isMobile) {
      const tokens = await createMobileTokens(user.userId);
      return NextResponse.json({
        user: userPayload,
        garageId: garage.id,
        garageTitle: garage.title,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.accessExpiresAt.toISOString(),
      });
    }

    const session = await createWebSession(user.userId);
    const response = NextResponse.json({
      user: userPayload,
      garageId: garage.id,
      garageTitle: garage.title,
    });
    response.cookies.set(SESSION_COOKIE_NAME, session.rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Не удалось войти." }, { status: 500 });
  }
}
