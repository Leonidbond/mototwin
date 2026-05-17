import { NextResponse } from "next/server";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAdminAuditLog } from "@/lib/admin-audit-list";

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const data = await loadAdminAuditLog({
      page: Number(url.searchParams.get("page") ?? 1),
      filters: {
        actorId: url.searchParams.get("actorId") ?? undefined,
        action: url.searchParams.get("action") ?? undefined,
        entityType: url.searchParams.get("entityType") ?? undefined,
      },
    });
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/audit-log:", error);
    return NextResponse.json({ error: "Не удалось загрузить аудит" }, { status: 500 });
  }
}
