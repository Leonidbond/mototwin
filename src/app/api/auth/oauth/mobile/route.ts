import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMobileTokens, resolveOrCreateOAuthUser, AuthServiceError } from "@/lib/auth/session-service";
import { resolveMobileOAuthProfile } from "@/lib/auth/oauth-mobile";
import { getPrimaryGarage } from "@/lib/auth/user-bootstrap";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { rateLimit, rateLimit429 } from "@/lib/http/rate-limit";

export async function POST(request: Request) {
  try {
    // MT-SEC-002: cap upstream verification calls (Google/Apple/Yandex) per IP.
    const decision = rateLimit({
      bucket: "auth:oauth-mobile",
      request,
      limit: 20,
      windowMs: 60_000,
    });
    if (!decision.allowed) return rateLimit429(decision);

    // OAuth idTokens can be a few kB; cap at 16 KB.
    const body = await parseJsonBody<{
      provider?: "google" | "apple" | "yandex";
      idToken?: string;
      accessToken?: string;
      rawNonce?: string;
    }>(request, { maxBytes: 16 * 1024 });
    const provider = body.provider;
    if (provider !== "google" && provider !== "apple" && provider !== "yandex") {
      return NextResponse.json({ error: "Неподдерживаемый OAuth-провайдер." }, { status: 400 });
    }

    const profile = await resolveMobileOAuthProfile({
      provider,
      idToken: body.idToken,
      accessToken: body.accessToken,
      rawNonce: body.rawNonce,
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
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof AuthServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    // MT-SEC-022: avoid leaking provider tokens/PII via raw error.
    console.error(
      "[auth] mobile oauth failed",
      JSON.stringify({
        name: (error as { name?: string })?.name,
        code: (error as { code?: string })?.code,
      })
    );
    return NextResponse.json({ error: "Не удалось выполнить OAuth-вход." }, { status: 500 });
  }
}
