import type {
  RideStyle,
  RideUsageType,
  VehicleRideProfile,
} from "@mototwin/types";

const USAGE_TYPE_SHORT_RU: Record<RideUsageType, string> = {
  CITY: "Город",
  HIGHWAY: "Трасса",
  MIXED: "Mixed",
  OFFROAD: "Off-road",
};

const RIDING_STYLE_SHORT_RU: Record<RideStyle, string> = {
  CALM: "Calm",
  ACTIVE: "Touring",
  AGGRESSIVE: "Sport",
};

/**
 * Формирует короткую chip-строку для UI picker-а («Mixed / Touring», «Город / Calm» и т. д.).
 * Если профиль не задан — `null` (UI показывает «Стиль езды: не задан»).
 */
export function formatRideStyleChipRu(
  profile: VehicleRideProfile | null | undefined
): string | null {
  if (!profile) {
    return null;
  }
  const usage = USAGE_TYPE_SHORT_RU[profile.usageType];
  const style = RIDING_STYLE_SHORT_RU[profile.ridingStyle];
  if (!usage || !style) {
    return null;
  }
  return `${usage} / ${style}`;
}

/** Полная подпись для chip с префиксом «Стиль езды: …» либо «Стиль езды: не задан». */
export function formatRideStyleChipLabelRu(
  profile: VehicleRideProfile | null | undefined
): string {
  const chip = formatRideStyleChipRu(profile);
  return chip ? `Стиль езды: ${chip}` : "Стиль езды: не задан";
}
