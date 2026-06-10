import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth/authjs";

function hasNextAuthOAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    const name = cookie.name;
    return name.includes("next-auth.state") || name.includes("next-auth.pkce.code_verifier");
  });
}

/**
 * Yandex OAuth callback — shared URL for web (NextAuth) and mobile (Expo AuthSession).
 *
 * Mobile PKCE flow has no NextAuth cookies; redirect into the native app scheme so
 * expo-auth-session can finish and read the authorization code (MT-SEC-010).
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if ((code || error) && !hasNextAuthOAuthCookies(request)) {
    const query = request.nextUrl.searchParams.toString();
    const target = query ? `mototwin://oauth/yandex?${query}` : "mototwin://oauth/yandex";
    return NextResponse.redirect(target);
  }

  return handlers.GET(request);
}
