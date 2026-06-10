import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const YANDEX_OAUTH_CALLBACK_SEGMENTS = ["callback", "yandex"] as const;

export function isYandexOAuthCallbackPath(segments: string[]): boolean {
  return segments.join("/") === YANDEX_OAUTH_CALLBACK_SEGMENTS.join("/");
}

export function hasNextAuthOAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    const name = cookie.name;
    return (
      name.includes("next-auth.state") ||
      name.includes("next-auth.pkce.code_verifier") ||
      name.includes("authjs.state") ||
      name.includes("authjs.pkce.code_verifier")
    );
  });
}

/**
 * Mobile PKCE flow has no NextAuth cookies; redirect into the native app scheme so
 * expo-auth-session can finish and read the authorization code (MT-SEC-010).
 *
 * Web Auth.js callbacks must go through `/api/auth/[...nextauth]` so NextAuth
 * receives `params.nextauth` — do not call `handlers.GET` from a dedicated route.
 */
export function maybeRedirectMobileYandexOAuth(
  request: NextRequest,
  segments: string[]
): NextResponse | null {
  if (!isYandexOAuthCallbackPath(segments)) {
    return null;
  }

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  if (!code && !error) {
    return null;
  }
  if (hasNextAuthOAuthCookies(request)) {
    return null;
  }

  const query = request.nextUrl.searchParams.toString();
  const target = query ? `mototwin://oauth/yandex?${query}` : "mototwin://oauth/yandex";
  return NextResponse.redirect(target);
}
