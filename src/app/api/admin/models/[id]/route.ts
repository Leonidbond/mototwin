import { NextResponse } from "next/server";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAdminModelDetail } from "@/lib/admin-models";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAnyAdmin();
    const { id } = await context.params;
    const detail = await loadAdminModelDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Модель не найдена" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/models/[id]:", error);
    return NextResponse.json({ error: "Не удалось загрузить модель" }, { status: 500 });
  }
}
