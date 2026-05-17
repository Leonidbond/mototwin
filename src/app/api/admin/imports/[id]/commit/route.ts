import { NextResponse } from "next/server";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { commitBatch } from "@/lib/admin-imports";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER"]);
    const { id } = await context.params;
    const summary = await commitBatch(id);
    await logAdminAction({
      actorId: ctx.userId,
      action: "import.commit",
      entityType: "ImportBatch",
      entityId: id,
      after: summary,
      importBatchId: id,
    });
    return NextResponse.json({ summary });
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("admin/imports commit:", error);
    return NextResponse.json({ error: "Не удалось зафиксировать импорт" }, { status: 500 });
  }
}
