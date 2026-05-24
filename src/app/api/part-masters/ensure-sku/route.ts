import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizePartNumber } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "@/app/api/_shared/current-user-context";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedText, strictObject } from "@/lib/http/input-validation";

// MT-SEC-068 + MT-SEC-070: strict + bounded ids/partType.
const bodySchema = strictObject({
  partMasterId: boundedText({ max: 64 }),
  nodeId: boundedText({ max: 64 }),
  vehicleId: boundedText({ max: 64 }),
  partType: boundedText({ min: 1, max: 120 }),
});

export async function POST(request: NextRequest) {
  try {
    const userCtx = await getCurrentUserContext();
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 2 * 1024 });
    const body = bodySchema.parse(raw);

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: body.vehicleId,
        garageId: userCtx.garageId,
        garage: { ownerUserId: userCtx.userId },
        trashedAt: null,
      },
      select: { id: true },
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

    const master = await prisma.partMaster.findUnique({
      where: { id: body.partMasterId },
      select: {
        id: true,
        brandName: true,
        sku: true,
        title: true,
      },
    });
    if (!master) {
      return NextResponse.json({ error: "Деталь не найдена." }, { status: 404 });
    }

    const existing = await prisma.partSku.findFirst({
      where: {
        partMasterId: master.id,
        isActive: true,
        OR: [{ primaryNodeId: body.nodeId }, { nodeLinks: { some: { nodeId: body.nodeId } } }],
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ skuId: existing.id, created: false });
    }

    const pt = body.partType.trim();
    const created = await prisma.$transaction(async (tx) => {
      const sku = await tx.partSku.create({
        data: {
          brandName: master.brandName.trim(),
          canonicalName: master.title.trim(),
          partType: pt,
          category: pt,
          description: null,
          primaryNodeId: body.nodeId,
          partMasterId: master.id,
          isActive: true,
          isOem: false,
        },
        select: { id: true },
      });
      await tx.partNumber.create({
        data: {
          skuId: sku.id,
          number: master.sku.trim(),
          normalizedNumber: normalizePartNumber(master.sku.trim()),
          numberType: "AFTERMARKET",
          brandName: master.brandName.trim(),
        },
      });
      await tx.partSkuNodeLink.create({
        data: {
          skuId: sku.id,
          nodeId: body.nodeId,
          relationType: "PRIMARY",
          confidence: 55,
        },
      });
      return sku;
    });

    return NextResponse.json({ skuId: created.id, created: true }, { status: 201 });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("part-masters ensure-sku POST:", error);
    return NextResponse.json({ error: "Не удалось привязать деталь к узлу." }, { status: 500 });
  }
}
