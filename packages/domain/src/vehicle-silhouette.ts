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
    patterns: [/adventure/i, /touring/i, /\badv\b/i],
  },
  {
    key: "sport_supersport",
    patterns: [/supersport/i, /sportbike/i, /\bsport\b/i, /\brr\b/i],
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

export function getVehicleSilhouetteClassLabel(key: VehicleSilhouetteKey): string {
  switch (key) {
    case "adventure_touring":
      return "Adventure class";
    case "enduro_dual_sport":
      return "Enduro class";
    case "naked_roadster":
      return "Naked class";
    case "sport_supersport":
      return "Sport class";
    case "cruiser":
      return "Cruiser class";
    case "classic_retro":
      return "Classic class";
    case "scooter_maxi_scooter":
      return "Scooter class";
    default:
      return "Motorcycle class";
  }
}
