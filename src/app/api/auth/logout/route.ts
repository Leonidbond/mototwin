import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { revokeRefreshToken, revokeWebSession } from "@/lib/auth/session-service";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (sessionCookie) {
      await revokeWebSession(sessionCookie);
    }

    const body = (await request.json().catch(() => ({}))) as { refreshToken?: string };
    if (typeof body.refreshToken === "string" && body.refreshToken.trim()) {
      await revokeRefreshToken(body.refreshToken.trim());
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
