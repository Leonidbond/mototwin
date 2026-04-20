import type { GarageDashboardSummaryViewModel, GarageVehicleItem } from "@mototwin/types";

export function buildGarageDashboardSummary(
  vehicles: GarageVehicleItem[]
): GarageDashboardSummaryViewModel {
  const motorcyclesCount = vehicles.length;
  const motorcyclesWithAttentionCount = vehicles.filter(
    (vehicle) => (vehicle.attentionSummary?.totalCount ?? 0) > 0
  ).length;
  const attentionItemsTotalCount = vehicles.reduce(
    (sum, vehicle) => sum + (vehicle.attentionSummary?.totalCount ?? 0),
    0
  );
  return {
    motorcyclesCount,
    motorcyclesWithAttentionCount,
    attentionItemsTotalCount,
    activeWishlistItemsCount: null,
    currentMonthExpensesLabel: null,
  };
}
