import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePartNumber } from "@mototwin/domain";
import type { AdminPartListFilters, AdminPartStatusWire } from "@mototwin/types";
import { requireAdminRole, requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { loadAdminPartList, normalizeBrand } from "@/lib/admin-parts";
import { prisma } from "@/lib/prisma";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { parseSearchParamInt, parseSearchParamText, strictObject } from "@/lib/http/input-validation";

const STATUSES: AdminPartStatusWire[] = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "MERGED", "REJECTED"];

const CreateSchema = strictObject({
  brandName: z.string().min(1).max(80),
  sku: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  subcategory: z.string().max(80).optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().max(400).optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "MERGED", "REJECTED"]).optional(),
});

export async function GET(request: Request) {
  try {
    await requireAnyAdmin();
    const url = new URL(request.url);
    // MT-SEC-071: bound free-text search params.
    const filters: AdminPartListFilters = {
      q: parseSearchParamText(url.searchParams.get("q"), { max: 200 }) ?? undefined,
      status: parseStatus(url.searchParams.get("status")),
      brand: parseSearchParamText(url.searchParams.get("brand"), { max: 120 }) ?? undefined,
      source: parseSource(url.searchParams.get("source")),
    };
    const page = parseSearchParamInt(url.searchParams.get("page"), {
      min: 1,
      max: 10_000,
      fallback: 1,
    });
    const data = await loadAdminPartList({ filters, page });
    return NextResponse.json(data);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/parts:", error);
    return NextResponse.json({ error: "Не удалось загрузить детали" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER"]);
    const body = await parseJsonBody<unknown>(request, { maxBytes: 8 * 1024 });
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", issues: parsed.error.format() },
        { status: 400 }
      );
    }
    const created = await prisma.partMaster.create({
      data: {
        brandName: parsed.data.brandName,
        brandNormalized: normalizeBrand(parsed.data.brandName),
        sku: parsed.data.sku,
        normalizedSku: normalizePartNumber(parsed.data.sku),
        title: parsed.data.title,
        subcategory: parsed.data.subcategory ?? null,
        description: parsed.data.description ?? null,
        imageUrl: parsed.data.imageUrl ?? null,
        status: parsed.data.status ?? "ACTIVE",
        source: "ADMIN",
        createdByUserId: ctx.userId,
      },
    });
    await logAdminAction({
      actorId: ctx.userId,
      action: "part.create",
      entityType: "PartMaster",
      entityId: created.id,
      after: created,
      reason: "manual creation via admin",
    });
    return NextResponse.json(created);
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/parts POST:", error);
    return NextResponse.json({ error: "Не удалось создать деталь" }, { status: 500 });
  }
}

function parseStatus(value: string | null): AdminPartStatusWire | undefined {
  if (value && STATUSES.includes(value as AdminPartStatusWire)) {
    return value as AdminPartStatusWire;
  }
  return undefined;
}

function parseSource(value: string | null): "ADMIN" | "USER" | undefined {
  if (value === "ADMIN" || value === "USER") return value;
  return undefined;
}
