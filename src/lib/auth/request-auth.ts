import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "./constants";
import {
  assertUserNotBlocked,
  AuthServiceError,
  resolveUserIdFromAccessToken,
  resolveUserIdFromSessionToken,
} from "./session-service";
import { auth } from "./authjs";

const AUTHJS_SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "__Host-next-auth.session-token",
  "next-auth.session-token",
] as const;

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

  const authJsUserId = await resolveUserIdFromAuthJsSessionCookie(cookieStore);
  if (authJsUserId) {
    return authJsUserId;
  }

  const authJsSession = await auth();
  if (authJsSession?.user?.id) {
    return authJsSession.user.id;
  }

  return null;
}

async function resolveUserIdFromAuthJsSessionCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): Promise<string | null> {
  let sessionToken: string | undefined;
  for (const name of AUTHJS_SESSION_COOKIE_NAMES) {
    const value = cookieStore.get(name)?.value?.trim();
    if (value) {
      sessionToken = value;
      break;
    }
  }
  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    select: { userId: true, expires: true },
  });
  if (!session || session.expires <= new Date()) {
    return null;
  }

  return resolveUserIdSafely(async () => {
    await assertUserNotBlocked(session.userId);
    return session.userId;
  });
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
