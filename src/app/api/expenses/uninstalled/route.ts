import { NextRequest, NextResponse } from "next/server";
import type { ExpenseItem } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { toCurrentUserContextErrorResponse } from "../../_shared/current-user-context";
import { getVehicleInCurrentContext } from "../../_shared/vehicle-context";

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

export async function GET(request: NextRequest) {
  try {
    const vehicleId = request.nextUrl.searchParams.get("vehicleId")?.trim();
    const nodeId = request.nextUrl.searchParams.get("nodeId")?.trim() || null;

    if (!vehicleId) {
      return NextResponse.json({ error: "vehicleId is required" }, { status: 400 });
    }

    const vehicle = await getVehicleInCurrentContext(vehicleId, { id: true });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const expenses = await prisma.expenseItem.findMany({
      where: {
        vehicleId,
        ...(nodeId ? { nodeId } : {}),
        purchaseStatus: "PURCHASED",
        installationStatus: "NOT_INSTALLED",
        serviceEventId: null,
      },
      orderBy: [{ purchasedAt: "desc" }, { expenseDate: "desc" }, { createdAt: "desc" }],
      include: { node: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ expenses: expenses.map((row) => toWire(row as ExpenseRow)) });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch uninstalled expenses:", error);
    return NextResponse.json({ error: "Failed to fetch uninstalled expenses" }, { status: 500 });
  }
}
