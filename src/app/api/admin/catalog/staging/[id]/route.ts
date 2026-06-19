import { NextResponse } from "next/server";
import { requireAdminRole, toAdminErrorResponse } from "@/lib/admin-auth";
import {
  approveCatalogStagingApplication,
  loadCatalogStagingDetail,
  rejectCatalogStagingApplication,
} from "@/lib/admin-catalog-staging";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER", "MODERATOR"]);
    const { id } = await context.params;
    const detail = await loadCatalogStagingDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Строка staging не найдена" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/catalog/staging/[id]:", error);
    return NextResponse.json({ error: "Не удалось загрузить строку" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER"]);
    const { id } = await context.params;
    const body = (await request.json()) as { action?: string };
    if (body.action === "approve") {
      const result = await approveCatalogStagingApplication(id);
      return NextResponse.json({ ok: true, ...result });
    }
    if (body.action === "reject") {
      await rejectCatalogStagingApplication(id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/catalog/staging/[id] PATCH:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось обновить строку" },
      { status: 500 }
    );
  }
}
