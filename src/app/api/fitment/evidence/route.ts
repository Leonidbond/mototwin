import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";

const bodySchema = z.object({
  reportId: z.string().trim().min(1),
  type: z.enum(["PART_PHOTO", "PACKAGING_PHOTO", "INSTALLED_PHOTO", "RECEIPT", "SERVICE_EVENT"]),
  fileUrl: z.string().trim().min(1, "fileUrl обязателен"),
});

export async function POST(request: NextRequest) {
  try {
    const userCtx = await getCurrentUserContext();
    const body = bodySchema.parse(await request.json());

    const report = await prisma.fitmentReport.findUnique({
      where: { id: body.reportId },
      select: { id: true, createdByUserId: true, moderationStatus: true },
    });
    if (!report) {
      return NextResponse.json({ error: "Отчёт не найден." }, { status: 404 });
    }

    if (report.createdByUserId !== userCtx.userId && !userCtx.isModerator) {
      return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
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
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("fitment evidence POST:", error);
    return NextResponse.json({ error: "Не удалось сохранить вложение." }, { status: 500 });
  }
}
