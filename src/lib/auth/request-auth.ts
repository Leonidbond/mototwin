import { cookies, headers } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";
import {
  AuthServiceError,
  resolveUserIdFromAccessToken,
  resolveUserIdFromSessionToken,
} from "./session-service";
import { auth } from "./authjs";

export async function resolveAuthenticatedUserId(): Promise<string | null> {
  const requestHeaders = await headers();
  const authHeader = requestHeaders.get("authorization")?.trim() ?? "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const accessToken = authHeader.slice(7).trim();
    if (accessToken) {
      const userId = await resolveUserIdSafely(() => resolveUserIdFromAccessToken(accessToken));
      if (userId) {
        return userId;
      }
    }
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();
  if (sessionCookie) {
    const userId = await resolveUserIdSafely(() => resolveUserIdFromSessionToken(sessionCookie));
    if (userId) {
      return userId;
    }
  }

  const authJsSession = await auth();
  if (authJsSession?.user?.id) {
    return authJsSession.user.id;
  }

  return null;
}

async function resolveUserIdSafely(resolver: () => Promise<string | null>) {
  try {
    return await resolver();
  } catch (error) {
    if (error instanceof AuthServiceError && error.code === "ACCOUNT_BLOCKED") {
      return null;
    }
    throw error;
  }
}
