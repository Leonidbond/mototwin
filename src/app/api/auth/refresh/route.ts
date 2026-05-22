import { NextResponse } from "next/server";
import { AuthServiceError, refreshMobileSession } from "@/lib/auth/session-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { refreshToken?: string };
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
    if (error instanceof AuthServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Refresh failed:", error);
    return NextResponse.json({ error: "Не удалось обновить сессию." }, { status: 500 });
  }
}
