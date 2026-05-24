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
  formatPowerLine,
} from "./vehicle-view-models";
import { buildGarageAttentionIndicatorViewModel } from "./garage-attention";
import { calculateGarageScore } from "./garage-score";

export function buildGarageCardProps(vehicle: GarageVehicleItem): GarageCardProps {
  const summary = buildVehicleSummaryViewModel(vehicle);
  const rideProfile = buildRideProfileViewModel(vehicle.rideProfile);
  const brand = vehicle.motorcycleBrand.name;
  const family = vehicle.motorcycleModelFamily.name;
  const brandModelCaption = `${brand} | ${family}`;
  const specs = vehicle.technicalSpecs;
  const wheels =
    specs?.frontWheelIn != null && specs?.rearWheelIn != null
      ? `${specs.frontWheelIn}″ / ${specs.rearWheelIn}″`
      : specs?.frontWheelIn != null
        ? `${specs.frontWheelIn}″`
        : specs?.rearWheelIn != null
          ? `${specs.rearWheelIn}″`
          : null;
  const weight =
    specs?.weightKg != null ? `${specs.weightKg} кг` : null;
  const power = specs ? formatPowerLine(specs) : null;
  const specHighlights = [
    { label: "Двигатель", value: specs?.engine || "Не указан" },
    {
      label: "Кубатура",
      value: specs?.displacementCc != null ? `${specs.displacementCc} см³` : "Не указана",
    },
    { label: "Мощность", value: power || "Не указана" },
    { label: "Колеса", value: wheels || "Не указаны" },
    { label: "Вес", value: weight || "Не указан" },
  ];

  return {
    vehicleId: vehicle.id,
    brandModelCaption,
    garageScore: calculateGarageScore(vehicle.attentionSummary ?? null),
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
