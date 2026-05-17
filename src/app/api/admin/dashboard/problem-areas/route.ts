import { NextResponse } from "next/server";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadProblemAreas } from "@/lib/admin-dashboard";

export async function GET() {
  try {
    await requireAnyAdmin();
    const data = await loadProblemAreas();
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/dashboard/problem-areas:", error);
    return NextResponse.json({ error: "Не удалось загрузить проблемные зоны" }, { status: 500 });
  }
}
