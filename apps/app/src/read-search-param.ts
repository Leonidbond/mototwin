/** Expo Router may return `string | string[]` for the same query key. */
export function readSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
