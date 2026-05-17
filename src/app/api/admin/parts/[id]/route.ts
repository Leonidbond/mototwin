import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePartNumber } from "@mototwin/domain";
import type { Prisma } from "@prisma/client";
import { requireAdminRole, requireAnyAdmin, toAdminErrorResponse } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { loadAdminPartDetail, normalizeBrand } from "@/lib/admin-parts";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  brandName: z.string().min(1).max(80).optional(),
  sku: z.string().min(1).max(80).optional(),
  title: z.string().min(1).max(200).optional(),
  subcategory: z.string().max(80).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().url().max(400).nullable().optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "MERGED", "REJECTED"]).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAnyAdmin();
    const { id } = await context.params;
    const detail = await loadAdminPartDetail(id);
    if (!detail) return NextResponse.json({ error: "Деталь не найдена" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/parts/[id]:", error);
    return NextResponse.json({ error: "Не удалось загрузить деталь" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminRole(["SUPER_ADMIN", "CATALOG_MANAGER", "MODERATOR"]);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные данные", issues: parsed.error.format() },
        { status: 400 }
      );
    }

    const before = await prisma.partMaster.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Деталь не найдена" }, { status: 404 });

    const data: Prisma.PartMasterUpdateInput = {};
    if (parsed.data.brandName !== undefined) {
      data.brandName = parsed.data.brandName;
      data.brandNormalized = normalizeBrand(parsed.data.brandName);
    }
    if (parsed.data.sku !== undefined) {
      data.sku = parsed.data.sku;
      data.normalizedSku = normalizePartNumber(parsed.data.sku);
    }
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.subcategory !== undefined) data.subcategory = parsed.data.subcategory;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.imageUrl !== undefined) data.imageUrl = parsed.data.imageUrl;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;

    const updated = await prisma.partMaster.update({ where: { id }, data });

    await logAdminAction({
      actorId: ctx.userId,
      action: "part.update",
      entityType: "PartMaster",
      entityId: id,
      before,
      after: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const handled = toAdminErrorResponse(error);
    if (handled) return handled;
    console.error("admin/parts/[id] PATCH:", error);
    return NextResponse.json({ error: "Не удалось обновить деталь" }, { status: 500 });
  }
}
