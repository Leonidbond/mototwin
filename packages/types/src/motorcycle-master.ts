/**
 * Unified motorcycle technical-master types.
 *
 * Mirrors the canonical hierarchy described in
 * `docs/models/mototwin_model_technical_master_standard_cursor.md`:
 *   MotorcycleBrand → MotorcycleModelFamily → MotorcycleVariant → MotorcycleGeneration
 *   plus a 1:1 MotorcycleTechnicalSpecs sidecar.
 *
 * The Prisma enums on these fields use the same string values, so wire types
 * just reuse the union literals.
 */

export type MotoDriveType = "CHAIN" | "SHAFT" | "BELT" | "UNKNOWN";
export type MotoPowerUnit = "hp" | "PS" | "kW";
export type MotoMarketRegion = "GLOBAL" | "EU" | "US" | "RU" | "OTHER";
export type MotoWeightType =
  | "dry"
  | "wet"
  | "curb"
  | "fully_fueled"
  | "without_fuel"
  | "unknown";

/**
 * Curated support level for a generation. The legacy 5-value enum has been
 * replaced by the standard's set; admin can override per generation.
 */
export type MotoSupportLevel =
  | "MVP_CORE"
  | "MVP_CORE_LEGACY"
  | "COMMUNITY_SUPPORT"
  | "EARLY_BETA"
  | "NO_FITMENT_DATA_YET";

/**
 * Raw row shape of `*-model-technical-master.csv` seeds.
 * Field names match the CSV headers in `docs/models/*.md`.
 */
export interface MotoModelTechnicalMasterRow {
  brand: string;
  model_family: string;
  variant: string;
  generation: string;

  year_from: number;
  year_to: number | null;
  years_label: string;
  market_region: MotoMarketRegion;

  segment: string;
  engine: string;

  displacement_cc: number | null;
  displacement_is_approx: boolean;

  power_value: number | null;
  power_unit: MotoPowerUnit | null;
  power_hp_normalized: number | null;
  power_is_approx: boolean;

  torque_nm: number | null;
  torque_is_approx: boolean;

  gearbox: string | null;
  drive: MotoDriveType;

  front_wheel_in: number | null;
  rear_wheel_in: number | null;
  front_tire: string | null;
  rear_tire: string | null;

  fuel_l: number | null;
  fuel_is_approx: boolean;

  weight_kg: number | null;
  weight_type: MotoWeightType | null;

  seat_mm: string | null;

  support_level: MotoSupportLevel;
  data_status: string;
  mototwin_comment: string | null;
  source_url: string | null;
}

/* ------------------------------------------------------------------ */
/* Wire shapes for catalog endpoints                                   */
/* ------------------------------------------------------------------ */

export interface MotorcycleBrandWire {
  id: string;
  name: string;
  slug: string;
}

export interface MotorcycleModelFamilyWire {
  id: string;
  brandId: string;
  name: string;
  slug: string;
}

export interface MotorcycleVariantWire {
  id: string;
  familyId: string;
  name: string;
  slug: string;
}

export interface MotorcycleGenerationWire {
  id: string;
  variantId: string;
  name: string;
  yearFrom: number;
  yearTo: number | null;
  yearsLabel: string;
  marketRegion: MotoMarketRegion;
  segment: string;
  supportLevel: MotoSupportLevel;
  supportLevelReason: string | null;
  dataStatus: string;
  comment: string | null;
  sourceUrl: string | null;
  technicalSpecs: MotorcycleTechnicalSpecsWire | null;
}

export interface MotorcycleTechnicalSpecsWire {
  engine: string;
  displacementCc: number | null;
  displacementIsApprox: boolean;
  powerValue: number | null;
  powerUnit: MotoPowerUnit | null;
  powerHpNormalized: number | null;
  powerIsApprox: boolean;
  torqueNm: number | null;
  torqueIsApprox: boolean;
  gearbox: string | null;
  drive: MotoDriveType;
  frontWheelIn: number | null;
  rearWheelIn: number | null;
  frontTire: string | null;
  rearTire: string | null;
  fuelLiters: number | null;
  fuelIsApprox: boolean;
  weightKg: number | null;
  weightType: MotoWeightType | null;
  seatMm: string | null;
}

/**
 * Compact reference triple used by Vehicle wire shapes (garage, picker, etc.).
 * Always includes the canonical generation row; the variant/family/brand
 * names are denormalized for UI display.
 */
export interface VehicleMotorcycleRefWire {
  brand: { id: string; name: string; slug: string };
  modelFamily: { id: string; name: string; slug: string };
  variant: { id: string; name: string; slug: string };
  generation: MotorcycleGenerationWire;
}

export type MotorcycleCatalogRequestStatusWire = "PENDING" | "APPROVED" | "REJECTED";

export interface CreateMotorcycleCatalogRequestInput {
  motorcycleBrandId?: string;
  brandName?: string;
  motorcycleModelFamilyId?: string;
  familyName?: string;
  motorcycleVariantId?: string;
  variantName?: string;
  yearFrom: number;
  yearTo?: number | null;
  userComment?: string;
}

export interface MotorcycleCatalogRequestWire {
  id: string;
  status: MotorcycleCatalogRequestStatusWire;
  motorcycleBrandId: string | null;
  motorcycleModelFamilyId: string | null;
  brandName: string | null;
  familyName: string | null;
  variantName: string;
  yearFrom: number;
  yearTo: number | null;
  userComment: string | null;
  resolvedBrandName: string | null;
  resolvedFamilyName: string | null;
  resolvedVariantName: string | null;
  resolvedYearFrom: number | null;
  resolvedYearTo: number | null;
  moderationComment: string | null;
  resolvedGenerationId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  displayLabel: string;
  vehicleCount: number;
  submittedBy: {
    id: string;
    displayName: string | null;
    email: string | null;
  } | null;
}

export interface CreateMotorcycleCatalogRequestResponse {
  request: MotorcycleCatalogRequestWire;
  placeholderGenerationId: string;
}

export interface MotorcycleCatalogRequestsResponse {
  requests: MotorcycleCatalogRequestWire[];
}
