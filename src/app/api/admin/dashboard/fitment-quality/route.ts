import { NextResponse } from "next/server";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadFitmentQuality } from "@/lib/admin-dashboard";

export async function GET() {
  try {
    await requireAnyAdmin();
    const data = await loadFitmentQuality();
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/dashboard/fitment-quality:", error);
    return NextResponse.json({ error: "Не удалось загрузить качество fitment" }, { status: 500 });
  }
}
