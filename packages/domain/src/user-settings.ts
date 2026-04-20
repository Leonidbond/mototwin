import type {
  UserLocalSettings,
  UserLocalSettingsCurrency,
  UserLocalSettingsDateFormat,
  UserLocalSettingsDistanceUnit,
} from "@mototwin/types";

export const USER_LOCAL_SETTINGS_STORAGE_KEY = "mototwin.userLocalSettings";

export const DEFAULT_USER_LOCAL_SETTINGS: UserLocalSettings = {
  defaultCurrency: "RUB",
  distanceUnit: "km",
  engineHoursUnit: "h",
  dateFormat: "DD.MM.YYYY",
  defaultSnoozeDays: 7,
};

function isCurrency(value: unknown): value is UserLocalSettingsCurrency {
  return value === "RUB" || value === "USD" || value === "EUR";
}

function isDistanceUnit(value: unknown): value is UserLocalSettingsDistanceUnit {
  return value === "km" || value === "mi";
}

function isDateFormat(value: unknown): value is UserLocalSettingsDateFormat {
  return value === "DD.MM.YYYY" || value === "YYYY-MM-DD";
}

function isSnoozeDays(value: unknown): value is UserLocalSettings["defaultSnoozeDays"] {
  return value === 7 || value === 14 || value === 30;
}

export function normalizeUserLocalSettings(value: unknown): UserLocalSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_USER_LOCAL_SETTINGS };
  }
  const raw = value as Record<string, unknown>;
  return {
    defaultCurrency: isCurrency(raw.defaultCurrency)
      ? raw.defaultCurrency
      : DEFAULT_USER_LOCAL_SETTINGS.defaultCurrency,
    distanceUnit: isDistanceUnit(raw.distanceUnit)
      ? raw.distanceUnit
      : DEFAULT_USER_LOCAL_SETTINGS.distanceUnit,
    engineHoursUnit: "h",
    dateFormat: isDateFormat(raw.dateFormat) ? raw.dateFormat : DEFAULT_USER_LOCAL_SETTINGS.dateFormat,
    defaultSnoozeDays: isSnoozeDays(raw.defaultSnoozeDays)
      ? raw.defaultSnoozeDays
      : DEFAULT_USER_LOCAL_SETTINGS.defaultSnoozeDays,
  };
}

export function mergeUserLocalSettings(
  current: UserLocalSettings,
  patch: Partial<UserLocalSettings>
): UserLocalSettings {
  const normalizedCurrent = normalizeUserLocalSettings(current);
  return normalizeUserLocalSettings({ ...normalizedCurrent, ...patch });
}

export function getDefaultCurrencyFromSettings(settings: UserLocalSettings): UserLocalSettingsCurrency {
  return normalizeUserLocalSettings(settings).defaultCurrency;
}

export function getDefaultSnoozeDaysFromSettings(
  settings: UserLocalSettings
): UserLocalSettings["defaultSnoozeDays"] {
  return normalizeUserLocalSettings(settings).defaultSnoozeDays;
}
