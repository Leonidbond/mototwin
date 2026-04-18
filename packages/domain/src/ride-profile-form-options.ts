import type {
  RideLoadType,
  RideProfileFieldOption,
  RideStyle,
  RideUsageIntensity,
  RideUsageType,
} from "@mototwin/types";

/**
 * Labels aligned with web onboarding + vehicle profile modals (Russian, stable values).
 * Used for cross-platform parity; mobile may differ slightly from older hard-coded copy.
 */
export const RIDE_USAGE_TYPE_OPTIONS: RideProfileFieldOption<RideUsageType>[] = [
  { value: "CITY", label: "Город" },
  { value: "HIGHWAY", label: "Трасса" },
  { value: "MIXED", label: "Смешанный" },
  { value: "OFFROAD", label: "Off-road" },
];

export const RIDE_RIDING_STYLE_OPTIONS: RideProfileFieldOption<RideStyle>[] = [
  { value: "CALM", label: "Спокойный" },
  { value: "ACTIVE", label: "Активный" },
  { value: "AGGRESSIVE", label: "Агрессивный" },
];

export const RIDE_LOAD_TYPE_OPTIONS: RideProfileFieldOption<RideLoadType>[] = [
  { value: "SOLO", label: "Один" },
  { value: "PASSENGER", label: "С пассажиром" },
  { value: "LUGGAGE", label: "С багажом" },
  { value: "PASSENGER_LUGGAGE", label: "Пассажир и багаж" },
];

export const RIDE_USAGE_INTENSITY_OPTIONS: RideProfileFieldOption<RideUsageIntensity>[] = [
  { value: "LOW", label: "Низкая" },
  { value: "MEDIUM", label: "Средняя" },
  { value: "HIGH", label: "Высокая" },
];
