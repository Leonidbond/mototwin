import { getWishlistItemIdsFromInstalledPartsJson } from "@mototwin/domain";
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
    findFirst?(args: unknown): Promise<{ nodeId: string | null } | null>;
  };
};

type ServiceExpenseItemExpenseSlice = {
  nodeId?: string | null;
  partName?: string | null;
  sku?: string | null;
  quantity?: number | null;
  partCost?: number | { toString(): string } | null;
  laborCost?: number | { toString(): string } | null;
  comment?: string | null;
  node?: { name?: string | null } | null;
};

type ServiceExpenseSource = {
  id: string;
  vehicleId: string;
  /** Anchor node — для записи на ExpenseItem.nodeId в BASIC. */
  nodeId: string;
  eventKind?: string | null;
  eventDate: Date;
  /** `BASIC` | `ADVANCED` (Prisma enum string). */
  mode?: string | null;
  /** Bundle title (заменяет legacy serviceType). */
  title?: string | null;
  /** Bundle total (заменяет legacy costAmount). */
  totalCost?: number | { toString(): string } | null;
  currency: string | null;
  comment: string | null;
  installedPartsJson?: unknown | null;
  /**
   * Items bundle — для синтеза «PartSku/PartName» категории и установки.
   * В BASIC обычно один item с anchor nodeId; в ADVANCED — полные строки для per-item расходов.
   */
  items?: ServiceExpenseItemExpenseSlice[];
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

function readItemLineTotal(item: ServiceExpenseItemExpenseSlice): number {
  const p = readTotalCostNumber(item.partCost as ServiceExpenseSource["totalCost"]);
  const l = readTotalCostNumber(item.laborCost as ServiceExpenseSource["totalCost"]);
  return (p ?? 0) + (l ?? 0);
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
  if (hasItemPartInfo || getWishlistItemIdsFromInstalledPartsJson(event.installedPartsJson).length > 0) {
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

export async function syncExpenseItemForServiceEvent(
  tx: unknown,
  event: ServiceExpenseSource
): Promise<void> {
  const db = tx as ExpenseMutationClient;
  await db.expenseItem.deleteMany({ where: { serviceEventId: event.id } });

  if (event.eventKind === "STATE_UPDATE") {
    return;
  }
  if (!event.currency?.trim()) {
    return;
  }

  const totalCost = readTotalCostNumber(event.totalCost);
  const advLineItems = (event.items ?? []).filter(
    (it) => readItemLineTotal(it) > 0 && Boolean(it.nodeId?.trim())
  );
  const wishlistIdsForEvent = getWishlistItemIdsFromInstalledPartsJson(event.installedPartsJson);
  const doAdvancedPerItem =
    event.mode === "ADVANCED" && advLineItems.length > 0 && wishlistIdsForEvent.length === 0;

  if (!doAdvancedPerItem && !hasPositiveAmount(totalCost, event.currency)) {
    return;
  }

  const title = readEventTitleOrFallback(event);
  const headerPartSku = readFirstItemPartSku(event);
  const headerPartName = readFirstItemPartName(event);
  const currency = normalizeCurrency(event.currency as string);

  const shoppingListItemIdForCreate =
    wishlistIdsForEvent.length > 0 ? wishlistIdsForEvent[0] : null;

  if (wishlistIdsForEvent.length > 0) {
    let linkedAnyStandalone = false;
    for (const shoppingListItemId of wishlistIdsForEvent) {
      let linkNodeId = event.nodeId;
      const wlRow = await db.partWishlistItem?.findFirst?.({
        where: { id: shoppingListItemId, vehicleId: event.vehicleId },
        select: { nodeId: true },
      });
      const wlNode = wlRow?.nodeId?.trim();
      if (wlNode) {
        linkNodeId = wlNode;
      }

      const existingStandalone = await db.expenseItem.findMany({
        where: {
          shoppingListItemId,
          serviceEventId: null,
          vehicleId: event.vehicleId,
        },
        select: { id: true },
      });
      for (const expense of existingStandalone) {
        await db.expenseItem.update({
          where: { id: expense.id },
          data: {
            node: { connect: { id: linkNodeId } },
            serviceEvent: { connect: { id: event.id } },
            category: classifyServiceExpense({
              ...event,
              nodeId: linkNodeId,
              installedPartsJson: { source: "wishlist", wishlistItemId: shoppingListItemId },
            }),
            installStatus: "INSTALLED",
            installationStatus: "INSTALLED",
            installedAt: event.eventDate,
            expenseDate: event.eventDate,
          },
        });
        linkedAnyStandalone = true;
      }
      await db.partWishlistItem?.updateMany({
        where: { id: shoppingListItemId, vehicleId: event.vehicleId },
        data: { status: "INSTALLED" },
      });
    }
    if (linkedAnyStandalone) {
      return;
    }
  }

  if (doAdvancedPerItem) {
    const baseTitle = readEventTitleOrFallback(event);
    for (const item of advLineItems) {
      const nodeId = item.nodeId!.trim();
      const lineAmount = readItemLineTotal(item);
      const rowSynthetic: ServiceExpenseSource = {
        ...event,
        nodeId,
        items: [{ partName: item.partName, sku: item.sku }],
        totalCost: lineAmount,
      };
      const rowTitle = item.partName?.trim()
        ? `${baseTitle} · ${item.partName.trim()}`
        : item.node?.name?.trim()
          ? `${baseTitle} · ${item.node.name.trim()}`
          : baseTitle;
      const partSku = item.sku?.trim() || null;
      const partName = item.partName?.trim() || null;
      const qtyRaw = item.quantity;
      const quantity =
        typeof qtyRaw === "number" && Number.isInteger(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
      const rowComment = [event.comment?.trim(), item.comment?.trim()].filter(Boolean).join("\n") || null;
      const category = classifyServiceExpense(rowSynthetic);
      const installStatus = getServiceExpenseInstallStatus(rowSynthetic);
      await db.expenseItem.create({
        data: {
          vehicleId: event.vehicleId,
          nodeId,
          serviceEventId: event.id,
          shoppingListItemId: null,
          category,
          installStatus,
          purchaseStatus: "PURCHASED",
          installationStatus: installStatus === "BOUGHT_NOT_INSTALLED" ? "NOT_INSTALLED" : "INSTALLED",
          expenseDate: event.eventDate,
          title: rowTitle,
          amount: lineAmount,
          currency,
          quantity,
          comment: rowComment,
          partSku,
          partName,
          purchasedAt: event.eventDate,
          installedAt: installStatus === "BOUGHT_NOT_INSTALLED" ? null : event.eventDate,
          createdAt: event.createdAt,
        },
      });
    }
    return;
  }

  const category = classifyServiceExpense(event);
  const installStatus = getServiceExpenseInstallStatus(event);
  if (totalCost == null || totalCost <= 0) {
    return;
  }
  await db.expenseItem.create({
    data: {
      vehicleId: event.vehicleId,
      nodeId: event.nodeId,
      serviceEventId: event.id,
      shoppingListItemId: shoppingListItemIdForCreate,
      category,
      installStatus,
      purchaseStatus: "PURCHASED",
      installationStatus: installStatus === "BOUGHT_NOT_INSTALLED" ? "NOT_INSTALLED" : "INSTALLED",
      expenseDate: event.eventDate,
      title,
      amount: totalCost,
      currency,
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
