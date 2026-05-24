import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ModelSupportLevel } from "@prisma/client";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { prisma } from "@/lib/prisma";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";

const PayloadSchema = z
  .object({
    supportLevel: z
      .enum([
        "MVP_CORE",
        "MVP_CORE_LEGACY",
        "COMMUNITY_SUPPORT",
        "EARLY_BETA",
        "NO_FITMENT_DATA_YET",
      ])
      .nullable(),
    reason: z
      .string()
      .min(3, "Укажите краткое обоснование (минимум 3 символа)")
      .max(500, "Обоснование слишком длинное"),
  })
  .strict();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER"]);
    const { id } = await context.params;
    const body = await parseJsonBody<unknown>(request, { maxBytes: 4 * 1024 });
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", issues: parsed.error.format() },
        { status: 400 }
      );
    }

    const before = await prisma.motorcycleGeneration.findUnique({
      where: { id },
      select: { id: true, supportLevel: true, supportLevelReason: true },
    });
    if (!before) {
      return NextResponse.json({ error: "Поколение не найдено" }, { status: 404 });
    }

    const updated = await prisma.motorcycleGeneration.update({
      where: { id },
      data: {
        supportLevel:
          (parsed.data.supportLevel as ModelSupportLevel | null) ?? "EARLY_BETA",
        supportLevelReason: parsed.data.reason,
      },
      select: { id: true, supportLevel: true, supportLevelReason: true },
    });

    await logAdminAction({
      actorId: ctx.userId,
      action: "support.change",
      entityType: "MotorcycleGeneration",
      entityId: id,
      before: {
        supportLevel: before.supportLevel,
        supportLevelReason: before.supportLevelReason,
      },
      after: {
        supportLevel: updated.supportLevel,
        supportLevelReason: updated.supportLevelReason,
      },
      reason: parsed.data.reason,
    });

    revalidatePath("/admin/models");
    revalidatePath(`/admin/models/${id}`);
    revalidatePath("/admin");

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/models/[id]/support-level:", error);
    return NextResponse.json({ error: "Не удалось сохранить уровень поддержки" }, { status: 500 });
  }
}
