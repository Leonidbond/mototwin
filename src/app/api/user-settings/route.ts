import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeUserSettings } from "@mototwin/domain";
import { MAX_FAVORITE_NODE_CODES } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../_shared/current-user-context";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { getCapabilities } from "@/lib/subscription/capabilities";
import { getOrCreateUserSubscription } from "@/lib/subscription/resolve-plan";
import {
  loadActiveServiceCatalogNodes,
  sanitizeFavoriteNodeCodes,
} from "@/lib/service-catalog-nodes";

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
    const subscription = await getOrCreateUserSubscription(currentUser.userId);
    const capabilities = getCapabilities(subscription.plan);
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

    const normalized = normalizeUserSettings(settings);
    if (!capabilities.canCustomizeFavoriteNodes) {
      normalized.favoriteNodeCodes = [];
      normalized.defaultNodeView = "top";
    } else {
      const catalogNodes = await loadActiveServiceCatalogNodes(prisma);
      normalized.favoriteNodeCodes = sanitizeFavoriteNodeCodes(
        normalized.favoriteNodeCodes,
        catalogNodes
      );
      if (!capabilities.defaultNodeViewAll && normalized.defaultNodeView === "all") {
        normalized.defaultNodeView = "top";
      }
    }
    return NextResponse.json({ settings: normalized });
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
    const subscription = await getOrCreateUserSubscription(currentUser.userId);
    const capabilities = getCapabilities(subscription.plan);
    const json = await parseJsonBody<unknown>(request, { maxBytes: 4 * 1024 });
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

    const patch = { ...parsed.data };
    if (!capabilities.canCustomizeFavoriteNodes) {
      delete patch.favoriteNodeCodes;
      patch.defaultNodeView = "top";
    } else if (!capabilities.defaultNodeViewAll && patch.defaultNodeView === "all") {
      patch.defaultNodeView = "top";
    }

    const merged = normalizeUserSettings({ ...existing, ...patch });
    if (capabilities.canCustomizeFavoriteNodes) {
      const catalogNodes = await loadActiveServiceCatalogNodes(prisma);
      merged.favoriteNodeCodes = sanitizeFavoriteNodeCodes(
        merged.favoriteNodeCodes,
        catalogNodes
      );
    }

    const updated = await prisma.userSettings.update({
      where: { userId: currentUser.userId },
      data: merged,
      select: userSettingsSelect,
    });

    return NextResponse.json({ settings: normalizeUserSettings(updated) });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to update user settings:", error);
    return NextResponse.json({ error: "Failed to update user settings" }, { status: 500 });
  }
}
