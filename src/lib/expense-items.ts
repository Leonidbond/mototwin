import type { ExpenseCategory, ExpenseInstallStatus } from "@mototwin/types";

type ExpenseMutationClient = {
  expenseItem: {
    create(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<Array<{ id: string }>>;
    update(args: unknown): Promise<unknown>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  partWishlistItem?: {
    updateMany(args: unknown): Promise<unknown>;
  };
};

type ServiceExpenseSource = {
  id: string;
  vehicleId: string;
  /** Anchor node — для записи на ExpenseItem.nodeId в BASIC. */
  nodeId: string;
  eventKind?: string | null;
  eventDate: Date;
  /** Bundle title (заменяет legacy serviceType). */
  title?: string | null;
  /** Bundle total (заменяет legacy costAmount). */
  totalCost?: number | { toString(): string } | null;
  currency: string | null;
  comment: string | null;
  installedPartsJson?: unknown | null;
  /**
   * Items bundle — для синтеза «PartSku/PartName» категории и установки.
   * В BASIC обычно один item с anchor nodeId.
   */
  items?: Array<{
    partName?: string | null;
    sku?: string | null;
  }>;
  createdAt?: Date;
};

function readTotalCostNumber(value: ServiceExpenseSource["totalCost"]): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

function readFirstItemPartSku(event: ServiceExpenseSource): string | null {
  for (const item of event.items ?? []) {
    const v = item.sku?.trim();
    if (v) {
      return v;
    }
  }
  return null;
}

function readFirstItemPartName(event: ServiceExpenseSource): string | null {
  for (const item of event.items ?? []) {
    const v = item.partName?.trim();
    if (v) {
      return v;
    }
  }
  return null;
}

function readEventTitleOrFallback(event: ServiceExpenseSource): string {
  const t = event.title?.trim();
  if (t) {
    return t;
  }
  return "Сервисное событие";
}

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

function getSearchText(event: ServiceExpenseSource): string {
  return [
    event.title,
    readFirstItemPartName(event),
    readFirstItemPartSku(event),
    event.comment,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isConsumableExpense(text: string): boolean {
  return (
    text.includes("масл") ||
    text.includes("oil") ||
    text.includes("жидк") ||
    text.includes("fluid") ||
    text.includes("смаз") ||
    text.includes("grease") ||
    text.includes("coolant") ||
    text.includes("антифриз") ||
    text.includes("тормозн")
  );
}

function classifyServiceExpense(event: ServiceExpenseSource): ExpenseCategory {
  const text = getSearchText(event);
  if (text.includes("ремонт")) {
    return "REPAIR";
  }
  if (text.includes("диагност")) {
    return "DIAGNOSTICS";
  }
  if (isConsumableExpense(text)) {
    return "CONSUMABLE";
  }
  const hasItemPartInfo =
    Boolean(readFirstItemPartSku(event) || readFirstItemPartName(event));
  if (
    hasItemPartInfo ||
    getWishlistItemIdFromExpenseSource(event.installedPartsJson)
  ) {
    return "PART";
  }
  if (text.includes("работ")) {
    return "SERVICE_WORK";
  }
  return "SERVICE_WORK";
}

function getServiceExpenseInstallStatus(event: ServiceExpenseSource): ExpenseInstallStatus {
  const category = classifyServiceExpense(event);
  if (category === "DIAGNOSTICS" || category === "SERVICE_WORK") {
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

  const totalCost = readTotalCostNumber(event.totalCost);
  if (event.eventKind === "STATE_UPDATE" || !hasPositiveAmount(totalCost, event.currency)) {
    return;
  }

  const title = readEventTitleOrFallback(event);
  const headerPartSku = readFirstItemPartSku(event);
  const headerPartName = readFirstItemPartName(event);

  const shoppingListItemId = getWishlistItemIdFromExpenseSource(event.installedPartsJson);
  if (shoppingListItemId) {
    const existingStandalone = await db.expenseItem.findMany({
      where: {
        shoppingListItemId,
        serviceEventId: null,
      },
      select: { id: true },
    });
    for (const expense of existingStandalone) {
      await db.expenseItem.update({
        where: { id: expense.id },
        data: {
          node: { connect: { id: event.nodeId } },
          serviceEvent: { connect: { id: event.id } },
          category: classifyServiceExpense(event),
          installStatus: "INSTALLED",
          installationStatus: "INSTALLED",
          installedAt: event.eventDate,
          expenseDate: event.eventDate,
          title,
          amount: totalCost,
          currency: normalizeCurrency(event.currency as string),
          quantity: 1,
          comment: event.comment?.trim() || null,
          partSku: headerPartSku,
          partName: headerPartName,
        },
      });
    }
    await db.partWishlistItem?.updateMany({
      where: { id: shoppingListItemId, vehicleId: event.vehicleId },
      data: { status: "INSTALLED" },
    });
    if (existingStandalone.length > 0) {
      return;
    }
  }

  if (shoppingListItemId) {
    await db.partWishlistItem?.updateMany({
      where: { id: shoppingListItemId, vehicleId: event.vehicleId },
      data: { status: "INSTALLED" },
    });
  }

  const category = classifyServiceExpense(event);
  const installStatus = getServiceExpenseInstallStatus(event);
  await db.expenseItem.create({
    data: {
      vehicleId: event.vehicleId,
      nodeId: event.nodeId,
      serviceEventId: event.id,
      shoppingListItemId,
      category,
      installStatus,
      purchaseStatus: "PURCHASED",
      installationStatus: installStatus === "BOUGHT_NOT_INSTALLED" ? "NOT_INSTALLED" : "INSTALLED",
      expenseDate: event.eventDate,
      title,
      amount: totalCost,
      currency: normalizeCurrency(event.currency as string),
      quantity: 1,
      comment: event.comment?.trim() || null,
      partSku: headerPartSku,
      partName: headerPartName,
      purchasedAt: event.eventDate,
      installedAt: installStatus === "BOUGHT_NOT_INSTALLED" ? null : event.eventDate,
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
      category: "PART",
      installStatus: "BOUGHT_NOT_INSTALLED",
      purchaseStatus: "PURCHASED",
      installationStatus: "NOT_INSTALLED",
      expenseDate: item.updatedAt,
      title: item.title.trim(),
      amount: item.costAmount,
      currency: normalizeCurrency(item.currency as string),
      quantity: item.quantity,
      comment: item.comment?.trim() || null,
      purchasedAt: item.updatedAt,
      installedAt: null,
      createdAt: item.createdAt,
    },
  });
}
