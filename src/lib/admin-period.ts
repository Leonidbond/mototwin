import type { AdminPeriodKey, AdminPeriodValue } from "@mototwin/types";

export const ADMIN_DEFAULT_PERIOD: AdminPeriodKey = "7d";

const DAYS_BY_KEY: Record<AdminPeriodKey, number> = {
  "1d": 1,
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "90d": 90,
  custom: 7,
};

/** Parse `period` from query/searchParams; falls back to default. */
export function parsePeriodKey(value: string | null | undefined): AdminPeriodKey {
  if (!value) return ADMIN_DEFAULT_PERIOD;
  if (
    value === "1d" ||
    value === "7d" ||
    value === "14d" ||
    value === "30d" ||
    value === "90d" ||
    value === "custom"
  ) {
    return value;
  }
  return ADMIN_DEFAULT_PERIOD;
}

export function periodDays(key: AdminPeriodKey): number {
  return DAYS_BY_KEY[key] ?? 7;
}

export function resolvePeriod(
  key: AdminPeriodKey,
  now: Date = new Date()
): AdminPeriodValue & { fromDate: Date; toDate: Date } {
  const days = periodDays(key);
  const toDate = new Date(now);
  const fromDate = new Date(now);
  fromDate.setUTCDate(fromDate.getUTCDate() - days);
  return {
    key,
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    fromDate,
    toDate,
  };
}

/**
 * Bucket a period range into N daily points (UTC midnight).
 * Convenient for sparklines / activity charts.
 */
export function bucketsForPeriod(key: AdminPeriodKey, now: Date = new Date()): Date[] {
  const days = periodDays(key);
  const result: Date[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    d.setUTCHours(0, 0, 0, 0);
    result.push(d);
  }
  return result;
}
