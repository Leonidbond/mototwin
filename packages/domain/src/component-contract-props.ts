import type {
  GarageCardProps,
  GarageVehicleItem,
  NodeTreeItem,
  ServiceEventItem,
  ServiceEventsFilters,
  ServiceLogEntryDateStyle,
  ServiceLogSortState,
  VehicleDetail,
  VehicleHeaderProps,
  VehicleStateSectionProps,
} from "@mototwin/types";
import { buildNodeTreeViewModel } from "./node-tree-view-models";
import { filterAndSortServiceEvents } from "./service-log";
import { groupServiceLogByMonth } from "./service-log-view-models";
import {
  buildVehicleDetailViewModel,
  buildVehicleStateViewModel,
  buildVehicleSummaryViewModel,
  buildRideProfileViewModel,
} from "./vehicle-view-models";
import { buildGarageAttentionIndicatorViewModel } from "./garage-attention";

export function buildGarageCardProps(vehicle: GarageVehicleItem): GarageCardProps {
  const summary = buildVehicleSummaryViewModel(vehicle);
  const rideProfile = buildRideProfileViewModel(vehicle.rideProfile);
  const brandModelCaption = `${vehicle.brand.name} | ${vehicle.model.name}`;
  const specHighlights = [
    { label: "Двигатель", value: vehicle.modelVariant?.engineType || "Не указан" },
    { label: "Охлаждение", value: vehicle.modelVariant?.coolingType || "Не указано" },
    { label: "Колеса", value: vehicle.modelVariant?.wheelSizes || "Не указаны" },
    { label: "Тормоза", value: vehicle.modelVariant?.brakeSystem || "Не указаны" },
  ];

  return {
    vehicleId: vehicle.id,
    brandModelCaption,
    summary,
    rideProfile,
    specHighlights,
    attentionIndicator: buildGarageAttentionIndicatorViewModel(vehicle.attentionSummary ?? null),
  };
}

/**
 * Garage cards only: drop empty values and Russian placeholders «Не указан / Не указано / Не указаны».
 * Canonical policy: both web and Expo garage use this after `buildGarageCardProps` so the list matches.
 * Full technical specs (including optional fields like рынок, цепь, звёзды) stay on vehicle detail via
 * `buildVehicleTechnicalInfoViewModel` (non-null rows only).
 */
export function filterMeaningfulGarageSpecHighlights(
  highlights: GarageCardProps["specHighlights"]
): NonNullable<GarageCardProps["specHighlights"]> {
  return (highlights ?? []).filter((item) => {
    const t = item.value.trim();
    if (!t) {
      return false;
    }
    return !/^Не указан(ы|о)?\.?$/i.test(t);
  });
}

export function buildVehicleHeaderProps(vehicle: VehicleDetail): VehicleHeaderProps {
  return {
    vehicleId: vehicle.id,
    detail: buildVehicleDetailViewModel(vehicle),
  };
}

export function buildVehicleStateSectionProps(args: {
  odometer: number;
  engineHours: number | null;
  isEditing?: boolean;
  isSaving?: boolean;
  errorMessage?: string;
}): VehicleStateSectionProps {
  return {
    state: buildVehicleStateViewModel({
      odometer: args.odometer,
      engineHours: args.engineHours,
    }),
    isEditing: args.isEditing,
    isSaving: args.isSaving,
    errorMessage: args.errorMessage,
  };
}

export function buildNodeTreeSectionProps(nodeTree: NodeTreeItem[]): {
  roots: ReturnType<typeof buildNodeTreeViewModel>;
} {
  return { roots: buildNodeTreeViewModel(nodeTree) };
}

export function buildServiceLogTimelineProps(
  serviceEvents: ServiceEventItem[],
  filters: ServiceEventsFilters,
  sort: ServiceLogSortState,
  dateStyle: ServiceLogEntryDateStyle = "default",
  restrictToNodeIds?: string[] | null
): { monthGroups: ReturnType<typeof groupServiceLogByMonth> } {
  const filtered = filterAndSortServiceEvents(
    serviceEvents,
    filters,
    sort,
    restrictToNodeIds
  );
  return { monthGroups: groupServiceLogByMonth(filtered, dateStyle) };
}
