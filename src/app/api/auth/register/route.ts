import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MOBILE_CLIENT_HEADER, SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  AuthServiceError,
  createMobileTokens,
  createWebSession,
  registerUser,
} from "@/lib/auth/session-service";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
    };

    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: "Укажите email и пароль." }, { status: 400 });
    }

    const registered = await registerUser({
      email,
      password,
      displayName: body.displayName,
    });

    const requestHeaders = await headers();
    const isMobile = requestHeaders.get(MOBILE_CLIENT_HEADER) === "expo";

    const garage = await prisma.garage.findUnique({
      where: { id: registered.garageId },
      select: { title: true },
    });

    const userPayload = {
      id: registered.userId,
      email: registered.email,
      displayName: registered.displayName,
    };

    if (isMobile) {
      const tokens = await createMobileTokens(registered.userId);
      return NextResponse.json({
        user: userPayload,
        garageId: registered.garageId,
        garageTitle: garage?.title ?? "Мой гараж",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.accessExpiresAt.toISOString(),
      });
    }

    const session = await createWebSession(registered.userId);
    const response = NextResponse.json({
      user: userPayload,
      garageId: registered.garageId,
      garageTitle: garage?.title ?? "Мой гараж",
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
    console.error("Register failed:", error);
    return NextResponse.json({ error: "Не удалось зарегистрироваться." }, { status: 500 });
  }
}
