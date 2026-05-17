import { NextResponse } from "next/server";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAlerts } from "@/lib/admin-dashboard";

export async function GET() {
  try {
    await requireAnyAdmin();
    const data = await loadAlerts();
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/dashboard/alerts:", error);
    return NextResponse.json({ error: "Не удалось загрузить алерты" }, { status: 500 });
  }
}
