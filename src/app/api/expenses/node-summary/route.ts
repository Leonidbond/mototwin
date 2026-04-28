import { NextRequest, NextResponse } from "next/server";
import type { ExpenseCategory, ExpenseInstallationStatus, ExpenseNodeSummaryItem } from "@mototwin/types";
import { prisma } from "@/lib/prisma";
import { toCurrentUserContextErrorResponse } from "../../_shared/current-user-context";
import { getVehicleInCurrentContext } from "../../_shared/vehicle-context";

const TECHNICAL_CATEGORIES: ExpenseCategory[] = [
  "PART",
  "CONSUMABLE",
  "SERVICE_WORK",
  "REPAIR",
  "DIAGNOSTICS",
  "OTHER",
];

type ExpenseRow = {
  id: string;
  nodeId: string | null;
  category: ExpenseCategory;
  purchaseStatus: "PLANNED" | "PURCHASED";
  installationStatus: ExpenseInstallationStatus;
  expenseDate: Date;
  title: string;
  amount: { toString(): string } | number;
  currency: string;
  serviceEventId: string | null;
};

function addAmount(
  totals: Map<string, number>,
  currency: string,
  amount: number
) {
  totals.set(currency, (totals.get(currency) ?? 0) + amount);
}

function getAncestorIds(nodeId: string, parentByNodeId: Map<string, string | null>): string[] {
  const ids: string[] = [];
  let current: string | null | undefined = nodeId;
  while (current) {
    ids.push(current);
    current = parentByNodeId.get(current) ?? null;
  }
  return ids;
}

export async function GET(request: NextRequest) {
  try {
    const vehicleId = request.nextUrl.searchParams.get("vehicleId")?.trim();
    const requestedYear = Number(request.nextUrl.searchParams.get("year"));
    const year = Number.isFinite(requestedYear) ? Math.trunc(requestedYear) : new Date().getFullYear();

    if (!vehicleId) {
      return NextResponse.json({ error: "vehicleId is required" }, { status: 400 });
    }

    const vehicle = await getVehicleInCurrentContext(vehicleId, { id: true });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const [nodes, expenses] = await Promise.all([
      prisma.node.findMany({
        select: { id: true, parentId: true },
      }),
      prisma.expenseItem.findMany({
        where: {
          vehicleId,
          nodeId: { not: null },
          category: { in: TECHNICAL_CATEGORIES },
          expenseDate: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
          },
        },
        select: {
          id: true,
          nodeId: true,
          category: true,
          purchaseStatus: true,
          installationStatus: true,
          expenseDate: true,
          title: true,
          amount: true,
          currency: true,
          serviceEventId: true,
        },
        orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const parentByNodeId = new Map(nodes.map((node) => [node.id, node.parentId]));
    const summaryByNodeId = new Map<
      string,
      {
        totals: Map<string, number>;
        expenseCount: number;
        purchasedNotInstalledCount: number;
        latestExpenses: ExpenseNodeSummaryItem["latestExpenses"];
      }
    >();

    for (const expense of expenses as ExpenseRow[]) {
      if (!expense.nodeId) {
        continue;
      }
      const amount = Number(expense.amount);
      const ancestorIds = getAncestorIds(expense.nodeId, parentByNodeId);
      for (const nodeId of ancestorIds) {
        const summary =
          summaryByNodeId.get(nodeId) ??
          {
            totals: new Map<string, number>(),
            expenseCount: 0,
            purchasedNotInstalledCount: 0,
            latestExpenses: [],
          };
        addAmount(summary.totals, expense.currency, amount);
        summary.expenseCount += 1;
        if (
          expense.purchaseStatus === "PURCHASED" &&
          expense.installationStatus === "NOT_INSTALLED" &&
          expense.serviceEventId == null
        ) {
          summary.purchasedNotInstalledCount += 1;
        }
        summary.latestExpenses.push({
          id: expense.id,
          date: expense.expenseDate.toISOString(),
          title: expense.title,
          amount,
          currency: expense.currency,
          category: expense.category,
          installationStatus: expense.installationStatus,
        });
        summaryByNodeId.set(nodeId, summary);
      }
    }

    const responseNodes: ExpenseNodeSummaryItem[] = Array.from(summaryByNodeId.entries()).map(
      ([nodeId, summary]) => ({
        nodeId,
        totalByCurrency: Array.from(summary.totals.entries())
          .map(([currency, amount]) => ({ currency, amount }))
          .sort((a, b) => a.currency.localeCompare(b.currency, "en")),
        expenseCount: summary.expenseCount,
        purchasedNotInstalledCount: summary.purchasedNotInstalledCount,
        latestExpenses: summary.latestExpenses
          .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
          .slice(0, 3),
      })
    );

    return NextResponse.json({ year, nodes: responseNodes });
  } catch (error) {
    const currentUserContextError = toCurrentUserContextErrorResponse(error);
    if (currentUserContextError) {
      return currentUserContextError;
    }
    console.error("Failed to fetch expense node summary:", error);
    return NextResponse.json({ error: "Failed to fetch expense node summary" }, { status: 500 });
  }
}
