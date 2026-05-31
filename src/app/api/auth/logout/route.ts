import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  resolveUserIdFromSessionToken,
  revokeRefreshToken,
  revokeWebSession,
} from "@/lib/auth/session-service";
import { parseJsonBody } from "@/lib/http/parse-json-body";
import { logAuthEvent } from "@/lib/auth-audit";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    let userId: string | null = null;
    if (sessionCookie) {
      userId = await resolveUserIdFromSessionToken(sessionCookie);
      await revokeWebSession(sessionCookie);
    }

    // MT-SEC-069: cap body at 2KB. Body is optional (cookie path is fine).
    const body = (await parseJsonBody<{ refreshToken?: string }>(request, {
      maxBytes: 2 * 1024,
    }).catch(() => ({}))) as { refreshToken?: string };
    if (typeof body.refreshToken === "string" && body.refreshToken.trim()) {
      const refreshToken = body.refreshToken.trim();
      // Hard cap on token length — generated tokens are 88 chars max; refuse
      // anything implausible to avoid wasting CPU on hash comparisons.
      if (refreshToken.length <= 4_096) {
        await revokeRefreshToken(refreshToken);
      }
    }

    if (userId) {
      void logAuthEvent({
        event: "session.revoked",
        userId,
        metadata: { cause: "logout" },
      });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("Logout failed:", error);
    return NextResponse.json({ error: "Не удалось выйти." }, { status: 500 });
  }
}
