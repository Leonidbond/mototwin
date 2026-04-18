import { NextRequest, NextResponse } from "next/server";
import { PartWishlistItemStatus } from "@prisma/client";
import { z } from "zod";
import { normalizePartWishlistCostMutationArgs } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";
import type { PartWishlistItem } from "@mototwin/types";

type RouteContext = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

const statusEnum = z.enum(["NEEDED", "ORDERED", "BOUGHT", "INSTALLED"]);

const patchWishlistSchema = z
  .object({
    title: z.string().trim().min(1, "Название не может быть пустым").optional(),
    quantity: z.number().int().min(1, "Количество должно быть не меньше 1").optional(),
    nodeId: z.union([z.string().trim().min(1), z.null()]).optional(),
    comment: z.string().trim().nullable().optional(),
    status: statusEnum.optional(),
    costAmount: z.union([z.number().min(0), z.null()]).optional(),
    currency: z.union([z.string(), z.null()]).optional(),
  })
  .strict();

function toWire(row: {
  id: string;
  vehicleId: string;
  nodeId: string | null;
  title: string;
  quantity: number;
  status: PartWishlistItemStatus;
  comment: string | null;
  costAmount: number | null;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
  node: { id: string; name: string } | null;
}): PartWishlistItem {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    nodeId: row.nodeId,
    title: row.title,
    quantity: row.quantity,
    status: row.status,
    comment: row.comment,
    costAmount: row.costAmount,
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    node: row.node,
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId, itemId } = await context.params;
    const json = await request.json();
    const data = patchWishlistSchema.parse(json);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
    }

    const existing = await prisma.partWishlistItem.findFirst({
      where: { id: itemId, vehicleId },
      select: { id: true, costAmount: true, currency: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Wishlist item not found" }, { status: 404 });
    }

    if (data.nodeId !== undefined && data.nodeId !== null) {
      const node = await prisma.node.findUnique({
        where: { id: data.nodeId },
        select: { id: true },
      });
      if (!node) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }
    }

    const costPatch =
      data.costAmount !== undefined || data.currency !== undefined
        ? normalizePartWishlistCostMutationArgs(
            data.costAmount !== undefined ? data.costAmount : existing.costAmount,
            data.currency !== undefined ? data.currency : existing.currency
          )
        : null;

    const updated = await prisma.partWishlistItem.update({
      where: { id: itemId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.comment !== undefined
          ? { comment: data.comment?.trim() ? data.comment.trim() : null }
          : {}),
        ...(data.nodeId !== undefined ? { nodeId: data.nodeId } : {}),
        ...(costPatch
          ? { costAmount: costPatch.costAmount, currency: costPatch.currency }
          : {}),
      },
      include: {
        node: { select: { id: true, name: true } },
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
    return NextResponse.json({ error: "Failed to update wishlist item" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId, itemId } = await context.params;

    const existing = await prisma.partWishlistItem.findFirst({
      where: { id: itemId, vehicleId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Wishlist item not found" }, { status: 404 });
    }

    await prisma.partWishlistItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete wishlist item:", error);
    return NextResponse.json({ error: "Failed to delete wishlist item" }, { status: 500 });
  }
}
