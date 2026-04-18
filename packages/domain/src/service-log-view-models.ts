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

export function buildServiceLogEntryViewModel(
  event: ServiceEventItem,
  dateStyle: ServiceLogEntryDateStyle = "default"
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

  return {
    id: event.id,
    eventKind: kind,
    visualKind: isState ? "secondary" : "primary",
    mainTitle: isState ? "Обновление состояния" : event.serviceType,
    secondaryTitle: nodeTitle,
    expoServiceNodeLabel: isState ? null : (event.node?.name ?? "—"),
    stateUpdateSubtitle: isState ? getStateUpdateSummary(event) : null,
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
  return raw.map((group) => ({
    monthKey: group.monthKey,
    monthStart: group.monthStart,
    label: group.label,
    summary: buildServiceLogMonthlySummary(group.summary),
    entries: group.events.map((event) => buildServiceLogEntryViewModel(event, dateStyle)),
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
  return sorted.map((event) => buildServiceLogEntryViewModel(event, dateStyle));
}
