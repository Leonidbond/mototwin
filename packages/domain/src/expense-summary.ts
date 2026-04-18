import type {
  ExpenseByCurrencyViewModel,
  ExpenseByMonthViewModel,
  ExpenseByNodeViewModel,
  ExpenseLatestPaidEventViewModel,
  ExpenseSummaryViewModel,
  ServiceEventItem,
} from "@mototwin/types";

/** Calendar month key `YYYY-MM` from event ISO date (local interpretation). */
export function getExpenseMonthKeyFromIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 7);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getExpenseMonthMeta(monthKey: string): {
  monthStart: number;
  monthLabel: string;
} {
  const sampleDate = `${monthKey}-01T12:00:00.000Z`;
  return {
    monthStart: getMonthStartTimestampFromIso(sampleDate),
    monthLabel: formatMonthYearLabelRu(sampleDate),
  };
}

function getMonthStartTimestampFromIso(value: string): number {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function formatMonthYearLabelRu(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Неизвестный месяц";
  }
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function currentLocalMonthKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function currentLocalMonthLabel(now: Date): string {
  return now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

/** SERVICE rows with positive amount and currency (excludes STATE_UPDATE and null/zero cost). */
export function filterPaidServiceExpenseEvents(
  serviceEvents: ServiceEventItem[]
): ServiceEventItem[] {
  return serviceEvents.filter((e) => {
    const kind = e.eventKind ?? "SERVICE";
    if (kind === "STATE_UPDATE") {
      return false;
    }
    const currency = e.currency?.trim();
    return (
      e.costAmount !== null &&
      e.costAmount > 0 &&
      Boolean(currency && currency.length > 0)
    );
  });
}

function addToCurrencyMap(
  map: Map<string, { total: number; count: number }>,
  currency: string,
  amount: number
): void {
  const key = currency.trim();
  const prev = map.get(key) ?? { total: 0, count: 0 };
  map.set(key, { total: prev.total + amount, count: prev.count + 1 });
}

function currencyMapToViewModels(
  map: Map<string, { total: number; count: number }>
): ExpenseByCurrencyViewModel[] {
  return Array.from(map.entries())
    .map(([currency, { total, count }]) => ({
      currency,
      totalAmount: total,
      paidEventCount: count,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency, "en"));
}

/** Roll up paid SERVICE events by currency (no mixing). */
export function groupExpensesByCurrency(
  paidEvents: ServiceEventItem[]
): ExpenseByCurrencyViewModel[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const e of paidEvents) {
    const currency = e.currency!.trim();
    addToCurrencyMap(map, currency, e.costAmount!);
  }
  return currencyMapToViewModels(map);
}

/** Group by event month (local interpretation of ISO date). */
export function groupExpensesByMonth(
  paidEvents: ServiceEventItem[]
): ExpenseByMonthViewModel[] {
  const byMonth = new Map<
    string,
    Map<string, { total: number; count: number }>
  >();

  for (const e of paidEvents) {
    const monthKey = getExpenseMonthKeyFromIso(e.eventDate);
    let curMap = byMonth.get(monthKey);
    if (!curMap) {
      curMap = new Map();
      byMonth.set(monthKey, curMap);
    }
    addToCurrencyMap(curMap, e.currency!.trim(), e.costAmount!);
  }

  const rows: ExpenseByMonthViewModel[] = [];
  for (const [monthKey, curMap] of byMonth) {
    const sampleDate = `${monthKey}-01T12:00:00.000Z`;
    rows.push({
      monthKey,
      monthStart: getMonthStartTimestampFromIso(sampleDate),
      monthLabel: formatMonthYearLabelRu(sampleDate),
      totalsByCurrency: currencyMapToViewModels(curMap),
    });
  }

  return rows.sort((a, b) => b.monthStart - a.monthStart);
}

/** Group by nodeId for paid SERVICE costs. */
export function groupExpensesByNode(
  paidEvents: ServiceEventItem[]
): ExpenseByNodeViewModel[] {
  const byNode = new Map<
    string,
    { name: string; map: Map<string, { total: number; count: number }> }
  >();

  for (const e of paidEvents) {
    const nodeName = e.node?.name?.trim() || e.nodeId;
    let bucket = byNode.get(e.nodeId);
    if (!bucket) {
      bucket = { name: nodeName, map: new Map() };
      byNode.set(e.nodeId, bucket);
    }
    addToCurrencyMap(bucket.map, e.currency!.trim(), e.costAmount!);
  }

  return Array.from(byNode.entries())
    .map(([nodeId, { name, map }]) => ({
      nodeId,
      nodeName: name,
      totalsByCurrency: currencyMapToViewModels(map),
    }))
    .sort((a, b) => a.nodeName.localeCompare(b.nodeName, "ru-RU"));
}

function pickLatestPaidEvent(
  paidEvents: ServiceEventItem[]
): ExpenseLatestPaidEventViewModel | null {
  if (paidEvents.length === 0) {
    return null;
  }
  const sorted = [...paidEvents].sort(
    (a, b) =>
      new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );
  const e = sorted[0];
  return {
    id: e.id,
    eventDate: e.eventDate,
    serviceType: e.serviceType,
    totalAmount: e.costAmount!,
    currency: e.currency!.trim(),
    nodeLabel: e.node?.name?.trim() || e.nodeId,
  };
}

export function buildExpenseSummaryFromServiceEvents(
  serviceEvents: ServiceEventItem[],
  now: Date = new Date()
): ExpenseSummaryViewModel {
  const paid = filterPaidServiceExpenseEvents(serviceEvents);
  const totalsByCurrency = groupExpensesByCurrency(paid);
  const byMonth = groupExpensesByMonth(paid);
  const byNode = groupExpensesByNode(paid);
  const latestPaidEvent = pickLatestPaidEvent(paid);

  const currentMonthKey = currentLocalMonthKey(now);
  const currentMonthRow = byMonth.find((m) => m.monthKey === currentMonthKey);
  const currentMonthTotalsByCurrency = currentMonthRow?.totalsByCurrency ?? [];

  return {
    paidEventCount: paid.length,
    totalsByCurrency,
    byMonth,
    byNode,
    latestPaidEvent,
    currentMonthTotalsByCurrency,
    currentMonthKey,
    currentMonthLabel: currentLocalMonthLabel(now),
  };
}

export function formatExpenseAmountRu(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}
