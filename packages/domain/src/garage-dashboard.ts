import type { ExpenseItem, GarageDashboardSummaryViewModel, GarageVehicleItem } from "@mototwin/types";
import {
  buildExpenseAnalyticsFromItems,
  formatExpenseTotalsByCurrency,
  getCurrentExpenseYear,
} from "./expense-summary";

export type BuildGarageDashboardSummaryOptions = {
  seasonExpenses?: ExpenseItem[];
  /** When true, season expense totals are shown even if the year total is zero. */
  seasonExpensesLoaded?: boolean;
  selectedYear?: number;
};

export function buildGarageDashboardSummary(
  vehicles: GarageVehicleItem[],
  options?: BuildGarageDashboardSummaryOptions
): GarageDashboardSummaryViewModel {
  const motorcyclesCount = vehicles.length;
  const motorcyclesWithAttentionCount = vehicles.filter(
    (vehicle) => (vehicle.attentionSummary?.totalCount ?? 0) > 0
  ).length;
  const attentionItemsTotalCount = vehicles.reduce(
    (sum, vehicle) => sum + (vehicle.attentionSummary?.totalCount ?? 0),
    0
  );

  const seasonExpenses = options?.seasonExpenses ?? [];
  const selectedYear = options?.selectedYear ?? getCurrentExpenseYear();
  let currentMonthExpensesLabel: string | null = null;
  if (options?.seasonExpensesLoaded) {
    const analytics = buildExpenseAnalyticsFromItems(seasonExpenses, selectedYear);
    currentMonthExpensesLabel = formatExpenseTotalsByCurrency(
      analytics.selectedYearTotalsByCurrency
    );
  }

  return {
    motorcyclesCount,
    motorcyclesWithAttentionCount,
    attentionItemsTotalCount,
    activeWishlistItemsCount: null,
    currentMonthExpensesLabel,
  };
}
