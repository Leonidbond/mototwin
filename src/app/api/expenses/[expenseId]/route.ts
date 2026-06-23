import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildExpenseAnalyticsFromItems, expenseCategoryRequiresNode, getDefaultExpenseInstallStatusForCategory } from "@mototwin/domain";
import { EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseItem } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { toCurrentUserContextErrorResponse } from "../../_shared/current-user-context";
import { getVehicleInCurrentContext } from "../../_shared/vehicle-context";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedInt, boundedNumber, boundedText, boundedTextOptional, strictObject } from "@/lib/http/input-validation";

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

type ExpenseModel = {
  findUnique(args: unknown): Promise<ExpenseRow | null>;
  findMany(args: unknown): Promise<ExpenseRow[]>;
  update(args: unknown): Promise<ExpenseRow>;
  delete(args: unknown): Promise<ExpenseRow>;
};

const expenseModel = () => (prisma as unknown as { expenseItem: ExpenseModel }).expenseItem;

// MT-SEC-068 + MT-SEC-070: mirror the create schema with bounded text/numerics.
const patchExpenseSchema = strictObject({
  nodeId: boundedTextOptional({ max: 64 }),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  installStatus: z.enum(["BOUGHT_NOT_INSTALLED", "INSTALLED", "NOT_APPLICABLE"]).optional(),
  purchaseStatus: z.enum(["PLANNED", "PURCHASED"]).optional(),
  installationStatus: z.enum(["NOT_INSTALLED", "INSTALLED"]).optional(),
  expenseDate: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value))).optional(),
  title: boundedText({ min: 1, max: 300 }).optional(),
  amount: boundedNumber({ min: 0, max: 1_000_000_000 }).refine((v) => v > 0).optional(),
  currency: boundedText({ min: 1, max: 12 }).optional(),
  quantity: boundedInt({ min: 1, max: 10_000 }).optional(),
  comment: boundedTextOptional({ max: 2_000 }),
  partSku: boundedTextOptional({ max: 200 }),
  partName: boundedTextOptional({ max: 300 }),
  vendor: boundedTextOptional({ max: 200 }),
  purchasedAt: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value))).nullable().optional(),
  installedAt: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value))).nullable().optional(),
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

async function assertExpenseInCurrentContext(expenseId: string): Promise<ExpenseRow | NextResponse> {
  const expense = await expenseModel().findUnique({
    where: { id: expenseId },
    include: { node: { select: { id: true, name: true } } },
  });
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  const vehicle = await getVehicleInCurrentContext(expense.vehicleId, { id: true });
  if (!vehicle) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  return expense;
}

async function loadVehicleExpenses(vehicleId: string): Promise<ExpenseItem[]> {
  const rows = await expenseModel().findMany({
    where: { vehicleId },
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    include: { node: { select: { id: true, name: true } } },
  });
  return rows.map(toWire);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { expenseId } = await context.params;
    const existing = await assertExpenseInCurrentContext(expenseId);
    if (existing instanceof NextResponse) {
      return existing;
    }

    const raw = await parseJsonBody<unknown>(request, { maxBytes: 32 * 1024 });
    const data = patchExpenseSchema.parse(raw);
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    if (data.nodeId && expenseCategoryRequiresNode(data.category ?? existing.category)) {
      const node = await prisma.node.findUnique({ where: { id: data.nodeId }, select: { id: true } });
      if (!node) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }
    }

    const effectiveCategory = data.category ?? existing.category;
    const effectiveInstallStatus = data.installStatus ?? existing.installStatus;
    const resolved = expenseCategoryRequiresNode(effectiveCategory)
      ? {
          nodeId: data.nodeId === undefined ? undefined : data.nodeId || null,
          installStatus: effectiveInstallStatus,
        }
      : {
          nodeId: null as string | null,
          installStatus: getDefaultExpenseInstallStatusForCategory(effectiveCategory),
        };

    const updated = await expenseModel().update({
      where: { id: expenseId },
      data: {
        ...data,
        category: data.category,
        installStatus: resolved.installStatus,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
        currency: data.currency ? data.currency.toUpperCase() : undefined,
        nodeId:
          resolved.nodeId === undefined
            ? expenseCategoryRequiresNode(effectiveCategory)
              ? undefined
              : null
            : resolved.nodeId,
        comment: data.comment === undefined ? undefined : data.comment?.trim() || null,
        partSku: data.partSku === undefined ? undefined : data.partSku?.trim() || null,
        partName: data.partName === undefined ? undefined : data.partName?.trim() || null,
        vendor: data.vendor === undefined ? undefined : data.vendor?.trim() || null,
        purchasedAt: data.purchasedAt === undefined ? undefined : data.purchasedAt ? new Date(data.purchasedAt) : null,
        installedAt: data.installedAt === undefined ? undefined : data.installedAt ? new Date(data.installedAt) : null,
      },
      include: { node: { select: { id: true, name: true } } },
    });

    const expenses = await loadVehicleExpenses(updated.vehicleId);
    const analytics = buildExpenseAnalyticsFromItems(expenses, new Date(updated.expenseDate).getFullYear());
    return NextResponse.json({ expense: toWire(updated), analytics });
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
    console.error("Failed to update expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { expenseId } = await context.params;
    const existing = await assertExpenseInCurrentContext(expenseId);
    if (existing instanceof NextResponse) {
      return existing;
    }

    await expenseModel().delete({ where: { id: expenseId } });
    return NextResponse.json({ deleted: true as const, expenseId });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to delete expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
