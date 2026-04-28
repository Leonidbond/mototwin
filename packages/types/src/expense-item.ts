export type ExpenseCategory =
  | "SERVICE"
  | "PARTS"
  | "REPAIR"
  | "DIAGNOSTICS"
  | "LABOR"
  | "OTHER_TECHNICAL";

export type ExpenseInstallStatus =
  | "BOUGHT_NOT_INSTALLED"
  | "INSTALLED"
  | "NOT_APPLICABLE";

export type ExpenseItemNodeSummary = {
  id: string;
  name: string;
} | null;

export type ExpenseItemVehicleSummary = {
  id: string;
  nickname: string | null;
  brandName: string;
  modelName: string;
} | null;

export type ExpenseItem = {
  id: string;
  vehicleId: string;
  nodeId: string | null;
  serviceEventId: string | null;
  shoppingListItemId: string | null;
  category: ExpenseCategory;
  installStatus: ExpenseInstallStatus;
  expenseDate: string;
  title: string;
  amount: number;
  currency: string;
  quantity: number;
  comment: string | null;
  partSku: string | null;
  partName: string | null;
  createdAt: string;
  updatedAt: string;
  node: ExpenseItemNodeSummary;
  vehicle?: ExpenseItemVehicleSummary;
};

export type CreateExpenseItemInput = {
  vehicleId: string;
  nodeId?: string | null;
  serviceEventId?: string | null;
  shoppingListItemId?: string | null;
  category: ExpenseCategory;
  installStatus: ExpenseInstallStatus;
  expenseDate: string;
  title: string;
  amount: number;
  currency: string;
  quantity?: number;
  comment?: string | null;
  partSku?: string | null;
  partName?: string | null;
};

export type UpdateExpenseItemInput = Partial<
  Omit<CreateExpenseItemInput, "vehicleId" | "serviceEventId" | "shoppingListItemId">
>;

export type ExpenseAmountByCurrency = {
  currency: string;
  totalAmount: number;
  expenseCount: number;
};

export type ExpenseAnalyticsRow = {
  key: string;
  label: string;
  totalsByCurrency: ExpenseAmountByCurrency[];
  expenseCount: number;
};

export type ExpenseAnalyticsSummary = {
  totalExpenseCount: number;
  totalsByCurrency: ExpenseAmountByCurrency[];
  selectedYear: number;
  selectedYearTotalsByCurrency: ExpenseAmountByCurrency[];
  selectedYearExpenseCount: number;
  boughtNotInstalledCount: number;
  boughtNotInstalledTotalsByCurrency: ExpenseAmountByCurrency[];
  byYear: ExpenseAnalyticsRow[];
  byMonth: ExpenseAnalyticsRow[];
  byNode: ExpenseAnalyticsRow[];
  byCategory: ExpenseAnalyticsRow[];
};

export type ExpensesResponse = {
  expenses: ExpenseItem[];
  analytics: ExpenseAnalyticsSummary;
  years: number[];
};

export type CreateExpenseItemResponse = {
  expense: ExpenseItem;
  analytics: ExpenseAnalyticsSummary;
};

export type UpdateExpenseItemResponse = CreateExpenseItemResponse;

export type DeleteExpenseItemResponse = {
  deleted: true;
  expenseId: string;
};
