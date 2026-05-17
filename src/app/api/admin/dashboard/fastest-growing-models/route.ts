import { NextResponse } from "next/server";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { ADMIN_DEFAULT_PERIOD, parsePeriodKey } from "@/lib/admin-period";
import { loadFastestGrowingModels } from "@/lib/admin-dashboard";

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const periodKey = parsePeriodKey(url.searchParams.get("period")) ?? ADMIN_DEFAULT_PERIOD;
    const data = await loadFastestGrowingModels(periodKey);
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/dashboard/fastest-growing-models:", error);
    return NextResponse.json({ error: "Не удалось загрузить блок моделей" }, { status: 500 });
  }
}
