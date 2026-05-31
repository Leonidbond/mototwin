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
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { rateLimit, rateLimit429 } from "@/lib/http/rate-limit";
import { logAuthEvent } from "@/lib/auth-audit";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ email?: string; password?: string }>(request, {
      maxBytes: 4 * 1024,
    });
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: "Укажите email и пароль." }, { status: 400 });
    }

    // MT-SEC-002: throttle by IP+UA and additionally by lowercased email so a
    // distributed attack against one account is still capped.
    const decision = rateLimit({
      bucket: "auth:login",
      request,
      limit: 8,
      windowMs: 60_000,
      extraKey: email.trim().toLowerCase(),
    });
    if (!decision.allowed) {
      void logAuthEvent({
        event: "auth.rate_limited",
        reasonCode: "auth:login",
        metadata: { endpoint: "/api/auth/login" },
      });
      return rateLimit429(decision);
    }

    const requestHeaders = await headers();
    const isMobile = requestHeaders.get(MOBILE_CLIENT_HEADER) === "expo";
    const client = isMobile ? "mobile" : "web";

    const user = await verifyUserCredentials(email, password);
    const garage = await prisma.garage.findFirst({
      where: { ownerUserId: user.userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    });
    if (!garage) {
      return NextResponse.json({ error: "Гараж не найден." }, { status: 503 });
    }

    const userPayload = {
      id: user.userId,
      email: user.email,
      displayName: user.displayName,
    };

    void logAuthEvent({
      event: "login.success",
      userId: user.userId,
      metadata: { client },
    });

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
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof AuthServiceError) {
      void logAuthEvent({
        event: "login.failure",
        reasonCode: error.code,
      });
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error(
      "[auth] login failed",
      JSON.stringify({
        name: (error as { name?: string })?.name,
        code: (error as { code?: string })?.code,
      })
    );
    return NextResponse.json({ error: "Не удалось войти." }, { status: 500 });
  }
}
