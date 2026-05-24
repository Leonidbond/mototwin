import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildPartMasterIdentity, normalizePartNumber } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedText, boundedTextOptional, strictObject } from "@/lib/http/input-validation";

// MT-SEC-068 + MT-SEC-070: strict + bounded — user-created catalog records
// end up in shared moderation queue, so bound every field tightly.
const createSchema = strictObject({
  brandName: boundedText({ min: 1, max: 120 }),
  sku: boundedText({ min: 1, max: 100 }),
  title: boundedText({ min: 1, max: 300 }),
  category: boundedText({ min: 1, max: 120 }),
  description: boundedTextOptional({ max: 2_000 }),
  vehicleId: boundedText({ max: 64 }),
  nodeId: boundedText({ max: 64 }),
  /** When true, also creates catalog {@link PartSku} + node link so the part appears in recommendations. */
  attachSkuToNode: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userCtx = await getCurrentUserContext();
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 8 * 1024 });
    const body = createSchema.parse(raw);
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
      select: { id: true, motorcycleGenerationId: true },
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
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("part-masters POST:", error);
    return NextResponse.json({ error: "Не удалось создать деталь." }, { status: 500 });
  }
}
