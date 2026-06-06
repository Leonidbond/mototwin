import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth/authjs";
import { attachMototwinSessionCookieIfNeeded } from "@/lib/auth/attach-web-session-cookie";
import { resolveAuthenticatedUserId } from "@/lib/auth/request-auth";

/**
 * Bridges Auth.js (Google/Apple/Yandex) database sessions to `mototwin_session`.
 * Email/password login already sets `mototwin_session` via POST /api/auth/login.
 */
export async function GET() {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const cookieNames = cookieStore
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name.includes("next-auth") || name.includes("authjs") || name.includes("mototwin"));
  const session = await auth();
  const userId = session?.user?.id ?? (await resolveAuthenticatedUserId());
  // #region agent log
  console.log(
    "[debug][google-sync] route-called",
    JSON.stringify({
      hasSessionUser: Boolean(session?.user?.id),
      resolvedUserId: userId,
      cookieNames,
      userAgent: requestHeaders.get("user-agent") ?? "",
      referer: requestHeaders.get("referer") ?? "",
    })
  );
  // #endregion
  if (!userId) {
    return NextResponse.json(
      { error: "Требуется вход в аккаунт.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true as const });
  return attachMototwinSessionCookieIfNeeded(response, userId);
}
