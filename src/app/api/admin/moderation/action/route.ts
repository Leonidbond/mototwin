import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { ADMIN_CACHE_TAGS } from "@/lib/admin-cache";
import { prisma } from "@/lib/prisma";

const PayloadSchema = z.object({
  kind: z.enum(["PART_MASTER", "FITMENT_REPORT", "FITMENT_CONFIDENCE"]),
  id: z.string().min(1),
  action: z.enum([
    "approve",
    "reject",
    "publish",
    "needs_review",
    "hide",
    "verify",
    "community_confirm",
  ]),
  reason: z.string().max(500).optional(),
});

/** Apply a moderation action and write to the audit log. */
export async function POST(request: Request) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER", "MODERATOR"]);
    const body = await request.json();
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", issues: parsed.error.format() },
        { status: 400 }
      );
    }
    const { kind, id, action } = parsed.data;
    const reason = parsed.data.reason?.trim() || undefined;

    const flushCache = () => {
      revalidatePath("/admin");
      revalidatePath("/admin/moderation");
      revalidateTag(ADMIN_CACHE_TAGS.dashboardWorkQueue, "max");
      revalidateTag(ADMIN_CACHE_TAGS.dashboardKpis, "max");
    };

    if (kind === "PART_MASTER") {
      if (action !== "approve" && action !== "reject") {
        return NextResponse.json({ error: "Действие не поддерживается" }, { status: 400 });
      }
      const before = await prisma.partMaster.findUnique({ where: { id } });
      if (!before) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
      const newStatus = action === "approve" ? "ACTIVE" : "REJECTED";
      const after = await prisma.partMaster.update({
        where: { id },
        data: { status: newStatus },
      });
      await logAdminAction({
        actorId: ctx.userId,
        action: `part.${action}`,
        entityType: "PartMaster",
        entityId: id,
        before,
        after,
        reason,
      });
      flushCache();
      return NextResponse.json({ ok: true });
    }

    if (kind === "FITMENT_REPORT") {
      const map: Record<string, "PUBLISHED" | "NEEDS_REVIEW" | "HIDDEN" | "REJECTED"> = {
        publish: "PUBLISHED",
        needs_review: "NEEDS_REVIEW",
        hide: "HIDDEN",
        reject: "REJECTED",
      };
      const newStatus = map[action];
      if (!newStatus) {
        return NextResponse.json({ error: "Действие не поддерживается" }, { status: 400 });
      }
      const before = await prisma.fitmentReport.findUnique({ where: { id } });
      if (!before) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
      const after = await prisma.fitmentReport.update({
        where: { id },
        data: { moderationStatus: newStatus },
      });
      await logAdminAction({
        actorId: ctx.userId,
        action: `fitment_report.${action}`,
        entityType: "FitmentReport",
        entityId: id,
        before,
        after,
        reason,
      });
      flushCache();
      return NextResponse.json({ ok: true });
    }

    if (kind === "FITMENT_CONFIDENCE") {
      const map: Record<string, "VERIFIED_BY_MOTOTWIN" | "COMMUNITY_CONFIRMED"> = {
        verify: "VERIFIED_BY_MOTOTWIN",
        community_confirm: "COMMUNITY_CONFIRMED",
      };
      const newStatus = map[action];
      if (!newStatus) {
        return NextResponse.json({ error: "Действие не поддерживается" }, { status: 400 });
      }
      const before = await prisma.fitmentConfidence.findUnique({ where: { id } });
      if (!before) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
      const after = await prisma.fitmentConfidence.update({
        where: { id },
        data: { status: newStatus },
      });
      await logAdminAction({
        actorId: ctx.userId,
        action: `fitment_confidence.${action}`,
        entityType: "FitmentConfidence",
        entityId: id,
        before,
        after,
        reason,
      });
      flushCache();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Неподдерживаемый тип" }, { status: 400 });
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/moderation/action:", error);
    return NextResponse.json({ error: "Не удалось применить действие" }, { status: 500 });
  }
}
