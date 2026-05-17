import { NextResponse } from "next/server";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadImportBatchDetail } from "@/lib/admin-imports";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAnyAdmin();
    const { id } = await context.params;
    const detail = await loadImportBatchDetail(id);
    if (!detail) return NextResponse.json({ error: "Импорт не найден" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/imports/[id] GET:", error);
    return NextResponse.json({ error: "Не удалось загрузить импорт" }, { status: 500 });
  }
}
