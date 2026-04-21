import { NextRequest, NextResponse } from "next/server";
import { PartWishlistItemStatus } from "@prisma/client";
import { z } from "zod";
import {
  buildPartRecommendationViewModel,
  buildPartSkuViewModel,
  buildWishlistItemSkuInfo,
  expandServiceKitToWishlistDrafts,
  getServiceKitsForNode,
  normalizeWishlistTitle,
  normalizePartWishlistCostMutationArgs,
  sortPartRecommendations,
} from "@mototwin/domain";
import type { PartWishlistItem } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { getVehicleInCurrentContext, isVehicleInCurrentContext } from "../../../../_shared/vehicle-context";
import { toCurrentUserContextErrorResponse } from "../../../../_shared/current-user-context";

type WishlistSkuRow = Parameters<typeof buildWishlistItemSkuInfo>[0];
type RouteContext = {
  params: Promise<{ id: string }>;
};

const addKitSchema = z.object({
  kitCode: z.string().trim().min(1, "kitCode обязателен"),
  contextNodeId: z.union([z.string(), z.null(), z.undefined()]).optional(),
});

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

async function buildRecommendationsForNode(
  vehicle: { modelId: string; modelVariantId: string | null; modelVariant: { year: number } | null },
  nodeId: string
) {
  const rows = await prisma.partSku.findMany({
    where: {
      isActive: true,
      OR: [{ primaryNodeId: nodeId }, { nodeLinks: { some: { nodeId } } }],
    },
    include: {
      primaryNode: { select: { id: true, code: true, name: true } },
      partNumbers: { orderBy: { createdAt: "asc" } },
      nodeLinks: {
        include: { node: { select: { id: true, code: true, name: true } } },
        where: { nodeId },
        orderBy: { confidence: "desc" },
      },
      fitments: { orderBy: { confidence: "desc" } },
      offers: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    take: 60,
  });

  return sortPartRecommendations(
    rows.map((row) => {
      const sku = buildPartSkuViewModel(row);
      const relation = row.nodeLinks[0];
      const relationType =
        relation?.relationType?.trim() ||
        (row.primaryNodeId === nodeId ? "PRIMARY" : "ALTERNATIVE");
      const relationConfidence = relation?.confidence ?? 60;
      const hasExactFit = row.fitments.some(
        (fitment) =>
          fitment.modelVariantId &&
          vehicle.modelVariantId &&
          fitment.modelVariantId === vehicle.modelVariantId
      );
      const hasModelFit = row.fitments.some((fitment) => {
        if (!fitment.modelId || fitment.modelId !== vehicle.modelId) {
          return false;
        }
        const vehicleYear = vehicle.modelVariant?.year ?? null;
        if (!vehicleYear) {
          return true;
        }
        const yearFrom = fitment.yearFrom ?? Number.MIN_SAFE_INTEGER;
        const yearTo = fitment.yearTo ?? Number.MAX_SAFE_INTEGER;
        return vehicleYear >= yearFrom && vehicleYear <= yearTo;
      });
      const hasGenericFitment = row.fitments.some(
        (fitment) => (fitment.fitmentType || "").toUpperCase() === "GENERIC_NODE"
      );
      const matchingFitment =
        row.fitments.find(
          (fitment) =>
            fitment.modelVariantId &&
            vehicle.modelVariantId &&
            fitment.modelVariantId === vehicle.modelVariantId
        ) ??
        row.fitments.find((fitment) => fitment.modelId && fitment.modelId === vehicle.modelId) ??
        row.fitments.find((fitment) => (fitment.fitmentType || "").toUpperCase() === "GENERIC_NODE") ??
        row.fitments[0] ??
        null;
      const fitmentConfidence = row.fitments[0]?.confidence ?? 0;
      const confidence = Math.max(relationConfidence, fitmentConfidence);

      return buildPartRecommendationViewModel({
        sku,
        nodeId,
        relationType,
        confidence,
        hasExactFit,
        hasModelFit,
        hasGenericFitment,
        fitmentNote: matchingFitment?.note ?? null,
      });
    })
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;
    const body = addKitSchema.parse(await request.json());
    const contextNodeId = body.contextNodeId ? String(body.contextNodeId).trim() : null;

    const vehicle = await getVehicleInCurrentContext(vehicleId, {
      id: true,
      modelId: true,
      modelVariantId: true,
      modelVariant: { select: { year: true } },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }

    let contextNodeCode: string | null = null;
    if (contextNodeId) {
      const node = await prisma.node.findUnique({
        where: { id: contextNodeId },
        select: { id: true, code: true },
      });
      if (!node) {
        return NextResponse.json({ error: "Контекстный узел не найден." }, { status: 404 });
      }
      contextNodeCode = node.code;
    }

    const kit = getServiceKitsForNode(contextNodeCode).find((k) => k.code === body.kitCode);
    if (!kit) {
      return NextResponse.json({ error: "Комплект обслуживания не найден." }, { status: 404 });
    }

    const activeRows = await prisma.partWishlistItem.findMany({
      where: {
        vehicleId,
        status: { in: [PartWishlistItemStatus.NEEDED, PartWishlistItemStatus.ORDERED, PartWishlistItemStatus.BOUGHT] },
      },
      select: {
        nodeId: true,
        skuId: true,
        title: true,
      },
    });

    const codes = [...new Set(kit.items.map((item) => item.nodeCode))];
    const rawNodes = await prisma.node.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });

    const nodeIdByCode = new Map<string, string>();
    const nodeIssueByCode = new Map<string, "MISSING_NODE" | "NON_LEAF_NODE">();
    const foundNodeCodeSet = new Set(rawNodes.map((node) => node.code));
    for (const code of codes) {
      if (!foundNodeCodeSet.has(code)) {
        nodeIssueByCode.set(code, "MISSING_NODE");
      }
    }
    for (const node of rawNodes) {
      const childrenCount = await prisma.node.count({ where: { parentId: node.id } });
      if (childrenCount === 0) {
        nodeIdByCode.set(node.code, node.id);
      } else {
        nodeIssueByCode.set(node.code, "NON_LEAF_NODE");
      }
    }

    const recommendationsByNodeCode = new Map<string, Awaited<ReturnType<typeof buildRecommendationsForNode>>>();
    for (const [code, nodeId] of nodeIdByCode) {
      recommendationsByNodeCode.set(code, await buildRecommendationsForNode(vehicle, nodeId));
    }

    const expanded = expandServiceKitToWishlistDrafts({
      kit,
      nodeIdByCode,
      nodeIssueByCode,
      recommendationsByNodeCode,
      existingActiveItems: activeRows,
    });

    const txResult = await prisma.$transaction(async (tx) => {
      const txSkips = [...expanded.skipped];
      const list = [];
      const txActiveRows = await tx.partWishlistItem.findMany({
        where: {
          vehicleId,
          status: {
            in: [PartWishlistItemStatus.NEEDED, PartWishlistItemStatus.ORDERED, PartWishlistItemStatus.BOUGHT],
          },
        },
        select: { nodeId: true, skuId: true, title: true },
      });
      const existingSkuKeys = new Set(
        txActiveRows
          .filter((item) => item.nodeId && item.skuId)
          .map((item) => `${item.nodeId}|${item.skuId}`)
      );
      const existingManualKeys = new Set(
        txActiveRows
          .filter((item) => item.nodeId && !item.skuId)
          .map((item) => `${item.nodeId}|${normalizeWishlistTitle(item.title)}`)
      );
      for (const draft of expanded.drafts) {
        if (draft.skuId) {
          const key = `${draft.nodeId}|${draft.skuId}`;
          if (existingSkuKeys.has(key)) {
            txSkips.push({
              itemKey: draft.itemKey,
              title: draft.title,
              reason: "DUPLICATE_ACTIVE_ITEM",
              message: "Похожая активная позиция с этим SKU уже есть в списке.",
            });
            continue;
          }
          existingSkuKeys.add(key);
        } else {
          const key = `${draft.nodeId}|${normalizeWishlistTitle(draft.title)}`;
          if (existingManualKeys.has(key)) {
            txSkips.push({
              itemKey: draft.itemKey,
              title: draft.title,
              reason: "DUPLICATE_ACTIVE_ITEM",
              message: "Похожая активная позиция уже есть в списке.",
            });
            continue;
          }
          existingManualKeys.add(key);
        }
        const normalizedCost = normalizePartWishlistCostMutationArgs(draft.costAmount, draft.currency);
        const created = await tx.partWishlistItem.create({
          data: {
            vehicleId,
            skuId: draft.skuId,
            title: draft.title,
            quantity: draft.quantity,
            nodeId: draft.nodeId,
            status: PartWishlistItemStatus.NEEDED,
            comment: draft.comment,
            costAmount: normalizedCost.costAmount,
            currency: normalizedCost.currency,
          },
          include: {
            node: { select: { id: true, name: true } },
            sku: { select: wishlistSkuSelect },
          },
        });
        list.push(created);
      }
      return { createdRows: list, txSkips };
    });

    const warnings = [...expanded.warnings];
    const result = {
      kitCode: kit.code,
      createdItems: txResult.createdRows.map((row) => toWire(row)),
      skippedItems: txResult.txSkips,
      warnings,
    };

    if (result.createdItems.length === 0) {
      return NextResponse.json(
        { error: "Не удалось добавить позиции комплекта.", result },
        { status: 400 }
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join("; ") || "Некорректный запрос" },
        { status: 400 }
      );
    }
    console.error("Failed to add service kit to wishlist:", error);
    return NextResponse.json(
      { error: "Не удалось добавить комплект обслуживания в список покупок." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;
    const allowed = await isVehicleInCurrentContext(vehicleId);
    if (!allowed) {
      return NextResponse.json({ error: "Мотоцикл не найден." }, { status: 404 });
    }
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId")?.trim();
    const query = new URLSearchParams();
    query.set("vehicleId", vehicleId);
    if (nodeId) {
      query.set("nodeId", nodeId);
    }
    const kits = await fetch(
      `${new URL(request.url).origin}/api/parts/service-kits?${query.toString()}`,
      { method: "GET" }
    );
    const body = await kits.json();
    return NextResponse.json(body, { status: kits.status });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to load service kits for wishlist:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить комплекты обслуживания." },
      { status: 500 }
    );
  }
}
