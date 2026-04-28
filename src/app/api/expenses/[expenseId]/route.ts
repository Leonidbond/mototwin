import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildExpenseAnalyticsFromItems } from "@mototwin/domain";
import type { ExpenseItem } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { toCurrentUserContextErrorResponse } from "../../_shared/current-user-context";
import { getVehicleInCurrentContext } from "../../_shared/vehicle-context";

type RouteContext = {
  params: Promise<{ expenseId: string }>;
};

type ExpenseRow = Omit<ExpenseItem, "expenseDate" | "createdAt" | "updatedAt"> & {
  expenseDate: Date;
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

const patchExpenseSchema = z
  .object({
    nodeId: z.string().trim().nullable().optional(),
    category: z.enum(["SERVICE", "PARTS", "REPAIR", "DIAGNOSTICS", "LABOR", "OTHER_TECHNICAL"]).optional(),
    installStatus: z.enum(["BOUGHT_NOT_INSTALLED", "INSTALLED", "NOT_APPLICABLE"]).optional(),
    expenseDate: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value))).optional(),
    title: z.string().trim().min(1).max(300).optional(),
    amount: z.number().positive().optional(),
    currency: z.string().trim().min(1).max(12).optional(),
    quantity: z.number().int().min(1).optional(),
    comment: z.string().trim().nullable().optional(),
    partSku: z.string().trim().nullable().optional(),
    partName: z.string().trim().nullable().optional(),
  })
  .strict();

function toWire(row: ExpenseRow): ExpenseItem {
  return {
    ...row,
    expenseDate: row.expenseDate.toISOString(),
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

    const data = patchExpenseSchema.parse(await request.json());
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    if (data.nodeId) {
      const node = await prisma.node.findUnique({ where: { id: data.nodeId }, select: { id: true } });
      if (!node) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }
    }

    const updated = await expenseModel().update({
      where: { id: expenseId },
      data: {
        ...data,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
        currency: data.currency ? data.currency.toUpperCase() : undefined,
        nodeId: data.nodeId === undefined ? undefined : data.nodeId || null,
        comment: data.comment === undefined ? undefined : data.comment?.trim() || null,
        partSku: data.partSku === undefined ? undefined : data.partSku?.trim() || null,
        partName: data.partName === undefined ? undefined : data.partName?.trim() || null,
      },
      include: { node: { select: { id: true, name: true } } },
    });

    const expenses = await loadVehicleExpenses(updated.vehicleId);
    const analytics = buildExpenseAnalyticsFromItems(expenses, new Date(updated.expenseDate).getFullYear());
    return NextResponse.json({ expense: toWire(updated), analytics });
  } catch (error) {
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
