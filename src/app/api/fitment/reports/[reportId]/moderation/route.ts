import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { recalculateFitmentConfidenceForKey } from "@/lib/fitment-confidence-prisma";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { strictObject } from "@/lib/http/input-validation";

type RouteContext = { params: Promise<{ reportId: string }> };

const patchSchema = strictObject({
  moderationStatus: z.enum(["PENDING", "PUBLISHED", "NEEDS_REVIEW", "HIDDEN", "REJECTED"]),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { reportId } = await context.params;
    // MT-SEC-024: centralized RBAC instead of direct `userCtx.isModerator`.
    await requireAdminRole(["MODERATOR", "CATALOG_MANAGER"]);
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 2 * 1024 });
    const body = patchSchema.parse(raw);

    const report = await prisma.fitmentReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        partMasterId: true,
        motorcycleGenerationId: true,
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
        motorcycleGenerationId: report.motorcycleGenerationId,
        nodeId: report.nodeId,
      });
    }

    return NextResponse.json({ report: updated });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const adminErr = toAdminErrorResponse(error);
    if (adminErr) return adminErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("fitment moderation PATCH:", error);
    return NextResponse.json({ error: "Не удалось обновить отчёт." }, { status: 500 });
  }
}
