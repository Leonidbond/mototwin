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
  VehicleTechnicalSpecsView,
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

/**
 * Best-effort year label derived from a {@link GarageVehicleItem.motorcycleGeneration}.
 * Prefers the curated `yearsLabel`, then `yearFrom..yearTo` range, otherwise just `yearFrom`.
 */
export function pickGenerationYearLabel(generation: {
  yearFrom: number;
  yearTo: number | null;
  yearsLabel?: string | null;
}): string {
  const curated = generation.yearsLabel?.trim();
  if (curated) {
    return curated;
  }
  if (generation.yearTo != null) {
    return `${generation.yearFrom}–${generation.yearTo}`;
  }
  return `${generation.yearFrom}–`;
}

export function buildVehicleSummaryViewModel(
  vehicle: GarageVehicleItem
): VehicleSummaryViewModel {
  const brand = vehicle.motorcycleBrand.name;
  const family = vehicle.motorcycleModelFamily.name;
  const variant = vehicle.motorcycleVariant.name;
  const generation = vehicle.motorcycleGeneration.name;
  const title = vehicle.nickname?.trim() || `${brand} ${family}`;
  const rideProfile = buildRideProfileViewModel(vehicle.rideProfile);
  const yearLabel = pickGenerationYearLabel(vehicle.motorcycleGeneration);

  return {
    title,
    subtitle: `${brand} · ${family}`,
    yearVersionLine: `${yearLabel} · ${variant} · ${generation}`,
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
    vehicle.nickname?.trim() ||
    `${vehicle.brandName} ${vehicle.modelFamilyName}`.trim();
  const yearLabel = vehicle.yearsLabel?.trim() || (vehicle.year ? String(vehicle.year) : "—");

  return {
    displayName: displayName || "Карточка мотоцикла",
    brandModelLine: `${vehicle.brandName} · ${vehicle.modelFamilyName}`,
    yearVersionLine: `${yearLabel} · ${vehicle.variantName || "—"} · ${vehicle.generationName || "—"}`,
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

function formatMarketRegion(region: string | null | undefined): string | null {
  if (!region) {
    return null;
  }
  switch (region) {
    case "GLOBAL":
      return "Глобальный";
    case "EU":
      return "ЕС";
    case "US":
      return "США";
    case "RU":
      return "Россия";
    case "OTHER":
      return "Другое";
    default:
      return region;
  }
}

function formatDriveType(drive: string | null | undefined): string | null {
  if (!drive) {
    return null;
  }
  switch (drive) {
    case "CHAIN":
      return "Цепь";
    case "BELT":
      return "Ремень";
    case "SHAFT":
      return "Кардан";
    case "UNKNOWN":
      return null;
    default:
      return drive;
  }
}

function formatWeightType(weightType: string | null | undefined): string | null {
  if (!weightType) {
    return null;
  }
  switch (weightType) {
    case "dry":
      return "сухой";
    case "wet":
      return "снаряженный";
    case "curb":
      return "снаряженный";
    case "fully_fueled":
      return "с полным баком";
    case "without_fuel":
      return "без топлива";
    case "unknown":
      return null;
    default:
      return weightType;
  }
}

/** Format `powerValue + powerUnit` as a localized "98 л.с. (72 кВт)" line. */
export function formatPowerLine(specs: VehicleTechnicalSpecsView): string | null {
  if (specs.powerValue == null && specs.powerHpNormalized == null) {
    return null;
  }
  const value = specs.powerValue;
  const unit = specs.powerUnit;
  if (value != null && unit) {
    const unitLabel = unit === "kW" ? "кВт" : unit === "PS" ? "PS" : "л.с.";
    if (specs.powerHpNormalized != null && unit !== "hp") {
      return `${value} ${unitLabel} (~${specs.powerHpNormalized} л.с.)`;
    }
    return `${value} ${unitLabel}`;
  }
  if (specs.powerHpNormalized != null) {
    return `${specs.powerHpNormalized} л.с.`;
  }
  return null;
}

function formatWheelsLine(specs: VehicleTechnicalSpecsView): string | null {
  const front = specs.frontWheelIn != null ? `${specs.frontWheelIn}″` : null;
  const rear = specs.rearWheelIn != null ? `${specs.rearWheelIn}″` : null;
  if (front && rear) {
    return `Перед ${front} / зад ${rear}`;
  }
  return front ?? rear;
}

function formatTiresLine(specs: VehicleTechnicalSpecsView): string | null {
  const front = specs.frontTire?.trim() || null;
  const rear = specs.rearTire?.trim() || null;
  if (front && rear) {
    return `Перед ${front} / зад ${rear}`;
  }
  return front ?? rear;
}

function formatWeightLine(specs: VehicleTechnicalSpecsView): string | null {
  if (specs.weightKg == null) {
    return null;
  }
  const type = formatWeightType(specs.weightType);
  return type ? `${specs.weightKg} кг (${type})` : `${specs.weightKg} кг`;
}

export function buildVehicleTechnicalInfoViewModel(
  vehicle: Pick<VehicleDetail, "technicalSpecs">
): VehicleTechnicalInfoViewModel {
  const specs: VehicleTechnicalSpecsView | null = vehicle.technicalSpecs;
  if (!specs) {
    return { items: [] };
  }
  const rows: Array<{ key: string; label: string; value: string | null }> = [
    { key: "marketRegion", label: "Рынок", value: formatMarketRegion(specs.marketRegion) },
    { key: "engine", label: "Двигатель", value: specs.engine || null },
    {
      key: "displacementCc",
      label: "Кубатура",
      value: specs.displacementCc != null ? `${specs.displacementCc} см³` : null,
    },
    { key: "power", label: "Мощность", value: formatPowerLine(specs) },
    {
      key: "torqueNm",
      label: "Момент",
      value: specs.torqueNm != null ? `${specs.torqueNm} Н·м` : null,
    },
    { key: "gearbox", label: "Коробка", value: specs.gearbox || null },
    { key: "drive", label: "Привод", value: formatDriveType(specs.drive) },
    { key: "wheels", label: "Колеса", value: formatWheelsLine(specs) },
    { key: "tires", label: "Шины", value: formatTiresLine(specs) },
    {
      key: "fuelLiters",
      label: "Бак",
      value: specs.fuelLiters != null ? `${specs.fuelLiters} л` : null,
    },
    { key: "weight", label: "Вес", value: formatWeightLine(specs) },
    { key: "seatMm", label: "Высота сиденья", value: specs.seatMm || null },
  ];
  const items = rows
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
  const generation = record.motorcycleGeneration;
  const technicalSpecs = generation.technicalSpecs
    ? { ...generation.technicalSpecs, marketRegion: generation.marketRegion ?? null }
    : null;
  return {
    id: record.id,
    nickname: record.nickname,
    brandName: record.motorcycleBrand.name,
    modelFamilyName: record.motorcycleModelFamily.name,
    variantName: record.motorcycleVariant.name,
    generationName: generation.name,
    year: generation.yearFrom,
    yearsLabel: generation.yearsLabel,
    vin: record.vin,
    odometer: record.odometer,
    engineHours: record.engineHours,
    trashedAt: record.trashedAt ?? null,
    trashExpiresAt: record.trashExpiresAt ?? null,
    rideProfile: record.rideProfile,
    motorcycleBrandId: record.motorcycleBrandId,
    motorcycleModelFamilyId: record.motorcycleModelFamilyId,
    motorcycleVariantId: record.motorcycleVariantId,
    motorcycleGenerationId: record.motorcycleGenerationId,
    technicalSpecs,
  };
}
