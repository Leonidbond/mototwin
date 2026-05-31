import { NextResponse } from "next/server";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { loadAdminAuditLog } from "@/lib/admin-audit-list";
import { loadAuthAuditLog } from "@/lib/auth-audit-list";
import { parseSearchParamInt, parseSearchParamText } from "@/lib/http/input-validation";

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const auditType = url.searchParams.get("type") === "auth" ? "auth" : "admin";
    const page = parseSearchParamInt(url.searchParams.get("page"), { min: 1, max: 10_000, fallback: 1 });

    if (auditType === "auth") {
      const data = await loadAuthAuditLog({
        page,
        filters: {
          userId: parseSearchParamText(url.searchParams.get("userId"), { max: 64 }) ?? undefined,
          event: parseSearchParamText(url.searchParams.get("event"), { max: 64 }) ?? undefined,
        },
      });
      return NextResponse.json(data);
    }

    // MT-SEC-071: cap free-form filter params before they hit DB.
    const data = await loadAdminAuditLog({
      page,
      filters: {
        actorId: parseSearchParamText(url.searchParams.get("actorId"), { max: 64 }) ?? undefined,
        action: parseSearchParamText(url.searchParams.get("action"), { max: 64 }) ?? undefined,
        entityType: parseSearchParamText(url.searchParams.get("entityType"), { max: 64 }) ?? undefined,
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
