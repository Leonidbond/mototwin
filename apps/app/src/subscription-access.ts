import type { SubscriptionPlan } from "@mototwin/types";

const VEHICLE_LIMIT_MARKERS = [
  "тариф free позволяет",
  "тариф rider позволяет",
  "vehicle_limit",
  "только 1 мотоцикл",
  "до 3 мотоциклов",
] as const;

export function isVehicleLimitErrorMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return VEHICLE_LIMIT_MARKERS.some((marker) => normalized.includes(marker));
}

export function vehicleLimitRequiredPlan(message: string): Exclude<SubscriptionPlan, "FREE"> {
  const normalized = message.trim().toLowerCase();
  if (normalized.includes("rider") && normalized.includes("pro")) {
    return "PRO";
  }
  if (normalized.includes("rider")) {
    return "RIDER";
  }
  return "RIDER";
}
