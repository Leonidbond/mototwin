import { NextResponse } from "next/server";
import type { AdminImportBatchTypeWire, AdminImportBatchStatusWire } from "@mototwin/types";
import { requireAdminRole, requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import {
  createImportBatch,
  loadImportBatchList,
  parseImportFile,
} from "@/lib/admin-imports";

const TYPES: AdminImportBatchTypeWire[] = [
  "PARTS",
  "PART_ALIASES",
  "FITMENT_RULES",
  "SERVICE_RULES",
  "MODELS",
  "CONFIGURATIONS",
  "OEM_CROSS",
];
const STATUSES: AdminImportBatchStatusWire[] = [
  "DRAFT",
  "VALIDATING",
  "READY",
  "IMPORTING",
  "COMMITTED",
  "ROLLED_BACK",
  "FAILED",
];

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    const typeParam = url.searchParams.get("type");
    const statusParam = url.searchParams.get("status");
    const data = await loadImportBatchList({
      page: Number(url.searchParams.get("page") ?? 1),
      type: TYPES.includes(typeParam as AdminImportBatchTypeWire)
        ? (typeParam as AdminImportBatchTypeWire)
        : undefined,
      status: STATUSES.includes(statusParam as AdminImportBatchStatusWire)
        ? (statusParam as AdminImportBatchStatusWire)
        : undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/imports GET:", error);
    return NextResponse.json({ error: "Не удалось загрузить импорты" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER"]);
    const formData = (await request.formData()) as unknown as {
      get(name: string): FormDataEntryValue | null;
    };
    const file = formData.get("file");
    const typeRaw = formData.get("type");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Файл больше 8 МБ" }, { status: 400 });
    }
    const type = typeof typeRaw === "string" ? typeRaw : "";
    if (!TYPES.includes(type as AdminImportBatchTypeWire)) {
      return NextResponse.json({ error: "Неизвестный тип импорта" }, { status: 400 });
    }

    // MT-SEC-075: sanitize client-controlled file.name before persisting it
    // to the import batch + audit log. Strip path separators (preventing path
    // traversal in any downstream filesystem usage), trim, and cap length.
    const rawName = typeof file.name === "string" ? file.name : "upload";
    const sanitizedFileName = rawName
      .replace(/[\u0000-\u001f]/g, "") // control chars
      .replace(/[/\\]/g, "_")
      .trim()
      .slice(0, 200) || "upload";

    const buffer = Buffer.from(await file.arrayBuffer());
    let parsed;
    try {
      parsed = parseImportFile(buffer, sanitizedFileName);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Не удалось разобрать файл" },
        { status: 400 }
      );
    }

    const created = await createImportBatch({
      actorId: ctx.userId,
      type: type as AdminImportBatchTypeWire,
      fileName: sanitizedFileName,
      rows: parsed.rows,
    });

    await logAdminAction({
      actorId: ctx.userId,
      action: "import.create",
      entityType: "ImportBatch",
      entityId: created.id,
      after: { type, fileName: sanitizedFileName, rowCount: parsed.rows.length },
      importBatchId: created.id,
    });

    return NextResponse.json(created);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/imports POST:", error);
    return NextResponse.json({ error: "Не удалось создать импорт" }, { status: 500 });
  }
}
