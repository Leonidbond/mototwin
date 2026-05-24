import type {
  MotoDriveType,
  MotoPowerUnit,
  MotoSupportLevel,
  MotoWeightType,
  MotorcycleBrandWire,
  MotorcycleGenerationWire,
  MotorcycleModelFamilyWire,
  MotorcycleTechnicalSpecsWire,
  MotorcycleVariantWire,
} from "./motorcycle-master";

export type RideUsageType = "CITY" | "HIGHWAY" | "MIXED" | "OFFROAD";
export type RideStyle = "CALM" | "ACTIVE" | "AGGRESSIVE";
export type RideLoadType = "SOLO" | "PASSENGER" | "LUGGAGE" | "PASSENGER_LUGGAGE";
export type RideUsageIntensity = "LOW" | "MEDIUM" | "HIGH";

/**
 * Flattened canonical UI summary of a motorcycle, derived from the 4-level
 * `MotorcycleBrand → MotorcycleModelFamily → MotorcycleVariant → MotorcycleGeneration`
 * hierarchy.
 *
 * `modelFamilyName` corresponds to `MotorcycleModelFamily.name`, `variantName` to
 * `MotorcycleVariant.name`, and `generationName` to `MotorcycleGeneration.name`.
 * `year` is derived from `MotorcycleGeneration.yearFrom` (the start of the year range).
 * `yearsLabel` is the curated display string (e.g. `2019-current`).
 */
export type VehicleSummary = {
  id: string;
  nickname: string | null;
  brandName: string;
  modelFamilyName: string;
  variantName: string;
  generationName: string;
  year: number;
  yearsLabel: string;
};

export type VehicleSummaryViewModel = {
  title: string;
  subtitle: string;
  yearVersionLine: string;
  vinLine: string | null;
  odometerLine: string;
  engineHoursLine: string | null;
  engineHoursLineWithUnit: string | null;
  rideProfileSummary: string | null;
};

export type VehicleDetailViewModel = {
  displayName: string;
  brandModelLine: string;
  yearVersionLine: string;
  vinLine: string;
};

export type VehicleStateViewModel = {
  odometerLabel: string;
  odometerValue: string;
  engineHoursLabel: string;
  engineHoursValue: string;
};

export type RideProfileViewModel = {
  usageType: string;
  ridingStyle: string;
  loadType: string;
  usageIntensity: string;
};

export type VehicleTechnicalInfoViewModel = {
  items: Array<{
    key: string;
    label: string;
    value: string;
  }>;
};

export type GarageDashboardSummaryViewModel = {
  motorcyclesCount: number;
  motorcyclesWithAttentionCount: number;
  attentionItemsTotalCount: number;
  activeWishlistItemsCount: number | null;
  currentMonthExpensesLabel: string | null;
};

/** Counts from the same attention rules as `buildAttentionSummaryFromNodeTree` (garage API). */
export type GarageAttentionSummaryWire = {
  totalCount: number;
  overdueCount: number;
  soonCount: number;
};

/**
 * UI projection of {@link MotorcycleTechnicalSpecsWire} used in the vehicle plaque /
 * details panel. Mirrors columns from the unified motorcycle technical master
 * standard (§3, technical_specifications block) — the canonical post-refactor shape.
 *
 * `marketRegion` lives on the parent generation (it's not part of the tech-specs
 * sidecar) but we surface it here for the same UI plaque convenience.
 */
export type VehicleTechnicalSpecsView = {
  marketRegion: string | null;
  engine: string;
  displacementCc: number | null;
  powerValue: number | null;
  powerUnit: MotoPowerUnit | null;
  powerHpNormalized: number | null;
  torqueNm: number | null;
  gearbox: string | null;
  drive: MotoDriveType;
  frontWheelIn: number | null;
  rearWheelIn: number | null;
  frontTire: string | null;
  rearTire: string | null;
  fuelLiters: number | null;
  weightKg: number | null;
  weightType: MotoWeightType | null;
  seatMm: string | null;
};

export type GarageVehicleItem = {
  id: string;
  nickname: string | null;
  odometer: number;
  vin: string | null;
  engineHours: number | null;
  trashedAt?: string | null;
  trashExpiresAt?: string | null;
  motorcycleBrand: { id: string; name: string };
  motorcycleModelFamily: { id: string; name: string };
  motorcycleVariant: { id: string; name: string };
  motorcycleGeneration: {
    id: string;
    name: string;
    yearFrom: number;
    yearTo: number | null;
    yearsLabel: string;
  };
  technicalSpecs: VehicleTechnicalSpecsView | null;
  rideProfile: VehicleRideProfile | null;
  /** Present when garage API computed maintenance attention for this row. */
  attentionSummary?: GarageAttentionSummaryWire | null;
};

export type VehicleRideProfile = {
  usageType: RideUsageType;
  ridingStyle: RideStyle;
  loadType: RideLoadType;
  usageIntensity: RideUsageIntensity;
};

export type VehicleDetail = VehicleSummary & {
  vin: string | null;
  odometer: number;
  engineHours: number | null;
  trashedAt?: string | null;
  trashExpiresAt?: string | null;
  rideProfile: VehicleRideProfile | null;
  motorcycleBrandId: string;
  motorcycleModelFamilyId: string;
  motorcycleVariantId: string;
  motorcycleGenerationId: string;
  technicalSpecs: VehicleTechnicalSpecsView | null;
};

/**
 * Wire shape returned by Next vehicle routes with Prisma `include`
 * (`motorcycleBrand`, `motorcycleModelFamily`, `motorcycleVariant`,
 * `motorcycleGeneration` + nested `technicalSpecs`). Canonical UI / domain shape is
 * {@link VehicleDetail}; map with `vehicleDetailFromApiRecord` in `@mototwin/domain`.
 */
export type VehicleDetailApiRecord = {
  id: string;
  nickname: string | null;
  vin: string | null;
  odometer: number;
  engineHours: number | null;
  trashedAt?: string | null;
  trashExpiresAt?: string | null;
  motorcycleBrandId: string;
  motorcycleModelFamilyId: string;
  motorcycleVariantId: string;
  motorcycleGenerationId: string;
  motorcycleBrand: { id: string; name: string };
  motorcycleModelFamily: { id: string; name: string };
  motorcycleVariant: { id: string; name: string };
  motorcycleGeneration: {
    id: string;
    name: string;
    yearFrom: number;
    yearTo: number | null;
    yearsLabel: string;
    marketRegion: string;
    technicalSpecs: VehicleTechnicalSpecsView | null;
  };
  rideProfile: VehicleRideProfile | null;
};

export type VehicleTrashInfo = {
  trashedAt: string;
  trashExpiresAt: string;
};

export type TrashedVehicleViewModel = {
  id: string;
  title: string;
  subtitle: string;
  trashedAtLabel: string;
  expiresAtLabel: string;
  daysRemaining: number | null;
  isExpired: boolean;
};

export type UpdateVehicleStateInput = {
  odometer: number;
  engineHours: number | null;
};

export type UpdateVehicleProfileInput = {
  nickname: string | null;
  vin: string | null;
  rideProfile: VehicleRideProfile;
};

export type UpdateVehicleProfilePayload = UpdateVehicleProfileInput;

export type UpdateVehicleProfileResult = {
  vehicle: VehicleDetail;
};

/** UI list item for the new motorcycle picker (catalog brand step). */
export type MotorcycleBrandPickerItem = {
  id: string;
  name: string;
  slug: string;
  supportLevel: MotoSupportLevel;
};

/** UI list item for the new motorcycle picker (model-family step). */
export type MotorcycleModelFamilyPickerItem = {
  id: string;
  motorcycleBrandId: string;
  name: string;
  slug: string;
  supportLevel: MotoSupportLevel;
};

/** UI list item for the new motorcycle picker (variant step). */
export type MotorcycleVariantPickerItem = {
  id: string;
  motorcycleModelFamilyId: string;
  name: string;
  slug: string;
  supportLevel: MotoSupportLevel;
};

/** UI list item for the new motorcycle picker (generation step). */
export type MotorcycleGenerationPickerItem = {
  id: string;
  motorcycleVariantId: string;
  name: string;
  yearFrom: number;
  yearTo: number | null;
  yearsLabel: string;
  marketRegion: string;
  segment: string;
  supportLevel: MotoSupportLevel;
  technicalSpecs: VehicleTechnicalSpecsView | null;
};

/** Anchors for creating a `Vehicle`: 4-level FK set + ownership/state fields. */
export type CreateVehicleInput = {
  motorcycleBrandId: string;
  motorcycleModelFamilyId: string;
  motorcycleVariantId: string;
  motorcycleGenerationId: string;
  nickname?: string | null;
  vin?: string | null;
  odometer: number;
  engineHours: number | null;
  rideProfile: VehicleRideProfile;
};

/** Re-exports for callers that want full wire shapes instead of the trimmed picker items. */
export type {
  MotorcycleBrandWire,
  MotorcycleGenerationWire,
  MotorcycleModelFamilyWire,
  MotorcycleTechnicalSpecsWire,
  MotorcycleVariantWire,
};
