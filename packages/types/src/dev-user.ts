export type DevUserOption = {
  email: string;
  label: string;
  garageTitle: string;
};

export const DEV_USER_HEADER_NAME = "x-mototwin-dev-user-email";
export const DEV_USER_STORAGE_KEY = "mototwin.devUserEmail";
export const DEFAULT_DEV_USER_EMAIL = "demo@mototwin.local";
export const DEV_USER_SWITCHER_ENV_FLAG = "MOTOTWIN_ENABLE_DEV_USER_SWITCHER";

export const DEV_USER_OPTIONS: DevUserOption[] = [
  {
    email: "demo@mototwin.local",
    label: "Demo User",
    garageTitle: "Мой гараж",
  },
  {
    email: "user-a@mototwin.local",
    label: "Test User A",
    garageTitle: "Гараж A",
  },
  {
    email: "user-b@mototwin.local",
    label: "Test User B",
    garageTitle: "Гараж B",
  },
];
