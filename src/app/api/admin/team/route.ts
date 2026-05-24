import { NextResponse } from "next/server";
import { z } from "zod";
import type { AdminRole } from "@prisma/client";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { loadAdminTeam } from "@/lib/admin-settings";
import { prisma } from "@/lib/prisma";

const PayloadSchema = z.object({
  userId: z.string().min(1),
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
    const body = await request.json();
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
      select: { id: true, adminRole: true },
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

    const updated = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { adminRole: parsed.data.adminRole as AdminRole | null },
      select: { id: true, adminRole: true },
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
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/team PATCH:", error);
    return NextResponse.json({ error: "Не удалось обновить роль" }, { status: 500 });
  }
}
