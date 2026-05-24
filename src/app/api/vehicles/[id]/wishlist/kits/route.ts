import { NextRequest, NextResponse } from "next/server";
import { PartWishlistItemSource, PartWishlistItemStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  buildUserServiceEventTemplateTitle,
  buildWishlistItemSkuInfo,
  expandServiceKitToWishlistDrafts,
  isUserServiceKitCode,
  normalizeWishlistTitle,
  normalizePartWishlistCostMutationArgs,
  stripAddServiceEventFormValuesForUserTemplate,
  wishlistRowsToAdvancedFormForTemplate,
} from "@mototwin/domain";
import type { PartWishlistItem } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { resolveServiceKitDefinitionForVehicle } from "@/lib/resolve-service-kit-definition";
import {
  buildRecommendationsForNodeWithCommunity,
  narrowVehicleFitmentContext,
} from "@/lib/build-recommendations-for-node-with-community";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "../../../../_shared/current-user-context";
import { getVehicleInCurrentContext, isVehicleInCurrentContext } from "../../../../_shared/vehicle-context";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedText, strictObject, parseSearchParamText } from "@/lib/http/input-validation";

type WishlistSkuRow = Parameters<typeof buildWishlistItemSkuInfo>[0];
type RouteContext = {
  params: Promise<{ id: string }>;
};

// MT-SEC-068 + MT-SEC-070: strict schema with capped strings.
const addKitSchema = strictObject({
  kitCode: boundedText({ min: 1, max: 100 }),
  contextNodeId: z.union([z.string().max(64), z.null(), z.undefined()]).optional(),
});

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

function buildNoItemsAddedReason(
  skippedItems: Array<{ reason: string; message: string }>
): string {
  if (skippedItems.length === 0) {
    return "Нет доступных позиций для добавления.";
  }

  const duplicateCount = skippedItems.filter(
    (item) => item.reason === "DUPLICATE_ACTIVE_ITEM"
  ).length;
  const missingNodeCount = skippedItems.filter(
    (item) => item.reason === "MISSING_NODE"
  ).length;
  const nonLeafCount = skippedItems.filter(
    (item) => item.reason === "NON_LEAF_NODE"
  ).length;
  const noMatchedSkuCount = skippedItems.filter(
    (item) => item.reason === "NO_MATCHED_SKU"
  ).length;

  const reasons: string[] = [];
  if (duplicateCount > 0) {
    reasons.push(`уже есть в активном списке: ${duplicateCount}`);
  }
  if (missingNodeCount > 0) {
    reasons.push(`узел не найден: ${missingNodeCount}`);
  }
  if (nonLeafCount > 0) {
    reasons.push(`узел не конечный (не leaf): ${nonLeafCount}`);
  }
  if (noMatchedSkuCount > 0) {
    reasons.push(`не найден подходящий SKU: ${noMatchedSkuCount}`);
  }

  if (reasons.length > 0) {
    return `Причины: ${reasons.join("; ")}.`;
  }

  const firstMessage = skippedItems[0]?.message?.trim();
  return firstMessage || "Нет доступных позиций для добавления.";
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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 4 * 1024 });
    const body = addKitSchema.parse(raw);
    const contextNodeId = body.contextNodeId ? String(body.contextNodeId).trim() : null;

    const vehicle = await getVehicleInCurrentContext(vehicleId, {
      id: true,
      motorcycleBrandId: true,
      motorcycleModelFamilyId: true,
      motorcycleVariantId: true,
      motorcycleGenerationId: true,
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

    const vctx = narrowVehicleFitmentContext(vehicle);
    if (!vctx) {
      return NextResponse.json(
        { error: "У мотоцикла не задана модель — добавление комплекта недоступно." },
        { status: 400 }
      );
    }

    const kitOrErr = await resolveServiceKitDefinitionForVehicle({
      prisma,
      kitCode: body.kitCode,
      contextNodeCode,
      vehicle: vctx,
    });
    if (kitOrErr instanceof NextResponse) {
      return kitOrErr;
    }
    const kit = kitOrErr;

    let userIdForTemplate: string | null = null;
    try {
      userIdForTemplate = (await getCurrentUserContext()).userId;
    } catch {
      userIdForTemplate = null;
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
      select: { id: true, code: true, serviceGroup: true },
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

    const recommendationsByNodeCode = new Map<
      string,
      Awaited<ReturnType<typeof buildRecommendationsForNodeWithCommunity>>
    >();
    for (const node of rawNodes) {
      const nodeId = nodeIdByCode.get(node.code);
      if (!nodeId) {
        continue;
      }
      recommendationsByNodeCode.set(
        node.code,
        await buildRecommendationsForNodeWithCommunity(prisma, vctx, nodeId, {
          code: node.code,
          serviceGroup: node.serviceGroup,
        })
      );
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
      if (userIdForTemplate && list.length > 0) {
        const rowsSnapshot = list.map((r) => ({
          nodeId: r.nodeId!,
          skuId: r.skuId,
          displaySku: r.sku?.partNumbers?.[0]?.number?.trim() ?? "",
          partName: r.title,
          quantity: r.quantity,
        }));
        const formSnap = wishlistRowsToAdvancedFormForTemplate({
          rows: rowsSnapshot,
          source: {
            kitTitle: kit.title,
            kitCode: kit.code,
            builtIn: !isUserServiceKitCode(kit.code),
          },
        });
        const stripped = stripAddServiceEventFormValuesForUserTemplate(formSnap);
        const title = buildUserServiceEventTemplateTitle(
          stripped.title.trim() || kit.title,
          "ADVANCED"
        );
        const formJson = JSON.parse(JSON.stringify(stripped)) as Prisma.InputJsonValue;
        try {
          await tx.userServiceEventFormTemplate.create({
            data: {
              userId: userIdForTemplate,
              title,
              mode: "ADVANCED",
              formJson,
              includeInPartPicker: false,
            },
          });
        } catch (tplErr) {
          if (
            tplErr instanceof Error &&
            tplErr.message.includes("Unknown argument") &&
            tplErr.message.includes("includeInPartPicker")
          ) {
            await tx.userServiceEventFormTemplate.create({
              data: {
                userId: userIdForTemplate,
                title,
                mode: "ADVANCED",
                formJson,
              },
            });
          } else {
            throw tplErr;
          }
        }
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
      const detailedReason = buildNoItemsAddedReason(result.skippedItems);
      return NextResponse.json(
        { error: `Не удалось добавить позиции комплекта. ${detailedReason}`, result },
        { status: 400 }
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
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
    // MT-SEC-071: validate nodeId length before propagating to downstream call.
    const nodeId = parseSearchParamText(searchParams.get("nodeId"), { max: 64 });
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
