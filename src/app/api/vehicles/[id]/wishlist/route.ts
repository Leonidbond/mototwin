import { NextRequest, NextResponse } from "next/server";
import { PartWishlistItemSource, PartWishlistItemStatus } from "@prisma/client";
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
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import {
  boundedInt,
  boundedNumber,
  boundedTextOptional,
  strictObject,
} from "@/lib/http/input-validation";

type WishlistSkuRow = Parameters<typeof buildWishlistItemSkuInfo>[0];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const statusEnum = z.enum(["NEEDED", "ORDERED", "BOUGHT", "INSTALLED", "REJECTED"]);

const wishlistSkuSelect = {
  id: true,
  partMasterId: true,
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

// MT-SEC-068 + MT-SEC-070: strict + bound all user-controlled text/numeric fields.
const createWishlistSchema = strictObject({
  skuId: z
    .union([z.string().max(64), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null) {
        return null;
      }
      const t = String(v).trim();
      return t.length > 0 ? t : null;
    }),
  title: z
    .union([z.string().max(300), z.null(), z.undefined()])
    .transform((v) => (v == null ? "" : String(v).trim())),
  quantity: boundedInt({ min: 1, max: 10_000 }).optional(),
  nodeId: z
    .union([z.string().max(64), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null) {
        return null;
      }
      const t = String(v).trim();
      return t.length > 0 ? t : null;
    }),
  comment: boundedTextOptional({ max: 2_000 }),
  status: statusEnum.optional(),
  costAmount: z.union([boundedNumber({ min: 0, max: 1_000_000_000 }), z.null()]).optional(),
  currency: z.union([z.string().trim().max(12), z.null()]).optional(),
  source: z.enum(["RECOMMENDATION", "USER_ADDED"]).optional(),
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
  source: PartWishlistItemSource;
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
    source: row.source,
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
    const json = await parseJsonBody<unknown>(request, { maxBytes: 8 * 1024 });
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
          source: data.source ?? PartWishlistItemSource.RECOMMENDATION,
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
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
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
