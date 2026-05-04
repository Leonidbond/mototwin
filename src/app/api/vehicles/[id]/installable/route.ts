import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { buildWishlistItemSkuInfo } from "@mototwin/domain";
import type {
  InstallableForServiceEventEntry,
  InstallableForServiceEventResponse,
  PartWishlistItemStatus,
} from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { getVehicleInCurrentContext } from "../../../_shared/vehicle-context";
import { toCurrentUserContextErrorResponse } from "../../../_shared/current-user-context";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Single source for the «Готово к установке» picker:
 * unions active wishlist (NEEDED/ORDERED/BOUGHT) and uninstalled standalone
 * `ExpenseItem` rows; pairs (`expense.shoppingListItemId == wishlist.id`)
 * are merged into one `wishlist+expense` entry.
 */

const WISHLIST_RANK: Record<PartWishlistItemStatus, number> = {
  BOUGHT: 0,
  ORDERED: 1,
  NEEDED: 2,
  INSTALLED: 9,
};

const wishlistInclude = {
  node: { select: { id: true, name: true } },
  sku: {
    select: {
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
    },
  },
} as const;

function isoOrNull(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function decimalToNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: vehicleId } = await context.params;
    const nodeIdParam = request.nextUrl.searchParams.get("nodeId")?.trim() || null;

    const vehicle = await getVehicleInCurrentContext(vehicleId, { id: true });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const wishlistWhere: Prisma.PartWishlistItemWhereInput = {
      vehicleId,
      status: { in: ["NEEDED", "ORDERED", "BOUGHT"] },
      ...(nodeIdParam ? { nodeId: nodeIdParam } : {}),
    };
    const expenseWhere: Prisma.ExpenseItemWhereInput = {
      vehicleId,
      purchaseStatus: "PURCHASED",
      installationStatus: "NOT_INSTALLED",
      serviceEventId: null,
      ...(nodeIdParam ? { nodeId: nodeIdParam } : {}),
    };

    const [wishlistRows, expenseRows] = await Promise.all([
      prisma.partWishlistItem.findMany({
        where: wishlistWhere,
        orderBy: [{ updatedAt: "desc" }],
        include: wishlistInclude,
      }),
      prisma.expenseItem.findMany({
        where: expenseWhere,
        orderBy: [{ purchasedAt: "desc" }, { expenseDate: "desc" }, { createdAt: "desc" }],
        include: { node: { select: { id: true, name: true } } },
      }),
    ]);

    const expensesByShoppingListItemId = new Map<string, (typeof expenseRows)[number]>();
    const orphanExpenses: (typeof expenseRows)[number][] = [];
    for (const exp of expenseRows) {
      if (exp.shoppingListItemId) {
        if (!expensesByShoppingListItemId.has(exp.shoppingListItemId)) {
          expensesByShoppingListItemId.set(exp.shoppingListItemId, exp);
          continue;
        }
      }
      orphanExpenses.push(exp);
    }

    const entries: InstallableForServiceEventEntry[] = [];

    for (const wl of wishlistRows) {
      const linkedExpense = expensesByShoppingListItemId.get(wl.id) ?? null;
      const skuInfo = wl.sku ? buildWishlistItemSkuInfo(wl.sku) : null;
      const wlAmount = wl.costAmount == null ? null : Number(wl.costAmount);
      const expAmount = linkedExpense ? decimalToNumber(linkedExpense.amount) : null;
      const amount = expAmount ?? wlAmount;
      const currency = linkedExpense?.currency ?? wl.currency ?? null;
      const purchasedAt =
        linkedExpense?.purchasedAt?.toISOString() ??
        (wl.status === "BOUGHT" ? wl.updatedAt.toISOString() : null);
      const expenseDate = linkedExpense?.expenseDate?.toISOString() ?? null;
      const isPaid = amount != null && amount > 0 && Boolean(currency?.trim());
      const partName = linkedExpense?.partName?.trim() || skuInfo?.canonicalName?.trim() || wl.title.trim();
      const partSku = linkedExpense?.partSku?.trim() || skuInfo?.primaryPartNumber?.trim() || null;
      entries.push({
        key: `wl:${wl.id}`,
        source: linkedExpense ? "wishlist+expense" : "wishlist",
        wishlistItemId: wl.id,
        expenseItemId: linkedExpense?.id ?? null,
        title: wl.title,
        partName,
        partSku,
        nodeId: wl.nodeId ?? linkedExpense?.nodeId ?? null,
        nodeName: wl.node?.name ?? linkedExpense?.node?.name ?? null,
        vendor: linkedExpense?.vendor ?? null,
        quantity: wl.quantity,
        amount,
        currency,
        wishlistStatus: wl.status,
        isPaid,
        purchasedAt,
        expenseDate,
      });
      if (linkedExpense) {
        expensesByShoppingListItemId.delete(wl.id);
      }
    }

    for (const exp of expensesByShoppingListItemId.values()) {
      orphanExpenses.push(exp);
    }

    for (const exp of orphanExpenses) {
      const amount = decimalToNumber(exp.amount);
      const currency = exp.currency ?? null;
      const isPaid = amount != null && amount > 0 && Boolean(currency?.trim());
      entries.push({
        key: `exp:${exp.id}`,
        source: "expense",
        wishlistItemId: null,
        expenseItemId: exp.id,
        title: exp.title,
        partName: exp.partName?.trim() || null,
        partSku: exp.partSku?.trim() || null,
        nodeId: exp.nodeId ?? null,
        nodeName: exp.node?.name ?? null,
        vendor: exp.vendor ?? null,
        quantity: typeof exp.quantity === "number" ? exp.quantity : null,
        amount,
        currency,
        wishlistStatus: null,
        isPaid,
        purchasedAt: isoOrNull(exp.purchasedAt),
        expenseDate: isoOrNull(exp.expenseDate),
      });
    }

    entries.sort((a, b) => {
      const ra =
        a.source === "expense" || a.wishlistStatus == null
          ? WISHLIST_RANK.BOUGHT
          : WISHLIST_RANK[a.wishlistStatus];
      const rb =
        b.source === "expense" || b.wishlistStatus == null
          ? WISHLIST_RANK.BOUGHT
          : WISHLIST_RANK[b.wishlistStatus];
      if (ra !== rb) {
        return ra - rb;
      }
      const ta = a.purchasedAt ?? a.expenseDate ?? "";
      const tb = b.purchasedAt ?? b.expenseDate ?? "";
      if (ta !== tb) {
        return tb.localeCompare(ta);
      }
      return a.title.localeCompare(b.title);
    });

    const body: InstallableForServiceEventResponse = { items: entries };
    return NextResponse.json(body);
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) {
      return ctxErr;
    }
    console.error("Failed to fetch installable picker:", error);
    return NextResponse.json(
      { error: "Failed to fetch installable picker" },
      { status: 500 }
    );
  }
}
