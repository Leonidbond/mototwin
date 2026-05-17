import { NextResponse } from "next/server";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { rollbackBatch } from "@/lib/admin-imports";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN"]);
    const { id } = await context.params;
    const result = await rollbackBatch(id);
    await logAdminAction({
      actorId: ctx.userId,
      action: "import.rollback",
      entityType: "ImportBatch",
      entityId: id,
      after: result,
      importBatchId: id,
    });
    return NextResponse.json(result);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("admin/imports rollback:", error);
    return NextResponse.json({ error: "Не удалось откатить импорт" }, { status: 500 });
  }
}
