/**
 * Power normalization helpers for `MotorcycleTechnicalSpecs`.
 *
 * The unified standard stores power as `(powerValue, powerUnit)` plus a derived
 * `powerHpNormalized` value used by filters/sort/UI. PS (DIN/Pferdestärke) is
 * extremely close to mechanical hp (1 PS ≈ 0.98632 hp), but for backward
 * compatibility with motorcycle catalog conventions we treat 1 PS = 1 hp.
 */
import type { MotoPowerUnit } from "@mototwin/types";

const PS_TO_HP = 1; // 1 PS treated as 1 hp for catalog purposes (see standard §4).
const KW_TO_HP = 1.35962; // 1 kW = 1.35962 hp (mechanical horsepower).

/**
 * Convert a raw power reading to mechanical horsepower (hp).
 * Returns `null` when either input is null/undefined.
 */
export function normalizePowerToHp(
  value: number | null | undefined,
  unit: MotoPowerUnit | null | undefined
): number | null {
  if (value == null || unit == null) {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  switch (unit) {
    case "hp":
      return value;
    case "PS":
      return value * PS_TO_HP;
    case "kW":
      return roundHp(value * KW_TO_HP);
    default:
      return null;
  }
}

function roundHp(hp: number): number {
  return Math.round(hp * 10) / 10;
}
