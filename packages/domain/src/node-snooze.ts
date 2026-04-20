import type { NodeSnoozeOption } from "@mototwin/types";

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeDateInput(date: Date | string | undefined): Date {
  if (date instanceof Date) {
    return new Date(date.getTime());
  }
  if (typeof date === "string") {
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function normalizeToMidday(date: Date): Date {
  const copy = new Date(date.getTime());
  copy.setHours(12, 0, 0, 0);
  return copy;
}

export function calculateSnoozeUntilDate(
  option: Exclude<NodeSnoozeOption, "clear">,
  currentDate?: Date | string
): string {
  const base = normalizeToMidday(normalizeDateInput(currentDate));
  const daysToAdd = option === "30d" ? 30 : 7;
  const snoozeUntil = new Date(base.getTime() + daysToAdd * DAY_MS);
  return snoozeUntil.toISOString();
}

export function isNodeSnoozed(
  snoozeUntilIso: string | null | undefined,
  currentDate?: Date | string
): boolean {
  if (!snoozeUntilIso) {
    return false;
  }
  const until = new Date(snoozeUntilIso);
  if (Number.isNaN(until.getTime())) {
    return false;
  }
  const now = normalizeDateInput(currentDate);
  return until.getTime() > now.getTime();
}

export function formatSnoozeUntilLabel(
  snoozeUntilIso: string | null | undefined,
  locale = "ru-RU",
  currentDate?: Date | string
): string | null {
  if (!isNodeSnoozed(snoozeUntilIso, currentDate)) {
    return null;
  }
  const until = new Date(snoozeUntilIso as string);
  return `Отложено до ${until.toLocaleDateString(locale)}`;
}
