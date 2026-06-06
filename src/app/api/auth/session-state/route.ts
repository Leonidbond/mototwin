import { NextResponse } from "next/server";
import { attachMototwinSessionCookieIfNeeded } from "@/lib/auth/attach-web-session-cookie";
import { resolveAuthenticatedUserId } from "@/lib/auth/request-auth";

/**
 * Lightweight auth probe for web guards.
 * Keeps page access checks cheap and avoids loading full profile on each route change.
 */
export async function GET() {
  try {
    const userId = await resolveAuthenticatedUserId();
    const response = NextResponse.json({
      authenticated: Boolean(userId),
      userId: userId ?? null,
    });
    if (!userId) {
      return response;
    }
    return attachMototwinSessionCookieIfNeeded(response, userId);
  } catch (error) {
    console.error("Auth session-state probe failed:", error);
    return NextResponse.json(
      { authenticated: false, userId: null, error: "Не удалось проверить сессию." },
      { status: 500 }
    );
  }
}
