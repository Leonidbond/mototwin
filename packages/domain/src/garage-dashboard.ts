import type { ExpenseItem, GarageDashboardSummaryViewModel, GarageVehicleItem } from "@mototwin/types";
import {
  buildExpenseAnalyticsFromItems,
  formatExpenseTotalsByCurrency,
  getCurrentExpenseYear,
} from "./expense-summary";

export type BuildGarageDashboardSummaryOptions = {
  seasonExpenses?: ExpenseItem[];
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
  if (seasonExpenses.length > 0) {
    const analytics = buildExpenseAnalyticsFromItems(seasonExpenses, selectedYear);
    if (analytics.selectedYearExpenseCount > 0) {
      currentMonthExpensesLabel = formatExpenseTotalsByCurrency(
        analytics.selectedYearTotalsByCurrency
      );
    }
  }

  return {
    motorcyclesCount,
    motorcyclesWithAttentionCount,
    attentionItemsTotalCount,
    activeWishlistItemsCount: null,
    currentMonthExpensesLabel,
  };
}
