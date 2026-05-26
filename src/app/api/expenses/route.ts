import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildExpenseAnalyticsFromItems, getCurrentExpenseYear } from "@mototwin/domain";
import type { ExpenseItem } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { expenseVehicleInclude, toExpenseItemVehicleSummary } from "@/lib/vehicle-wire";
import { getCurrentUserContext, toCurrentUserContextErrorResponse } from "../_shared/current-user-context";
import { getVehicleInCurrentContext } from "../_shared/vehicle-context";
import { BodyParseError, parseJsonBody } from "@/lib/http/parse-json-body";
import { boundedInt, boundedNumber, boundedText, boundedTextOptional, strictObject } from "@/lib/http/input-validation";
import { parseSearchParamInt, parseSearchParamText } from "@/lib/http/input-validation";

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
  findMany(args: unknown): Promise<ExpenseRow[]>;
  create(args: unknown): Promise<ExpenseRow>;
};

const expenseModel = () => (prisma as unknown as { expenseItem: ExpenseModel }).expenseItem;

const categorySchema = z.enum([
  "PART",
  "CONSUMABLE",
  "SERVICE_WORK",
  "REPAIR",
  "DIAGNOSTICS",
  "OTHER",
]);

const installStatusSchema = z.enum([
  "BOUGHT_NOT_INSTALLED",
  "INSTALLED",
  "NOT_APPLICABLE",
]);

const purchaseStatusSchema = z.enum(["PLANNED", "PURCHASED"]);
const installationStatusSchema = z.enum(["NOT_INSTALLED", "INSTALLED"]);

// MT-SEC-068 + MT-SEC-070: strictObject blocks mass-assignment; every free-text
// field is length-capped; numerics use sane upper bounds so a single user
// cannot poison the DB with absurd values.
const createExpenseSchema = strictObject({
  vehicleId: boundedText({ max: 64 }),
  nodeId: boundedTextOptional({ max: 64 }),
  category: categorySchema,
  installStatus: installStatusSchema,
  purchaseStatus: purchaseStatusSchema.optional(),
  installationStatus: installationStatusSchema.optional(),
  expenseDate: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value))),
  title: boundedText({ min: 1, max: 300 }),
  amount: boundedNumber({ min: 0, max: 1_000_000_000 }).refine((value) => value > 0, {
    message: "amount must be > 0",
  }),
  currency: boundedText({ min: 1, max: 12 }),
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

async function loadExpenses(vehicleId?: string | null): Promise<ExpenseItem[]> {
  const current = await getCurrentUserContext();
  const rows = await expenseModel().findMany({
    where: {
      ...(vehicleId ? { vehicleId } : {}),
      vehicle: {
        garageId: current.garageId,
        trashedAt: null,
        garage: { ownerUserId: current.userId },
      },
    },
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    include: {
      node: { select: { id: true, name: true } },
      vehicle: { include: expenseVehicleInclude },
    },
  });

  return rows.map((row) => {
    const wire = toWire(row);
    const rawVehicle = row.vehicle as unknown as Parameters<typeof toExpenseItemVehicleSummary>[0];
    return {
      ...wire,
      vehicle: toExpenseItemVehicleSummary(rawVehicle),
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    // MT-SEC-071: validate search params with explicit bounds.
    const year = parseSearchParamInt(searchParams.get("year"), {
      min: 1990,
      max: 2100,
      fallback: getCurrentExpenseYear(),
    });
    const vehicleId = parseSearchParamText(searchParams.get("vehicleId"), { max: 64 });

    if (vehicleId) {
      const allowed = await getVehicleInCurrentContext(vehicleId, { id: true });
      if (!allowed) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }
    }

    const expenses = await loadExpenses(vehicleId);
    const analytics = buildExpenseAnalyticsFromItems(expenses, year);
    const years = Array.from(new Set(expenses.map((expense) => new Date(expense.expenseDate).getFullYear())))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => b - a);

    return NextResponse.json({ expenses, analytics, years });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // MT-SEC-069: cap body at 32 KB.
    const raw = await parseJsonBody<unknown>(request, { maxBytes: 32 * 1024 });
    const data = createExpenseSchema.parse(raw);
    const vehicle = await getVehicleInCurrentContext(data.vehicleId, { id: true });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (data.nodeId) {
      const node = await prisma.node.findUnique({ where: { id: data.nodeId }, select: { id: true } });
      if (!node) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }
    }

    const expenseDate = new Date(data.expenseDate);
    const installationStatus =
      data.installationStatus ??
      (data.installStatus === "BOUGHT_NOT_INSTALLED" ? "NOT_INSTALLED" : "INSTALLED");

    const row = await expenseModel().create({
      data: {
        vehicleId: data.vehicleId,
        nodeId: data.nodeId || null,
        category: data.category,
        installStatus: data.installStatus,
        purchaseStatus: data.purchaseStatus ?? "PURCHASED",
        installationStatus,
        expenseDate,
        title: data.title,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        quantity: data.quantity ?? 1,
        comment: data.comment?.trim() || null,
        partSku: data.partSku?.trim() || null,
        partName: data.partName?.trim() || null,
        vendor: data.vendor?.trim() || null,
        purchasedAt: data.purchasedAt ? new Date(data.purchasedAt) : expenseDate,
        installedAt:
          data.installedAt
            ? new Date(data.installedAt)
            : installationStatus === "NOT_INSTALLED"
              ? null
              : expenseDate,
        odometer: data.odometer ?? null,
        engineHours: data.engineHours ?? null,
      },
      include: {
        node: { select: { id: true, name: true } },
        vehicle: { include: expenseVehicleInclude },
      },
    });

    const expenses = await loadExpenses(data.vehicleId);
    const analytics = buildExpenseAnalyticsFromItems(
      expenses,
      new Date(row.expenseDate).getFullYear()
    );

    return NextResponse.json({ expense: toWire(row), analytics }, { status: 201 });
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
    console.error("Failed to create expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
