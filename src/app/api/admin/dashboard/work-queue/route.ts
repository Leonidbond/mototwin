import { NextResponse } from "next/server";
import type { AdminWorkQueueTabKey } from "@mototwin/types";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadWorkQueue } from "@/lib/admin-dashboard";

function parseTab(value: string | null | undefined): AdminWorkQueueTabKey {
  if (
    value === "all" ||
    value === "new-parts" ||
    value === "fitment" ||
    value === "conflicts" ||
    value === "safety"
  ) {
    return value;
  }
  return "all";
}

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const tab = parseTab(url.searchParams.get("tab"));
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") ?? 8)));
    const data = await loadWorkQueue(tab, limit);
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/dashboard/work-queue:", error);
    return NextResponse.json({ error: "Не удалось загрузить очередь" }, { status: 500 });
  }
}
