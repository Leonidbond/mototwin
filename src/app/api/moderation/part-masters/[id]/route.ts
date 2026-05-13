import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";

const patchMasterSchema = z.object({
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "MERGED", "REJECTED"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userCtx = await getCurrentUserContext();
    if (!userCtx.isModerator) {
      return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    }
    const { id } = await context.params;
    const body = patchMasterSchema.parse(await request.json());

    const updated = await prisma.partMaster.update({
      where: { id },
      data: { status: body.status },
      select: {
        id: true,
        brandName: true,
        sku: true,
        title: true,
        status: true,
        source: true,
      },
    });

    return NextResponse.json({ partMaster: updated });
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("moderation part-master PATCH:", error);
    return NextResponse.json({ error: "Не удалось обновить деталь." }, { status: 500 });
  }
}
