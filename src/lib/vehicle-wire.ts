import type { Prisma } from "@prisma/client";
import type {
  ExpenseItemVehicleSummary,
  GarageVehicleItem,
  VehicleDetailApiRecord,
  VehicleRideProfile,
  VehicleTechnicalSpecsView,
} from "@mototwin/types";
import { getCatalogRequestDisplayNames } from "@/lib/motorcycle-catalog-request-wire";

/**
 * Prisma `include` shape that produces all data the wire helpers below need.
 * Keep these aligned: every change to the new motorcycle hierarchy include must
 * be reflected in {@link GarageVehicleItem} / {@link VehicleDetailApiRecord}.
 */
export const vehicleWireInclude = {
  motorcycleBrand: { select: { id: true, name: true } },
  motorcycleModelFamily: { select: { id: true, name: true } },
  motorcycleVariant: { select: { id: true, name: true } },
  motorcycleGeneration: {
    select: {
      id: true,
      name: true,
      yearFrom: true,
      yearTo: true,
      yearsLabel: true,
      marketRegion: true,
      technicalSpecs: {
        select: {
          engine: true,
          displacementCc: true,
          powerValue: true,
          powerUnit: true,
          powerHpNormalized: true,
          torqueNm: true,
          gearbox: true,
          drive: true,
          frontWheelIn: true,
          rearWheelIn: true,
          frontTire: true,
          rearTire: true,
          fuelLiters: true,
          weightKg: true,
          weightType: true,
          seatMm: true,
        },
      },
    },
  },
  pendingCatalogRequest: {
    select: {
      id: true,
      status: true,
      brandName: true,
      familyName: true,
      variantName: true,
      yearFrom: true,
      yearTo: true,
      motorcycleBrand: { select: { name: true } },
      motorcycleModelFamily: { select: { name: true } },
    },
  },
  rideProfile: true,
} satisfies Prisma.VehicleInclude;

type VehicleWithMotorcycleIncludes = Prisma.VehicleGetPayload<{
  include: typeof vehicleWireInclude;
}>;

function buildTechnicalSpecsView(
  generation: VehicleWithMotorcycleIncludes["motorcycleGeneration"]
): VehicleTechnicalSpecsView | null {
  const specs = generation.technicalSpecs;
  if (!specs) {
    return null;
  }
  return {
    marketRegion: generation.marketRegion ? String(generation.marketRegion) : null,
    engine: specs.engine,
    displacementCc: specs.displacementCc,
    powerValue: specs.powerValue,
    powerUnit: specs.powerUnit,
    powerHpNormalized: specs.powerHpNormalized,
    torqueNm: specs.torqueNm,
    gearbox: specs.gearbox,
    drive: specs.drive,
    frontWheelIn: specs.frontWheelIn,
    rearWheelIn: specs.rearWheelIn,
    frontTire: specs.frontTire,
    rearTire: specs.rearTire,
    fuelLiters: specs.fuelLiters,
    weightKg: specs.weightKg,
    weightType: specs.weightType,
    seatMm: specs.seatMm,
  };
}

function toRideProfileWire(
  rideProfile: VehicleWithMotorcycleIncludes["rideProfile"]
): VehicleRideProfile | null {
  if (!rideProfile) return null;
  return {
    usageType: rideProfile.usageType,
    ridingStyle: rideProfile.ridingStyle,
    loadType: rideProfile.loadType,
    usageIntensity: rideProfile.usageIntensity,
  };
}

/**
 * Map a Prisma `Vehicle` row (loaded with {@link vehicleWireInclude}) to the
 * canonical {@link GarageVehicleItem} wire shape used by garage/list/trash
 * endpoints.
 */
export function toGarageVehicleItem(
  row: VehicleWithMotorcycleIncludes
): GarageVehicleItem {
  const catalogRequest = row.pendingCatalogRequest;
  const pendingDisplay =
    catalogRequest != null ? getCatalogRequestDisplayNames(catalogRequest) : null;

  const brandName =
    pendingDisplay?.brandName ??
    catalogRequest?.motorcycleBrand?.name ??
    row.motorcycleBrand.name;
  const familyName =
    pendingDisplay?.familyName ??
    catalogRequest?.motorcycleModelFamily?.name ??
    row.motorcycleModelFamily.name;
  const variantName = pendingDisplay?.variantName ?? row.motorcycleVariant.name;
  const generationYearsLabel =
    pendingDisplay?.yearsLabel ?? row.motorcycleGeneration.yearsLabel;

  return {
    id: row.id,
    nickname: row.nickname,
    odometer: row.odometer,
    vin: row.vin,
    engineHours: row.engineHours,
    trashedAt: row.trashedAt ? row.trashedAt.toISOString() : null,
    trashExpiresAt: row.trashExpiresAt
      ? row.trashExpiresAt.toISOString()
      : null,
    motorcycleBrand: {
      id: row.motorcycleBrand.id,
      name: brandName,
    },
    motorcycleModelFamily: {
      id: row.motorcycleModelFamily.id,
      name: familyName,
    },
    motorcycleVariant: {
      id: row.motorcycleVariant.id,
      name: variantName,
    },
    motorcycleGeneration: {
      id: row.motorcycleGeneration.id,
      name: row.motorcycleGeneration.name,
      yearFrom: catalogRequest?.yearFrom ?? row.motorcycleGeneration.yearFrom,
      yearTo: catalogRequest?.yearTo ?? row.motorcycleGeneration.yearTo ?? null,
      yearsLabel: generationYearsLabel,
    },
    technicalSpecs: catalogRequest ? null : buildTechnicalSpecsView(row.motorcycleGeneration),
    rideProfile: toRideProfileWire(row.rideProfile),
    catalogRequest: catalogRequest
      ? {
          id: catalogRequest.id,
          status: catalogRequest.status,
          displayBrandName: brandName,
          displayFamilyName: familyName,
          displayVariantName: variantName,
          yearsLabel: generationYearsLabel,
        }
      : null,
  };
}

/**
 * Map a Prisma `Vehicle` row (loaded with {@link vehicleWireInclude}) to the
 * canonical {@link VehicleDetailApiRecord} wire shape used by single-vehicle
 * endpoints. Consumed by `vehicleDetailFromApiRecord` in `@mototwin/domain`.
 */
export function toVehicleDetailApiRecord(
  row: VehicleWithMotorcycleIncludes
): VehicleDetailApiRecord {
  return {
    id: row.id,
    nickname: row.nickname,
    vin: row.vin,
    odometer: row.odometer,
    engineHours: row.engineHours,
    trashedAt: row.trashedAt ? row.trashedAt.toISOString() : null,
    trashExpiresAt: row.trashExpiresAt
      ? row.trashExpiresAt.toISOString()
      : null,
    motorcycleBrandId: row.motorcycleBrandId,
    motorcycleModelFamilyId: row.motorcycleModelFamilyId,
    motorcycleVariantId: row.motorcycleVariantId,
    motorcycleGenerationId: row.motorcycleGenerationId,
    motorcycleBrand: {
      id: row.motorcycleBrand.id,
      name: row.motorcycleBrand.name,
    },
    motorcycleModelFamily: {
      id: row.motorcycleModelFamily.id,
      name: row.motorcycleModelFamily.name,
    },
    motorcycleVariant: {
      id: row.motorcycleVariant.id,
      name: row.motorcycleVariant.name,
    },
    motorcycleGeneration: {
      id: row.motorcycleGeneration.id,
      name: row.motorcycleGeneration.name,
      yearFrom: row.motorcycleGeneration.yearFrom,
      yearTo: row.motorcycleGeneration.yearTo ?? null,
      yearsLabel: row.motorcycleGeneration.yearsLabel,
      marketRegion: String(row.motorcycleGeneration.marketRegion),
      technicalSpecs: buildTechnicalSpecsView(row.motorcycleGeneration),
    },
    rideProfile: toRideProfileWire(row.rideProfile),
  };
}

/** Minimal vehicle include for expense list/create responses. */
export const expenseVehicleInclude = {
  motorcycleBrand: { select: { name: true } },
  motorcycleModelFamily: { select: { name: true } },
} satisfies Prisma.VehicleInclude;

type ExpenseVehicleWithIncludes = Prisma.VehicleGetPayload<{
  include: typeof expenseVehicleInclude;
}>;

export function toExpenseItemVehicleSummary(
  vehicle: ExpenseVehicleWithIncludes | null | undefined
): ExpenseItemVehicleSummary | null {
  if (!vehicle) {
    return null;
  }
  return {
    id: vehicle.id,
    nickname: vehicle.nickname,
    brandName: vehicle.motorcycleBrand.name,
    modelName: vehicle.motorcycleModelFamily.name,
  };
}
