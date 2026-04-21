import type {
  GarageVehicleItem,
  RideProfileViewModel,
  VehicleDetail,
  VehicleDetailApiRecord,
  VehicleDetailViewModel,
  VehicleStateViewModel,
  VehicleSummaryViewModel,
  VehicleTechnicalInfoViewModel,
  VehicleRideProfile,
} from "@mototwin/types";

function formatUsageType(value: string): string {
  switch (value) {
    case "CITY":
      return "Город";
    case "HIGHWAY":
      return "Трасса";
    case "MIXED":
      return "Смешанный";
    case "OFFROAD":
      return "Off-road";
    default:
      return value;
  }
}

function formatRidingStyle(value: string): string {
  switch (value) {
    case "CALM":
      return "Спокойный";
    case "ACTIVE":
      return "Активный";
    case "AGGRESSIVE":
      return "Агрессивный";
    default:
      return value;
  }
}

function formatLoadType(value: string): string {
  switch (value) {
    case "SOLO":
      return "Один";
    case "PASSENGER":
      return "С пассажиром";
    case "LUGGAGE":
      return "С багажом";
    case "PASSENGER_LUGGAGE":
      return "Пассажир и багаж";
    default:
      return value;
  }
}

function formatUsageIntensity(value: string): string {
  switch (value) {
    case "LOW":
      return "Низкая";
    case "MEDIUM":
      return "Средняя";
    case "HIGH":
      return "Высокая";
    default:
      return value;
  }
}

export function buildRideProfileViewModel(
  rideProfile: VehicleRideProfile | null | undefined
): RideProfileViewModel | null {
  if (!rideProfile) {
    return null;
  }

  return {
    usageType: formatUsageType(rideProfile.usageType),
    ridingStyle: formatRidingStyle(rideProfile.ridingStyle),
    loadType: formatLoadType(rideProfile.loadType),
    usageIntensity: formatUsageIntensity(rideProfile.usageIntensity),
  };
}

export function buildVehicleSummaryViewModel(
  vehicle: GarageVehicleItem
): VehicleSummaryViewModel {
  const title =
    vehicle.nickname?.trim() || `${vehicle.brand.name} ${vehicle.model.name}`;
  const rideProfile = buildRideProfileViewModel(vehicle.rideProfile);

  return {
    title,
    subtitle: `${vehicle.brand.name} · ${vehicle.model.name}`,
    yearVersionLine: vehicle.modelVariant
      ? `${vehicle.modelVariant.year} · ${vehicle.modelVariant.versionName}`
      : "Модификация не указана",
    vinLine: vehicle.vin?.trim() || null,
    odometerLine: `${vehicle.odometer} км`,
    engineHoursLine:
      vehicle.engineHours !== null ? String(vehicle.engineHours) : null,
    engineHoursLineWithUnit:
      vehicle.engineHours !== null ? `${vehicle.engineHours} ч` : null,
    rideProfileSummary: rideProfile?.usageType ?? null,
  };
}

export function buildVehicleDetailViewModel(
  vehicle: VehicleDetail
): VehicleDetailViewModel {
  const displayName =
    vehicle.nickname?.trim() || `${vehicle.brandName} ${vehicle.modelName}`.trim();

  const resolvedYear = vehicle.modelVariant?.year ?? vehicle.year;
  const resolvedVersion = vehicle.modelVariant?.versionName ?? vehicle.variantName;

  return {
    displayName: displayName || "Карточка мотоцикла",
    brandModelLine: `${vehicle.brandName} · ${vehicle.modelName}`,
    yearVersionLine: `${resolvedYear || "—"} · ${resolvedVersion || "—"}`,
    vinLine: vehicle.vin || "Не указан",
  };
}

export function buildVehicleStateViewModel(args: {
  odometer: number;
  engineHours: number | null;
}): VehicleStateViewModel {
  return {
    odometerLabel: "Пробег",
    odometerValue: `${args.odometer} км`,
    engineHoursLabel: "Моточасы",
    engineHoursValue:
      args.engineHours !== null ? `${args.engineHours} ч` : "Не указаны",
  };
}

export function buildVehicleTechnicalInfoViewModel(
  vehicle: Pick<VehicleDetail, "modelVariant">
): VehicleTechnicalInfoViewModel {
  const variant = vehicle.modelVariant;
  const items = [
    { key: "market", label: "Рынок", value: variant?.market || null },
    { key: "engineType", label: "Двигатель", value: variant?.engineType || null },
    { key: "coolingType", label: "Охлаждение", value: variant?.coolingType || null },
    { key: "wheelSizes", label: "Колеса", value: variant?.wheelSizes || null },
    { key: "brakeSystem", label: "Тормоза", value: variant?.brakeSystem || null },
    { key: "chainPitch", label: "Шаг цепи", value: variant?.chainPitch || null },
    {
      key: "stockSprockets",
      label: "Стоковые звезды",
      value: variant?.stockSprockets || null,
    },
  ]
    .filter((item) => Boolean(item.value))
    .map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value as string,
    }));

  return { items };
}

/** Map Prisma/API nested vehicle JSON to shared {@link VehicleDetail} for view-model helpers. */
export function vehicleDetailFromApiRecord(record: VehicleDetailApiRecord): VehicleDetail {
  const mv = record.modelVariant;
  return {
    id: record.id,
    nickname: record.nickname,
    brandName: record.brand.name,
    modelName: record.model.name,
    variantName: mv?.versionName ?? "",
    year: mv?.year ?? 0,
    vin: record.vin,
    odometer: record.odometer,
    engineHours: record.engineHours,
    trashedAt: record.trashedAt ?? null,
    trashExpiresAt: record.trashExpiresAt ?? null,
    rideProfile: record.rideProfile,
    modelVariant: mv
      ? {
          year: mv.year,
          versionName: mv.versionName,
          market: mv.market ?? null,
          engineType: mv.engineType,
          coolingType: mv.coolingType,
          wheelSizes: mv.wheelSizes,
          brakeSystem: mv.brakeSystem,
          chainPitch: mv.chainPitch,
          stockSprockets: mv.stockSprockets,
        }
      : null,
  };
}
