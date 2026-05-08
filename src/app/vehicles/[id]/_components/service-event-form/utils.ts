import { nodeAncestorPathLabelRu } from "@mototwin/domain";
import type { AddServiceEventFormValues, NodeTreeItem, ServicePerformedBy } from "@mototwin/types";

export function cloneAddServiceEventForm(src: AddServiceEventFormValues): AddServiceEventFormValues {
  return {
    ...src,
    items: src.items.map((it) => ({ ...it })),
    installedExpenseItemIds: [...src.installedExpenseItemIds],
  };
}

export function performedByLabelRu(value: ServicePerformedBy): string {
  if (value === "SELF") {
    return "Сам";
  }
  if (value === "SERVICE") {
    return "Сервис";
  }
  return "Другое";
}

/** `YYYY-MM-DD` → `ДД.ММ.ГГГГ` for display (empty if invalid). */
export function ymdToDdMmYyyy(ymd: string): string {
  const t = ymd.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) {
    return "";
  }
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** Parse `ДД.ММ.ГГГГ` → `YYYY-MM-DD`, `null` if invalid, empty `""` for clear. */
export function parseDdMmYyyyToYmd(display: string): string | null | "" {
  const t = display.trim().replace(/\s/g, "");
  if (!t) {
    return "";
  }
  const rx = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
  const m = rx.exec(t);
  if (!m) {
    return null;
  }
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (!Number.isFinite(d) || !Number.isFinite(mo) || !Number.isFinite(y)) {
    return null;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) {
    return null;
  }
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Path of ancestors for the breadcrumb under a node title. */
export function nodeBreadcrumbRu(nodeTree: NodeTreeItem[], nodeId: string): string {
  return nodeAncestorPathLabelRu(nodeTree, nodeId);
}

export function normalizePartNumber(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function currencySuffix(currency: string): string {
  const c = currency.trim().toUpperCase() || "RUB";
  if (c === "RUB") return "₽";
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  return c;
}
