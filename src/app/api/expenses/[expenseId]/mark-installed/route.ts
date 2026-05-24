import { NextRequest, NextResponse } from "next/server";
import { PartWishlistItemStatus } from "@prisma/client";
import { z } from "zod";
import type { ExpenseItem } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { toCurrentUserContextErrorResponse } from "../../../_shared/current-user-context";
import { getVehicleInCurrentContext } from "../../../_shared/vehicle-context";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedInt, boundedTextOptional, strictObject } from "@/lib/http/input-validation";

type RouteContext = {
  params: Promise<{ expenseId: string }>;
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

// MT-SEC-068 + MT-SEC-070: strict + bounded fields.
const markInstalledSchema = strictObject({
  installedAt: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value))),
  serviceEventId: boundedTextOptional({ max: 64 }),
  odometer: boundedInt({ min: 0, max: 10_000_000 }).nullable().optional(),
  engineHours: boundedInt({ min: 0, max: 1_000_000 }).nullable().optional(),
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { expenseId } = await context.params;
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 4 * 1024 });
    const data = markInstalledSchema.parse(raw);

    const existing = await prisma.expenseItem.findUnique({
      where: { id: expenseId },
      include: { node: { select: { id: true, name: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const vehicle = await getVehicleInCurrentContext(existing.vehicleId, { id: true });
    if (!vehicle) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (data.serviceEventId) {
      const serviceEvent = await prisma.serviceEvent.findFirst({
        where: {
          id: data.serviceEventId,
          vehicleId: existing.vehicleId,
          eventKind: "SERVICE",
        },
        select: { id: true },
      });
      if (!serviceEvent) {
        return NextResponse.json({ error: "Service event not found" }, { status: 404 });
      }
    }

    const installedAt = new Date(data.installedAt);
    const updated = await prisma.$transaction(async (tx) => {
      const expense = await tx.expenseItem.update({
        where: { id: existing.id },
        data: {
          serviceEventId: data.serviceEventId || existing.serviceEventId,
          installStatus: "INSTALLED",
          purchaseStatus: "PURCHASED",
          installationStatus: "INSTALLED",
          installedAt,
          odometer: data.odometer ?? null,
          engineHours: data.engineHours ?? null,
        },
        include: { node: { select: { id: true, name: true } } },
      });

      if (existing.shoppingListItemId) {
        await tx.partWishlistItem.updateMany({
          where: { id: existing.shoppingListItemId, vehicleId: existing.vehicleId },
          data: { status: PartWishlistItemStatus.INSTALLED },
        });
      }

      return expense;
    });

    return NextResponse.json({ expense: toWire(updated as ExpenseRow) });
  } catch (error) {
    if (error instanceof BodyParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
    }
    console.error("Failed to mark expense installed:", error);
    return NextResponse.json({ error: "Failed to mark expense installed" }, { status: 500 });
  }
}
