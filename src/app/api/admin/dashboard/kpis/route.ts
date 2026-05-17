import { NextResponse } from "next/server";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { ADMIN_DEFAULT_PERIOD, parsePeriodKey } from "@/lib/admin-period";
import { loadKpis } from "@/lib/admin-dashboard";

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const periodKey = parsePeriodKey(url.searchParams.get("period")) ?? ADMIN_DEFAULT_PERIOD;
    const data = await loadKpis(periodKey);
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/dashboard/kpis:", error);
    return NextResponse.json({ error: "Не удалось загрузить KPI" }, { status: 500 });
  }
}
