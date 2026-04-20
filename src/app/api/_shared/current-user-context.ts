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
 */
export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: { id: true },
  });

  if (!user) {
    throw new Error("Demo user not found");
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
      title: DEMO_GARAGE_TITLE,
    },
    select: { id: true },
  });

  return {
    userId: user.id,
    garageId: createdGarage.id,
  };
}
