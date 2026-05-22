import { cookies, headers } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";
import { resolveUserIdFromAccessToken, resolveUserIdFromSessionToken } from "./session-service";

export async function resolveAuthenticatedUserId(): Promise<string | null> {
  const requestHeaders = await headers();
  const authHeader = requestHeaders.get("authorization")?.trim() ?? "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const accessToken = authHeader.slice(7).trim();
    if (accessToken) {
      const userId = await resolveUserIdFromAccessToken(accessToken);
      if (userId) {
        return userId;
      }
    }
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();
  if (sessionCookie) {
    return resolveUserIdFromSessionToken(sessionCookie);
  }

  return null;
}
