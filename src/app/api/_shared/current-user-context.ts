import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  DEFAULT_DEV_USER_EMAIL,
  DEV_USER_HEADER_NAME,
  DEV_USER_OPTIONS,
} from "@mototwin/types";
import { isDevUserSwitcherEnabled } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";

export const DEMO_USER_EMAIL = "demo@mototwin.local";
export const DEMO_GARAGE_TITLE = "Мой гараж";

export type CurrentUserContext = {
  userId: string;
  garageId: string;
};

export class CurrentUserContextError extends Error {
  readonly code:
    | "CURRENT_USER_NOT_FOUND"
    | "CURRENT_GARAGE_NOT_FOUND"
    | "INVALID_DEV_USER_HEADER"
    | "DEV_SWITCHER_DISABLED";
  readonly status: number;

  constructor(
    code:
      | "CURRENT_USER_NOT_FOUND"
      | "CURRENT_GARAGE_NOT_FOUND"
      | "INVALID_DEV_USER_HEADER"
      | "DEV_SWITCHER_DISABLED",
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
 * Phase 1 ownership foundation:
 * until real auth is implemented, backend resolves a stable demo user context.
 *
 * Dev-only behavior:
 * in development, optional request header can switch context between seeded users.
 */
export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const resolvedEmail = await resolveCurrentUserEmail();
  return findUserContextByEmail(resolvedEmail);
}

export function toCurrentUserContextErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof CurrentUserContextError)) {
    return null;
  }
  return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
}

async function resolveCurrentUserEmail(): Promise<string> {
  const requestHeaders = await headers();
  const fromHeader = requestHeaders.get(DEV_USER_HEADER_NAME)?.trim().toLowerCase() ?? "";

  if (process.env.NODE_ENV === "production") {
    if (fromHeader) {
      throw new CurrentUserContextError(
        "DEV_SWITCHER_DISABLED",
        400,
        "Dev user override is disabled in production."
      );
    }
    return DEMO_USER_EMAIL;
  }

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

async function findUserContextByEmail(email: string): Promise<CurrentUserContext> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    throw new CurrentUserContextError(
      "CURRENT_USER_NOT_FOUND",
      503,
      "Current user context is not initialized. Run prisma seed."
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
  };
}
