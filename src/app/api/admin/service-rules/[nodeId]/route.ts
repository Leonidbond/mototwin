import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { strictObject } from "@/lib/http/input-validation";

const patchSchema = strictObject({
  intervalKm: z.number().int().min(0).nullable().optional(),
  intervalHours: z.number().int().min(0).nullable().optional(),
  intervalDays: z.number().int().min(0).nullable().optional(),
  triggerMode: z.enum(["WHICHEVER_COMES_FIRST", "ANY", "ALL"]).optional(),
  warningKm: z.number().int().min(0).nullable().optional(),
  warningHours: z.number().int().min(0).nullable().optional(),
  warningDays: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ nodeId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAnyAdmin();
    const { nodeId } = await context.params;
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 4 * 1024 });
    const body = patchSchema.parse(raw);
    const rule = await prisma.nodeMaintenanceRule.update({
      where: { nodeId },
      data: body,
      include: { node: { select: { code: true, name: true } } },
    });
    return NextResponse.json({ rule });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    console.error("admin/service-rules PATCH:", error);
    return NextResponse.json({ error: "Не удалось обновить регламент" }, { status: 500 });
  }
}
