import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeUserSettings } from "@mototwin/domain";
import { MAX_FAVORITE_NODE_CODES } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../_shared/current-user-context";

const userSettingsPatchSchema = z
  .object({
    defaultCurrency: z.enum(["RUB", "USD", "EUR"]).optional(),
    distanceUnit: z.enum(["km", "mi"]).optional(),
    engineHoursUnit: z.literal("h").optional(),
    dateFormat: z.enum(["DD.MM.YYYY", "YYYY-MM-DD"]).optional(),
    defaultSnoozeDays: z.union([z.literal(7), z.literal(14), z.literal(30)]).optional(),
    vehicleTrashRetentionDays: z
      .union([z.literal(7), z.literal(14), z.literal(30), z.literal(60), z.literal(90)])
      .optional(),
    favoriteNodeCodes: z
      .array(z.string().min(1).max(64))
      .max(MAX_FAVORITE_NODE_CODES)
      .optional(),
    defaultNodeView: z.enum(["top", "all"]).optional(),
  })
  .strict();

const userSettingsSelect = {
  defaultCurrency: true,
  distanceUnit: true,
  engineHoursUnit: true,
  dateFormat: true,
  defaultSnoozeDays: true,
  vehicleTrashRetentionDays: true,
  favoriteNodeCodes: true,
  defaultNodeView: true,
} as const;

export async function GET() {
  try {
    const currentUser = await getCurrentUserContext();
    const settings = await prisma.userSettings.findUnique({
      where: { userId: currentUser.userId },
      select: userSettingsSelect,
    });
    if (!settings) {
      return NextResponse.json(
        { error: "User settings are not initialized. Run prisma seed." },
        { status: 503 }
      );
    }

    return NextResponse.json({ settings: normalizeUserSettings(settings) });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
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

    const existing = await prisma.userSettings.findUnique({
      where: { userId: currentUser.userId },
      select: userSettingsSelect,
    });
    if (!existing) {
      return NextResponse.json(
        { error: "User settings are not initialized. Run prisma seed." },
        { status: 503 }
      );
    }

    const merged = normalizeUserSettings({ ...existing, ...parsed.data });

    const updated = await prisma.userSettings.update({
      where: { userId: currentUser.userId },
      data: merged,
      select: userSettingsSelect,
    });

    return NextResponse.json({ settings: normalizeUserSettings(updated) });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to update user settings:", error);
    return NextResponse.json({ error: "Failed to update user settings" }, { status: 500 });
  }
}
