import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildPartMasterIdentity, normalizePartNumber } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";

const createSchema = z.object({
  brandName: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  title: z.string().trim().min(1),
  category: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  vehicleId: z.string().trim().min(1),
  nodeId: z.string().trim().min(1),
  /** When true, also creates catalog {@link PartSku} + node link so the part appears in recommendations. */
  attachSkuToNode: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userCtx = await getCurrentUserContext();
    const body = createSchema.parse(await request.json());
    const { brandNormalized, normalizedSku, skuLabel } = buildPartMasterIdentity({
      brandName: body.brandName,
      skuLabel: body.sku,
    });

    const dup = await prisma.partMaster.findUnique({
      where: { normalizedSku_brandNormalized: { normalizedSku, brandNormalized } },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json(
        { error: "Такая деталь уже есть в каталоге.", partMasterId: dup.id },
        { status: 409 }
      );
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: body.vehicleId,
        garageId: userCtx.garageId,
        garage: { ownerUserId: userCtx.userId },
        trashedAt: null,
      },
      select: { id: true, modelVariantId: true },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }

    const node = await prisma.node.findUnique({
      where: { id: body.nodeId },
      select: { id: true },
    });
    if (!node) {
      return NextResponse.json({ error: "Узел не найден." }, { status: 404 });
    }
    const childCount = await prisma.node.count({ where: { parentId: body.nodeId } });
    if (childCount > 0) {
      return NextResponse.json({ error: "Выберите конечный узел." }, { status: 400 });
    }

    const master = await prisma.partMaster.create({
      data: {
        brandName: body.brandName.trim(),
        brandNormalized,
        sku: skuLabel,
        normalizedSku,
        title: body.title.trim(),
        subcategory: null,
        description: body.description?.trim() || null,
        source: "USER",
        status: "PENDING_REVIEW",
        createdByUserId: userCtx.userId,
        aliasesJson: [],
      },
      select: {
        id: true,
        brandName: true,
        sku: true,
        title: true,
        status: true,
        source: true,
      },
    });

    let skuId: string | null = null;
    if (body.attachSkuToNode !== false) {
      const sku = await prisma.partSku.create({
        data: {
          brandName: body.brandName.trim(),
          canonicalName: body.title.trim(),
          partType: body.category.trim(),
          category: body.category.trim(),
          description: body.description?.trim() || null,
          primaryNodeId: body.nodeId,
          partMasterId: master.id,
          isActive: true,
          isOem: false,
        },
        select: { id: true },
      });
      skuId = sku.id;
      await prisma.partNumber.create({
        data: {
          skuId: sku.id,
          number: body.sku.trim(),
          normalizedNumber: normalizePartNumber(body.sku.trim()),
          numberType: "AFTERMARKET",
          brandName: body.brandName.trim(),
        },
      });
      await prisma.partSkuNodeLink.create({
        data: {
          skuId: sku.id,
          nodeId: body.nodeId,
          relationType: "PRIMARY",
          confidence: 55,
        },
      });
    }

    return NextResponse.json({ partMaster: master, skuId }, { status: 201 });
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("part-masters POST:", error);
    return NextResponse.json({ error: "Не удалось создать деталь." }, { status: 500 });
  }
}
