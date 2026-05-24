import { prisma } from "@/lib/prisma";
import { DEMO_GARAGE_TITLE } from "@/app/api/_shared/current-user-context";
import { getOrCreateUserNotificationSettings } from "@/lib/notifications";

export async function ensureUserBootstrap(userId: string): Promise<void> {
  const [garage, settings] = await Promise.all([
    prisma.garage.findFirst({
      where: { ownerUserId: userId },
      select: { id: true },
    }),
    prisma.userSettings.findUnique({
      where: { userId },
      select: { id: true },
    }),
  ]);

  if (!garage) {
    await prisma.garage.create({
      data: {
        ownerUserId: userId,
        title: DEMO_GARAGE_TITLE,
      },
    });
  }

  if (!settings) {
    await prisma.userSettings.create({
      data: { userId },
    });
  }

  await getOrCreateUserNotificationSettings(userId);
}

export async function getPrimaryGarage(userId: string): Promise<{ id: string; title: string } | null> {
  return prisma.garage.findFirst({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true },
  });
}
