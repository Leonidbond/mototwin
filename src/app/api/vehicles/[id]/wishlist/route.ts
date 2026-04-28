import { NextRequest, NextResponse } from "next/server";
import { PartWishlistItemStatus } from "@prisma/client";
import { z } from "zod";
import {
  applySkuDefaultsToWishlistDraft,
  buildWishlistItemSkuInfo,
  normalizePartWishlistCostMutationArgs,
} from "@mototwin/domain";
import { syncExpenseItemForWishlistItem } from "@/lib/expense-items";
import { prisma } from "@/lib/prisma";
import type { PartWishlistItem } from "@mototwin/types";
import { isVehicleInCurrentContext } from "../../../_shared/vehicle-context";
import { toCurrentUserContextErrorResponse } from "../../../_shared/current-user-context";

type WishlistSkuRow = Parameters<typeof buildWishlistItemSkuInfo>[0];

type RouteContext = {
  params: Promise<{
    id: string;
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

const createWishlistSchema = z
  .object({
    skuId: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((v) => {
        if (v == null) {
          return null;
        }
        const t = String(v).trim();
        return t.length > 0 ? t : null;
      }),
    title: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((v) => (v == null ? "" : String(v).trim())),
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
  })
  .superRefine((data, ctx) => {
    if (!data.skuId && !data.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Название обязательно",
        path: ["title"],
      });
    }
  });

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

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;

    const allowed = await isVehicleInCurrentContext(vehicleId);
    if (!allowed) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }

    const rows = await prisma.partWishlistItem.findMany({
      where: { vehicleId },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        node: { select: { id: true, name: true } },
        sku: { select: wishlistSkuSelect },
      },
    });

    const items = rows.map((r) => toWire(r));

    return NextResponse.json({ items });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch wishlist:", error);
    return NextResponse.json({ error: "Не удалось загрузить список покупок." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;
    const json = await request.json();
    const data = createWishlistSchema.parse(json);

    const allowed = await isVehicleInCurrentContext(vehicleId);
    if (!allowed) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }

    let skuRow: {
      id: string;
      canonicalName: string;
      primaryNodeId: string | null;
      priceAmount: WishlistSkuRow["priceAmount"];
      currency: string | null;
    } | null = null;

    if (data.skuId) {
      const found = await prisma.partSku.findFirst({
        where: { id: data.skuId, isActive: true },
        select: {
          id: true,
          canonicalName: true,
          primaryNodeId: true,
          priceAmount: true,
          currency: true,
        },
      });
      if (!found) {
        return NextResponse.json(
          { error: "Позиция каталога не найдена или неактивна." },
          { status: 404 }
        );
      }
      skuRow = found;
    }

    const draft = applySkuDefaultsToWishlistDraft(
      {
        titleTrimmed: data.title,
        nodeId: data.nodeId ?? null,
        costAmount: data.costAmount,
        currency: data.currency,
      },
      skuRow
        ? {
            canonicalName: skuRow.canonicalName,
            primaryNodeId: skuRow.primaryNodeId,
            priceAmount: skuRow.priceAmount == null ? null : Number(skuRow.priceAmount),
            currency: skuRow.currency,
          }
        : null
    );

    const nodeId = draft.nodeId;
    if (!nodeId) {
      return NextResponse.json({ error: "Выберите узел мотоцикла" }, { status: 400 });
    }
    const leafError = await resolveLeafNodeIdOrError(nodeId);
    if (leafError) {
      return leafError;
    }

    const { costAmount, currency } = normalizePartWishlistCostMutationArgs(
      draft.costAmount === undefined ? null : draft.costAmount,
      draft.currency === undefined ? null : draft.currency
    );

    const quantity = data.quantity ?? 1;

    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.partWishlistItem.create({
        data: {
          vehicleId,
          skuId: data.skuId,
          title: draft.title,
          quantity,
          status: data.status ?? PartWishlistItemStatus.NEEDED,
          comment: data.comment?.trim() ? data.comment.trim() : null,
          nodeId,
          costAmount,
          currency,
        },
        include: {
          node: { select: { id: true, name: true } },
          sku: { select: wishlistSkuSelect },
        },
      });
      await syncExpenseItemForWishlistItem(tx, item);
      return item;
    });

    return NextResponse.json({ item: toWire(created) });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
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
