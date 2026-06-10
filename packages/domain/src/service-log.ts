import type {
  MonthlyServiceLogGroup,
  ServiceActionType,
  ServiceEventItem,
  ServiceEventsFilters,
  ServiceEventsSortDirection,
  ServiceEventsSortField,
  ServiceLogNodeFilter,
  ServiceLogSortState,
  ServicePerformedBy,
} from "@mototwin/types";
import { applyServiceLogNodeFilter } from "./service-log-node-filter";
import {
  getServiceEventComparableTotalCost,
  getServiceEventCostByCurrency,
  resolveServiceEventCost,
} from "./service-event-expenses";

/** Event has explicit totals or linked expense rows with positive amounts. */
export function isPaidServiceEvent(event: ServiceEventItem): boolean {
  return resolveServiceEventCost(event).hasCost;
}

export function filterPaidServiceEvents(
  serviceEvents: ServiceEventItem[]
): ServiceEventItem[] {
  return serviceEvents.filter(isPaidServiceEvent);
}

export function buildPaidEventsServiceLogFilter(): Pick<ServiceEventsFilters, "paidOnly"> {
  return { paidOnly: true };
}

/** Same as {@link filterServiceLogEntries} (explicit name for parity docs). */
export function applyServiceLogFilters(
  serviceEvents: ServiceEventItem[],
  serviceEventsFilters: ServiceEventsFilters,
  restrictToNodeIds?: string[] | null
): ServiceEventItem[] {
  return filterServiceLogEntries(serviceEvents, serviceEventsFilters, restrictToNodeIds);
}

/** Default timeline query: newest first by event date (web + Expo). */
export const DEFAULT_SERVICE_LOG_SORT_STATE: ServiceLogSortState = {
  field: "eventDate",
  direction: "desc",
};

function trimServiceLogFilterFields(filters: ServiceEventsFilters) {
  return {
    dateFrom: filters.dateFrom.trim(),
    dateTo: filters.dateTo.trim(),
    eventKind: filters.eventKind.trim(),
    serviceType: filters.serviceType.trim(),
    node: filters.node.trim(),
    odometerMin: filters.odometerMin.trim(),
    odometerMax: filters.odometerMax.trim(),
    costMin: filters.costMin.trim(),
    costMax: filters.costMax.trim(),
    performerKind: filters.performerKind.trim(),
    actionType: filters.actionType.trim(),
  };
}

/** True when any filter is set or sort differs from {@link DEFAULT_SERVICE_LOG_SORT_STATE}. */
export function isServiceLogTimelineQueryActive(
  filters: ServiceEventsFilters,
  sort: ServiceLogSortState,
  nodeSubtreeFilter?: ServiceLogNodeFilter | null
): boolean {
  const t = trimServiceLogFilterFields(filters);
  const hasFilter =
    Boolean(t.dateFrom) ||
    Boolean(t.dateTo) ||
    Boolean(t.eventKind) ||
    Boolean(t.serviceType) ||
    Boolean(t.node) ||
    Boolean(t.odometerMin) ||
    Boolean(t.odometerMax) ||
    Boolean(t.costMin) ||
    Boolean(t.costMax) ||
    Boolean(t.performerKind) ||
    Boolean(t.actionType);
  const sortNonDefault =
    sort.field !== DEFAULT_SERVICE_LOG_SORT_STATE.field ||
    sort.direction !== DEFAULT_SERVICE_LOG_SORT_STATE.direction;
  const hasNodeSubtree = Boolean(nodeSubtreeFilter?.nodeIds.length);
  const hasPaidOnly = filters.paidOnly === true;
  return hasFilter || sortNonDefault || hasNodeSubtree || hasPaidOnly;
}

function normalizeServiceLogFilters(serviceEventsFilters: ServiceEventsFilters) {
  return {
    dateFrom: serviceEventsFilters.dateFrom.trim(),
    dateTo: serviceEventsFilters.dateTo.trim(),
    eventKind: serviceEventsFilters.eventKind.trim().toLowerCase(),
    serviceType: serviceEventsFilters.serviceType.trim().toLowerCase(),
    node: serviceEventsFilters.node.trim().toLowerCase(),
    odometerMin: serviceEventsFilters.odometerMin.trim(),
    odometerMax: serviceEventsFilters.odometerMax.trim(),
    costMin: serviceEventsFilters.costMin.trim().replace(",", "."),
    costMax: serviceEventsFilters.costMax.trim().replace(",", "."),
    performerKind: serviceEventsFilters.performerKind.trim().toUpperCase(),
    actionType: serviceEventsFilters.actionType.trim().toUpperCase(),
  };
}

const SERVICE_ACTION_TYPES: ReadonlySet<string> = new Set([
  "REPLACE",
  "SERVICE",
  "INSPECT",
  "CLEAN",
  "ADJUST",
]);

const PERFORMER_KINDS: ReadonlySet<string> = new Set(["SELF", "SERVICE", "OTHER"]);

function parseOdometerBound(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function parseCostBound(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

function eventTotalCost(event: ServiceEventItem): number | null {
  return getServiceEventComparableTotalCost(event);
}

export function filterServiceLogEntries(
  serviceEvents: ServiceEventItem[],
  serviceEventsFilters: ServiceEventsFilters,
  restrictToNodeIds?: string[] | null
): ServiceEventItem[] {
  const scoped =
    restrictToNodeIds && restrictToNodeIds.length > 0
      ? applyServiceLogNodeFilter(serviceEvents, { nodeIds: restrictToNodeIds })
      : serviceEvents;
  const normalizedFilters = normalizeServiceLogFilters(serviceEventsFilters);

  return scoped.filter((event) => {
    const eventDateOnly = event.eventDate.slice(0, 10);
    const eventKindLabel =
      event.eventKind === "STATE_UPDATE" ? "обновление состояния" : "сервис";
    const nodeLabel = event.node?.name || event.nodeId;
    const normalizedNodeLabel = nodeLabel.toLowerCase();
    const nodeStartsWith = normalizedNodeLabel.startsWith(normalizedFilters.node);
    const nodeIncludes = normalizedNodeLabel.includes(normalizedFilters.node);

    const passesPaidOnly =
      serviceEventsFilters.paidOnly !== true || isPaidServiceEvent(event);

    const odoMin = parseOdometerBound(normalizedFilters.odometerMin);
    const odoMax = parseOdometerBound(normalizedFilters.odometerMax);
    const passesOdometer =
      (odoMin === null || event.odometer >= odoMin) &&
      (odoMax === null || event.odometer <= odoMax);

    const costMin = parseCostBound(normalizedFilters.costMin);
    const costMax = parseCostBound(normalizedFilters.costMax);
    const costVal = eventTotalCost(event);
    const passesCost =
      (costMin === null || (costVal !== null && costVal >= costMin)) &&
      (costMax === null || (costVal !== null && costVal <= costMax));

    const actionFilter = normalizedFilters.actionType;
    const passesActionType =
      !actionFilter ||
      !SERVICE_ACTION_TYPES.has(actionFilter) ||
      (event.items ?? []).some((it) => it.actionType === (actionFilter as ServiceActionType));

    const perfFilter = normalizedFilters.performerKind;
    const passesPerformer =
      !perfFilter ||
      !PERFORMER_KINDS.has(perfFilter) ||
      (event.performedBy ?? "") === (perfFilter as ServicePerformedBy);

    return (
      passesPaidOnly &&
      passesOdometer &&
      passesCost &&
      passesActionType &&
      passesPerformer &&
      (!normalizedFilters.dateFrom || eventDateOnly >= normalizedFilters.dateFrom) &&
      (!normalizedFilters.dateTo || eventDateOnly <= normalizedFilters.dateTo) &&
      (!normalizedFilters.eventKind ||
        (event.eventKind || "SERVICE") === normalizedFilters.eventKind.toUpperCase() ||
        eventKindLabel.includes(normalizedFilters.eventKind)) &&
      (!normalizedFilters.serviceType ||
        event.serviceType.toLowerCase().includes(normalizedFilters.serviceType)) &&
      (!normalizedFilters.node || nodeStartsWith || nodeIncludes)
    );
  });
}

export function sortServiceLogEntries(
  serviceEvents: ServiceEventItem[],
  serviceEventsSort: ServiceLogSortState
): ServiceEventItem[] {
  return [...serviceEvents].sort((left, right) => {
    const directionMultiplier = serviceEventsSort.direction === "asc" ? 1 : -1;

    const compareStrings = (a: string, b: string) =>
      a.localeCompare(b, "ru-RU") * directionMultiplier;

    const compareNumbers = (a: number, b: number) => (a - b) * directionMultiplier;

    const compareNullableNumbers = (a: number | null, b: number | null) => {
      if (a === null && b === null) {
        return 0;
      }
      if (a === null) {
        return 1;
      }
      if (b === null) {
        return -1;
      }
      return compareNumbers(a, b);
    };

    switch (serviceEventsSort.field) {
      case "eventDate":
        return (
          (new Date(left.eventDate).getTime() - new Date(right.eventDate).getTime()) *
          directionMultiplier
        );
      case "eventKind": {
        const leftKind =
          left.eventKind === "STATE_UPDATE" ? "Обновление состояния" : "Сервис";
        const rightKind =
          right.eventKind === "STATE_UPDATE" ? "Обновление состояния" : "Сервис";
        return compareStrings(leftKind, rightKind);
      }
      case "serviceType":
        return compareStrings(left.serviceType, right.serviceType);
      case "node":
        return compareStrings(
          left.node?.name || left.nodeId,
          right.node?.name || right.nodeId
        );
      case "odometer":
        return compareNumbers(left.odometer, right.odometer);
      case "engineHours":
        return compareNullableNumbers(left.engineHours, right.engineHours);
      case "cost":
        return compareNullableNumbers(
          getServiceEventComparableTotalCost(left),
          getServiceEventComparableTotalCost(right)
        );
      case "comment":
        return compareStrings(left.comment || "", right.comment || "");
      default:
        return 0;
    }
  });
}

export function filterAndSortServiceEvents(
  serviceEvents: ServiceEventItem[],
  serviceEventsFilters: ServiceEventsFilters,
  serviceEventsSort: {
    field: ServiceEventsSortField;
    direction: ServiceEventsSortDirection;
  },
  restrictToNodeIds?: string[] | null
) {
  const filtered = filterServiceLogEntries(
    serviceEvents,
    serviceEventsFilters,
    restrictToNodeIds
  );
  return sortServiceLogEntries(filtered, serviceEventsSort);
}

export function groupServiceEventsByMonth(
  serviceEvents: ServiceEventItem[]
): MonthlyServiceLogGroup[] {
  const groupsMap = new Map<string, MonthlyServiceLogGroup>();

  serviceEvents.forEach((event) => {
    const key = getMonthYearKey(event.eventDate);
    const monthStart = getMonthStartTimestamp(event.eventDate);
    const existingGroup = groupsMap.get(key);

    const eventCostByCurrency = getServiceEventCostByCurrency(event);
    if (existingGroup) {
      existingGroup.events.push(event);
      if (event.eventKind === "STATE_UPDATE") {
        existingGroup.summary.stateUpdateCount += 1;
      } else {
        existingGroup.summary.serviceCount += 1;
      }
      for (const [currency, amount] of Object.entries(eventCostByCurrency)) {
        if (amount > 0) {
          existingGroup.summary.costByCurrency[currency] =
            (existingGroup.summary.costByCurrency[currency] || 0) + amount;
        }
      }
      return;
    }

    groupsMap.set(key, {
      monthKey: key,
      monthStart,
      label: formatMonthYearLabel(event.eventDate),
      events: [event],
      summary: {
        serviceCount: event.eventKind === "STATE_UPDATE" ? 0 : 1,
        stateUpdateCount: event.eventKind === "STATE_UPDATE" ? 1 : 0,
        costByCurrency: { ...eventCostByCurrency },
      },
    });
  });

  return Array.from(groupsMap.values()).sort((left, right) => right.monthStart - left.monthStart);
}

export function getStateUpdateSummary(serviceEvent: ServiceEventItem) {
  if (serviceEvent.engineHours !== null) {
    return "Пробег и моточасы обновлены";
  }

  return "Пробег обновлен";
}

export function getMonthlyCostLabel(costByCurrency: Record<string, number>) {
  const entries = Object.entries(costByCurrency).filter(([, amount]) => amount > 0);

  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([currency, amount]) => `${formatNumber(amount)} ${currency}`)
    .join(" + ");
}

function getMonthYearKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 7);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthStartTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function formatMonthYearLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Неизвестный месяц";
  }

  return date.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}
