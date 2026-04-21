import { headers } from "next/headers";
import {
  DEFAULT_DEV_USER_EMAIL,
  DEV_USER_HEADER_NAME,
  DEV_USER_OPTIONS,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";

export const DEMO_USER_EMAIL = "demo@mototwin.local";
export const DEMO_GARAGE_TITLE = "Мой гараж";

export type CurrentUserContext = {
  userId: string;
  garageId: string;
};

/**
 * Phase 1 ownership foundation:
 * until real auth is implemented, backend resolves a stable demo user context.
 *
 * Dev-only behavior:
 * in development, optional request header can switch context between seeded users.
 */
export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const resolvedEmail = await resolveCurrentUserEmail();
  const user = await prisma.user.findUnique({
    where: { email: resolvedEmail },
    select: { id: true },
  });

  if (!user) {
    throw new Error(`Current user not found (${resolvedEmail})`);
  }

  const garage = await prisma.garage.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (garage) {
    return {
      userId: user.id,
      garageId: garage.id,
    };
  }

  const createdGarage = await prisma.garage.create({
    data: {
      ownerUserId: user.id,
      title: resolvedEmail === DEMO_USER_EMAIL ? DEMO_GARAGE_TITLE : "Мой гараж",
    },
    select: { id: true },
  });

  return {
    userId: user.id,
    garageId: createdGarage.id,
  };
}

async function resolveCurrentUserEmail(): Promise<string> {
  if (process.env.NODE_ENV === "production") {
    return DEMO_USER_EMAIL;
  }

  const requestHeaders = await headers();
  const fromHeader = requestHeaders.get(DEV_USER_HEADER_NAME)?.trim().toLowerCase() ?? "";
  if (!fromHeader) {
    return DEFAULT_DEV_USER_EMAIL;
  }

  const isKnownDevUser = DEV_USER_OPTIONS.some((option) => option.email === fromHeader);
  if (!isKnownDevUser) {
    console.warn(
      `[dev-user-context] Unknown ${DEV_USER_HEADER_NAME} value "${fromHeader}", fallback to demo user`
    );
    return DEFAULT_DEV_USER_EMAIL;
  }
  return fromHeader;
}
