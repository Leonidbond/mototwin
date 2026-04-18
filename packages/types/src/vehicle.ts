export type RideUsageType = "CITY" | "HIGHWAY" | "MIXED" | "OFFROAD";
export type RideStyle = "CALM" | "ACTIVE" | "AGGRESSIVE";
export type RideLoadType = "SOLO" | "PASSENGER" | "LUGGAGE" | "PASSENGER_LUGGAGE";
export type RideUsageIntensity = "LOW" | "MEDIUM" | "HIGH";

export type VehicleSummary = {
  id: string;
  nickname: string | null;
  brandName: string;
  modelName: string;
  variantName: string;
  year: number;
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

export type GarageVehicleItem = {
  id: string;
  nickname: string | null;
  odometer: number;
  vin: string | null;
  engineHours: number | null;
  brand: {
    name: string;
  };
  model: {
    name: string;
  };
  modelVariant: {
    year: number;
    versionName: string;
    market?: string | null;
    engineType: string | null;
    coolingType: string | null;
    wheelSizes?: string | null;
    brakeSystem?: string | null;
    chainPitch?: string | null;
    stockSprockets?: string | null;
  } | null;
  rideProfile: VehicleRideProfile | null;
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
  rideProfile: VehicleRideProfile | null;
  modelVariant?: {
    year?: number | null;
    versionName?: string | null;
    market?: string | null;
    engineType?: string | null;
    coolingType?: string | null;
    wheelSizes?: string | null;
    brakeSystem?: string | null;
    chainPitch?: string | null;
    stockSprockets?: string | null;
  } | null;
};

/**
 * Wire shape returned by Next vehicle routes with Prisma `include` (`brand`, `model`, `modelVariant`).
 * Canonical UI / domain shape is {@link VehicleDetail}; map with `vehicleDetailFromApiRecord` in `@mototwin/domain`.
 */
export type VehicleDetailApiRecord = {
  id: string;
  nickname: string | null;
  vin: string | null;
  odometer: number;
  engineHours: number | null;
  brand: { name: string };
  model: { name: string };
  modelVariant: {
    year: number;
    versionName: string;
    market?: string | null;
    engineType: string | null;
    coolingType: string | null;
    wheelSizes: string | null;
    brakeSystem: string | null;
    chainPitch: string | null;
    stockSprockets: string | null;
  } | null;
  rideProfile: VehicleRideProfile | null;
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

export type BrandItem = {
  id: string;
  name: string;
  slug: string;
};

export type ModelItem = {
  id: string;
  name: string;
  slug: string;
  brandId: string;
};

export type ModelVariantItem = {
  id: string;
  modelId: string;
  year: number;
  generation: string | null;
  versionName: string;
  market: string | null;
  engineType: string | null;
  coolingType: string | null;
  wheelSizes: string | null;
  brakeSystem: string | null;
  chainPitch: string | null;
  stockSprockets: string | null;
};

export type CreateVehicleInput = {
  brandId: string;
  modelId: string;
  modelVariantId: string;
  nickname?: string | null;
  vin?: string | null;
  odometer: number;
  engineHours: number | null;
  rideProfile: VehicleRideProfile;
};
