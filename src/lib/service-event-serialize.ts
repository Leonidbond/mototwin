import type { ServiceEventMode } from "@prisma/client";
import type { ExpenseItem, ServiceBundleItem, ServiceEventItem } from "@mototwin/types";
import { getServiceActionTypeLabelRu } from "@mototwin/domain";

type DecimalLike = { toString(): string } | number | null;

export type RawServiceEventRow = {
  id: string;
  vehicleId: string;
  nodeId: string;
  eventKind: string;
  mode: ServiceEventMode | string;
  entryMode?: string | null;
  createdUnderPlan?: string | null;
  title: string | null;
  eventDate: Date;
  odometer: number;
  engineHours: number | null;
  partsCost: DecimalLike;
  laborCost: DecimalLike;
  totalCost: DecimalLike;
  currency: string | null;
  comment: string | null;
  performedBy?: string | null;
  serviceProviderNote?: string | null;
  installLocationAddress?: string | null;
  installLocationLat?: number | null;
  installLocationLng?: number | null;
  attachReceiptRequested?: boolean | null;
  attachFileRequested?: boolean | null;
  nextReminderEnabled?: boolean | null;
  nextReminderDate?: Date | null;
  nextReminderOdometer?: number | null;
  nextReminderEngineHours?: number | null;
  rotatedOutAt?: Date | null;
  rotatedOutReason?: string | null;
  createdAt: Date;
  installedPartsJson?: unknown | null;
  node?: {
    id: string;
    code: string;
    name: string;
    level: number;
    displayOrder: number;
  };
  items?: Array<{
    id: string;
    nodeId: string;
    actionType: string;
    partName: string | null;
    sku: string | null;
    quantity: number | null;
    partCost: DecimalLike;
    laborCost: DecimalLike;
    comment: string | null;
    sortOrder: number;
    node?: {
      id: string;
      code: string;
      name: string;
      level: number;
      displayOrder: number;
    };
  }>;
  expenseItems?: Array<{
    amount: { toString(): string } | number;
    expenseDate: Date;
    purchasedAt: Date | null;
    installedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    [key: string]: unknown;
  }>;
};

function decimalToNumber(value: DecimalLike): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

function expenseItemToWire(row: NonNullable<RawServiceEventRow["expenseItems"]>[number]): ExpenseItem {
  return {
    ...(row as unknown as Omit<ExpenseItem, "amount" | "expenseDate" | "purchasedAt" | "installedAt" | "createdAt" | "updatedAt">),
    amount: Number(row.amount),
    expenseDate: row.expenseDate.toISOString(),
    purchasedAt: row.purchasedAt?.toISOString() ?? null,
    installedAt: row.installedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Конвертирует строку DB → API-DTO, сохраняя обратно-совместимые legacy-поля
 * (`serviceType`/`costAmount`/`partSku`/`partName`), которые синтезируются из
 * `title`/`totalCost`/`items[0]`. Новый код должен использовать `items[]`.
 */
export function serializeServiceEventRow(row: RawServiceEventRow): ServiceEventItem {
  const itemsSorted = (row.items ?? [])
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const items: ServiceBundleItem[] = itemsSorted.map((item) => ({
    id: item.id,
    nodeId: item.nodeId,
    actionType: item.actionType as ServiceBundleItem["actionType"],
    partName: item.partName,
    sku: item.sku,
    quantity: item.quantity,
    partCost: decimalToNumber(item.partCost),
    laborCost: decimalToNumber(item.laborCost),
    comment: item.comment,
    sortOrder: item.sortOrder,
    node: item.node
      ? {
          id: item.node.id,
          code: item.node.code,
          name: item.node.name,
          level: item.node.level,
          displayOrder: item.node.displayOrder,
        }
      : undefined,
  }));

  const firstItem = items[0] ?? null;
  const totalCost = decimalToNumber(row.totalCost);
  const partsCost = decimalToNumber(row.partsCost);
  const laborCost = decimalToNumber(row.laborCost);

  // Legacy-синтез — для журналов и старого UI.
  const legacyServiceType =
    row.title?.trim() ||
    (firstItem ? getServiceActionTypeLabelRu(firstItem.actionType) : "Сервисное событие");

  return {
    id: row.id,
    eventKind: row.eventKind as ServiceEventItem["eventKind"],
    eventDate: row.eventDate.toISOString(),
    nodeId: row.nodeId,
    node: row.node
      ? {
          id: row.node.id,
          code: row.node.code,
          name: row.node.name,
          level: row.node.level,
          displayOrder: row.node.displayOrder,
        }
      : undefined,
    title: row.title,
    mode: row.mode as ServiceEventItem["mode"],
    entryMode: (row.entryMode as ServiceEventItem["entryMode"]) ?? "QUICK",
    createdUnderPlan: (row.createdUnderPlan as ServiceEventItem["createdUnderPlan"]) ?? "FREE",
    odometer: row.odometer,
    engineHours: row.engineHours,
    installedPartsJson: row.installedPartsJson ?? null,
    partsCost,
    laborCost,
    totalCost,
    currency: row.currency,
    comment: row.comment,
    performedBy: (row.performedBy as ServiceEventItem["performedBy"]) ?? null,
    serviceProviderNote: row.serviceProviderNote ?? null,
    installLocationAddress: row.installLocationAddress ?? null,
    installLocationLat: row.installLocationLat ?? null,
    installLocationLng: row.installLocationLng ?? null,
    attachReceiptRequested: Boolean(row.attachReceiptRequested),
    attachFileRequested: Boolean(row.attachFileRequested),
    nextReminderEnabled: Boolean(row.nextReminderEnabled),
    nextReminderDate: row.nextReminderDate?.toISOString() ?? null,
    nextReminderOdometer: row.nextReminderOdometer ?? null,
    nextReminderEngineHours: row.nextReminderEngineHours ?? null,
    rotatedOutAt: row.rotatedOutAt?.toISOString() ?? null,
    rotatedOutReason: (row.rotatedOutReason as ServiceEventItem["rotatedOutReason"]) ?? null,
    items,
    serviceType: legacyServiceType,
    costAmount: totalCost,
    partSku: firstItem?.sku ?? null,
    partName: firstItem?.partName ?? null,
    expenseItems: row.expenseItems?.map(expenseItemToWire),
    createdAt: row.createdAt.toISOString(),
  };
}
