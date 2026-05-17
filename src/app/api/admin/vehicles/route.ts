import { NextResponse } from "next/server";
import type { AdminVehicleListFilters, AdminVehicleSortKey } from "@mototwin/types";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAdminVehicleList } from "@/lib/admin-vehicles";

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const filters: AdminVehicleListFilters = {
      brandId: url.searchParams.get("brandId") ?? undefined,
      modelId: url.searchParams.get("modelId") ?? undefined,
      year: parseInt(url.searchParams.get("year") ?? "", 10) || undefined,
      q: url.searchParams.get("q") ?? undefined,
      sort: parseSort(url.searchParams.get("sort")),
    };
    const page = Number(url.searchParams.get("page") ?? 1);
    const data = await loadAdminVehicleList({ filters, page });
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/vehicles:", error);
    return NextResponse.json({ error: "Не удалось загрузить мотоциклы" }, { status: 500 });
  }
}

function parseSort(value: string | null): AdminVehicleSortKey | undefined {
  if (value === "createdAtDesc" || value === "lastActivityDesc" || value === "odometerDesc") {
    return value;
  }
  return undefined;
}
