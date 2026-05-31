import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAdminUserDetail } from "@/lib/admin-users";
import { logAdminAction } from "@/lib/admin-audit";
import { prisma } from "@/lib/prisma";
import { revokeAllUserSessions } from "@/lib/auth/session-service";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { strictObject } from "@/lib/http/input-validation";

// MT-SEC-068: strictObject prevents extra fields slipping into the audit log payload.
const UpdateUserBlockSchema = strictObject({
  isBlocked: z.boolean(),
  reason: z.string().trim().min(3).max(500),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAnyAdmin();
    const { id } = await context.params;
    const detail = await loadAdminUserDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/users/[id]:", error);
    return NextResponse.json({ error: "Не удалось загрузить пользователя" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAnyAdmin();
    const { id } = await context.params;
    const body = (await parseJsonBody<unknown>(request, { maxBytes: 4 * 1024 }).catch(
      () => null
    )) as unknown;
    const parsed = UpdateUserBlockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", issues: parsed.error.format() },
        { status: 400 }
      );
    }
    if (id === admin.userId) {
      return NextResponse.json(
        { error: "Нельзя блокировать собственную учётную запись." },
        { status: 400 }
      );
    }

    const before = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        isBlocked: true,
        blockedAt: true,
        blockReason: true,
      },
    });
    if (!before) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    const now = new Date();
    const updated = await prisma.user.update({
      where: { id },
      data: {
        isBlocked: parsed.data.isBlocked,
        blockedAt: parsed.data.isBlocked ? now : null,
        blockReason: parsed.data.reason,
      },
      select: {
        id: true,
        isBlocked: true,
        blockedAt: true,
        blockReason: true,
      },
    });

    if (updated.isBlocked) {
      await revokeAllUserSessions(id, { cause: "admin" });
    }

    await logAdminAction({
      actorId: admin.userId,
      action: updated.isBlocked ? "user.block" : "user.unblock",
      entityType: "User",
      entityId: id,
      before,
      after: updated,
      reason: parsed.data.reason,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/users/[id] PATCH:", error);
    return NextResponse.json({ error: "Не удалось обновить статус пользователя" }, { status: 500 });
  }
}
