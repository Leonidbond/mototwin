import type {
  ExpenseAnalyticsRow,
  ExpenseAnalyticsSummary,
  ExpenseAmountByCurrency,
  ExpenseCategory,
  ExpenseByCurrencyViewModel,
  ExpenseByMonthViewModel,
  ExpenseByNodeViewModel,
  ExpenseByYearViewModel,
  ExpenseLatestPaidEventViewModel,
  ExpenseInstallStatus,
  ExpenseItem,
  ExpenseSummaryViewModel,
  ServiceEventItem,
} from "@mototwin/types";

export const expenseCategoryLabelsRu: Record<ExpenseCategory, string> = {
  SERVICE: "Обслуживание",
  PARTS: "Запчасти",
  REPAIR: "Ремонт",
  DIAGNOSTICS: "Диагностика",
  LABOR: "Работа сервиса",
  OTHER_TECHNICAL: "Прочие технические",
};

export const expenseInstallStatusLabelsRu: Record<ExpenseInstallStatus, string> = {
  BOUGHT_NOT_INSTALLED: "Куплено, но не установлено",
  INSTALLED: "Установлено",
  NOT_APPLICABLE: "Не применимо",
};

export function getExpenseCategoryLabelRu(category: ExpenseCategory): string {
  return expenseCategoryLabelsRu[category] ?? category;
}

export function getExpenseInstallStatusLabelRu(status: ExpenseInstallStatus): string {
  return expenseInstallStatusLabelsRu[status] ?? status;
}

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

function expenseCurrencyMapToRows(
  map: Map<string, { total: number; count: number }>
): ExpenseAmountByCurrency[] {
  return Array.from(map.entries())
    .map(([currency, { total, count }]) => ({
      currency,
      totalAmount: total,
      expenseCount: count,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency, "en"));
}

function addExpenseToCurrencyMap(
  map: Map<string, { total: number; count: number }>,
  expense: ExpenseItem
): void {
  addToCurrencyMap(map, expense.currency.trim(), expense.amount);
}

function getExpenseYear(expense: ExpenseItem): number {
  const date = new Date(expense.expenseDate);
  if (!Number.isNaN(date.getTime())) {
    return date.getFullYear();
  }
  const year = Number(expense.expenseDate.slice(0, 4));
  return Number.isFinite(year) ? year : 0;
}

function groupExpenseItems(
  expenses: ExpenseItem[],
  getKeyAndLabel: (expense: ExpenseItem) => { key: string; label: string; sort: number | string }
): ExpenseAnalyticsRow[] {
  const groups = new Map<
    string,
    { label: string; sort: number | string; count: number; totals: Map<string, { total: number; count: number }> }
  >();

  for (const expense of expenses) {
    const { key, label, sort } = getKeyAndLabel(expense);
    const bucket = groups.get(key) ?? {
      label,
      sort,
      count: 0,
      totals: new Map<string, { total: number; count: number }>(),
    };
    bucket.count += 1;
    addExpenseToCurrencyMap(bucket.totals, expense);
    groups.set(key, bucket);
  }

  return Array.from(groups.entries())
    .map(([key, bucket]) => ({
      key,
      label: bucket.label,
      expenseCount: bucket.count,
      totalsByCurrency: expenseCurrencyMapToRows(bucket.totals),
      sort: bucket.sort,
    }))
    .sort((a, b) => {
      if (typeof a.sort === "number" && typeof b.sort === "number") {
        return b.sort - a.sort;
      }
      return String(a.sort).localeCompare(String(b.sort), "ru-RU");
    })
    .map((row) => ({
      key: row.key,
      label: row.label,
      expenseCount: row.expenseCount,
      totalsByCurrency: row.totalsByCurrency,
    }));
}

export function getCurrentExpenseYear(now: Date = new Date()): number {
  return now.getFullYear();
}

export function getExpenseYearDateRange(year: number): { dateFrom: string; dateTo: string } {
  const safeYear = Number.isFinite(year) && year > 0 ? Math.trunc(year) : getCurrentExpenseYear();
  return {
    dateFrom: `${safeYear}-01-01`,
    dateTo: `${safeYear + 1}-01-01`,
  };
}

export function buildExpenseAnalyticsFromItems(
  expenses: ExpenseItem[],
  selectedYear: number = getCurrentExpenseYear()
): ExpenseAnalyticsSummary {
  const totals = new Map<string, { total: number; count: number }>();
  for (const expense of expenses) {
    addExpenseToCurrencyMap(totals, expense);
  }

  const selectedYearExpenses = expenses.filter((expense) => getExpenseYear(expense) === selectedYear);
  const selectedYearTotals = new Map<string, { total: number; count: number }>();
  for (const expense of selectedYearExpenses) {
    addExpenseToCurrencyMap(selectedYearTotals, expense);
  }

  const boughtNotInstalled = expenses.filter(
    (expense) => expense.installStatus === "BOUGHT_NOT_INSTALLED"
  );
  const boughtTotals = new Map<string, { total: number; count: number }>();
  for (const expense of boughtNotInstalled) {
    addExpenseToCurrencyMap(boughtTotals, expense);
  }

  return {
    totalExpenseCount: expenses.length,
    totalsByCurrency: expenseCurrencyMapToRows(totals),
    selectedYear,
    selectedYearExpenseCount: selectedYearExpenses.length,
    selectedYearTotalsByCurrency: expenseCurrencyMapToRows(selectedYearTotals),
    boughtNotInstalledCount: boughtNotInstalled.length,
    boughtNotInstalledTotalsByCurrency: expenseCurrencyMapToRows(boughtTotals),
    byYear: groupExpenseItems(expenses, (expense) => {
      const year = getExpenseYear(expense);
      return { key: String(year), label: String(year), sort: year };
    }),
    byMonth: groupExpenseItems(selectedYearExpenses, (expense) => {
      const monthKey = getExpenseMonthKeyFromIso(expense.expenseDate);
      const meta = getExpenseMonthMeta(monthKey);
      return { key: monthKey, label: meta.monthLabel, sort: meta.monthStart };
    }),
    byNode: groupExpenseItems(selectedYearExpenses, (expense) => ({
      key: expense.nodeId ?? "without-node",
      label: expense.node?.name?.trim() || "Без узла",
      sort: expense.node?.name?.trim() || "Без узла",
    })),
    byCategory: groupExpenseItems(selectedYearExpenses, (expense) => ({
      key: expense.category,
      label: getExpenseCategoryLabelRu(expense.category),
      sort: getExpenseCategoryLabelRu(expense.category),
    })),
  };
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

/** Group by calendar year (local interpretation of ISO date). */
export function groupExpensesByCalendarYear(
  paidEvents: ServiceEventItem[]
): ExpenseByYearViewModel[] {
  const byYear = new Map<number, Map<string, { total: number; count: number }>>();

  for (const e of paidEvents) {
    const date = new Date(e.eventDate);
    const year = Number.isNaN(date.getTime())
      ? Number(e.eventDate.slice(0, 4))
      : date.getFullYear();
    if (!Number.isFinite(year)) {
      continue;
    }
    let curMap = byYear.get(year);
    if (!curMap) {
      curMap = new Map();
      byYear.set(year, curMap);
    }
    addToCurrencyMap(curMap, e.currency!.trim(), e.costAmount!);
  }

  return Array.from(byYear.entries())
    .map(([year, curMap]) => ({
      year,
      totalsByCurrency: currencyMapToViewModels(curMap),
    }))
    .sort((a, b) => b.year - a.year);
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

export function getCurrentExpenseMonthKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseExpenseMonthKey(monthKey: string): { year: number; month: number } | null {
  const matched = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!matched) {
    return null;
  }
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

export function formatExpenseMonthLabelRu(monthKey: string): string {
  const parsed = parseExpenseMonthKey(monthKey);
  if (!parsed) {
    return monthKey;
  }
  const dt = new Date(parsed.year, parsed.month - 1, 1);
  const label = dt.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  return label.slice(0, 1).toUpperCase() + label.slice(1);
}

export function getExpenseMonthDateRange(monthKey: string): { dateFrom: string; dateTo: string } {
  const parsed = parseExpenseMonthKey(monthKey);
  if (!parsed) {
    const current = getCurrentExpenseMonthKey();
    return getExpenseMonthDateRange(current);
  }
  const from = new Date(parsed.year, parsed.month - 1, 1);
  const next = new Date(parsed.year, parsed.month, 1);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: next.toISOString().slice(0, 10),
  };
}

export function addMonthsToExpenseMonthKey(monthKey: string, delta: number): string {
  const parsed = parseExpenseMonthKey(monthKey);
  const base = parsed
    ? new Date(parsed.year, parsed.month - 1, 1)
    : new Date();
  base.setMonth(base.getMonth() + delta);
  return getCurrentExpenseMonthKey(base);
}

export function filterEventsByExpenseMonth(
  serviceEvents: ServiceEventItem[],
  monthKey: string
): ServiceEventItem[] {
  const { dateFrom, dateTo } = getExpenseMonthDateRange(monthKey);
  return serviceEvents.filter((event) => {
    const date = event.eventDate.slice(0, 10);
    return date >= dateFrom && date < dateTo;
  });
}
