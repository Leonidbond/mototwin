import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { PartWishlistItemStatus } from "@prisma/client";
import { z } from "zod";
import { buildWishlistItemSkuInfo, normalizePartWishlistCostMutationArgs } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";
import type { PartWishlistItem } from "@mototwin/types";
import { isVehicleInCurrentContext } from "../../../../_shared/vehicle-context";

type WishlistSkuRow = Parameters<typeof buildWishlistItemSkuInfo>[0];

type RouteContext = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

const statusEnum = z.enum(["NEEDED", "ORDERED", "BOUGHT", "INSTALLED"]);

const wishlistSkuSelect = {
  id: true,
  canonicalName: true,
  brandName: true,
  partType: true,
  priceAmount: true,
  currency: true,
  partNumbers: {
    orderBy: { createdAt: "asc" as const },
    take: 1,
    select: { number: true },
  },
} as const;

const patchWishlistSchema = z
  .object({
    title: z.string().trim().min(1, "Название не может быть пустым").optional(),
    quantity: z.number().int().min(1, "Количество должно быть не меньше 1").optional(),
    nodeId: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((v) => {
        if (v === undefined) {
          return undefined;
        }
        if (v === null) {
          return null;
        }
        const t = String(v).trim();
        return t.length > 0 ? t : null;
      }),
    skuId: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((v) => {
        if (v === undefined) {
          return undefined;
        }
        if (v === null) {
          return null;
        }
        const t = String(v).trim();
        return t.length > 0 ? t : null;
      }),
    comment: z.string().trim().nullable().optional(),
    status: statusEnum.optional(),
    costAmount: z.union([z.number().min(0), z.null()]).optional(),
    currency: z.union([z.string(), z.null()]).optional(),
  })
  .strict();

async function resolveLeafNodeIdOrError(nodeId: string) {
  const node = await prisma.node.findUnique({
    where: { id: nodeId },
    select: { id: true },
  });
  if (!node) {
    return NextResponse.json({ error: "Узел не найден." }, { status: 404 });
  }
  const hasChildren = await prisma.node.count({ where: { parentId: nodeId } });
  if (hasChildren > 0) {
    return NextResponse.json(
      { error: "Выберите конечный узел для позиции списка покупок" },
      { status: 400 }
    );
  }
  return null;
}

function toWire(row: {
  id: string;
  vehicleId: string;
  nodeId: string | null;
  skuId: string | null;
  title: string;
  quantity: number;
  status: PartWishlistItemStatus;
  comment: string | null;
  costAmount: number | null;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
  node: { id: string; name: string } | null;
  sku: WishlistSkuRow | null;
}): PartWishlistItem {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    nodeId: row.nodeId,
    skuId: row.skuId,
    title: row.title,
    quantity: row.quantity,
    status: row.status,
    comment: row.comment,
    costAmount: row.costAmount,
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    node: row.node,
    sku: row.sku ? buildWishlistItemSkuInfo(row.sku) : null,
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId, itemId } = await context.params;
    const json = await request.json();
    const parsed = patchWishlistSchema.parse(json);
    const allowed = await isVehicleInCurrentContext(vehicleId);
    if (!allowed) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }

    if (Object.keys(parsed).length === 0) {
      return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
    }

    const existing = await prisma.partWishlistItem.findFirst({
      where: { id: itemId, vehicleId },
      select: {
        id: true,
        costAmount: true,
        currency: true,
        nodeId: true,
        skuId: true,
        title: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Позиция списка не найдена." }, { status: 404 });
    }

    let targetSku: {
      id: string;
      primaryNodeId: string | null;
      priceAmount: WishlistSkuRow["priceAmount"];
      currency: string | null;
    } | null = null;

    if (parsed.skuId !== undefined && parsed.skuId !== null) {
      const s = await prisma.partSku.findFirst({
        where: { id: parsed.skuId, isActive: true },
        select: { id: true, primaryNodeId: true, priceAmount: true, currency: true },
      });
      if (!s) {
        return NextResponse.json(
          { error: "Позиция каталога не найдена или неактивна." },
          { status: 404 }
        );
      }
      targetSku = s;
    }

    if (parsed.nodeId === null) {
      return NextResponse.json({ error: "Выберите узел мотоцикла" }, { status: 400 });
    }

    if (parsed.nodeId !== undefined && parsed.nodeId !== null) {
      const leafError = await resolveLeafNodeIdOrError(parsed.nodeId);
      if (leafError) {
        return leafError;
      }
    }

    let nextNodeId = existing.nodeId;
    if (parsed.nodeId !== undefined) {
      nextNodeId = parsed.nodeId;
    } else if (
      parsed.skuId !== undefined &&
      parsed.skuId !== null &&
      targetSku?.primaryNodeId &&
      !existing.nodeId
    ) {
      nextNodeId = targetSku.primaryNodeId;
    }

    if (!nextNodeId) {
      return NextResponse.json({ error: "Выберите узел мотоцикла" }, { status: 400 });
    }

    const finalLeafError = await resolveLeafNodeIdOrError(nextNodeId);
    if (finalLeafError) {
      return finalLeafError;
    }

    const shouldWriteNodeId =
      parsed.nodeId !== undefined ||
      (parsed.skuId !== undefined &&
        parsed.skuId !== null &&
        Boolean(targetSku?.primaryNodeId) &&
        !existing.nodeId);

    let nextCostAmount = existing.costAmount;
    let nextCurrency = existing.currency;

    if (parsed.costAmount !== undefined || parsed.currency !== undefined) {
      const costPatch = normalizePartWishlistCostMutationArgs(
        parsed.costAmount !== undefined ? parsed.costAmount : existing.costAmount,
        parsed.currency !== undefined ? parsed.currency : existing.currency
      );
      nextCostAmount = costPatch.costAmount;
      nextCurrency = costPatch.currency;
    } else if (
      parsed.skuId !== undefined &&
      parsed.skuId !== null &&
      existing.costAmount == null &&
      targetSku?.priceAmount != null &&
      parsed.skuId !== existing.skuId
    ) {
      nextCostAmount = Number(targetSku.priceAmount);
      nextCurrency = targetSku.currency?.trim() || "RUB";
    }

    const costTouched =
      parsed.costAmount !== undefined ||
      parsed.currency !== undefined ||
      (!(parsed.costAmount !== undefined || parsed.currency !== undefined) &&
        parsed.skuId !== undefined &&
        parsed.skuId !== null &&
        existing.costAmount == null &&
        targetSku?.priceAmount != null &&
        parsed.skuId !== existing.skuId);

    const updateData: Prisma.PartWishlistItemUncheckedUpdateInput = {};

    if (parsed.title !== undefined) {
      updateData.title = parsed.title;
    }
    if (parsed.quantity !== undefined) {
      updateData.quantity = parsed.quantity;
    }
    if (parsed.status !== undefined) {
      updateData.status = parsed.status;
    }
    if (parsed.comment !== undefined) {
      updateData.comment = parsed.comment?.trim() ? parsed.comment.trim() : null;
    }
    if (shouldWriteNodeId) {
      updateData.nodeId = nextNodeId;
    }
    if (parsed.skuId !== undefined) {
      updateData.skuId = parsed.skuId;
    }
    if (costTouched) {
      updateData.costAmount = nextCostAmount;
      updateData.currency = nextCurrency;
    }

    const updated = await prisma.partWishlistItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        node: { select: { id: true, name: true } },
        sku: { select: wishlistSkuSelect },
      },
    });

    return NextResponse.json({ item: toWire(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg =
        error.issues.map((i) => i.message).join("; ") || "Некорректное тело запроса";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("Failed to update wishlist item:", error);
    return NextResponse.json({ error: "Не удалось обновить позицию списка." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId, itemId } = await context.params;
    const allowed = await isVehicleInCurrentContext(vehicleId);
    if (!allowed) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }

    const existing = await prisma.partWishlistItem.findFirst({
      where: { id: itemId, vehicleId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Позиция списка не найдена." }, { status: 404 });
    }

    await prisma.partWishlistItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete wishlist item:", error);
    return NextResponse.json({ error: "Не удалось удалить позицию списка." }, { status: 500 });
  }
}
