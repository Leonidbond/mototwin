import { NextResponse } from "next/server";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadCatalogCoverage } from "@/lib/admin-dashboard";

export async function GET() {
  try {
    await requireAnyAdmin();
    const data = await loadCatalogCoverage();
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/dashboard/catalog-coverage:", error);
    return NextResponse.json({ error: "Не удалось загрузить покрытие каталога" }, { status: 500 });
  }
}
