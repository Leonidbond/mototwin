import type { ExpenseCategory, ExpenseInstallStatus } from "@mototwin/types";

type ExpenseMutationClient = {
  expenseItem: {
    create(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<unknown>;
  };
};

type ServiceExpenseSource = {
  id: string;
  vehicleId: string;
  nodeId: string;
  eventKind?: string | null;
  eventDate: Date;
  serviceType: string;
  costAmount: number | null;
  currency: string | null;
  comment: string | null;
  installedPartsJson?: unknown | null;
  partSku?: string | null;
  partName?: string | null;
  createdAt?: Date;
};

type WishlistExpenseSource = {
  id: string;
  vehicleId: string;
  nodeId: string | null;
  title: string;
  quantity: number;
  status: string;
  costAmount: number | null;
  currency: string | null;
  comment: string | null;
  updatedAt: Date;
  createdAt?: Date;
};

function hasPositiveAmount(amount: number | null | undefined, currency: string | null | undefined): boolean {
  return amount != null && amount > 0 && Boolean(currency?.trim());
}

function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

function classifyServiceExpense(event: ServiceExpenseSource): ExpenseCategory {
  const serviceType = event.serviceType.toLowerCase();
  if (event.partSku?.trim() || event.partName?.trim()) {
    return "PARTS";
  }
  if (serviceType.includes("ремонт")) {
    return "REPAIR";
  }
  if (serviceType.includes("диагност")) {
    return "DIAGNOSTICS";
  }
  if (serviceType.includes("работ")) {
    return "LABOR";
  }
  return "SERVICE";
}

function getServiceExpenseInstallStatus(event: ServiceExpenseSource): ExpenseInstallStatus {
  const category = classifyServiceExpense(event);
  if (category === "DIAGNOSTICS" || category === "LABOR") {
    return "NOT_APPLICABLE";
  }
  return "INSTALLED";
}

export function getWishlistItemIdFromExpenseSource(payload: unknown): string | null {
  let parsed = payload;
  if (typeof payload === "string") {
    try {
      parsed = JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const record = parsed as { source?: unknown; wishlistItemId?: unknown };
  if (record.source !== "wishlist" || typeof record.wishlistItemId !== "string") {
    return null;
  }
  return record.wishlistItemId.trim() || null;
}

export async function syncExpenseItemForServiceEvent(
  tx: unknown,
  event: ServiceExpenseSource
): Promise<void> {
  const db = tx as ExpenseMutationClient;
  await db.expenseItem.deleteMany({ where: { serviceEventId: event.id } });

  if (event.eventKind === "STATE_UPDATE" || !hasPositiveAmount(event.costAmount, event.currency)) {
    return;
  }

  await db.expenseItem.create({
    data: {
      vehicleId: event.vehicleId,
      nodeId: event.nodeId,
      serviceEventId: event.id,
      shoppingListItemId: getWishlistItemIdFromExpenseSource(event.installedPartsJson),
      category: classifyServiceExpense(event),
      installStatus: getServiceExpenseInstallStatus(event),
      expenseDate: event.eventDate,
      title: event.serviceType.trim(),
      amount: event.costAmount,
      currency: normalizeCurrency(event.currency as string),
      quantity: 1,
      comment: event.comment?.trim() || null,
      partSku: event.partSku?.trim() || null,
      partName: event.partName?.trim() || null,
      createdAt: event.createdAt,
    },
  });
}

export async function syncExpenseItemForWishlistItem(
  tx: unknown,
  item: WishlistExpenseSource
): Promise<void> {
  const db = tx as ExpenseMutationClient;
  await db.expenseItem.deleteMany({
    where: {
      shoppingListItemId: item.id,
      serviceEventId: null,
    },
  });

  if (item.status !== "BOUGHT" || !hasPositiveAmount(item.costAmount, item.currency)) {
    return;
  }

  await db.expenseItem.create({
    data: {
      vehicleId: item.vehicleId,
      nodeId: item.nodeId,
      shoppingListItemId: item.id,
      category: "PARTS",
      installStatus: "BOUGHT_NOT_INSTALLED",
      expenseDate: item.updatedAt,
      title: item.title.trim(),
      amount: item.costAmount,
      currency: normalizeCurrency(item.currency as string),
      quantity: item.quantity,
      comment: item.comment?.trim() || null,
      createdAt: item.createdAt,
    },
  });
}
