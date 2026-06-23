import { NextResponse } from "next/server";
import { z } from "zod";
import type { AdminRole } from "@prisma/client";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { loadAdminTeam } from "@/lib/admin-settings";
import { resolveIsModeratorForAdminRole } from "@/lib/admin-team-role";
import { prisma } from "@/lib/prisma";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { strictObject } from "@/lib/http/input-validation";

// MT-SEC-068 + MT-SEC-070: strict + bounded userId length.
const PayloadSchema = strictObject({
  userId: z.string().min(1).max(64),
  adminRole: z
    .enum(["SUPER_ADMIN", "CATALOG_MANAGER", "MODERATOR", "ANALYST"])
    .nullable(),
  reason: z.string().min(3).max(500),
});

export async function GET() {
  try {
    await requireAdminRole(["SUPER_ADMIN"]);
    const team = await loadAdminTeam();
    return NextResponse.json({ items: team });
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/team GET:", error);
    return NextResponse.json({ error: "Не удалось загрузить команду" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN"]);
    const body = await parseJsonBody<unknown>(request, { maxBytes: 4 * 1024 });
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", issues: parsed.error.format() },
        { status: 400 }
      );
    }
    if (parsed.data.userId === ctx.userId && parsed.data.adminRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Нельзя самому себе понизить роль ниже SUPER_ADMIN" },
        { status: 400 }
      );
    }

    const before = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, adminRole: true, isModerator: true },
    });
    if (!before) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }
    const demotesSuperAdmin =
      before.adminRole === "SUPER_ADMIN" && parsed.data.adminRole !== "SUPER_ADMIN";
    if (demotesSuperAdmin) {
      const superAdminCount = await prisma.user.count({
        where: { adminRole: "SUPER_ADMIN" },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: "Нельзя снять роль у последнего SUPER_ADMIN." },
          { status: 400 }
        );
      }
    }

    const nextAdminRole = parsed.data.adminRole as AdminRole | null;
    const updated = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: {
        adminRole: nextAdminRole,
        isModerator: resolveIsModeratorForAdminRole(nextAdminRole),
      },
      select: { id: true, adminRole: true, isModerator: true },
    });

    await logAdminAction({
      actorId: ctx.userId,
      action: "team.role.change",
      entityType: "User",
      entityId: parsed.data.userId,
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
    console.error("admin/team PATCH:", error);
    return NextResponse.json({ error: "Не удалось обновить роль" }, { status: 500 });
  }
}
