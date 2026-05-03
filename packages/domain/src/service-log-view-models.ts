import type {
  MonthlyServiceLogSummary,
  ServiceBundleItem,
  ServiceEventItem,
  ServiceEventKind,
  ServiceEventsFilters,
  ServiceLogBundleItemSummary,
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
import { formatExpenseAmountRu } from "./expense-summary";
import {
  getServiceActionTypeLabelRu,
  getServiceEventModeLabelRu,
  mapServiceTypeStringToActionType,
} from "./forms";
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

function buildBundleItemSummaries(event: ServiceEventItem): ServiceLogBundleItemSummary[] {
  const items: ServiceBundleItem[] =
    event.items && event.items.length > 0
      ? event.items
      : [
          {
            id: `${event.id}_legacy`,
            nodeId: event.nodeId,
            actionType: mapServiceTypeStringToActionType(event.serviceType),
            partName: event.partName ?? null,
            sku: event.partSku ?? null,
            quantity: null,
            partCost: null,
            laborCost: null,
            comment: null,
            sortOrder: 0,
            node: event.node,
          },
        ];
  return items
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item) => ({
      id: item.id,
      nodeId: item.nodeId,
      nodeName: item.node?.name?.trim() || item.nodeId,
      actionType: item.actionType,
      actionLabelRu: getServiceActionTypeLabelRu(item.actionType),
      partName: item.partName?.trim() ? item.partName.trim() : null,
      sku: item.sku?.trim() ? item.sku.trim() : null,
      quantity: item.quantity ?? null,
      partCost: item.partCost ?? null,
      laborCost: item.laborCost ?? null,
      comment: item.comment?.trim() ? item.comment.trim() : null,
    }));
}

function formatBundleCostLabel(label: string, amount: number | null, currency: string | null): string | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0 || !currency) {
    return null;
  }
  return `${label} ${formatExpenseAmountRu(amount)} ${currency}`;
}

export function buildServiceLogEntryViewModel(
  event: ServiceEventItem,
  dateStyle: ServiceLogEntryDateStyle = "default",
  previousFromHistory: StateUpdatePreviousValues | null = null
): ServiceLogEntryViewModel {
  const kind = event.eventKind === "STATE_UPDATE" ? "STATE_UPDATE" : "SERVICE";
  const isState = kind === "STATE_UPDATE";
  const dateLabel = formatServiceLogEntryDate(event.eventDate, dateStyle);

  const bundleItemsSummary = isState ? [] : buildBundleItemSummaries(event);
  const nodeChips = bundleItemsSummary.map((item) => item.nodeName);
  const nodeCount = bundleItemsSummary.length;
  const isMultiNode = nodeCount > 1;

  const titleFallback = event.title?.trim() || event.serviceType?.trim() || "";
  const firstActionLabel =
    bundleItemsSummary[0]?.actionLabelRu ?? getServiceActionTypeLabelRu("SERVICE");
  const mainTitle = isState
    ? "Обновление состояния"
    : titleFallback || firstActionLabel;

  const singleNodeName = bundleItemsSummary[0]?.nodeName || event.node?.name || event.nodeId;
  const secondaryTitle = isMultiNode
    ? `${nodeCount} узлов`
    : singleNodeName;
  const expoServiceNodeLabel = isState
    ? null
    : isMultiNode
      ? `${nodeCount} узлов`
      : (event.node?.name ?? bundleItemsSummary[0]?.nodeName ?? "—");

  const totalAmount = event.totalCost ?? event.costAmount ?? null;
  const hasCost =
    !isState &&
    totalAmount !== null &&
    totalAmount > 0 &&
    Boolean(event.currency);

  const wishlistOriginLabelRu =
    !isState && isLikelyWishlistInstallServiceEvent(event) ? "Из списка покупок" : null;
  const stateUpdateDisplay = isState
    ? buildStateUpdateDisplayViewModelWithFallback(event, previousFromHistory)
    : null;

  const mode = event.mode ?? "BASIC";

  // Для legacy single-node BASIC оставляем partSku/partName на верхнем уровне.
  const firstItem = bundleItemsSummary[0] ?? null;
  const headerPartSku =
    !isMultiNode && firstItem?.sku ? firstItem.sku : event.partSku?.trim() || null;
  const headerPartName =
    !isMultiNode && firstItem?.partName ? firstItem.partName : event.partName?.trim() || null;

  return {
    id: event.id,
    eventKind: kind,
    visualKind: isState ? "secondary" : "primary",
    mainTitle,
    secondaryTitle,
    expoServiceNodeLabel,
    stateUpdateSubtitle: stateUpdateDisplay?.summary ?? null,
    stateUpdateLines: stateUpdateDisplay?.lines ?? [],
    dateLabel,
    odometerLabel: "Пробег",
    odometerValue: `${event.odometer} км`,
    engineHoursLabel: event.engineHours !== null ? "Моточасы" : null,
    engineHoursValue: event.engineHours !== null ? String(event.engineHours) : null,
    compactMetricsLine: buildCompactMetricsLine(event),
    costLabel: hasCost ? "Стоимость" : null,
    costAmount: hasCost ? totalAmount : null,
    costCurrency: hasCost ? event.currency : null,
    comment: event.comment,
    partSku: headerPartSku,
    partName: headerPartName,
    wishlistOriginLabelRu,
    mode,
    modeBadgeRu: getServiceEventModeLabelRu(mode),
    nodeChips,
    nodeCount,
    bundleItemsSummary,
    partsCostLabel: formatBundleCostLabel("Детали", event.partsCost ?? null, event.currency ?? null),
    laborCostLabel: formatBundleCostLabel("Работа", event.laborCost ?? null, event.currency ?? null),
    totalCostLabel: formatBundleCostLabel("Итого", totalAmount, event.currency ?? null),
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
