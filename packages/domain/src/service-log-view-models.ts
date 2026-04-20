import type {
  MonthlyServiceLogSummary,
  ServiceEventItem,
  ServiceEventKind,
  ServiceEventsFilters,
  ServiceLogEntryDateStyle,
  ServiceLogEntryViewModel,
  ServiceLogMonthGroupViewModel,
  ServiceLogMonthlySummaryViewModel,
  ServiceLogSortState,
} from "@mototwin/types";
import {
  filterAndSortServiceEvents,
  getMonthlyCostLabel,
  getStateUpdateSummary,
  groupServiceEventsByMonth,
} from "./service-log";
import { isLikelyWishlistInstallServiceEvent } from "./part-wishlist";

/** Preview length for collapsed journal comments (web + Expo). */
export const SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS = 120;

export function getServiceLogEventKindBadgeLabel(kind: ServiceEventKind): string {
  return kind === "STATE_UPDATE" ? "Обновление состояния" : "Сервис";
}

/**
 * Full Russian locale calendar date (no extra options).
 * Same string shape as service-log entry `dateStyle: "default"` and as month-group entry dates derived from it.
 * Use for status explanations and anywhere the product wants “full” date, not the compact journal line.
 */
export function formatIsoCalendarDateRu(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString("ru-RU");
}

function formatServiceLogEntryDate(iso: string, style: ServiceLogEntryDateStyle): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return style === "compact" ? iso.slice(0, 10) : iso;
  }
  if (style === "compact") {
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return formatIsoCalendarDateRu(iso);
}

function buildCompactMetricsLine(event: ServiceEventItem): string {
  const km = `${event.odometer} км`;
  if (event.engineHours !== null) {
    return `${km} · ${event.engineHours} ч`;
  }
  return km;
}

function formatStateMetricNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function readNumberishOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return null;
}

function readObjectCandidate(
  source: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> | null {
  for (const key of keys) {
    const candidate = source[key];
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }
  }
  return null;
}

function readFirstNumberish(
  source: Record<string, unknown>,
  keys: string[],
  nested?: Record<string, unknown> | null
): number | null {
  for (const key of keys) {
    const fromRoot = readNumberishOrNull(source[key]);
    if (fromRoot !== null) {
      return fromRoot;
    }
    if (nested) {
      const fromNested = readNumberishOrNull(nested[key]);
      if (fromNested !== null) {
        return fromNested;
      }
    }
  }
  return null;
}

function readStateUpdatePreviousValues(
  event: ServiceEventItem
): { odometer: number | null; engineHours: number | null } {
  const payload = event.installedPartsJson;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { odometer: null, engineHours: null };
  }
  const obj = payload as Record<string, unknown>;
  const prevObj = readObjectCandidate(obj, [
    "previous",
    "previousState",
    "old",
    "from",
    "before",
    "prev",
  ]);

  const odometer = readFirstNumberish(
    obj,
    [
      "previousOdometer",
      "oldOdometer",
      "odometerBefore",
      "prevOdometer",
      "previous_odometer",
      "old_odometer",
      "beforeOdometer",
      "odometer",
      "odometerKm",
    ],
    prevObj
  );
  const engineHours = readFirstNumberish(
    obj,
    [
      "previousEngineHours",
      "oldEngineHours",
      "engineHoursBefore",
      "prevEngineHours",
      "previous_engine_hours",
      "old_engine_hours",
      "beforeEngineHours",
      "engineHours",
      "hours",
    ],
    prevObj
  );

  return { odometer, engineHours };
}

export function formatOdometerValue(value: number): string {
  return `${formatStateMetricNumber(value)} км`;
}

export function formatEngineHoursValue(value: number): string {
  return `${formatStateMetricNumber(value)} ч`;
}

export function formatStateValueChange(args: {
  field: "odometer" | "engineHours";
  previousValue: number | null;
  nextValue: number | null;
}): string | null {
  const { field, previousValue, nextValue } = args;
  if (nextValue === null) {
    return null;
  }
  if (field === "odometer") {
    if (previousValue !== null) {
      return `Пробег: ${formatStateMetricNumber(previousValue)} → ${formatOdometerValue(nextValue)}`;
    }
    return `Пробег обновлен до ${formatOdometerValue(nextValue)}`;
  }
  if (previousValue !== null) {
    return `Моточасы: ${formatStateMetricNumber(previousValue)} → ${formatEngineHoursValue(nextValue)}`;
  }
  return `Моточасы обновлены до ${formatEngineHoursValue(nextValue)}`;
}

export function buildStateUpdateDisplayViewModel(event: ServiceEventItem): {
  summary: string;
  lines: string[];
} {
  return buildStateUpdateDisplayViewModelWithFallback(event, null);
}

type StateUpdatePreviousValues = {
  odometer: number | null;
  engineHours: number | null;
};

function buildStateUpdateDisplayViewModelWithFallback(
  event: ServiceEventItem,
  fallbackPrevious: StateUpdatePreviousValues | null
): {
  summary: string;
  lines: string[];
} {
  const previous = readStateUpdatePreviousValues(event);
  const previousResolved: StateUpdatePreviousValues = {
    odometer: previous.odometer ?? fallbackPrevious?.odometer ?? null,
    engineHours: previous.engineHours ?? fallbackPrevious?.engineHours ?? null,
  };
  const odometerLine = formatStateValueChange({
    field: "odometer",
    previousValue: previousResolved.odometer,
    nextValue: event.odometer,
  });
  const engineHoursLine = formatStateValueChange({
    field: "engineHours",
    previousValue: previousResolved.engineHours,
    nextValue: event.engineHours,
  });
  const lines = [odometerLine, engineHoursLine].filter((line): line is string => Boolean(line));
  const summary = lines.length > 0 ? lines.join(" · ") : getStateUpdateSummary(event);
  return { summary, lines };
}

function getHistoryPreviousStateByEventId(
  serviceEvents: ServiceEventItem[]
): Map<string, StateUpdatePreviousValues> {
  const previousByEventId = new Map<string, StateUpdatePreviousValues>();
  for (let index = 0; index < serviceEvents.length; index += 1) {
    const current = serviceEvents[index];
    const older = serviceEvents[index + 1];
    previousByEventId.set(current.id, {
      odometer: older ? older.odometer : null,
      engineHours: older?.engineHours ?? null,
    });
  }
  return previousByEventId;
}

export function buildServiceLogEntryViewModel(
  event: ServiceEventItem,
  dateStyle: ServiceLogEntryDateStyle = "default",
  previousFromHistory: StateUpdatePreviousValues | null = null
): ServiceLogEntryViewModel {
  const kind = event.eventKind === "STATE_UPDATE" ? "STATE_UPDATE" : "SERVICE";
  const isState = kind === "STATE_UPDATE";
  const nodeTitle = event.node?.name || event.nodeId;
  const dateLabel = formatServiceLogEntryDate(event.eventDate, dateStyle);
  const hasCost =
    !isState &&
    event.costAmount !== null &&
    event.costAmount > 0 &&
    Boolean(event.currency);

  const wishlistOriginLabelRu =
    !isState && isLikelyWishlistInstallServiceEvent(event) ? "Из списка покупок" : null;
  const stateUpdateDisplay = isState
    ? buildStateUpdateDisplayViewModelWithFallback(event, previousFromHistory)
    : null;

  return {
    id: event.id,
    eventKind: kind,
    visualKind: isState ? "secondary" : "primary",
    mainTitle: isState ? "Обновление состояния" : event.serviceType,
    secondaryTitle: nodeTitle,
    expoServiceNodeLabel: isState ? null : (event.node?.name ?? "—"),
    stateUpdateSubtitle: stateUpdateDisplay?.summary ?? null,
    stateUpdateLines: stateUpdateDisplay?.lines ?? [],
    dateLabel,
    odometerLabel: "Пробег",
    odometerValue: `${event.odometer} км`,
    engineHoursLabel: event.engineHours !== null ? "Моточасы" : null,
    engineHoursValue: event.engineHours !== null ? String(event.engineHours) : null,
    compactMetricsLine: buildCompactMetricsLine(event),
    costLabel: hasCost ? "Стоимость" : null,
    costAmount: hasCost ? event.costAmount : null,
    costCurrency: hasCost ? event.currency : null,
    comment: event.comment,
    wishlistOriginLabelRu,
  };
}

export function buildServiceLogMonthlySummary(
  summary: MonthlyServiceLogSummary
): ServiceLogMonthlySummaryViewModel {
  return {
    serviceCount: summary.serviceCount,
    stateUpdateCount: summary.stateUpdateCount,
    costByCurrency: { ...summary.costByCurrency },
    costLabel: getMonthlyCostLabel(summary.costByCurrency),
  };
}

export function groupServiceLogByMonth(
  serviceEvents: ServiceEventItem[],
  dateStyle: ServiceLogEntryDateStyle = "default"
): ServiceLogMonthGroupViewModel[] {
  const raw = groupServiceEventsByMonth(serviceEvents);
  const previousByEventId = getHistoryPreviousStateByEventId(serviceEvents);
  return raw.map((group) => ({
    monthKey: group.monthKey,
    monthStart: group.monthStart,
    label: group.label,
    summary: buildServiceLogMonthlySummary(group.summary),
    entries: group.events.map((event) =>
      buildServiceLogEntryViewModel(event, dateStyle, previousByEventId.get(event.id) ?? null)
    ),
  }));
}

export function buildServiceLogTimelineViewModel(
  serviceEvents: ServiceEventItem[],
  filters: ServiceEventsFilters,
  sort: ServiceLogSortState,
  dateStyle: ServiceLogEntryDateStyle = "default",
  restrictToNodeIds?: string[] | null
): ServiceLogEntryViewModel[] {
  const sorted = filterAndSortServiceEvents(
    serviceEvents,
    filters,
    sort,
    restrictToNodeIds
  );
  const previousByEventId = getHistoryPreviousStateByEventId(sorted);
  return sorted.map((event) =>
    buildServiceLogEntryViewModel(event, dateStyle, previousByEventId.get(event.id) ?? null)
  );
}
