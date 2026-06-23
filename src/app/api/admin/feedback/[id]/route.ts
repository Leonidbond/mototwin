import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole, requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAdminFeedbackDetail } from "@/lib/admin-feedback";
import { logAdminAction } from "@/lib/admin-audit";
import { prisma } from "@/lib/prisma";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedTextOptional, strictObject } from "@/lib/http/input-validation";

// MT-SEC-068: strictObject blocks mass-assignment into the feedback row.
const patchFeedbackSchema = strictObject({
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "REJECTED"]),
  adminNote: boundedTextOptional({ max: 2_000 }),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAnyAdmin();
    const { id } = await context.params;
    const detail = await loadAdminFeedbackDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Обращение не найдено" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/feedback/[id] GET:", error);
    return NextResponse.json({ error: "Не удалось загрузить обращение" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    // Status changes are restricted to SUPER_ADMIN + MODERATOR (decision #3).
    const admin = await requireAdminRole(["SUPER_ADMIN", "MODERATOR"]);
    const { id } = await context.params;

    const body = (await parseJsonBody<unknown>(request, { maxBytes: 8 * 1024 }).catch(() => null)) as unknown;
    const parsed = patchFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", issues: parsed.error.format() },
        { status: 400 }
      );
    }

    const before = await prisma.feedback.findUnique({
      where: { id },
      select: { id: true, status: true, adminNote: true },
    });
    if (!before) {
      return NextResponse.json({ error: "Обращение не найдено" }, { status: 404 });
    }

    const updated = await prisma.feedback.update({
      where: { id },
      data: {
        status: parsed.data.status,
        adminNote: parsed.data.adminNote ?? null,
        reviewedByUserId: admin.userId,
        reviewedAt: new Date(),
      },
      select: { id: true, status: true, adminNote: true, reviewedAt: true },
    });

    await logAdminAction({
      actorId: admin.userId,
      action: "feedback.status.change",
      entityType: "Feedback",
      entityId: id,
      before,
      after: updated,
      reason: parsed.data.adminNote ?? undefined,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/feedback/[id] PATCH:", error);
    return NextResponse.json({ error: "Не удалось обновить обращение" }, { status: 500 });
  }
}
