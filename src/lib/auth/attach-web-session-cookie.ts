import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";
import { createWebSession, resolveUserIdFromSessionToken } from "./session-service";

/** Mint `mototwin_session` when the user is known (e.g. after Google OAuth). */
export async function attachMototwinSessionCookieIfNeeded(
  response: NextResponse,
  userId: string
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();
  if (existing) {
    const existingUserId = await resolveUserIdFromSessionToken(existing);
    if (existingUserId === userId) {
      return response;
    }
  }

  const session = await createWebSession(userId);
  response.cookies.set(SESSION_COOKIE_NAME, session.rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  return response;
}
