import { NextRequest, NextResponse } from "next/server";
import { PartWishlistItemStatus } from "@prisma/client";
import { z } from "zod";
import type { ExpenseItem } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { toCurrentUserContextErrorResponse } from "../../../_shared/current-user-context";
import { getVehicleInCurrentContext } from "../../../_shared/vehicle-context";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ExpenseRow = Omit<
  ExpenseItem,
  "amount" | "expenseDate" | "purchasedAt" | "installedAt" | "createdAt" | "updatedAt"
> & {
  amount: { toString(): string } | number;
  expenseDate: Date;
  purchasedAt: Date | null;
  installedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const createExpenseSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().trim().min(1).max(12),
  purchasedAt: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value))).nullable().optional(),
  vendor: z.string().trim().nullable().optional(),
  comment: z.string().trim().nullable().optional(),
});

function toWire(row: ExpenseRow): ExpenseItem {
  return {
    ...row,
    amount: Number(row.amount),
    expenseDate: row.expenseDate.toISOString(),
    purchasedAt: row.purchasedAt?.toISOString() ?? null,
    installedAt: row.installedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const data = createExpenseSchema.parse(await request.json());

    const item = await prisma.partWishlistItem.findUnique({
      where: { id },
      include: { node: { select: { id: true, name: true } } },
    });
    if (!item) {
      return NextResponse.json({ error: "Shopping list item not found" }, { status: 404 });
    }

    const vehicle = await getVehicleInCurrentContext(item.vehicleId, { id: true });
    if (!vehicle) {
      return NextResponse.json({ error: "Shopping list item not found" }, { status: 404 });
    }

    const purchasedAt = data.purchasedAt ? new Date(data.purchasedAt) : new Date();
    const expense = await prisma.$transaction(async (tx) => {
      const existing = await tx.expenseItem.findFirst({
        where: {
          shoppingListItemId: item.id,
          serviceEventId: null,
        },
      });

      const expenseData = {
        vehicleId: item.vehicleId,
        nodeId: item.nodeId,
        shoppingListItemId: item.id,
        category: "PART" as const,
        installStatus: "BOUGHT_NOT_INSTALLED" as const,
        purchaseStatus: "PURCHASED" as const,
        installationStatus: "NOT_INSTALLED" as const,
        expenseDate: purchasedAt,
        title: item.title.trim(),
        amount: data.amount,
        currency: data.currency.trim().toUpperCase(),
        quantity: item.quantity,
        comment: data.comment?.trim() || item.comment?.trim() || null,
        vendor: data.vendor?.trim() || null,
        purchasedAt,
        installedAt: null,
      };

      const saved = existing
        ? await tx.expenseItem.update({
            where: { id: existing.id },
            data: expenseData,
            include: { node: { select: { id: true, name: true } } },
          })
        : await tx.expenseItem.create({
            data: expenseData,
            include: { node: { select: { id: true, name: true } } },
          });

      await tx.partWishlistItem.update({
        where: { id: item.id },
        data: {
          status: PartWishlistItemStatus.BOUGHT,
          costAmount: data.amount,
          currency: data.currency.trim().toUpperCase(),
        },
      });

      return saved;
    });

    return NextResponse.json({ expense: toWire(expense as ExpenseRow) }, { status: 201 });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("Failed to create shopping-list expense:", error);
    return NextResponse.json({ error: "Failed to create shopping-list expense" }, { status: 500 });
  }
}
