import type { StaticImageData } from "next/image";
import { resolveGarageVehicleSilhouette } from "@mototwin/domain";
import type { VehicleDetail } from "@mototwin/types";
import adventureTouring from "../../images/Motocycles/adventure_touring.png";
import enduroDualSport from "../../images/Motocycles/enduro_dual_sport.png";
import nakedRoadster from "../../images/Motocycles/naked_roadster.png";
import sportSupersport from "../../images/Motocycles/sport_supersport.png";
import cruiser from "../../images/Motocycles/cruiser.png";
import classicRetro from "../../images/Motocycles/classic_retro.png";
import scooterMaxiScooter from "../../images/Motocycles/scooter_maxi_scooter.png";

const SILHOUETTE_SRC = {
  adventure_touring: adventureTouring,
  enduro_dual_sport: enduroDualSport,
  naked_roadster: nakedRoadster,
  sport_supersport: sportSupersport,
  cruiser,
  classic_retro: classicRetro,
  scooter_maxi_scooter: scooterMaxiScooter,
} as const;

/** Тот же выбор PNG, что в гараже / `VehicleSilhouette`, по полям карточки ТС. */
export function getVehicleDetailSilhouetteStaticSrc(vehicle: VehicleDetail): StaticImageData {
  const key = resolveGarageVehicleSilhouette({
    brand: { name: vehicle.brandName },
    model: { name: vehicle.modelName },
    modelVariant: {
      year: vehicle.year,
      versionName: vehicle.variantName,
      market: vehicle.modelVariant?.market ?? null,
      engineType: vehicle.modelVariant?.engineType ?? null,
      coolingType: vehicle.modelVariant?.coolingType ?? null,
      wheelSizes: vehicle.modelVariant?.wheelSizes ?? null,
      brakeSystem: vehicle.modelVariant?.brakeSystem ?? null,
      chainPitch: vehicle.modelVariant?.chainPitch ?? null,
      stockSprockets: vehicle.modelVariant?.stockSprockets ?? null,
    },
    rideProfile: vehicle.rideProfile,
  });
  return SILHOUETTE_SRC[key] ?? SILHOUETTE_SRC.naked_roadster;
}
