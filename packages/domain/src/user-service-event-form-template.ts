import type {
  AddServiceEventFormValues,
  BundleItemFormValues,
  ServiceActionType,
  ServiceEventMode,
  ServicePerformedBy,
} from "@mototwin/types";
import {
  createEmptyBundleItemFormValues,
  createInitialAddServiceEventFormValues,
} from "./forms";

/** Select value prefix for system bundle templates in combined template pickers. */
export const SERVICE_EVENT_TEMPLATE_SELECT_SYSTEM_PREFIX = "s:" as const;
/** Select value prefix for user-saved form templates. */
export const SERVICE_EVENT_TEMPLATE_SELECT_USER_PREFIX = "u:" as const;

const SERVICE_ACTION_SET = new Set<ServiceActionType>([
  "REPLACE",
  "SERVICE",
  "INSPECT",
  "CLEAN",
  "ADJUST",
]);

function parseServiceActionType(value: unknown): ServiceActionType {
  return typeof value === "string" && SERVICE_ACTION_SET.has(value as ServiceActionType)
    ? (value as ServiceActionType)
    : "REPLACE";
}

function parsePerformedBy(value: unknown): ServicePerformedBy {
  return value === "SELF" || value === "SERVICE" || value === "OTHER" ? value : "SELF";
}

function parseBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseItems(raw: unknown): BundleItemFormValues[] | null {
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  return raw.map((row) => {
    const it = row as Record<string, unknown>;
    return createEmptyBundleItemFormValues({
      nodeId: parseString(it.nodeId),
      actionType: parseServiceActionType(it.actionType),
      partName: parseString(it.partName),
      sku: parseString(it.sku),
      quantity: parseString(it.quantity),
      partCost: parseString(it.partCost),
      laborCost: parseString(it.laborCost),
      comment: parseString(it.comment),
    });
  });
}

/**
 * Human-readable stored title: includes whether the snapshot is for quick or detailed mode.
 */
export function buildUserServiceEventTemplateTitle(base: string, mode: ServiceEventMode): string {
  const modeLabel = mode === "BASIC" ? "Быстрый режим" : "Подробный режим";
  const t = base.trim();
  return t ? `${t} — ${modeLabel}` : modeLabel;
}

/**
 * Strip vehicle-specific / session-only fields before persisting a user template.
 */
export function stripAddServiceEventFormValuesForUserTemplate(
  form: AddServiceEventFormValues
): AddServiceEventFormValues {
  return {
    ...form,
    installedExpenseItemIds: [],
    installedPartsJson: "",
  };
}

/**
 * Parse JSON from DB into a fresh form (new row keys, validated enums).
 */
export function addServiceEventFormValuesFromUserTemplateJson(
  raw: unknown
): AddServiceEventFormValues | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const mode = o.mode === "BASIC" || o.mode === "ADVANCED" ? o.mode : null;
  if (!mode) {
    return null;
  }
  const items = parseItems(o.items);
  if (!items) {
    return null;
  }
  const commonActionType = parseServiceActionType(o.commonActionType);
  const syncedItems =
    mode === "BASIC"
      ? items.map((it) => ({ ...it, actionType: commonActionType }))
      : items.map((it) => ({ ...it, actionType: parseServiceActionType(it.actionType) }));

  const base = createInitialAddServiceEventFormValues();
  return {
    ...base,
    title: parseString(o.title),
    mode,
    commonActionType: mode === "BASIC" ? commonActionType : parseServiceActionType(o.commonActionType),
    eventDate: parseString(o.eventDate),
    odometer: parseString(o.odometer),
    engineHours: parseString(o.engineHours),
    partsCost: parseString(o.partsCost),
    laborCost: parseString(o.laborCost),
    currency: parseString(o.currency, base.currency),
    comment: parseString(o.comment),
    installedPartsJson: "",
    installedExpenseItemIds: [],
    performedBy: parsePerformedBy(o.performedBy),
    serviceProviderNote: parseString(o.serviceProviderNote),
    installLocationAddress: parseString(o.installLocationAddress),
    installLocationLat: parseString(o.installLocationLat),
    installLocationLng: parseString(o.installLocationLng),
    attachReceiptRequested: parseBool(o.attachReceiptRequested, base.attachReceiptRequested),
    attachFileRequested: parseBool(o.attachFileRequested, base.attachFileRequested),
    nextReminderEnabled: parseBool(o.nextReminderEnabled, base.nextReminderEnabled),
    nextReminderDate: parseString(o.nextReminderDate),
    nextReminderOdometer: parseString(o.nextReminderOdometer),
    nextReminderEngineHours: parseString(o.nextReminderEngineHours),
    items: syncedItems,
  };
}
