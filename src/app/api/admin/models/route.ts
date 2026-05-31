import { NextResponse } from "next/server";
import type { AdminSupportLevel } from "@mototwin/types";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAdminModelList } from "@/lib/admin-models";
import { parseSearchParamInt, parseSearchParamText } from "@/lib/http/input-validation";

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
    // MT-SEC-071: cap user-controlled filter strings.
    const filters = {
      q: parseSearchParamText(url.searchParams.get("q"), { max: 200 }) ?? undefined,
      motorcycleBrandId:
        parseSearchParamText(url.searchParams.get("motorcycleBrandId"), { max: 64 }) ??
        parseSearchParamText(url.searchParams.get("brandId"), { max: 64 }) ??
        undefined,
      supportLevel: parseSupportLevel(url.searchParams.get("supportLevel")),
    };
    const page = parseSearchParamInt(url.searchParams.get("page"), { min: 1, max: 10_000, fallback: 1 });
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
