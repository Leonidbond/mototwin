import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { MaintenanceTriggerMode, Prisma } from "@prisma/client";
import { normalizePartNumber } from "@mototwin/domain";
import type {
  AdminImportBatchDetailWire,
  AdminImportBatchListItemWire,
  AdminImportBatchListResponse,
  AdminImportBatchRowWire,
  AdminImportBatchStatusWire,
  AdminImportBatchSummaryWire,
  AdminImportBatchTypeWire,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";

const SUPPORTED_TYPES: AdminImportBatchTypeWire[] = ["PARTS", "PART_ALIASES", "SERVICE_RULES"];

const EMPTY_SUMMARY: AdminImportBatchSummaryWire = {
  total: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  conflicts: 0,
  errors: 0,
};

interface ParsedFile {
  rows: Array<Record<string, string>>;
}

/** Parse an uploaded CSV or XLSX buffer into homogeneous string-only rows. */
export function parseImportFile(buffer: Buffer, fileName: string): ParsedFile {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".tsv")) {
    const text = buffer.toString("utf-8");
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (value) => (typeof value === "string" ? value.trim() : value),
    });
    if (parsed.errors.length > 0) {
      throw new Error(
        `Не удалось разобрать CSV: ${parsed.errors.slice(0, 3).map((e) => e.message).join(", ")}`
      );
    }
    return { rows: parsed.data.filter((r) => Object.keys(r).length > 0) };
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) throw new Error("В файле нет листов");
    const sheet = wb.Sheets[firstSheet];
    if (!sheet) throw new Error("Не удалось прочитать первый лист");
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: "",
      raw: false,
    });
    return {
      rows: json.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k.trim(), String(v ?? "").trim()])
        )
      ),
    };
  }
  throw new Error("Поддерживаются только .csv, .tsv, .xlsx, .xls");
}

interface CreateBatchInput {
  actorId: string;
  type: AdminImportBatchTypeWire;
  fileName: string;
  rows: Array<Record<string, string>>;
}

export async function createImportBatch(input: CreateBatchInput): Promise<{ id: string }> {
  const batch = await prisma.importBatch.create({
    data: {
      type: input.type,
      status: "DRAFT",
      fileName: input.fileName,
      createdById: input.actorId,
      summary: { ...EMPTY_SUMMARY, total: input.rows.length } as unknown as Prisma.InputJsonValue,
    },
  });
  if (input.rows.length > 0) {
    await prisma.importBatchRow.createMany({
      data: input.rows.map((raw, index) => ({
        batchId: batch.id,
        rowIndex: index,
        raw,
        status: "ok",
      })),
    });
  }
  return { id: batch.id };
}

export async function loadImportBatchList(params: {
  page?: number;
  pageSize?: number;
  type?: AdminImportBatchTypeWire;
  status?: AdminImportBatchStatusWire;
}): Promise<AdminImportBatchListResponse> {
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const page = Math.max(1, params.page ?? 1);
  const where: { type?: AdminImportBatchTypeWire; status?: AdminImportBatchStatusWire } = {};
  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;

  const [total, batches] = await Promise.all([
    prisma.importBatch.count({ where }),
    prisma.importBatch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { createdBy: { select: { displayName: true, email: true } } },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    items: batches.map((b) => toListItem(b)),
  };
}

export async function loadImportBatchDetail(
  id: string
): Promise<AdminImportBatchDetailWire | null> {
  const batch = await prisma.importBatch.findUnique({
    where: { id },
    include: {
      createdBy: { select: { displayName: true, email: true } },
      rows: { orderBy: { rowIndex: "asc" } },
    },
  });
  if (!batch) return null;
  const summary = readSummary(batch.summary);
  return {
    id: batch.id,
    type: batch.type as AdminImportBatchTypeWire,
    status: batch.status as AdminImportBatchStatusWire,
    fileName: batch.fileName,
    createdAt: batch.createdAt.toISOString(),
    dryRunAt: batch.dryRunAt?.toISOString() ?? null,
    committedAt: batch.committedAt?.toISOString() ?? null,
    rolledBackAt: batch.rolledBackAt?.toISOString() ?? null,
    createdByLabel:
      batch.createdBy?.displayName ?? batch.createdBy?.email ?? "—",
    summary,
    rows: batch.rows.map((row) => ({
      id: row.id,
      rowIndex: row.rowIndex,
      raw: row.raw as Record<string, string>,
      action: (row.action as AdminImportBatchRowWire["action"]) ?? null,
      status: row.status as AdminImportBatchRowWire["status"],
      errorMessage: row.errorMessage,
      mappedEntityId: row.mappedEntityId,
    })),
  };
}

function toListItem(b: {
  id: string;
  type: string;
  status: string;
  fileName: string;
  createdAt: Date;
  committedAt: Date | null;
  createdBy: { displayName: string | null; email: string | null } | null;
  summary: unknown;
}): AdminImportBatchListItemWire {
  return {
    id: b.id,
    type: b.type as AdminImportBatchTypeWire,
    status: b.status as AdminImportBatchStatusWire,
    fileName: b.fileName,
    createdAt: b.createdAt.toISOString(),
    committedAt: b.committedAt?.toISOString() ?? null,
    createdByLabel: b.createdBy?.displayName ?? b.createdBy?.email ?? "—",
    summary: readSummary(b.summary),
  };
}

function readSummary(value: unknown): AdminImportBatchSummaryWire {
  if (value && typeof value === "object") {
    const v = value as Partial<AdminImportBatchSummaryWire>;
    return {
      total: v.total ?? 0,
      created: v.created ?? 0,
      updated: v.updated ?? 0,
      skipped: v.skipped ?? 0,
      conflicts: v.conflicts ?? 0,
      errors: v.errors ?? 0,
    };
  }
  return { ...EMPTY_SUMMARY };
}

export async function dryRunBatch(batchId: string): Promise<AdminImportBatchSummaryWire> {
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { rows: { orderBy: { rowIndex: "asc" } } },
  });
  if (!batch) throw new Error("Импорт не найден");
  if (!SUPPORTED_TYPES.includes(batch.type as AdminImportBatchTypeWire)) {
    throw new Error("Этот тип импорта пока не поддержан в MVP");
  }
  if (batch.status === "COMMITTED" || batch.status === "ROLLED_BACK") {
    throw new Error("Этот импорт уже зафиксирован/откачен — пересоздайте партию");
  }

  await prisma.importBatch.update({ where: { id: batchId }, data: { status: "VALIDATING" } });
  const summary: AdminImportBatchSummaryWire = { ...EMPTY_SUMMARY, total: batch.rows.length };

  for (const row of batch.rows) {
    const raw = row.raw as Record<string, string>;
    const result =
      batch.type === "PARTS"
        ? await validatePartsRow(raw)
        : batch.type === "SERVICE_RULES"
          ? await validateServiceRulesRow(raw)
          : await validatePartAliasesRow(raw);
    summary[result.summaryKey] += 1;
    await prisma.importBatchRow.update({
      where: { id: row.id },
      data: {
        action: result.action,
        status: result.status,
        errorMessage: result.errorMessage,
      },
    });
  }

  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      status: summary.errors > 0 ? "FAILED" : "READY",
      dryRunAt: new Date(),
      summary: summary as unknown as Prisma.InputJsonValue,
    },
  });
  return summary;
}

export async function commitBatch(batchId: string): Promise<AdminImportBatchSummaryWire> {
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { rows: { orderBy: { rowIndex: "asc" } } },
  });
  if (!batch) throw new Error("Импорт не найден");
  if (batch.status !== "READY") {
    throw new Error("Сначала запустите успешный dry-run (статус должен быть READY)");
  }

  await prisma.importBatch.update({ where: { id: batchId }, data: { status: "IMPORTING" } });
  const summary: AdminImportBatchSummaryWire = { ...EMPTY_SUMMARY, total: batch.rows.length };

  for (const row of batch.rows) {
    const raw = row.raw as Record<string, string>;
    try {
      const result =
        batch.type === "PARTS"
          ? await applyPartsRow(raw, batch.createdById)
          : batch.type === "SERVICE_RULES"
            ? await applyServiceRulesRow(raw)
            : await applyPartAliasesRow(raw);
      summary[result.summaryKey] += 1;
      await prisma.importBatchRow.update({
        where: { id: row.id },
        data: {
          action: result.action,
          status: result.status,
          errorMessage: result.errorMessage,
          mappedEntityId: result.entityId ?? row.mappedEntityId,
        },
      });
    } catch (err) {
      summary.errors += 1;
      await prisma.importBatchRow.update({
        where: { id: row.id },
        data: {
          action: "skip",
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Неизвестная ошибка",
        },
      });
    }
  }

  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      status: summary.errors > 0 ? "FAILED" : "COMMITTED",
      committedAt: new Date(),
      summary: summary as unknown as Prisma.InputJsonValue,
    },
  });
  return summary;
}

export async function rollbackBatch(batchId: string): Promise<{ removed: number }> {
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { rows: true },
  });
  if (!batch) throw new Error("Импорт не найден");
  if (batch.status !== "COMMITTED") {
    throw new Error("Откатить можно только зафиксированный импорт");
  }

  let removed = 0;
  for (const row of batch.rows) {
    if (!row.mappedEntityId || row.action !== "create") continue;
    try {
      if (batch.type === "PART_ALIASES") {
        await prisma.partAlias.delete({ where: { id: row.mappedEntityId } });
        removed += 1;
      } else if (batch.type === "PARTS") {
        const reportCount = await prisma.fitmentReport.count({
          where: { partMasterId: row.mappedEntityId },
        });
        if (reportCount === 0) {
          await prisma.partMaster.delete({ where: { id: row.mappedEntityId } });
          removed += 1;
        }
      }
    } catch (err) {
      console.warn("rollback row failed", row.id, err);
    }
  }

  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: "ROLLED_BACK", rolledBackAt: new Date() },
  });
  return { removed };
}

interface RowOutcome {
  action: "create" | "update" | "skip" | "conflict";
  status: "ok" | "warning" | "error";
  summaryKey: keyof AdminImportBatchSummaryWire;
  errorMessage: string | null;
  entityId?: string;
}

async function validatePartsRow(raw: Record<string, string>): Promise<RowOutcome> {
  const brand = (raw["brand"] ?? raw["brandName"] ?? "").trim();
  const sku = (raw["sku"] ?? raw["partNumber"] ?? "").trim();
  const title = (raw["title"] ?? raw["name"] ?? "").trim();
  if (!brand || !sku || !title) {
    return errorOutcome("Поля brand, sku и title обязательны");
  }
  const normalizedSku = normalizePartNumber(sku);
  const existing = await prisma.partMaster.findFirst({
    where: { brandNormalized: brand.toLowerCase(), normalizedSku },
    select: { id: true },
  });
  if (existing) {
    return {
      action: "update",
      status: "ok",
      summaryKey: "updated",
      errorMessage: null,
      entityId: existing.id,
    };
  }
  return {
    action: "create",
    status: "ok",
    summaryKey: "created",
    errorMessage: null,
  };
}

async function applyPartsRow(
  raw: Record<string, string>,
  actorId: string
): Promise<RowOutcome> {
  const validation = await validatePartsRow(raw);
  if (validation.status === "error") return validation;
  const brand = (raw["brand"] ?? raw["brandName"] ?? "").trim();
  const sku = (raw["sku"] ?? raw["partNumber"] ?? "").trim();
  const title = (raw["title"] ?? raw["name"] ?? "").trim();
  const subcategory = (raw["subcategory"] ?? "").trim() || null;
  const description = (raw["description"] ?? "").trim() || null;
  const imageUrl = (raw["imageUrl"] ?? raw["image"] ?? "").trim() || null;
  const normalizedSku = normalizePartNumber(sku);

  if (validation.action === "update" && validation.entityId) {
    const updated = await prisma.partMaster.update({
      where: { id: validation.entityId },
      data: {
        brandName: brand,
        brandNormalized: brand.toLowerCase(),
        sku,
        normalizedSku,
        title,
        subcategory,
        description,
        imageUrl,
      },
    });
    return { ...validation, entityId: updated.id };
  }

  const created = await prisma.partMaster.create({
    data: {
      brandName: brand,
      brandNormalized: brand.toLowerCase(),
      sku,
      normalizedSku,
      title,
      subcategory,
      description,
      imageUrl,
      status: "ACTIVE",
      source: "ADMIN",
      createdByUserId: actorId,
    },
  });
  return { ...validation, entityId: created.id };
}

async function validatePartAliasesRow(raw: Record<string, string>): Promise<RowOutcome> {
  const brand = (raw["brand"] ?? raw["brandName"] ?? "").trim();
  const sku = (raw["sku"] ?? raw["partNumber"] ?? "").trim();
  const alias = (raw["alias"] ?? raw["altSku"] ?? "").trim();
  if (!brand || !sku || !alias) {
    return errorOutcome("Поля brand, sku, alias обязательны");
  }
  const part = await prisma.partMaster.findFirst({
    where: {
      brandNormalized: brand.toLowerCase(),
      normalizedSku: normalizePartNumber(sku),
    },
    select: { id: true },
  });
  if (!part) {
    return errorOutcome(`PartMaster ${brand} ${sku} не найден`);
  }
  const existing = await prisma.partAlias.findUnique({
    where: {
      partMasterId_normalized: {
        partMasterId: part.id,
        normalized: normalizePartNumber(alias),
      },
    },
    select: { id: true },
  });
  if (existing) {
    return {
      action: "skip",
      status: "ok",
      summaryKey: "skipped",
      errorMessage: "alias уже существует",
      entityId: existing.id,
    };
  }
  return {
    action: "create",
    status: "ok",
    summaryKey: "created",
    errorMessage: null,
    entityId: part.id,
  };
}

async function applyPartAliasesRow(raw: Record<string, string>): Promise<RowOutcome> {
  const validation = await validatePartAliasesRow(raw);
  if (validation.status === "error" || validation.action === "skip") return validation;
  const brand = (raw["brand"] ?? raw["brandName"] ?? "").trim();
  const sku = (raw["sku"] ?? raw["partNumber"] ?? "").trim();
  const alias = (raw["alias"] ?? raw["altSku"] ?? "").trim();
  const part = await prisma.partMaster.findFirst({
    where: {
      brandNormalized: brand.toLowerCase(),
      normalizedSku: normalizePartNumber(sku),
    },
    select: { id: true },
  });
  if (!part) return errorOutcome("Деталь не найдена");
  const created = await prisma.partAlias.create({
    data: {
      partMasterId: part.id,
      alias,
      normalized: normalizePartNumber(alias),
      source: "import",
    },
  });
  return { ...validation, entityId: created.id };
}

function parseOptionalInt(raw: Record<string, string>, key: string): number | null {
  const value = (raw[key] ?? "").trim();
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function parseTriggerMode(raw: Record<string, string>): MaintenanceTriggerMode {
  const value = (raw["triggerMode"] ?? raw["trigger"] ?? "WHICHEVER_COMES_FIRST").trim();
  if (value === "ANY" || value === "ALL" || value === "WHICHEVER_COMES_FIRST") {
    return value;
  }
  return "WHICHEVER_COMES_FIRST";
}

async function validateServiceRulesRow(raw: Record<string, string>): Promise<RowOutcome> {
  const nodeCode = (raw["nodeCode"] ?? raw["code"] ?? "").trim();
  if (!nodeCode) {
    return errorOutcome("Поле nodeCode обязательно");
  }
  const node = await prisma.node.findFirst({
    where: { code: nodeCode },
    select: { id: true },
  });
  if (!node) {
    return errorOutcome(`Узел ${nodeCode} не найден`);
  }
  const existing = await prisma.nodeMaintenanceRule.findUnique({
    where: { nodeId: node.id },
    select: { id: true },
  });
  return {
    action: existing ? "update" : "create",
    status: "ok",
    summaryKey: existing ? "updated" : "created",
    errorMessage: null,
    entityId: node.id,
  };
}

async function applyServiceRulesRow(raw: Record<string, string>): Promise<RowOutcome> {
  const validation = await validateServiceRulesRow(raw);
  if (validation.status === "error" || !validation.entityId) return validation;
  const nodeCode = (raw["nodeCode"] ?? raw["code"] ?? "").trim();
  const node = await prisma.node.findFirst({
    where: { code: nodeCode },
    select: { id: true },
  });
  if (!node) return errorOutcome(`Узел ${nodeCode} не найден`);
  const data = {
    intervalKm: parseOptionalInt(raw, "intervalKm"),
    intervalHours: parseOptionalInt(raw, "intervalHours"),
    intervalDays: parseOptionalInt(raw, "intervalDays"),
    warningKm: parseOptionalInt(raw, "warningKm"),
    warningHours: parseOptionalInt(raw, "warningHours"),
    warningDays: parseOptionalInt(raw, "warningDays"),
    triggerMode: parseTriggerMode(raw),
    isActive: (raw["isActive"] ?? "true").trim().toLowerCase() !== "false",
  };
  const rule = await prisma.nodeMaintenanceRule.upsert({
    where: { nodeId: node.id },
    create: { nodeId: node.id, ...data },
    update: data,
  });
  return { ...validation, entityId: rule.id };
}

function errorOutcome(message: string): RowOutcome {
  return {
    action: "skip",
    status: "error",
    summaryKey: "errors",
    errorMessage: message,
  };
}
