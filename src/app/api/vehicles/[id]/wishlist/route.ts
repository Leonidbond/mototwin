import { NextRequest, NextResponse } from "next/server";
import { PartWishlistItemStatus } from "@prisma/client";
import { z } from "zod";
import { normalizePartWishlistCostMutationArgs } from "@mototwin/domain";
import { prisma } from "@/lib/prisma";
import type { PartWishlistItem } from "@mototwin/types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const statusEnum = z.enum(["NEEDED", "ORDERED", "BOUGHT", "INSTALLED"]);

const createWishlistSchema = z.object({
  title: z.string().trim().min(1, "Название обязательно"),
  quantity: z.number().int().min(1, "Количество должно быть не меньше 1").optional(),
  nodeId: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null) {
        return null;
      }
      const t = String(v).trim();
      return t.length > 0 ? t : null;
    }),
  comment: z.string().trim().nullable().optional(),
  status: statusEnum.optional(),
  costAmount: z.union([z.number().min(0), z.null()]).optional(),
  currency: z.union([z.string(), z.null()]).optional(),
});

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

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const rows = await prisma.partWishlistItem.findMany({
      where: { vehicleId },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        node: { select: { id: true, name: true } },
      },
    });

    const items = rows.map((r) =>
      toWire({
        ...r,
        node: r.node,
      })
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to fetch wishlist:", error);
    return NextResponse.json({ error: "Failed to fetch wishlist" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;
    const json = await request.json();
    const data = createWishlistSchema.parse(json);

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const nodeId: string | null = data.nodeId ?? null;
    if (nodeId) {
      const node = await prisma.node.findUnique({
        where: { id: nodeId },
        select: { id: true },
      });
      if (!node) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }
    }

    const quantity = data.quantity ?? 1;

    const { costAmount, currency } = normalizePartWishlistCostMutationArgs(
      data.costAmount === undefined ? null : data.costAmount,
      data.currency === undefined ? null : data.currency
    );

    const created = await prisma.partWishlistItem.create({
      data: {
        vehicleId,
        title: data.title,
        quantity,
        status: data.status ?? PartWishlistItemStatus.NEEDED,
        comment: data.comment?.trim() ? data.comment.trim() : null,
        nodeId,
        costAmount,
        currency,
      },
      include: {
        node: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ item: toWire(created) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg =
        error.issues.map((i) => i.message).join("; ") || "Некорректное тело запроса";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("Failed to create wishlist item:", error);
    return NextResponse.json(
      {
        error:
          "Не удалось создать позицию списка. Проверьте миграции (`npx prisma migrate dev`) и обновите Prisma Client (`npx prisma generate` или `npm install`).",
      },
      { status: 500 }
    );
  }
}
