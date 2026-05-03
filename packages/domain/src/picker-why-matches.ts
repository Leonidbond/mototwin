import type { PickerDraftCart, VehicleRideProfile } from "@mototwin/types";

export type WhyMatchesInput = {
  vehicleModelLabel: string;
  draft: PickerDraftCart;
  rideProfile: VehicleRideProfile | null | undefined;
};

/**
 * Формирует 3–4 фразы для блока «Почему это подходит».
 * Список меняется в зависимости от заполненности профиля и наличия позиций в draft cart.
 */
export function buildWhyMatchesReasons(input: WhyMatchesInput): string[] {
  const reasons: string[] = [
    "Полная совместимость с вашим мотоциклом",
    "Соответствует штатным размерам",
  ];
  const trimmedModel = input.vehicleModelLabel.trim();
  if (trimmedModel.length > 0) {
    reasons.push(`Проверено владельцами ${trimmedModel}`);
  }
  if (input.rideProfile) {
    reasons.push("Оптимально для вашего стиля езды");
  }
  return reasons;
}
