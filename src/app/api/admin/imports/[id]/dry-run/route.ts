import { NextResponse } from "next/server";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { dryRunBatch } from "@/lib/admin-imports";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER"]);
    const { id } = await context.params;
    const summary = await dryRunBatch(id);
    await logAdminAction({
      actorId: ctx.userId,
      action: "import.dry_run",
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
    console.error("admin/imports dry-run:", error);
    return NextResponse.json({ error: "Не удалось выполнить dry-run" }, { status: 500 });
  }
}
