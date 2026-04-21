import {
  DEFAULT_DEV_USER_EMAIL,
  DEV_USER_SWITCHER_ENV_FLAG,
  DEV_USER_OPTIONS,
  type DevUserOption,
} from "@mototwin/types";

export function isDevLoginEnabled(): boolean {
  return isDevUserSwitcherEnabled();
}

export function isDevUserSwitcherEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env[DEV_USER_SWITCHER_ENV_FLAG] === "true";
}

export function getDevUserOptions(): DevUserOption[] {
  return DEV_USER_OPTIONS;
}

export function normalizeDevUserEmail(raw: unknown): string {
  if (typeof raw !== "string") {
    return DEFAULT_DEV_USER_EMAIL;
  }
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    return DEFAULT_DEV_USER_EMAIL;
  }
  const known = DEV_USER_OPTIONS.some((option) => option.email === trimmed);
  return known ? trimmed : DEFAULT_DEV_USER_EMAIL;
}
