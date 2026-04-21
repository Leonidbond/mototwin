import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_USER_SETTINGS, normalizeUserSettings } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "../_shared/current-user-context";

const userSettingsPatchSchema = z
  .object({
    defaultCurrency: z.enum(["RUB", "USD", "EUR"]).optional(),
    distanceUnit: z.enum(["km", "mi"]).optional(),
    engineHoursUnit: z.literal("h").optional(),
    dateFormat: z.enum(["DD.MM.YYYY", "YYYY-MM-DD"]).optional(),
    defaultSnoozeDays: z.union([z.literal(7), z.literal(14), z.literal(30)]).optional(),
  })
  .strict();

export async function GET() {
  try {
    const currentUser = await getCurrentUserContext();
    const settings = await prisma.userSettings.upsert({
      where: { userId: currentUser.userId },
      update: {},
      create: {
        userId: currentUser.userId,
        ...DEFAULT_USER_SETTINGS,
      },
      select: {
        defaultCurrency: true,
        distanceUnit: true,
        engineHoursUnit: true,
        dateFormat: true,
        defaultSnoozeDays: true,
      },
    });

    return NextResponse.json({ settings: normalizeUserSettings(settings) });
  } catch (error) {
    console.error("Failed to load user settings:", error);
    return NextResponse.json({ error: "Failed to load user settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUserContext();
    const json = await request.json();
    const parsed = userSettingsPatchSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверный формат настроек профиля." },
        { status: 400 }
      );
    }

    const existing = await prisma.userSettings.upsert({
      where: { userId: currentUser.userId },
      update: {},
      create: {
        userId: currentUser.userId,
        ...DEFAULT_USER_SETTINGS,
      },
      select: {
        defaultCurrency: true,
        distanceUnit: true,
        engineHoursUnit: true,
        dateFormat: true,
        defaultSnoozeDays: true,
      },
    });

    const merged = normalizeUserSettings({ ...existing, ...parsed.data });

    const updated = await prisma.userSettings.update({
      where: { userId: currentUser.userId },
      data: merged,
      select: {
        defaultCurrency: true,
        distanceUnit: true,
        engineHoursUnit: true,
        dateFormat: true,
        defaultSnoozeDays: true,
      },
    });

    return NextResponse.json({ settings: normalizeUserSettings(updated) });
  } catch (error) {
    console.error("Failed to update user settings:", error);
    return NextResponse.json({ error: "Failed to update user settings" }, { status: 500 });
  }
}
