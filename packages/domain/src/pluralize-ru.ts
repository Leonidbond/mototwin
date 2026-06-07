/** Russian plural form: 1 мотоцикл, 2 мотоцикла, 5 мотоциклов. */
export function pluralizeRu(
  value: number,
  variants: [one: string, few: string, many: string]
): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return variants[0];
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return variants[1];
  }
  return variants[2];
}

export function pluralizeMotorcycleRu(count: number): string {
  return pluralizeRu(count, ["мотоцикл", "мотоцикла", "мотоциклов"]);
}
