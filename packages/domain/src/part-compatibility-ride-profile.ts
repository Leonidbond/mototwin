import type {
  FitmentReportResultWire,
  PartCompatibilityRideProfileInsightWire,
  RideLoadType,
  RideStyle,
  RideUsageIntensity,
  RideUsageType,
  VehicleRideProfile,
} from "@mototwin/types";
import { buildRideProfileViewModel } from "./vehicle-view-models";

const USAGE: readonly RideUsageType[] = ["CITY", "HIGHWAY", "MIXED", "OFFROAD"];
const STYLE: readonly RideStyle[] = ["CALM", "ACTIVE", "AGGRESSIVE"];
const LOAD: readonly RideLoadType[] = ["SOLO", "PASSENGER", "LUGGAGE", "PASSENGER_LUGGAGE"];
const INTENSITY: readonly RideUsageIntensity[] = ["LOW", "MEDIUM", "HIGH"];

/** Разбор JSON из {@link FitmentReport.rideProfileSnapshot}. */
export function parseVehicleRideProfileSnapshot(json: unknown): VehicleRideProfile | null {
  if (json == null || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const u = o.usageType;
  const r = o.ridingStyle;
  const l = o.loadType;
  const i = o.usageIntensity;
  if (
    typeof u !== "string" ||
    typeof r !== "string" ||
    typeof l !== "string" ||
    typeof i !== "string"
  ) {
    return null;
  }
  if (!USAGE.includes(u as RideUsageType)) return null;
  if (!STYLE.includes(r as RideStyle)) return null;
  if (!LOAD.includes(l as RideLoadType)) return null;
  if (!INTENSITY.includes(i as RideUsageIntensity)) return null;
  return {
    usageType: u as RideUsageType,
    ridingStyle: r as RideStyle,
    loadType: l as RideLoadType,
    usageIntensity: i as RideUsageIntensity,
  };
}

const POSITIVE_RESULTS = new Set<FitmentReportResultWire>([
  "DIRECT_FIT",
  "OEM_REPLACEMENT",
  "FIT_WITH_MODIFICATION",
  "PARTIAL_FIT",
]);

/**
 * Спека §19: рекомендательный слой по положительным отчётам с известным профилем езды.
 * Возвращает null, если данных мало (меньше 3 подходящих отчётов).
 */
export function buildRideProfileCompatibilityInsight(
  rows: ReadonlyArray<{
    fitmentResult: FitmentReportResultWire;
    rideProfile: VehicleRideProfile | null;
  }>
): PartCompatibilityRideProfileInsightWire | null {
  const tagCounts = new Map<string, number>();
  let used = 0;
  for (const row of rows) {
    if (!POSITIVE_RESULTS.has(row.fitmentResult)) continue;
    const prof = row.rideProfile;
    if (!prof) continue;
    const vm = buildRideProfileViewModel(prof);
    if (!vm) continue;
    const tag = `${vm.usageType} · ${vm.ridingStyle}`;
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    used += 1;
  }
  if (used < 3) return null;

  const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5);
  const topTags = top.map(([labelRu, count]) => ({
    labelRu,
    count,
    percent: Math.max(0, Math.round((1000 * count) / used) / 10),
  }));

  const topTwoLabels = top.slice(0, 2).map(([label]) => label);
  const joined =
    topTwoLabels.length >= 2
      ? `${topTwoLabels[0]} и ${topTwoLabels[1]}`
      : topTwoLabels[0] ?? "";

  const headlineRu = `Чаще всего положительно оценивают владельцы с профилем: ${joined} (по ${used} отчётам с указанным профилем езды).`;

  return { headlineRu, topTags, sampleSize: used };
}
