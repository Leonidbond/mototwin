import type { ServiceEventItem } from "./service-event";

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

export type ServiceEventsFilters = {
  dateFrom: string;
  dateTo: string;
  eventKind: string;
  serviceType: string;
  node: string;
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
