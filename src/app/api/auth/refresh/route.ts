import { NextResponse } from "next/server";
import { AuthServiceError, refreshMobileSession } from "@/lib/auth/session-service";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { rateLimit, rateLimit429 } from "@/lib/http/rate-limit";

export async function POST(request: Request) {
  try {
    // MT-SEC-002: refresh is hit-per-30min in legitimate use; cap aggressively.
    const decision = rateLimit({ bucket: "auth:refresh", request, limit: 30, windowMs: 60_000 });
    if (!decision.allowed) return rateLimit429(decision);

    const body = await parseJsonBody<{ refreshToken?: string }>(request, { maxBytes: 2 * 1024 });
    const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";
    if (!refreshToken) {
      return NextResponse.json({ error: "Укажите refreshToken." }, { status: 400 });
    }

    const tokens = await refreshMobileSession(refreshToken);
    return NextResponse.json({
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
    console.error(
      "[auth] refresh failed",
      JSON.stringify({
        name: (error as { name?: string })?.name,
        code: (error as { code?: string })?.code,
      })
    );
    return NextResponse.json({ error: "Не удалось обновить сессию." }, { status: 500 });
  }
}
