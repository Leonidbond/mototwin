import { NextResponse } from "next/server";
import type { AdminSupportLevel } from "@mototwin/types";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAdminModelList } from "@/lib/admin-models";

const SUPPORT_LEVELS: AdminSupportLevel[] = [
  "MVP_CORE",
  "MVP_CORE_LEGACY",
  "COMMUNITY_SUPPORT",
  "EARLY_BETA",
  "NO_FITMENT_DATA_YET",
];

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const filters = {
      q: url.searchParams.get("q") ?? undefined,
      motorcycleBrandId:
        url.searchParams.get("motorcycleBrandId") ??
        url.searchParams.get("brandId") ??
        undefined,
      supportLevel: parseSupportLevel(url.searchParams.get("supportLevel")),
    };
    const page = Number(url.searchParams.get("page") ?? 1);
    const data = await loadAdminModelList({ filters, page });
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/models:", error);
    return NextResponse.json({ error: "Не удалось загрузить модели" }, { status: 500 });
  }
}

function parseSupportLevel(value: string | null): AdminSupportLevel | undefined {
  if (value && SUPPORT_LEVELS.includes(value as AdminSupportLevel)) {
    return value as AdminSupportLevel;
  }
  return undefined;
}
