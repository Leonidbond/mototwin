import type { GarageVehicleItem } from "@mototwin/types";

export type VehicleSilhouetteKey =
  | "adventure_touring"
  | "enduro_dual_sport"
  | "naked_roadster"
  | "sport_supersport"
  | "cruiser"
  | "classic_retro"
  | "scooter_maxi_scooter";

const KEYWORDS: Array<{ key: VehicleSilhouetteKey; patterns: RegExp[] }> = [
  {
    key: "scooter_maxi_scooter",
    patterns: [/scooter/i, /maxi\s*-?\s*scooter/i, /vespa/i],
  },
  {
    key: "enduro_dual_sport",
    patterns: [/enduro/i, /dual\s*-?\s*sport/i, /off\s*-?\s*road/i],
  },
  {
    key: "adventure_touring",
    patterns: [/adventure/i, /touring/i, /adv/i],
  },
  {
    key: "sport_supersport",
    patterns: [/supersport/i, /sportbike/i, /sport/i, /rr/i],
  },
  {
    key: "cruiser",
    patterns: [/cruiser/i, /bobber/i, /chopper/i],
  },
  {
    key: "classic_retro",
    patterns: [/classic/i, /retro/i, /heritage/i, /scrambler/i],
  },
  {
    key: "naked_roadster",
    patterns: [/naked/i, /roadster/i, /street/i],
  },
];

export function resolveGarageVehicleSilhouette(
  vehicle: Pick<GarageVehicleItem, "brand" | "model" | "modelVariant" | "rideProfile">,
  fallback: VehicleSilhouetteKey = "naked_roadster"
): VehicleSilhouetteKey {
  const haystack = [
    vehicle.brand?.name ?? "",
    vehicle.model?.name ?? "",
    vehicle.modelVariant?.versionName ?? "",
    vehicle.rideProfile?.usageType ?? "",
    vehicle.rideProfile?.ridingStyle ?? "",
  ]
    .join(" ")
    .trim();

  for (const candidate of KEYWORDS) {
    if (candidate.patterns.some((re) => re.test(haystack))) {
      return candidate.key;
    }
  }

  return fallback;
}
