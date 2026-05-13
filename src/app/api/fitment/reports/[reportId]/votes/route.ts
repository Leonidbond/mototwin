import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";
import { recalculateFitmentConfidenceForKey } from "@/lib/fitment-confidence-prisma";

type RouteContext = { params: Promise<{ reportId: string }> };

const voteSchema = z.object({
  voteType: z.enum(["CONFIRM", "REJECT", "SAME_EXPERIENCE", "DIFFERENT_EXPERIENCE", "HELPFUL"]),
  comment: z.string().trim().optional().nullable(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { reportId } = await context.params;
    const userCtx = await getCurrentUserContext();
    const body = voteSchema.parse(await request.json());

    const report = await prisma.fitmentReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        moderationStatus: true,
        partMasterId: true,
        modelVariantId: true,
        nodeId: true,
      },
    });
    if (!report || report.moderationStatus !== "PUBLISHED") {
      return NextResponse.json({ error: "Отчёт недоступен для голосования." }, { status: 404 });
    }

    const vote = await prisma.fitmentVote.upsert({
      where: {
        reportId_userId: {
          reportId,
          userId: userCtx.userId,
        },
      },
      create: {
        reportId,
        userId: userCtx.userId,
        voteType: body.voteType,
        comment: body.comment?.trim() || null,
      },
      update: {
        voteType: body.voteType,
        comment: body.comment?.trim() || null,
      },
    });

    await recalculateFitmentConfidenceForKey(prisma, {
      partMasterId: report.partMasterId,
      modelVariantId: report.modelVariantId,
      nodeId: report.nodeId,
    });

    return NextResponse.json({ vote });
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("fitment vote POST:", error);
    return NextResponse.json({ error: "Не удалось сохранить голос." }, { status: 500 });
  }
}
