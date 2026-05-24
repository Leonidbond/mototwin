import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";
import { tryGetAdminContext } from "@/lib/admin-auth";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedText, safeUrl, strictObject } from "@/lib/http/input-validation";

// MT-SEC-065: fileUrl is rendered as <a href> AND <Image src> on the client.
// A bare `z.string()` accepts `javascript:` and `data:` URIs (stored XSS) and
// arbitrary external hosts (SSRF via Next image optimizer). We restrict to a
// validated HTTPS/HTTP URL with a 2 KB cap.
const bodySchema = strictObject({
  reportId: boundedText({ max: 64 }),
  type: z.enum(["PART_PHOTO", "PACKAGING_PHOTO", "INSTALLED_PHOTO", "RECEIPT", "SERVICE_EVENT"]),
  fileUrl: safeUrl({ max: 2_048 }),
});

export async function POST(request: NextRequest) {
  try {
    const userCtx = await getCurrentUserContext();
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 8 * 1024 });
    const body = bodySchema.parse(raw);

    const report = await prisma.fitmentReport.findUnique({
      where: { id: body.reportId },
      select: { id: true, createdByUserId: true, moderationStatus: true },
    });
    if (!report) {
      return NextResponse.json({ error: "Отчёт не найден." }, { status: 404 });
    }

    // MT-SEC-024: prefer the centralized RBAC helper over the legacy
    // `userCtx.isModerator` flag so adding a new admin role automatically
    // grants access here too.
    const isOwner = report.createdByUserId === userCtx.userId;
    if (!isOwner) {
      const adminCtx = await tryGetAdminContext();
      const isAllowedAdmin =
        adminCtx?.role === "SUPER_ADMIN" ||
        adminCtx?.role === "MODERATOR" ||
        adminCtx?.role === "CATALOG_MANAGER";
      if (!isAllowedAdmin) {
        return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
      }
    }

    const row = await prisma.fitmentEvidence.create({
      data: {
        reportId: body.reportId,
        type: body.type,
        fileUrl: body.fileUrl,
      },
    });

    return NextResponse.json({ evidence: row }, { status: 201 });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("fitment evidence POST:", error);
    return NextResponse.json({ error: "Не удалось сохранить вложение." }, { status: 500 });
  }
}
