/**
 * Shorter names for dense UI (overview badges, attention row titles) so labels
 * stay on one line next to status pills without awkward wraps.
 */
const TIGHT_UI_DISPLAY_NAME_BY_CODE: Record<string, string> = {
  "BRAKES.FLUID": "Тормозная жидкость",
  "ELECTRICS.IGNITION.SPARK": "Свеча",
};

export function getNodeTightUiDisplayName(code: string, canonicalName: string): string {
  return TIGHT_UI_DISPLAY_NAME_BY_CODE[code] ?? canonicalName;
}

/** Keeps badge copy on one line in environments without `white-space: nowrap` (e.g. RN `Text`). */
export function formatNodeBadgeSingleLine(label: string): string {
  return label.replace(/ /g, "\u00A0");
}
