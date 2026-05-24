import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { strictObject } from "@/lib/http/input-validation";

const patchMasterSchema = strictObject({
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "MERGED", "REJECTED"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // MT-SEC-024: use the centralized RBAC helper so any role-model change
    // (split MODERATOR, add CATALOG_MANAGER scopes, etc.) propagates here.
    await requireAdminRole(["MODERATOR", "CATALOG_MANAGER"]);
    const { id } = await context.params;
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 2 * 1024 });
    const body = patchMasterSchema.parse(raw);

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
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const adminErr = toAdminErrorResponse(error);
    if (adminErr) return adminErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("moderation part-master PATCH:", error);
    return NextResponse.json({ error: "Не удалось обновить деталь." }, { status: 500 });
  }
}
