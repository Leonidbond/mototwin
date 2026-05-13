import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";
import { recalculateFitmentConfidenceForKey } from "@/lib/fitment-confidence-prisma";

type RouteContext = { params: Promise<{ reportId: string }> };

const patchSchema = z.object({
  moderationStatus: z.enum(["PENDING", "PUBLISHED", "NEEDS_REVIEW", "HIDDEN", "REJECTED"]),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { reportId } = await context.params;
    const userCtx = await getCurrentUserContext();
    if (!userCtx.isModerator) {
      return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    }
    const body = patchSchema.parse(await request.json());

    const report = await prisma.fitmentReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        partMasterId: true,
        modelVariantId: true,
        nodeId: true,
        moderationStatus: true,
      },
    });
    if (!report) {
      return NextResponse.json({ error: "Отчёт не найден." }, { status: 404 });
    }

    const updated = await prisma.fitmentReport.update({
      where: { id: reportId },
      data: { moderationStatus: body.moderationStatus },
    });

    if (body.moderationStatus === "PUBLISHED") {
      await recalculateFitmentConfidenceForKey(prisma, {
        partMasterId: report.partMasterId,
        modelVariantId: report.modelVariantId,
        nodeId: report.nodeId,
      });
    }

    return NextResponse.json({ report: updated });
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("fitment moderation PATCH:", error);
    return NextResponse.json({ error: "Не удалось обновить отчёт." }, { status: 500 });
  }
}
