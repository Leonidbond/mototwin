import { NextResponse } from "next/server";
import type { AdminVehicleListFilters, AdminVehicleSortKey } from "@mototwin/types";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAdminVehicleList } from "@/lib/admin-vehicles";
import { parseSearchParamInt, parseSearchParamText } from "@/lib/http/input-validation";

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    // MT-SEC-071: cap user-controlled filter strings.
    const filters: AdminVehicleListFilters = {
      motorcycleBrandId:
        parseSearchParamText(url.searchParams.get("motorcycleBrandId"), { max: 64 }) ?? undefined,
      motorcycleModelFamilyId:
        parseSearchParamText(url.searchParams.get("motorcycleModelFamilyId"), { max: 64 }) ?? undefined,
      motorcycleVariantId:
        parseSearchParamText(url.searchParams.get("motorcycleVariantId"), { max: 64 }) ?? undefined,
      motorcycleGenerationId:
        parseSearchParamText(url.searchParams.get("motorcycleGenerationId"), { max: 64 }) ?? undefined,
      year: parseSearchParamInt(url.searchParams.get("year"), { min: 1900, max: 2100, fallback: 0 }) || undefined,
      q: parseSearchParamText(url.searchParams.get("q"), { max: 200 }) ?? undefined,
      sort: parseSort(url.searchParams.get("sort")),
    };
    const page = parseSearchParamInt(url.searchParams.get("page"), { min: 1, max: 10_000, fallback: 1 });
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
