import type { ServiceBundleItem, ServiceEventItem } from "@mototwin/types";
import { formatExpenseAmountRu, formatExpenseTotalsByCurrency } from "./expense-summary";

function resolveEventCostCurrency(event: Pick<ServiceEventItem, "currency">): string | null {
  const currency = event.currency?.trim();
  return currency || null;
}

function getPartsAndLaborCostTotal(
  event: Pick<ServiceEventItem, "partsCost" | "laborCost" | "currency">
): { amount: number; currency: string } | null {
  const currency = resolveEventCostCurrency(event);
  if (!currency) {
    return null;
  }
  const parts =
    event.partsCost != null && Number.isFinite(event.partsCost) && event.partsCost > 0
      ? event.partsCost
      : 0;
  const labor =
    event.laborCost != null && Number.isFinite(event.laborCost) && event.laborCost > 0
      ? event.laborCost
      : 0;
  const amount = parts + labor;
  return amount > 0 ? { amount, currency } : null;
}

function getBundleItemsCostTotal(
  event: Pick<ServiceEventItem, "items" | "currency">
): { amount: number; currency: string } | null {
  const currency = resolveEventCostCurrency(event);
  if (!currency) {
    return null;
  }
  let amount = 0;
  let hasLineCost = false;
  for (const item of event.items ?? []) {
    amount += sumBundleItemLineCost(item);
    if (bundleItemHasLineCost(item)) {
      hasLineCost = true;
    }
  }
  return hasLineCost && amount > 0 ? { amount, currency } : null;
}

function bundleItemHasLineCost(item: ServiceBundleItem): boolean {
  return (
    (item.partCost != null && Number.isFinite(item.partCost) && item.partCost > 0) ||
    (item.laborCost != null && Number.isFinite(item.laborCost) && item.laborCost > 0)
  );
}

function sumBundleItemLineCost(item: ServiceBundleItem): number {
  const parts =
    item.partCost != null && Number.isFinite(item.partCost) && item.partCost > 0 ? item.partCost : 0;
  const labor =
    item.laborCost != null && Number.isFinite(item.laborCost) && item.laborCost > 0 ? item.laborCost : 0;
  return parts + labor;
}

function resolveDirectServiceEventCost(
  event: ServiceEventItem
): { amount: number; currency: string } | null {
  const directAmount = event.totalCost ?? event.costAmount ?? null;
  const directCurrency = resolveEventCostCurrency(event);
  if (
    directAmount !== null &&
    Number.isFinite(directAmount) &&
    directAmount > 0 &&
    directCurrency
  ) {
    return { amount: directAmount, currency: directCurrency };
  }
  return getPartsAndLaborCostTotal(event) ?? getBundleItemsCostTotal(event);
}

export type ServiceEventExpenseCurrencyTotal = {
  currency: string;
  totalAmount: number;
};

/** Sum linked {@link ExpenseItem} rows by currency (ignores non-positive / invalid rows). */
export function getServiceEventLinkedExpenseTotals(
  event: Pick<ServiceEventItem, "expenseItems">
): ServiceEventExpenseCurrencyTotal[] {
  const map = new Map<string, number>();
  for (const expense of event.expenseItems ?? []) {
    if (!Number.isFinite(expense.amount) || expense.amount <= 0) continue;
    const currency = expense.currency?.trim();
    if (!currency) continue;
    map.set(currency, (map.get(currency) ?? 0) + expense.amount);
  }
  return [...map.entries()]
    .map(([currency, totalAmount]) => ({ currency, totalAmount }))
    .sort((left, right) => left.currency.localeCompare(right.currency));
}

export type ResolvedServiceEventCost = {
  totalAmount: number | null;
  currency: string | null;
  totalsLabel: string | null;
  hasCost: boolean;
};

/**
 * Event cost for journal UI and filters: prefers explicit ServiceEvent totals,
 * otherwise rolls up linked expense rows.
 */
export function resolveServiceEventCost(event: ServiceEventItem): ResolvedServiceEventCost {
  const direct = resolveDirectServiceEventCost(event);
  if (direct) {
    return {
      totalAmount: direct.amount,
      currency: direct.currency,
      totalsLabel: `${formatExpenseAmountRu(direct.amount)} ${direct.currency}`,
      hasCost: true,
    };
  }

  const linkedTotals = getServiceEventLinkedExpenseTotals(event);
  if (linkedTotals.length === 0) {
    return { totalAmount: null, currency: null, totalsLabel: null, hasCost: false };
  }

  const totalsLabel = formatExpenseTotalsByCurrency(linkedTotals);
  const single = linkedTotals.length === 1 ? linkedTotals[0]! : null;
  return {
    totalAmount: single?.totalAmount ?? null,
    currency: single?.currency ?? null,
    totalsLabel,
    hasCost: true,
  };
}

/** Totals by currency for monthly journal rollups and cost filters. */
export function getServiceEventCostByCurrency(event: ServiceEventItem): Record<string, number> {
  const direct = resolveDirectServiceEventCost(event);
  if (direct) {
    return { [direct.currency]: direct.amount };
  }

  const result: Record<string, number> = {};
  for (const row of getServiceEventLinkedExpenseTotals(event)) {
    result[row.currency] = row.totalAmount;
  }
  return result;
}

/** Single numeric total when unambiguous (direct cost or one linked currency). */
export function getServiceEventComparableTotalCost(event: ServiceEventItem): number | null {
  const resolved = resolveServiceEventCost(event);
  if (!resolved.hasCost) {
    return null;
  }
  if (resolved.totalAmount !== null) {
    return resolved.totalAmount;
  }

  const linkedTotals = getServiceEventLinkedExpenseTotals(event);
  if (linkedTotals.length === 1) {
    return linkedTotals[0]!.totalAmount;
  }
  return null;
}

export function hasPaidLinkedExpenses(event: Pick<ServiceEventItem, "expenseItems">): boolean {
  return getServiceEventLinkedExpenseTotals(event).length > 0;
}
