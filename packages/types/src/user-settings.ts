export type UserLocalSettingsCurrency = "RUB" | "USD" | "EUR";

export type UserLocalSettingsDistanceUnit = "km" | "mi";

export type UserLocalSettingsDateFormat = "DD.MM.YYYY" | "YYYY-MM-DD";
export type VehicleTrashRetentionDays = 7 | 14 | 30 | 60 | 90;

export type UserLocalSettings = {
  defaultCurrency: UserLocalSettingsCurrency;
  distanceUnit: UserLocalSettingsDistanceUnit;
  engineHoursUnit: "h";
  dateFormat: UserLocalSettingsDateFormat;
  defaultSnoozeDays: 7 | 14 | 30;
  vehicleTrashRetentionDays: VehicleTrashRetentionDays;
};

export type UserSettings = UserLocalSettings;

export type UserSettingsPayload = Partial<UserSettings>;
