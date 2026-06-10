import type { ServiceEventItem } from "@mototwin/types";
import { formatExpenseAmountRu, formatExpenseTotalsByCurrency } from "./expense-summary";

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
  const directAmount = event.totalCost ?? event.costAmount ?? null;
  const directCurrency = event.currency?.trim() || null;
  const hasDirectCost =
    directAmount !== null &&
    Number.isFinite(directAmount) &&
    directAmount > 0 &&
    Boolean(directCurrency);

  if (hasDirectCost) {
    return {
      totalAmount: directAmount,
      currency: directCurrency,
      totalsLabel: `${formatExpenseAmountRu(directAmount)} ${directCurrency}`,
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
  const directAmount = event.totalCost ?? event.costAmount ?? null;
  const directCurrency = event.currency?.trim();
  if (
    directAmount !== null &&
    Number.isFinite(directAmount) &&
    directAmount > 0 &&
    directCurrency
  ) {
    return { [directCurrency]: directAmount };
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
  if (!resolved.hasCost) return null;
  if (resolved.totalAmount !== null) return resolved.totalAmount;

  const linkedTotals = getServiceEventLinkedExpenseTotals(event);
  if (linkedTotals.length === 1) {
    return linkedTotals[0]!.totalAmount;
  }
  return null;
}

export function hasPaidLinkedExpenses(event: Pick<ServiceEventItem, "expenseItems">): boolean {
  return getServiceEventLinkedExpenseTotals(event).length > 0;
}
