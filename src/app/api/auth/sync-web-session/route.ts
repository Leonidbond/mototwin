import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/authjs";
import { attachMototwinSessionCookieIfNeeded } from "@/lib/auth/attach-web-session-cookie";
import { resolveAuthenticatedUserId } from "@/lib/auth/request-auth";

/**
 * Bridges Auth.js (Google/Apple/Yandex) database sessions to `mototwin_session`.
 * Email/password login already sets `mototwin_session` via POST /api/auth/login.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id ?? (await resolveAuthenticatedUserId());
  if (!userId) {
    return NextResponse.json(
      { error: "Требуется вход в аккаунт.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true as const });
  return attachMototwinSessionCookieIfNeeded(response, userId);
}
