/** One currency bucket (no cross-currency total). */
export type ExpenseByCurrencyViewModel = {
  currency: string;
  totalAmount: number;
  paidEventCount: number;
};

/** Paid service costs grouped by calendar month (YYYY-MM). */
export type ExpenseByMonthViewModel = {
  monthKey: string;
  monthStart: number;
  monthLabel: string;
  totalsByCurrency: ExpenseByCurrencyViewModel[];
};

/** Paid service costs grouped by calendar year. */
export type ExpenseByYearViewModel = {
  year: number;
  totalsByCurrency: ExpenseByCurrencyViewModel[];
};

/** Paid service costs grouped by maintenance node (leaf / service target). */
export type ExpenseByNodeViewModel = {
  nodeId: string;
  nodeName: string;
  totalsByCurrency: ExpenseByCurrencyViewModel[];
};

export type ExpenseLatestPaidEventViewModel = {
  id: string;
  eventDate: string;
  serviceType: string;
  totalAmount: number;
  currency: string;
  nodeLabel: string;
};

/** MVP expense rollup derived only from ServiceEvent cost fields. */
export type ExpenseSummaryViewModel = {
  /** SERVICE events with costAmount > 0 and non-empty currency. */
  paidEventCount: number;
  totalsByCurrency: ExpenseByCurrencyViewModel[];
  byMonth: ExpenseByMonthViewModel[];
  byNode: ExpenseByNodeViewModel[];
  latestPaidEvent: ExpenseLatestPaidEventViewModel | null;
  /** Totals for the current local calendar month, if any paid events fall in it. */
  currentMonthTotalsByCurrency: ExpenseByCurrencyViewModel[];
  currentMonthKey: string;
  currentMonthLabel: string;
};
