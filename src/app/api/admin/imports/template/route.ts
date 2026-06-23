import { NextResponse } from "next/server";
import { requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import {
  buildImportTemplate,
  buildImportTemplateHeadersOnly,
  isSupportedImportTemplateType,
} from "@/lib/admin-import-templates";

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const typeRaw = url.searchParams.get("type") ?? "";
    const headersOnly = url.searchParams.get("headersOnly") === "1";

    if (!isSupportedImportTemplateType(typeRaw)) {
      return NextResponse.json(
        {
          error:
            "Неизвестный или неподдерживаемый тип шаблона. Доступны: PARTS, PARTS_STAGING, PART_ALIASES, SERVICE_RULES.",
        },
        { status: 400 }
      );
    }

    const template = headersOnly
      ? buildImportTemplateHeadersOnly(typeRaw)
      : buildImportTemplate(typeRaw);

    const body = `\uFEFF${template.content}`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${template.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/imports/template GET:", error);
    return NextResponse.json({ error: "Не удалось сформировать шаблон" }, { status: 500 });
  }
}
