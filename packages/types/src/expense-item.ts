export type ExpenseCategory =
  | "PART"
  | "CONSUMABLE"
  | "SERVICE_WORK"
  | "REPAIR"
  | "DIAGNOSTICS"
  | "OTHER";

export type ExpenseInstallStatus =
  | "BOUGHT_NOT_INSTALLED"
  | "INSTALLED"
  | "NOT_APPLICABLE";

export type ExpensePurchaseStatus = "PLANNED" | "PURCHASED";

export type ExpenseInstallationStatus = "NOT_INSTALLED" | "INSTALLED";

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
  purchaseStatus: ExpensePurchaseStatus;
  installationStatus: ExpenseInstallationStatus;
  expenseDate: string;
  title: string;
  amount: number;
  currency: string;
  quantity: number;
  comment: string | null;
  partSku: string | null;
  partName: string | null;
  vendor: string | null;
  purchasedAt: string | null;
  installedAt: string | null;
  odometer: number | null;
  engineHours: number | null;
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
  purchaseStatus?: ExpensePurchaseStatus;
  installationStatus?: ExpenseInstallationStatus;
  expenseDate: string;
  title: string;
  amount: number;
  currency: string;
  quantity?: number;
  comment?: string | null;
  partSku?: string | null;
  partName?: string | null;
  vendor?: string | null;
  purchasedAt?: string | null;
  installedAt?: string | null;
  odometer?: number | null;
  engineHours?: number | null;
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

export type UninstalledExpensesResponse = {
  expenses: ExpenseItem[];
};

export type ExpenseNodeSummaryItem = {
  nodeId: string;
  totalByCurrency: {
    currency: string;
    amount: number;
  }[];
  expenseCount: number;
  purchasedNotInstalledCount: number;
  latestExpenses: {
    id: string;
    date: string;
    title: string;
    amount: number;
    currency: string;
    category: ExpenseCategory;
    installationStatus: ExpenseInstallationStatus;
  }[];
};

export type ExpenseNodeSummaryResponse = {
  year: number;
  nodes: ExpenseNodeSummaryItem[];
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

export type CreateExpenseFromShoppingListInput = {
  amount: number;
  currency: string;
  purchasedAt?: string | null;
  vendor?: string | null;
  comment?: string | null;
};

export type CreateExpenseFromShoppingListResponse = {
  expense: ExpenseItem;
};

export type MarkExpenseInstalledInput = {
  installedAt: string;
  serviceEventId?: string | null;
  odometer?: number | null;
  engineHours?: number | null;
};

export type MarkExpenseInstalledResponse = {
  expense: ExpenseItem;
};
