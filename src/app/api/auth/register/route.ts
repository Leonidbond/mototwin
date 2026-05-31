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
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { rateLimit, rateLimit429 } from "@/lib/http/rate-limit";
import { logAuthEvent } from "@/lib/auth-audit";

export async function POST(request: Request) {
  try {
    // MT-SEC-002 + MT-SEC-004: cap registration probes per IP so the
    // unavoidable 409 on existing accounts can't be used for enumeration.
    const decision = rateLimit({
      bucket: "auth:register",
      request,
      limit: 5,
      windowMs: 5 * 60_000,
    });
    if (!decision.allowed) {
      void logAuthEvent({
        event: "auth.rate_limited",
        reasonCode: "auth:register",
        metadata: { endpoint: "/api/auth/register" },
      });
      return rateLimit429(decision);
    }

    const body = await parseJsonBody<{
      email?: string;
      password?: string;
      displayName?: string;
    }>(request, { maxBytes: 8 * 1024 });

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
    const client = isMobile ? "mobile" : "web";

    const garage = await prisma.garage.findUnique({
      where: { id: registered.garageId },
      select: { title: true },
    });

    const userPayload = {
      id: registered.userId,
      email: registered.email,
      displayName: registered.displayName,
    };

    void logAuthEvent({
      event: "register.success",
      userId: registered.userId,
      metadata: { client },
    });

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
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof AuthServiceError) {
      void logAuthEvent({
        event: "register.failure",
        reasonCode: error.code,
      });
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    // MT-SEC-022: Prisma errors may include unique-constraint field values
    // (i.e. the user's e-mail). Log a sanitized shape only.
    console.error(
      "[auth] register failed",
      JSON.stringify({
        name: (error as { name?: string })?.name,
        code: (error as { code?: string })?.code,
      })
    );
    return NextResponse.json({ error: "Не удалось зарегистрироваться." }, { status: 500 });
  }
}
