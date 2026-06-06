import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  DEFAULT_DEV_USER_EMAIL,
  DEV_USER_HEADER_NAME,
  DEV_USER_OPTIONS,
} from "@mototwin/types";
import { isDevUserSwitcherEnabled } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";
import { resolveAuthenticatedUserId } from "@/lib/auth/request-auth";
import { ensureUserBootstrap } from "@/lib/auth/user-bootstrap";

export const DEMO_USER_EMAIL = "demo@mototwin.local";
export const DEMO_GARAGE_TITLE = "Мой гараж";

export type CurrentUserContext = {
  userId: string;
  garageId: string;
  isModerator: boolean;
};

export class CurrentUserContextError extends Error {
  readonly code:
    | "CURRENT_USER_NOT_FOUND"
    | "CURRENT_GARAGE_NOT_FOUND"
    | "INVALID_DEV_USER_HEADER"
    | "DEV_SWITCHER_DISABLED"
    | "UNAUTHORIZED"
    | "ACCOUNT_BLOCKED";
  readonly status: number;

  constructor(
    code:
      | "CURRENT_USER_NOT_FOUND"
      | "CURRENT_GARAGE_NOT_FOUND"
      | "INVALID_DEV_USER_HEADER"
      | "DEV_SWITCHER_DISABLED"
      | "UNAUTHORIZED"
      | "ACCOUNT_BLOCKED",
    status: number,
    message: string
  ) {
    super(message);
    this.name = "CurrentUserContextError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Resolves the current user + primary garage for API ownership checks.
 *
 * Production: session cookie or Bearer access token (auth required).
 * Development: dev user switcher when enabled, else demo user; auth session overrides demo when present.
 */
export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  if (process.env.NODE_ENV === "production") {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      throw new CurrentUserContextError(
        "UNAUTHORIZED",
        401,
        "Требуется вход в аккаунт."
      );
    }
    return findUserContextByUserId(userId);
  }

  const authUserId = await resolveAuthenticatedUserId();
  if (authUserId) {
    return findUserContextByUserId(authUserId);
  }

  const resolvedEmail = await resolveDevUserEmail();
  return findUserContextByEmail(resolvedEmail);
}

export function toCurrentUserContextErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof CurrentUserContextError)) {
    return null;
  }
  return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
}

async function resolveDevUserEmail(): Promise<string> {
  const requestHeaders = await headers();
  const fromHeader = requestHeaders.get(DEV_USER_HEADER_NAME)?.trim().toLowerCase() ?? "";

  const switcherEnabled = isDevUserSwitcherEnabled();

  if (!switcherEnabled) {
    if (fromHeader) {
      throw new CurrentUserContextError(
        "DEV_SWITCHER_DISABLED",
        400,
        "Dev user override is disabled. Enable MOTOTWIN_ENABLE_DEV_USER_SWITCHER=true for local QA."
      );
    }
    return DEFAULT_DEV_USER_EMAIL;
  }

  if (!fromHeader) {
    return DEFAULT_DEV_USER_EMAIL;
  }

  const isKnownDevUser = DEV_USER_OPTIONS.some((option) => option.email === fromHeader);
  if (!isKnownDevUser) {
    throw new CurrentUserContextError(
      "INVALID_DEV_USER_HEADER",
      400,
      `Unknown ${DEV_USER_HEADER_NAME} value: ${fromHeader}`
    );
  }
  return fromHeader;
}

async function findUserContextByUserId(userId: string): Promise<CurrentUserContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isModerator: true, isBlocked: true },
  });
  if (!user) {
    throw new CurrentUserContextError(
      "CURRENT_USER_NOT_FOUND",
      404,
      "Пользователь не найден."
    );
  }
  if (user.isBlocked) {
    throw new CurrentUserContextError(
      "ACCOUNT_BLOCKED",
      403,
      "Аккаунт заблокирован. Обратитесь в поддержку."
    );
  }

  let garage = await prisma.garage.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!garage) {
    await ensureUserBootstrap(user.id);
    garage = await prisma.garage.findFirst({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
  }
  if (!garage) {
    throw new CurrentUserContextError(
      "CURRENT_GARAGE_NOT_FOUND",
      503,
      "Гараж не найден. Обратитесь в поддержку."
    );
  }

  return {
    userId: user.id,
    garageId: garage.id,
    isModerator: user.isModerator,
  };
}

async function findUserContextByEmail(email: string): Promise<CurrentUserContext> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isModerator: true, isBlocked: true },
  });
  if (!user) {
    throw new CurrentUserContextError(
      "CURRENT_USER_NOT_FOUND",
      503,
      "Current user context is not initialized. Run prisma seed."
    );
  }
  if (user.isBlocked) {
    throw new CurrentUserContextError(
      "ACCOUNT_BLOCKED",
      403,
      "Аккаунт заблокирован. Обратитесь в поддержку."
    );
  }

  const garage = await prisma.garage.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!garage) {
    throw new CurrentUserContextError(
      "CURRENT_GARAGE_NOT_FOUND",
      503,
      "Current garage context is not initialized. Run prisma seed."
    );
  }

  return {
    userId: user.id,
    garageId: garage.id,
    isModerator: user.isModerator,
  };
}
