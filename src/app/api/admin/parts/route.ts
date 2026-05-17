import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePartNumber } from "@mototwin/domain";
import type { AdminPartListFilters, AdminPartStatusWire } from "@mototwin/types";
import { requireAdminRole, requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { loadAdminPartList, normalizeBrand } from "@/lib/admin-parts";
import { prisma } from "@/lib/prisma";

const STATUSES: AdminPartStatusWire[] = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "MERGED", "REJECTED"];

const CreateSchema = z.object({
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
    const filters: AdminPartListFilters = {
      q: url.searchParams.get("q") ?? undefined,
      status: parseStatus(url.searchParams.get("status")),
      brand: url.searchParams.get("brand") ?? undefined,
      source: parseSource(url.searchParams.get("source")),
    };
    const page = Number(url.searchParams.get("page") ?? 1);
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
    const body = await request.json();
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
