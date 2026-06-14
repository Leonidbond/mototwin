import { NextResponse } from "next/server";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadModerationInspector } from "@/lib/admin-moderation";
import { parseSearchParamText } from "@/lib/http/input-validation";

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind");
    // MT-SEC-071: cap id length before passing to DB lookup.
    const id = parseSearchParamText(url.searchParams.get("id"), { max: 64 });
    if (
      !id ||
      (kind !== "PART_MASTER" &&
        kind !== "FITMENT_REPORT" &&
        kind !== "FITMENT_CONFIDENCE" &&
        kind !== "CATALOG_REQUEST")
    ) {
      return NextResponse.json({ error: "Неверные параметры" }, { status: 400 });
    }
    const inspector = await loadModerationInspector(kind, id);
    if (!inspector) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json(inspector);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/moderation/inspector:", error);
    return NextResponse.json({ error: "Не удалось загрузить" }, { status: 500 });
  }
}
