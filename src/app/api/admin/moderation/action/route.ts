import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { ADMIN_CACHE_TAGS } from "@/lib/admin-cache";
import { prisma } from "@/lib/prisma";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedInt, boundedText, boundedTextOptional, strictObject } from "@/lib/http/input-validation";
import {
  approveMotorcycleCatalogRequest,
  rejectMotorcycleCatalogRequest,
} from "@/lib/motorcycle-catalog-request-service";

const resolvedFieldsSchema = strictObject({
  brandName: boundedText({ min: 1, max: 120 }).optional(),
  familyName: boundedText({ min: 1, max: 120 }).optional(),
  variantName: boundedText({ min: 1, max: 160 }).optional(),
  yearFrom: boundedInt({ min: 1900, max: 2100 }).optional(),
  yearTo: boundedInt({ min: 1900, max: 2100 }).nullable().optional(),
}).optional();

const PayloadSchema = strictObject({
  kind: z.enum(["PART_MASTER", "FITMENT_REPORT", "FITMENT_CONFIDENCE", "CATALOG_REQUEST"]),
  id: z.string().min(1).max(64),
  action: z.enum([
    "approve",
    "reject",
    "publish",
    "needs_review",
    "hide",
    "verify",
    "community_confirm",
  ]),
  reason: z.string().max(1000).optional(),
  resolvedFields: resolvedFieldsSchema,
});

/** Apply a moderation action and write to the audit log. */
export async function POST(request: Request) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER", "MODERATOR"]);
    const body = await parseJsonBody<unknown>(request, { maxBytes: 8 * 1024 });
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", issues: parsed.error.format() },
        { status: 400 }
      );
    }
    const { kind, id, action } = parsed.data;
    const reason = parsed.data.reason?.trim() || undefined;
    const resolvedFields = parsed.data.resolvedFields;

    const flushCache = () => {
      revalidatePath("/admin");
      revalidatePath("/admin/moderation");
      revalidateTag(ADMIN_CACHE_TAGS.dashboardWorkQueue, "max");
      revalidateTag(ADMIN_CACHE_TAGS.dashboardKpis, "max");
    };

    if (kind === "CATALOG_REQUEST") {
      if (action !== "approve" && action !== "reject") {
        return NextResponse.json({ error: "Действие не поддерживается" }, { status: 400 });
      }
      const before = await prisma.motorcycleCatalogRequest.findUnique({ where: { id } });
      if (!before) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

      try {
        const after =
          action === "approve"
            ? await approveMotorcycleCatalogRequest({
                requestId: id,
                reviewerUserId: ctx.userId,
                overrides: resolvedFields,
                moderationComment: reason,
              })
            : await rejectMotorcycleCatalogRequest({
                requestId: id,
                reviewerUserId: ctx.userId,
                moderationComment: reason ?? "",
              });

        await logAdminAction({
          actorId: ctx.userId,
          action: `catalog_request.${action}`,
          entityType: "MotorcycleCatalogRequest",
          entityId: id,
          before,
          after: await prisma.motorcycleCatalogRequest.findUnique({ where: { id } }),
          reason,
        });
        flushCache();
        return NextResponse.json({ ok: true });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "NOT_FOUND") {
            return NextResponse.json({ error: "Не найдено" }, { status: 404 });
          }
          if (error.message === "NOT_PENDING") {
            return NextResponse.json({ error: "Заявка уже обработана." }, { status: 409 });
          }
          if (error.message === "COMMENT_REQUIRED") {
            return NextResponse.json({ error: "Укажите причину отклонения." }, { status: 400 });
          }
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }
    }

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
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/moderation/action:", error);
    return NextResponse.json({ error: "Не удалось применить действие" }, { status: 500 });
  }
}
