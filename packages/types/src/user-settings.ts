export type UserLocalSettingsCurrency = "RUB" | "USD" | "EUR";

export type UserLocalSettingsDistanceUnit = "km" | "mi";

export type UserLocalSettingsDateFormat = "DD.MM.YYYY" | "YYYY-MM-DD";

export type UserLocalSettings = {
  defaultCurrency: UserLocalSettingsCurrency;
  distanceUnit: UserLocalSettingsDistanceUnit;
  engineHoursUnit: "h";
  dateFormat: UserLocalSettingsDateFormat;
  defaultSnoozeDays: 7 | 14 | 30;
};

export type UserSettings = UserLocalSettings;

export type UserSettingsPayload = Partial<UserSettings>;
