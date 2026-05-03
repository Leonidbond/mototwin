import type {
  ServiceActionType,
  ServiceEventItem,
  ServiceEventKind,
  ServiceEventMode,
} from "./service-event";

export type ServiceEventsSortField =
  | "eventDate"
  | "eventKind"
  | "serviceType"
  | "node"
  | "odometer"
  | "engineHours"
  | "cost"
  | "comment";

export type ServiceEventsSortDirection = "asc" | "desc";
export type ServiceLogPeriodFilter = "month" | "3m" | "year" | "all";

export type ServiceEventsFilters = {
  dateFrom: string;
  dateTo: string;
  eventKind: string;
  serviceType: string;
  node: string;
  /**
   * When true, only events with costAmount &gt; 0 and non-empty currency (client-side).
   * Combines with other filters and with optional node subtree restriction.
   */
  paidOnly?: boolean;
};

/** Client-side subtree filter: events whose `nodeId` is in `nodeIds`. */
export type ServiceLogNodeFilter = {
  nodeIds: string[];
  displayLabel: string;
};

/** Payload when opening the service log from a node-tree status control. */
export type NodeStatusClickTarget = {
  treeNodeId: string;
};

export type MonthlyServiceLogSummary = {
  serviceCount: number;
  stateUpdateCount: number;
  costByCurrency: Record<string, number>;
};

export type MonthlyServiceLogGroup = {
  monthKey: string;
  monthStart: number;
  label: string;
  events: ServiceEventItem[];
  summary: MonthlyServiceLogSummary;
};

/** Alias for filters shared by web and Expo service log UIs. */
export type ServiceLogFilters = ServiceEventsFilters;

export type ServiceLogSortState = {
  field: ServiceEventsSortField;
  direction: ServiceEventsSortDirection;
};

export type ServiceLogFilterState = {
  filters: ServiceEventsFilters;
  sort: ServiceLogSortState;
  nodeFilter: ServiceLogNodeFilter | null;
  period: ServiceLogPeriodFilter;
};

export type ServiceLogEntryVisualKind = "primary" | "secondary";

/**
 * Service log **entry** row date label (`dateLabel` in the shared VM).
 * - `default`: `toLocaleDateString("ru-RU")` — web journal modal (`buildServiceLogTimelineProps`, …, `"default"`).
 * - `compact`: numeric day + short month + year — Expo journal (`…, "compact"`).
 * **Month/year group headers** use a separate shared formatter (long month + year, `ru-RU`) for both clients.
 * Status explanation dates use the same full locale string as `default` (see `formatIsoCalendarDateRu` in `@mototwin/domain`).
 */
export type ServiceLogEntryDateStyle = "default" | "compact";

/**
 * Сводка по одному пункту bundle для рендеринга в журнале/детальной панели.
 */
export type ServiceLogBundleItemSummary = {
  id: string;
  nodeId: string;
  nodeName: string;
  actionType: ServiceActionType;
  /** RU-лейбл действия — «Замена», «Проверка», … */
  actionLabelRu: string;
  partName: string | null;
  sku: string | null;
  quantity: number | null;
  partCost: number | null;
  laborCost: number | null;
  comment: string | null;
};

export type ServiceLogEntryViewModel = {
  id: string;
  eventKind: ServiceEventKind;
  visualKind: ServiceLogEntryVisualKind;
  mainTitle: string;
  /** Node or `nodeId` (web-style). Для bundle с >1 узлами: «N узлов». */
  secondaryTitle: string;
  /**
   * Expo service cards historically used an em dash when the nested `node`
   * object was absent (`node?.name ?? "—"`), even if `nodeId` exists.
   * Для bundle с >1 узлами: «N узлов».
   */
  expoServiceNodeLabel: string | null;
  stateUpdateSubtitle: string | null;
  stateUpdateLines: string[];
  dateLabel: string;
  odometerLabel: string;
  odometerValue: string;
  engineHoursLabel: string | null;
  engineHoursValue: string | null;
  /** Single line for compact mobile meta (e.g. "12 345 км · 100 ч"). */
  compactMetricsLine: string;
  costLabel: string | null;
  costAmount: number | null;
  costCurrency: string | null;
  comment: string | null;
  /** Артикул / SKU для отображения в журнале (если задано в событии). */
  partSku?: string | null;
  /** Наименование запчасти в журнале (если задано). */
  partName?: string | null;
  /**
   * Short label when the row likely came from «установлено из списка покупок» (serviceType + comment prefix).
   * `null` for other events.
   */
  wishlistOriginLabelRu: string | null;

  // ---------------------------------------------------------------------------
  // Service Bundle (Wave 1) — extra fields, всегда заполнены.
  // ---------------------------------------------------------------------------
  /** Bundle режим (BASIC / ADVANCED). */
  mode: ServiceEventMode;
  /** RU-лейбл режима — «Быстро» / «Подробно». */
  modeBadgeRu: string;
  /** Имена затронутых узлов (для chips). */
  nodeChips: string[];
  /** Кол-во узлов в bundle (= `items.length`; >=1). */
  nodeCount: number;
  /** Полная сводка по items (для раскрытой карточки и detail-view). */
  bundleItemsSummary: ServiceLogBundleItemSummary[];
  /** Лейбл сводки для детали запчастей (`«Детали 12 000 ₽»`); `null` если 0 / нет валюты. */
  partsCostLabel: string | null;
  /** Лейбл сводки работы. */
  laborCostLabel: string | null;
  /** Лейбл итоговой суммы (`«Итого 17 000 ₽»`). */
  totalCostLabel: string | null;
};

export type ServiceLogMonthlySummaryViewModel = MonthlyServiceLogSummary & {
  /** Preformatted multi-currency label, empty when no costs. */
  costLabel: string;
};

export type ServiceLogMonthGroupViewModel = {
  monthKey: string;
  monthStart: number;
  label: string;
  summary: ServiceLogMonthlySummaryViewModel;
  entries: ServiceLogEntryViewModel[];
};
