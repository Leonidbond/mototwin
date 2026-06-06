import { getTodayDateYmdLocal } from "@mototwin/domain";

export function localDateToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmdToLocalDate(ymd: string): Date {
  const t = ymd.trim();
  if (t.length >= 10) {
    const y = Number(t.slice(0, 4));
    const mo = Number(t.slice(5, 7)) - 1;
    const day = Number(t.slice(8, 10));
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(day)) {
      return new Date(y, mo, day);
    }
  }
  const today = getTodayDateYmdLocal();
  const y = Number(today.slice(0, 4));
  const mo = Number(today.slice(5, 7)) - 1;
  const day = Number(today.slice(8, 10));
  return new Date(y, mo, day);
}
