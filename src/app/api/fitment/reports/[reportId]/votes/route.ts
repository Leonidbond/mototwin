import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";
import { recalculateFitmentConfidenceForKey } from "@/lib/fitment-confidence-prisma";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedTextOptional, strictObject } from "@/lib/http/input-validation";

type RouteContext = { params: Promise<{ reportId: string }> };

// MT-SEC-068 + MT-SEC-070: strict + length-capped optional comment.
const voteSchema = strictObject({
  voteType: z.enum(["CONFIRM", "REJECT", "SAME_EXPERIENCE", "DIFFERENT_EXPERIENCE", "HELPFUL"]),
  comment: boundedTextOptional({ max: 1_000 }),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { reportId } = await context.params;
    const userCtx = await getCurrentUserContext();
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 4 * 1024 });
    const body = voteSchema.parse(raw);

    const report = await prisma.fitmentReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        moderationStatus: true,
        partMasterId: true,
        motorcycleGenerationId: true,
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
      motorcycleGenerationId: report.motorcycleGenerationId,
      nodeId: report.nodeId,
    });

    return NextResponse.json({ vote });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("fitment vote POST:", error);
    return NextResponse.json({ error: "Не удалось сохранить голос." }, { status: 500 });
  }
}
