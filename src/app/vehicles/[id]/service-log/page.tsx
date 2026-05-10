"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  buildServiceLogTimelineProps,
  expenseCategoryLabelsRu,
  filterPaidServiceEvents,
  formatExpenseAmountRu,
  getWishlistItemIdsFromInstalledPartsJson,
  isServiceLogTimelineQueryActive,
} from "@mototwin/domain";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { Button } from "@/components/ui";
import { GarageSidebar } from "@/app/garage/_components/GarageSidebar";
import type {
  ServiceEventItem,
  ServiceEventsFilters,
  ServiceEventsSortDirection,
  ServiceEventsSortField,
  ServiceLogEntryViewModel,
  ServiceLogMonthGroupViewModel,
  ServiceLogNodeFilter,
} from "@mototwin/types";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));
const SIDEBAR_COLLAPSED_KEY = "vehicle.detail.sidebar.collapsed";
const LOAD_MORE_STEP = 20;
const SERVICE_LOG_DETAILS_COL_WIDTH = 460;

// ─── Visual system ─────────────────────────────────────────────────────────────
// All colours route through `productSemanticColors` so the journal stays in the
// same visual language as garage / vehicle pages (the canonical reference).
// Layout-only constants (sizes, paddings) remain page-local below.

const C = {
  canvas: productSemanticColors.canvas,
  panel: productSemanticColors.card,
  row: productSemanticColors.cardMuted,
  rowSelected: productSemanticColors.cardMuted,
  rowMuted: productSemanticColors.cardSubtle,
  rowHover: productSemanticColors.cardMuted,
  border: productSemanticColors.border,
  borderMed: productSemanticColors.borderStrong,
  wash: "rgba(255,255,255,0.04)",
  text: productSemanticColors.textPrimary,
  text2: productSemanticColors.textSecondary,
  text3: productSemanticColors.textMuted,
  orange: productSemanticColors.primaryAction,
  orangeSoft: `${productSemanticColors.primaryAction}24`,
  green: productSemanticColors.successStrong,
  danger: productSemanticColors.error,
  dangerSurface: productSemanticColors.errorSurface,
  dangerBorder: productSemanticColors.errorBorder,
} as const;

/**
 * Aliases used across this page. Mapped to `productSemanticColors` so the
 * pixel spec (`docs/service-log-web-reference-pixel-spec.md`) is satisfied via
 * tokens rather than parallel hex values.
 */
const SPEC = {
  accent: productSemanticColors.primaryAction,
  borderSubtle: `1px solid ${productSemanticColors.border}`,
  bgPage: productSemanticColors.canvas,
  bgPageDeep: productSemanticColors.canvas,
  bgControl: productSemanticColors.cardSubtle,
  bgPanel: productSemanticColors.card,
  timelineLine: "rgba(148,163,184,0.35)",
  textPrimary: productSemanticColors.textPrimary,
  textSecondary: productSemanticColors.textSecondary,
  textVin: productSemanticColors.textMuted,
  textMuted: productSemanticColors.textMuted,
  rowSelectWash: `${productSemanticColors.primaryAction}10`,
} as const;

/** Верх страницы и тулбар — числа по спеке, цвета через токены. */
const REF_TOP = {
  padX: 24,
  vehicleBlockPad: "18px 0 22px",
  backBtn: 40,
  vehicleTitle: { fontSize: 18, fontWeight: 700 as const, lineHeight: 1.25, letterSpacing: "-0.01em" },
  vin: { fontSize: 12, marginTop: 4, color: SPEC.textVin, lineHeight: 1.35 },
  ctaGap: 10,
  ctaH: 40,
  ctaRadius: 8,
  ghostFont: 13,
  ghostWeight: 500 as const,
  ghostPadX: 18,
  primaryPadX: 20,
  primaryFont: 13,
  primaryWeight: 600 as const,
  pageTitle: { fontSize: 27, fontWeight: 700 as const, letterSpacing: "-0.02em", lineHeight: 1.12 },
  pageSub: { fontSize: 14, marginTop: 8, color: SPEC.textSecondary, lineHeight: 1.45, fontWeight: 400 },
  journalTitlePad: "22px 24px 6px",
  toolbarPad: "16px 24px 18px",
  toolbarGap: 10,
  searchH: 44,
  searchRadius: 9,
  searchBg: SPEC.bgControl,
  searchBorder: SPEC.borderSubtle,
  searchPlaceholder: SPEC.textMuted,
  dropdownMinW: 128,
  dropdownLabel: 10,
  dropdownValue: 13,
  toggleW: 36,
  toggleH: 20,
  toggleThumb: 16,
  infoPad: "6px 24px 8px",
  infoFont: 13,
  infoMuted: SPEC.textSecondary,
  sortComboH: 28,
  filterBadgeBg: SPEC.accent,
  filterBadgeColor: productSemanticColors.onPrimaryAction,
  viewBtn: { w: 30, h: 28, radius: 8 },
} as const;

/** Панель поиска/фильтров — 4 модуля в ряд, цвета из токенов. */
const TOOLBAR_REF = {
  moduleBg: SPEC.bgControl,
  moduleBorder: SPEC.borderSubtle,
  moduleRadius: 9,
  /** Спека §6.5 / §14.2: бейдж счётчика — оранжевый primaryAction, текст белый. */
  filterCountBadgeBg: SPEC.accent,
  filterCountBadgeColor: productSemanticColors.onPrimaryAction,
  labelColor: SPEC.textSecondary,
  filtersNestedBtnH: 36,
  filtersNestedBtnRadius: 8,
} as const;

const toolbarDropdownChevronStyle: CSSProperties = {
  position: "absolute",
  right: 5,
  top: "50%",
  transform: "translateY(-50%)",
  color: SPEC.textSecondary,
  fontSize: 9,
  pointerEvents: "none",
  lineHeight: 1,
};

/** Дропдауны в строке фильтров: делят оставшуюся ширину вместе с поиском. */
const serviceLogFilterDropdownBase: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: 0,
  height: REF_TOP.searchH,
  borderRadius: REF_TOP.searchRadius,
  border: REF_TOP.searchBorder,
  backgroundColor: REF_TOP.searchBg,
  color: SPEC.textPrimary,
  padding: "2px 14px 2px 5px",
  fontSize: 11,
  cursor: "pointer",
  position: "relative",
  textAlign: "left",
  minWidth: 88,
  flex: "1 1 0",
  overflow: "hidden",
  boxSizing: "border-box",
};

const pageShellStyle: CSSProperties = {
  backgroundColor: productSemanticColors.canvas,
  color: C.text,
  minHeight: "100vh",
};

const contentWrapStyle: CSSProperties = {
  minWidth: 0,
  padding: "12px 24px 40px",
};

/** Тулбар фильтров — выравнен по краю колонки (вертикальные отступы из спеки §6.1). */
const serviceLogFilterRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "nowrap",
  gap: REF_TOP.toolbarGap,
  alignItems: "stretch",
  padding: "16px 0 18px",
  borderBottom: SPEC.borderSubtle,
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
};

/** Внешний контейнер левой колонки (layout-only, без общей карточки — экономит место). */
const journalCardLayoutStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minWidth: 0,
};

const detailsCardStyle: CSSProperties = {
  borderRadius: radiusScale.xl,
  border: `1px solid ${productSemanticColors.border}`,
  backgroundColor: productSemanticColors.card,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  flexShrink: 0,
  alignSelf: "flex-start",
  position: "sticky",
  top: 16,
  maxHeight: "calc(100vh - 32px)",
};

const monthCardStyle: CSSProperties = {
  borderRadius: 14,
  border: SPEC.borderSubtle,
  backgroundColor: "rgba(255,255,255,0.012)",
  overflow: "hidden",
  marginTop: 10,
  width: "100%",
  boxSizing: "border-box",
};

const serviceLogFilterLabelStyle: CSSProperties = {
  fontSize: 9,
  color: TOOLBAR_REF.labelColor,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
  lineHeight: 1.15,
};

const serviceLogFilterValueStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: SPEC.textPrimary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: 1.2,
  maxWidth: "100%",
};

const mutedBtnStyle: CSSProperties = {
  height: 34,
  borderRadius: 9,
  border: `1px solid ${C.borderMed}`,
  backgroundColor: "rgba(255,255,255,0.04)",
  color: C.text,
  padding: "0 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

// ─── Pure helpers ──────────────────────────────────────────────────────────────

function parsePaidOnly(v: string | null): boolean {
  return v === "1" || v === "true";
}

function getCompactCost(entry: ServiceLogEntryViewModel): string | null {
  if (entry.totalCostLabel) return entry.totalCostLabel;
  if (entry.costAmount !== null && entry.costCurrency) {
    return `${formatExpenseAmountRu(entry.costAmount)} ${entry.costCurrency}`;
  }
  return null;
}

type ActionType = "REPLACE" | "SERVICE" | "INSPECT" | "STATE_UPDATE";

function getServiceIconConfig(actionType: ActionType): { bg: string; iconColor: string; variant: ActionType } {
  if (actionType === "REPLACE") return { bg: "#172440", iconColor: "#60a5fa", variant: "REPLACE" };
  if (actionType === "INSPECT") return { bg: "#0f2b1f", iconColor: "#4ade80", variant: "INSPECT" };
  if (actionType === "STATE_UPDATE") return { bg: "rgba(255,255,255,0.055)", iconColor: C.text3, variant: "STATE_UPDATE" };
  return { bg: "#112038", iconColor: "#38bdf8", variant: "SERVICE" };
}

function getFirstActionType(entry: ServiceLogEntryViewModel, event: ServiceEventItem | null): ActionType {
  if (entry.eventKind === "STATE_UPDATE") return "STATE_UPDATE";
  const raw = (event?.items?.[0] as { actionType?: string } | undefined)?.actionType;
  if (raw === "REPLACE") return "REPLACE";
  if (raw === "INSPECT") return "INSPECT";
  return "SERVICE";
}

function getPerformerLabel(performedBy: string | null | undefined): string {
  if (performedBy === "SELF") return "Самостоятельно";
  if (performedBy === "SERVICE") return "Сервис";
  if (performedBy === "OTHER") return "Другой";
  return "—";
}

/** Reference layout: day+month on line 1, year on line 2 (`docs/service-log-web-reference-pixel-spec.md` §9.1 col 2). */
function formatRowDateParts(iso: string): { dayMonth: string; year: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { dayMonth: iso.slice(0, 10), year: "" };
  }
  const dayMonth = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const year = date.toLocaleDateString("ru-RU", { year: "numeric" });
  return { dayMonth, year };
}

function getIntervalLabel(event: ServiceEventItem | null): string {
  if (!event) return "—";
  if (event.nextReminderOdometer) return `${event.nextReminderOdometer.toLocaleString("ru-RU")} км`;
  if (event.nextReminderEngineHours) return `${event.nextReminderEngineHours} ч`;
  if (event.nextReminderDate) return event.nextReminderDate.slice(0, 10).split("-").reverse().join(".");
  return "—";
}

// ─── Page component ────────────────────────────────────────────────────────────

export default function VehicleServiceLogPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = params.id;
  const paidOnlyFromQuery = parsePaidOnly(searchParams.get("paidOnly"));
  const nodeIdFromQuery = searchParams.get("nodeId");
  const nodeIdsFromQuery = searchParams.get("nodeIds");
  const nodeLabelFromQuery = searchParams.get("nodeLabel");
  const expandExpensesFromQuery = searchParams.get("expandExpenses");
  const returnNodeIdFromQuery = searchParams.get("returnNodeId");
  const highlightedServiceEventId =
    searchParams.get("serviceEventId") ?? searchParams.get("highlightServiceEventId");

  const [vehicleTitle, setVehicleTitle] = useState("Мотоцикл");
  const [vehicleVin, setVehicleVin] = useState<string | null>(null);
  const [isWideViewport, setIsWideViewport] = useState(false);
  const [events, setEvents] = useState<ServiceEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(highlightedServiceEventId ?? "");
  const [visibleCount, setVisibleCount] = useState(LOAD_MORE_STEP);
  const [filters, setFilters] = useState<ServiceEventsFilters>({
    dateFrom: "",
    dateTo: "",
    eventKind: "",
    serviceType: "",
    node: "",
    paidOnly: paidOnlyFromQuery ? true : undefined,
  });
  const [sort, setSort] = useState<{
    field: ServiceEventsSortField;
    direction: ServiceEventsSortDirection;
  }>({ field: "eventDate", direction: "desc" });

  const nodeFilter = useMemo<ServiceLogNodeFilter | null>(() => {
    const resolvedNodeIds = nodeIdsFromQuery
      ? nodeIdsFromQuery.split(",").filter(Boolean)
      : nodeIdFromQuery
        ? [nodeIdFromQuery]
        : [];
    if (!resolvedNodeIds.length) return null;
    return { nodeIds: resolvedNodeIds, displayLabel: nodeLabelFromQuery || "Узел" };
  }, [nodeIdFromQuery, nodeIdsFromQuery, nodeLabelFromQuery]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, paidOnly: paidOnlyFromQuery ? true : undefined }));
  }, [paidOnlyFromQuery]);

  useEffect(() => {
    if (expandExpensesFromQuery === "1" || expandExpensesFromQuery === "true") {
      setFilters((prev) => ({ ...prev, paidOnly: true }));
    }
  }, [expandExpensesFromQuery]);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const [detail, service] = await Promise.all([
        api.getVehicleDetail(vehicleId),
        api.getServiceEvents(vehicleId),
      ]);
      const vehicle = detail.vehicle;
      const title =
        vehicle?.nickname ||
        `${vehicle?.brandName || ""} ${vehicle?.modelName || ""}`.trim() ||
        "Мотоцикл";
      setVehicleTitle(title);
      setVehicleVin(vehicle?.vin ?? null);
      setEvents(service.serviceEvents ?? []);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Не удалось загрузить журнал обслуживания.");
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { void load(); }, [load]);

  const effectiveNodeIds = useMemo(() => nodeFilter?.nodeIds ?? null, [nodeFilter]);

  const groups = useMemo(
    () => buildServiceLogTimelineProps(events, filters, sort, "default", effectiveNodeIds).monthGroups,
    [events, filters, sort, effectiveNodeIds]
  );

  const wishlistItemIdsByServiceEventId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const ev of events) {
      const ids = getWishlistItemIdsFromInstalledPartsJson(ev.installedPartsJson);
      if (ids.length > 0) map.set(ev.id, ids);
    }
    return map;
  }, [events]);

  const serviceEventById = useMemo(
    () => new Map(events.map((ev) => [ev.id, ev])),
    [events]
  );

  const flatEntries = useMemo(() => groups.flatMap((g) => g.entries), [groups]);

  // Slice entries for load-more, rebuilding groups structure
  const visibleGroups = useMemo(() => {
    let remaining = visibleCount;
    const result: ServiceLogMonthGroupViewModel[] = [];
    for (const group of groups) {
      if (remaining <= 0) break;
      const entries = group.entries.slice(0, remaining);
      remaining -= entries.length;
      result.push({ ...group, entries });
    }
    return result;
  }, [groups, visibleCount]);

  const selectedEntry =
    flatEntries.find((e) => e.id === selectedEventId) ?? flatEntries[0] ?? null;
  const selectedServiceEvent = selectedEntry
    ? (serviceEventById.get(selectedEntry.id) ?? null)
    : null;

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(min-width: 1180px)");
    const update = () => setIsWideViewport(mq.matches);
    update();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  useEffect(() => {
    if (highlightedServiceEventId) {
      setSelectedEventId(highlightedServiceEventId);
      return;
    }
    if (!flatEntries.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(flatEntries[0]?.id ?? "");
    }
  }, [flatEntries, highlightedServiceEventId, selectedEventId]);

  useEffect(() => {
    if (isLoading || !highlightedServiceEventId || groups.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`service-log-event-${highlightedServiceEventId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [groups, highlightedServiceEventId, isLoading]);

  const hasAnyPaid = useMemo(() => filterPaidServiceEvents(events).length > 0, [events]);
  const isQueryActive = useMemo(
    () => isServiceLogTimelineQueryActive(
      filters, sort,
      effectiveNodeIds ? { nodeIds: effectiveNodeIds, displayLabel: "" } : null
    ),
    [filters, sort, effectiveNodeIds]
  );
  const visibleEventCount = flatEntries.length;
  const activeFilterCount = [
    filters.dateFrom, filters.dateTo, filters.eventKind, filters.serviceType, filters.node,
    filters.paidOnly === true ? "paidOnly" : "",
    effectiveNodeIds?.length ? "nodeLink" : "",
  ].filter(Boolean).length;

  const updateFilter = (field: keyof ServiceEventsFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [field]: value }));

  const resetFilters = () => {
    setFilters({ dateFrom: "", dateTo: "", eventKind: "", serviceType: "", node: "", paidOnly: undefined });
    setSort({ field: "eventDate", direction: "desc" });
    router.replace(`/vehicles/${vehicleId}/service-log`);
  };

  const setPaidOnly = (next: boolean) => {
    const q = new URLSearchParams(searchParams.toString());
    if (next) q.set("paidOnly", "1");
    else q.delete("paidOnly");
    router.replace(`/vehicles/${vehicleId}/service-log${q.toString() ? `?${q.toString()}` : ""}`);
  };

  const serviceLogReturnTo = encodeURIComponent(`/vehicles/${vehicleId}/service-log`);

  const openCreate = () =>
    router.push(`/vehicles/${vehicleId}/service-events/new?returnTo=${serviceLogReturnTo}`);

  const openRepeat = (id: string) => {
    if (serviceEventById.get(id)?.eventKind === "STATE_UPDATE") return;
    router.push(`/vehicles/${vehicleId}/service-events/new?repeatOf=${encodeURIComponent(id)}&returnTo=${serviceLogReturnTo}`);
  };

  const openEdit = (id: string) => {
    if (serviceEventById.get(id)?.eventKind === "STATE_UPDATE") return;
    router.push(`/vehicles/${vehicleId}/service-events/${encodeURIComponent(id)}/edit?returnTo=${serviceLogReturnTo}`);
  };

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm("Удалить сервисное событие?\n\nЭто может изменить статус узла и суммы расходов.")) return;
    try {
      await api.deleteServiceEvent(vehicleId, eventId);
      setActionMessage("Сервисное событие удалено. Статусы и расходы обновлены.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить сервисное событие.");
    }
  };

  const navigateBack = () => {
    if (window.history.length > 1) { router.back(); return; }
    if (returnNodeIdFromQuery) {
      router.push(`/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(returnNodeIdFromQuery)}`);
      return;
    }
    router.push(`/vehicles/${vehicleId}`);
  };

  const sortValue = `${sort.field}:${sort.direction}`;
  const sortLabel =
    sortValue === "eventDate:desc"
      ? "Сначала новые"
      : sortValue === "eventDate:asc"
        ? "Сначала старые"
        : sortValue === "cost:desc"
          ? "Расходы ↓"
          : sortValue === "cost:asc"
            ? "Расходы ↑"
            : "Узел A-Z";

  return (
    <main className="mt-internal-page" style={pageShellStyle}>
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: `${sidebarCollapsed ? 64 : 204}px minmax(0, 1fr)`,
          alignItems: "start",
          transition: "grid-template-columns 0.18s ease",
          minHeight: "100vh",
        }}
      >
        <GarageSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <section style={contentWrapStyle}>
          <div style={{ width: "100%" }}>
            <div
              style={
                isWideViewport
                  ? {
                      display: "grid",
                      gridTemplateColumns: `minmax(0, 1fr) ${SERVICE_LOG_DETAILS_COL_WIDTH}px`,
                      gap: 16,
                      alignItems: "start",
                      width: "100%",
                    }
                  : { width: "100%" }
              }
            >
              <div style={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>

            {/* ── Референс: верхняя шапка (назад + авто + VIN | CTA) ─── */}
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
                padding: REF_TOP.vehicleBlockPad,
                paddingLeft: 0,
                paddingRight: 0,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                <button
                  type="button"
                  onClick={navigateBack}
                  aria-label="Назад"
                  style={{
                    width: REF_TOP.backBtn,
                    height: REF_TOP.backBtn,
                    padding: 0,
                    border: "none",
                    borderRadius: REF_TOP.ctaRadius,
                    backgroundColor: "transparent",
                    color: "#F1F5F9",
                    cursor: "pointer",
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronBackSvg />
                </button>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      color: SPEC.textPrimary,
                      ...REF_TOP.vehicleTitle,
                    }}
                  >
                    Журнал обслуживания
                  </p>
                  <p style={{ margin: 0, ...REF_TOP.vin }}>
                    {vehicleTitle}
                    {vehicleVin ? ` · VIN: ${vehicleVin}` : ""}
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: REF_TOP.ctaGap,
                  flexShrink: 0,
                }}
              >
                <Button
                  variant="ghost"
                  onClick={openCreate}
                  leadingIcon={<WrenchHeaderSvg />}
                  style={{
                    height: REF_TOP.ctaH,
                    borderRadius: REF_TOP.ctaRadius,
                    padding: `0 ${REF_TOP.ghostPadX}px`,
                    fontSize: REF_TOP.ghostFont,
                    fontWeight: REF_TOP.ghostWeight,
                    whiteSpace: "nowrap",
                  }}
                >
                  Добавить событие
                </Button>
                <Button
                  variant="primary"
                  onClick={openCreate}
                  leadingIcon={<PlusSmallSvg />}
                  style={{
                    height: REF_TOP.ctaH,
                    borderRadius: REF_TOP.ctaRadius,
                    padding: `0 ${REF_TOP.primaryPadX}px`,
                    fontSize: REF_TOP.primaryFont,
                    fontWeight: REF_TOP.primaryWeight,
                    whiteSpace: "nowrap",
                  }}
                >
                  Добавить ТО
                </Button>
              </div>
            </header>

            {/* ── Action message ────────────────────────────────────── */}
            {actionMessage ? (
              <div
                style={{
                  borderRadius: 10,
                  border: `1px solid ${productSemanticColors.successBorder}`,
                  backgroundColor: productSemanticColors.successSurface,
                  color: productSemanticColors.successText,
                  padding: "8px 14px",
                  fontSize: 13,
                  marginBottom: 10,
                }}
              >
                {actionMessage}
              </div>
            ) : null}

            {/* ── States ────────────────────────────────────────────── */}
            {isLoading ? (
              <p style={{ color: C.text2, fontSize: 14, padding: "24px 0" }}>Загрузка журнала обслуживания…</p>
            ) : null}
            {!isLoading && error ? (
              <p style={{ color: productSemanticColors.error, fontSize: 14, padding: "24px 0" }}>{error}</p>
            ) : null}

            {/* ── Main 2-col split: Journal card | Details card ─────── */}
            {!isLoading && !error ? (
              <div style={{ width: "100%", minWidth: 0 }}>

                {/* ── Journal card (single 18-radius surface, spec §5.1) ─ */}
                <div style={journalCardLayoutStyle}>
                  <style>
                    {`
.service-log-ref-ph::placeholder { color: ${REF_TOP.searchPlaceholder}; opacity: 1; }
.service-log-ref-ph::-webkit-input-placeholder { color: ${REF_TOP.searchPlaceholder}; }
.service-log-ref-ph::-moz-placeholder { color: ${REF_TOP.searchPlaceholder}; opacity: 1; }
`}
                  </style>

                  {/* Поиск и фильтры: без общей карточки, минимальный gap, отдельные поля */}
                  <div style={serviceLogFilterRowStyle}>
                    {/* 1 — поиск */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flex: "2.4 1 0%",
                        minWidth: 160,
                        height: REF_TOP.searchH,
                        borderRadius: TOOLBAR_REF.moduleRadius,
                        border: TOOLBAR_REF.moduleBorder,
                        backgroundColor: TOOLBAR_REF.moduleBg,
                        padding: "0 10px",
                        boxSizing: "border-box",
                      }}
                    >
                        <SearchSvg />
                        <input
                          className="service-log-ref-ph"
                          value={filters.serviceType}
                          onChange={(e) => updateFilter("serviceType", e.target.value)}
                          placeholder="Поиск по событию, узлу, комментарию"
                          style={{
                            flex: 1,
                            minWidth: 0,
                            height: "100%",
                            background: "transparent",
                            border: "none",
                            color: SPEC.textPrimary,
                            fontSize: 14,
                            fontWeight: 400,
                            outline: "none",
                          }}
                        />
                      </div>

                    {/* 2 — тип события (узкая колонка) */}
                    <div
                      style={{
                        ...serviceLogFilterDropdownBase,
                        border: TOOLBAR_REF.moduleBorder,
                        backgroundColor: TOOLBAR_REF.moduleBg,
                        borderRadius: TOOLBAR_REF.moduleRadius,
                      }}
                    >
                        <span style={serviceLogFilterLabelStyle}>Тип события</span>
                        <span style={serviceLogFilterValueStyle}>
                          {filters.eventKind === "SERVICE"
                            ? "Сервис"
                            : filters.eventKind === "STATE_UPDATE"
                              ? "Состояние"
                              : "Все"}
                        </span>
                        <span style={toolbarDropdownChevronStyle}>▾</span>
                        <select
                          value={filters.eventKind}
                          onChange={(e) => updateFilter("eventKind", e.target.value)}
                          style={dropdownSelectOverlayStyle}
                          aria-label="Тип события"
                        >
                          <option value="">Все</option>
                          <option value="SERVICE">Сервис</option>
                          <option value="STATE_UPDATE">Состояние</option>
                        </select>
                      </div>

                    {/* 3 — узел */}
                    <div
                      style={{
                        ...serviceLogFilterDropdownBase,
                        border: TOOLBAR_REF.moduleBorder,
                        backgroundColor: TOOLBAR_REF.moduleBg,
                        borderRadius: TOOLBAR_REF.moduleRadius,
                      }}
                    >
                      <span style={serviceLogFilterLabelStyle}>Узел</span>
                      <span style={serviceLogFilterValueStyle}>
                        {filters.node.trim() ? filters.node : "Все узлы"}
                      </span>
                      <span style={toolbarDropdownChevronStyle}>▾</span>
                      <input
                        value={filters.node}
                        onChange={(e) => updateFilter("node", e.target.value)}
                        placeholder="Введите название узла"
                        title="Узел"
                        aria-label="Фильтр по узлу"
                        style={dropdownSelectOverlayStyle}
                      />
                    </div>

                    {/* 4 — период */}
                    <div
                      style={{
                        ...serviceLogFilterDropdownBase,
                        border: TOOLBAR_REF.moduleBorder,
                        backgroundColor: TOOLBAR_REF.moduleBg,
                        borderRadius: TOOLBAR_REF.moduleRadius,
                      }}
                    >
                      <span style={serviceLogFilterLabelStyle}>Период</span>
                      <span style={serviceLogFilterValueStyle}>
                        {filters.dateFrom || filters.dateTo
                          ? `${filters.dateFrom || "…"} – ${filters.dateTo || "…"}`
                          : "Все время"}
                      </span>
                      <span style={toolbarDropdownChevronStyle}>▾</span>
                      <div
                        style={{
                          ...dropdownSelectOverlayStyle,
                          display: "flex",
                          gap: 4,
                          padding: 4,
                          opacity: 0,
                          zIndex: 1,
                        }}
                      >
                        <input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => updateFilter("dateFrom", e.target.value)}
                          style={{ flex: 1, padding: 4, fontSize: 11, border: "none", background: "transparent", color: C.text }}
                        />
                        <input
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => updateFilter("dateTo", e.target.value)}
                          style={{ flex: 1, padding: 4, fontSize: 11, border: "none", background: "transparent", color: C.text }}
                        />
                      </div>
                    </div>

                    {/* 5 — тумблер + подпись в 2 строки */}
                    <label
                      role="switch"
                      aria-checked={filters.paidOnly === true}
                      aria-label="Только оплаченные записи"
                      tabIndex={0}
                      onClick={() => setPaidOnly(filters.paidOnly !== true)}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          setPaidOnly(filters.paidOnly !== true);
                        }
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 3,
                        flexShrink: 0,
                        cursor: "pointer",
                        userSelect: "none",
                        color: SPEC.textPrimary,
                        minHeight: REF_TOP.searchH,
                        padding: "0 2px",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          display: "inline-block",
                          width: REF_TOP.toggleW,
                          height: REF_TOP.toggleH,
                          borderRadius: 999,
                          backgroundColor: filters.paidOnly === true ? SPEC.accent : "rgba(148,163,184,0.28)",
                          position: "relative",
                          transition: "background-color 0.15s",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: (REF_TOP.toggleH - REF_TOP.toggleThumb) / 2,
                            left: filters.paidOnly === true ? REF_TOP.toggleW - REF_TOP.toggleThumb - 2 : 2,
                            width: REF_TOP.toggleThumb,
                            height: REF_TOP.toggleThumb,
                            borderRadius: "50%",
                            backgroundColor: filters.paidOnly === true ? "#fff" : "#e2e8f0",
                            transition: "left 0.15s",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                          }}
                        />
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          lineHeight: 1.1,
                          textAlign: "center",
                          maxWidth: 72,
                        }}
                      >
                        Оплаченные
                      </span>
                    </label>

                    {/* 6 — кнопка «Фильтры» */}
                    <button
                      type="button"
                      onClick={resetFilters}
                      disabled={!isQueryActive}
                      aria-label="Сбросить фильтры"
                      style={{
                        position: "relative",
                        alignSelf: "center",
                        flexShrink: 0,
                        height: REF_TOP.searchH,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        padding: "0 7px 0 6px",
                        borderRadius: TOOLBAR_REF.moduleRadius,
                        border: TOOLBAR_REF.moduleBorder,
                        backgroundColor: TOOLBAR_REF.moduleBg,
                        color: SPEC.textPrimary,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: isQueryActive ? "pointer" : "not-allowed",
                        opacity: isQueryActive ? 1 : 0.55,
                        boxSizing: "border-box",
                      }}
                    >
                      <FilterSvg />
                      Фильтры
                      {activeFilterCount > 0 ? (
                        <span
                          style={{
                            position: "absolute",
                            top: -4,
                            right: -4,
                            minWidth: 18,
                            height: 18,
                            padding: "0 4px",
                            borderRadius: 999,
                            backgroundColor: TOOLBAR_REF.filterCountBadgeBg,
                            color: TOOLBAR_REF.filterCountBadgeColor,
                            fontSize: 10,
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxSizing: "border-box",
                            lineHeight: 1,
                            pointerEvents: "none",
                          }}
                        >
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </button>
                  </div>

                    {/* Вторая строка: как в макете — найдено, сортировка, вид (не в полоске фильтров) */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 8,
                        rowGap: 6,
                        padding: REF_TOP.infoPad,
                        fontSize: REF_TOP.infoFont,
                        color: REF_TOP.infoMuted,
                        borderBottom: SPEC.borderSubtle,
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 400, letterSpacing: "0.01em", color: REF_TOP.infoMuted }}>
                          Найдено:{" "}
                          <span style={{ color: SPEC.textPrimary, fontWeight: 600 }}>{visibleEventCount}</span> событий
                        </span>
                        {nodeFilter ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              borderRadius: 6,
                              border: SPEC.borderSubtle,
                              backgroundColor: C.wash,
                              padding: "2px 6px",
                              fontSize: 12,
                            }}
                          >
                            Узел: <strong style={{ color: SPEC.textPrimary }}>{nodeFilter.displayLabel}</strong>
                            <button
                              type="button"
                              onClick={() => {
                                const q = new URLSearchParams(searchParams.toString());
                                q.delete("nodeId");
                                q.delete("nodeIds");
                                q.delete("nodeLabel");
                                router.replace(`/vehicles/${vehicleId}/service-log${q.toString() ? `?${q.toString()}` : ""}`);
                              }}
                              aria-label="Сбросить фильтр узла"
                              style={{
                                background: "none",
                                border: "none",
                                color: C.text3,
                                cursor: "pointer",
                                padding: 0,
                                fontSize: 13,
                                lineHeight: 1,
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              height: REF_TOP.sortComboH,
                              padding: "0 30px 0 12px",
                              borderRadius: REF_TOP.viewBtn.radius,
                              border: REF_TOP.searchBorder,
                              backgroundColor: REF_TOP.searchBg,
                              color: SPEC.textPrimary,
                              fontSize: 13,
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span style={{ color: REF_TOP.infoMuted, fontWeight: 400 }}>Сортировка:</span>
                            <span style={{ fontWeight: 500 }}>{sortLabel}</span>
                          </span>
                          <span
                            style={{
                              position: "absolute",
                              right: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#94A3B8",
                              fontSize: 11,
                              pointerEvents: "none",
                            }}
                          >
                            ▾
                          </span>
                          <select
                            value={sortValue}
                            onChange={(e) => {
                              const [field, direction] = e.target.value.split(":") as [
                                ServiceEventsSortField,
                                ServiceEventsSortDirection,
                              ];
                              setSort({ field, direction });
                            }}
                            aria-label="Сортировка"
                            style={{
                              position: "absolute",
                              inset: 0,
                              opacity: 0,
                              cursor: "pointer",
                            }}
                          >
                            <option value="eventDate:desc">Сначала новые</option>
                            <option value="eventDate:asc">Сначала старые</option>
                            <option value="cost:desc">Расходы ↓</option>
                            <option value="cost:asc">Расходы ↑</option>
                            <option value="node:asc">Узел A-Z</option>
                          </select>
                        </div>
                        <ViewToggleIcons />
                      </div>
                    </div>

                  <div style={{ width: "100%", boxSizing: "border-box", padding: "10px 0 18px" }}>
                    {/* Empty state */}
                    {groups.length === 0 ? (
                      <div
                        style={{
                          marginTop: 12,
                          borderRadius: 12,
                          border: SPEC.borderSubtle,
                          backgroundColor: C.wash,
                          padding: "24px 18px",
                          fontSize: 13,
                          color: C.text2,
                        }}
                      >
                        <p style={{ fontWeight: 700, color: SPEC.textPrimary }}>
                          {filters.paidOnly === true && !hasAnyPaid ? "Расходов пока нет" : "Ничего не найдено"}
                        </p>
                        <p style={{ marginTop: 6, lineHeight: 1.5 }}>
                          {filters.paidOnly === true && !hasAnyPaid
                            ? "Нет сервисных записей с суммой больше нуля и указанной валютой."
                            : nodeFilter
                              ? `Для узла «${nodeFilter.displayLabel}» нет записей. Сбросьте фильтр или измените условия.`
                              : "По текущим фильтрам нет записей."}
                        </p>
                      </div>
                    ) : null}

                    {/* Month sections */}
                    {visibleGroups.map((group) => (
                      <section key={group.monthKey} style={monthCardStyle}>
                        <MonthGroupHeader group={group} />
                        <div>
                          {group.entries.map((entry, idx) => {
                            const isSelected = entry.id === selectedEntry?.id;
                            const isHighlighted = entry.id === highlightedServiceEventId;
                            const rawEvent = serviceEventById.get(entry.id) ?? null;
                            return (
                              <article
                                key={entry.id}
                                id={`service-log-event-${entry.id}`}
                                style={{ scrollMarginTop: 80 }}
                              >
                                <ServiceLogRow
                                  entry={entry}
                                  event={rawEvent}
                                  isSelected={isSelected}
                                  isHighlighted={isHighlighted}
                                  isFirst={idx === 0}
                                  isLast={idx === group.entries.length - 1}
                                  onSelect={() => setSelectedEventId(entry.id)}
                                />
                                {isSelected && !isWideViewport ? (
                                  <div style={{ borderTop: SPEC.borderSubtle }}>
                                    <ServiceLogEventDetails
                                      entry={entry}
                                      event={rawEvent}
                                      originWishlistItemIds={wishlistItemIdsByServiceEventId.get(entry.id) ?? []}
                                      onOpenWishlistOrigin={(wid) =>
                                        router.push(`/vehicles/${vehicleId}/parts?wishlistItemId=${encodeURIComponent(wid)}`)
                                      }
                                      onClearSelection={() => setSelectedEventId("")}
                                      onRepeat={() => openRepeat(entry.id)}
                                      onEdit={() => openEdit(entry.id)}
                                      onDelete={() => void deleteEvent(entry.id)}
                                    />
                                  </div>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ))}

                    {/* Load more */}
                    {flatEntries.length > visibleCount ? (
                      <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 2px" }}>
                        <button
                          type="button"
                          onClick={() => setVisibleCount((v) => v + LOAD_MORE_STEP)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            minWidth: 240,
                            padding: "10px 22px",
                            background: "rgba(255,255,255,0.03)",
                            border: SPEC.borderSubtle,
                            borderRadius: 10,
                            color: SPEC.textSecondary,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Показать ещё события ▾
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
              </div>

              {/* ── Right details card: always right of whole left column ───────────────── */}
              {isWideViewport ? (
                <aside style={detailsCardStyle}>
                  {selectedEntry ? (
                    <ServiceLogEventDetails
                      entry={selectedEntry}
                      event={selectedServiceEvent}
                      originWishlistItemIds={wishlistItemIdsByServiceEventId.get(selectedEntry.id) ?? []}
                      onOpenWishlistOrigin={(wid) =>
                        router.push(`/vehicles/${vehicleId}/parts?wishlistItemId=${encodeURIComponent(wid)}`)
                      }
                      onClearSelection={() => setSelectedEventId("")}
                      onRepeat={() => openRepeat(selectedEntry.id)}
                      onEdit={() => openEdit(selectedEntry.id)}
                      onDelete={() => void deleteEvent(selectedEntry.id)}
                    />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 220,
                        padding: "24px",
                        color: SPEC.textSecondary,
                        fontSize: 13,
                        textAlign: "center",
                      }}
                    >
                      Выберите событие в журнале, чтобы увидеть подробности по узлам, запчастям и расходам.
                    </div>
                  )}
                </aside>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

// ─── Toolbar dropdown button (2-line: label + value) ───────────────────────────

const dropdownSelectOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  cursor: "pointer",
  border: "none",
  background: "transparent",
  color: "transparent",
};

function ViewToggleIcons() {
  const { w, h, radius } = REF_TOP.viewBtn;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span
        aria-label="Список"
        style={{
          width: w,
          height: h,
          borderRadius: radius,
          border: REF_TOP.searchBorder,
          backgroundColor: "rgba(255,255,255,0.08)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#F8FAFC",
        }}
      >
        <ListSvg />
      </span>
      <span
        aria-label="Сетка"
        style={{
          width: w,
          height: h,
          borderRadius: radius,
          border: REF_TOP.searchBorder,
          backgroundColor: "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748B",
        }}
      >
        <GridSvg />
      </span>
    </div>
  );
}

// ─── Month group header (inside month card) ──────────────────────────────────

function MonthGroupHeader({ group }: { group: ServiceLogMonthGroupViewModel }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: `12px ${REF_TOP.padX}px 10px`,
        flexWrap: "wrap",
        backgroundColor: "rgba(255,255,255,0.018)",
        borderBottom: SPEC.borderSubtle,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 800, color: SPEC.textPrimary, textTransform: "capitalize" }}>
        {group.label}
      </span>
      <span
        style={{
          borderRadius: 6,
          backgroundColor: "rgba(56,189,248,0.10)",
          border: "1px solid rgba(56,189,248,0.25)",
          padding: "1px 7px",
          fontSize: 11,
          fontWeight: 700,
          color: "#7dd3fc",
        }}
      >
        {group.entries.length} {group.entries.length === 1 ? "событие" : "события"}
      </span>
      {group.summary.serviceCount > 0 ? (
        <span style={{ fontSize: 11, color: C.text3 }}>
          {group.summary.serviceCount} сервис
        </span>
      ) : null}
      {group.summary.costLabel ? (
        <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>
          {group.summary.costLabel}
        </span>
      ) : null}
    </div>
  );
}

// ─── Timeline row (with rail column) ─────────────────────────────────────────

function ServiceLogRow({
  entry,
  event,
  isSelected,
  isHighlighted,
  isFirst,
  isLast,
  onSelect,
}: {
  entry: ServiceLogEntryViewModel;
  event: ServiceEventItem | null;
  isSelected: boolean;
  isHighlighted: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
}) {
  const isStateUpdate = entry.eventKind === "STATE_UPDATE";
  const actionType = getFirstActionType(entry, event);
  const iconCfg = getServiceIconConfig(actionType);
  const cost = getCompactCost(entry);
  const intervalLabel = getIntervalLabel(event);
  const performerLabel = getPerformerLabel(event?.performedBy);

  // Timeline circle: orange filled w/ check (selected), green outlined check (services), gray (state-update)
  const dotInner = isSelected ? (
    <CheckSvg color="#fff" size={9} />
  ) : !isStateUpdate ? (
    <CheckSvg color="#22c55e" size={9} />
  ) : null;
  const dotBg = isSelected ? SPEC.accent : "transparent";
  const dotBorder = isSelected
    ? SPEC.accent
    : isStateUpdate
      ? "rgba(255,255,255,0.18)"
      : "rgba(34,197,94,0.6)";

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "grid",
        gridTemplateColumns:
          "minmax(72px, 1.1fr) 32px 44px minmax(0, 2.5fr) minmax(88px, 1fr) minmax(88px, 1fr) minmax(96px, 1fr) 22px",
        gap: 12,
        width: "100%",
        alignItems: "center",
        minHeight: isStateUpdate ? 56 : 72,
        padding: `10px ${REF_TOP.padX}px`,
        textAlign: "left",
        background: isSelected ? SPEC.rowSelectWash : "transparent",
        border: "none",
        borderTop: !isFirst ? SPEC.borderSubtle : "none",
        cursor: "pointer",
        transition: "background 0.1s",
      }}
      aria-expanded={isSelected}
    >
      {/* Col 1 — Date (day+month / year) + odometer (3 lines, ref §9.1) */}
      <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {(() => {
          const { dayMonth, year } = formatRowDateParts(event?.eventDate ?? "");
          return (
            <>
              <span
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: SPEC.textPrimary,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {dayMonth || entry.dateLabel}
              </span>
              {year ? (
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    color: SPEC.textPrimary,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {year}
                </span>
              ) : null}
            </>
          );
        })()}
        <span style={{ display: "block", fontSize: 11, color: SPEC.textMuted, marginTop: 2 }}>
          {entry.odometerValue}
        </span>
      </span>

      {/* Col 2 — Timeline rail (vertical line + circle) */}
      <span
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 56,
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: isFirst ? "50%" : 0,
            bottom: isLast ? "50%" : 0,
            width: 1,
            backgroundColor: SPEC.timelineLine,
          }}
        />
        <span
          style={{
            position: "relative",
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: dotBg,
            border: `1.5px solid ${dotBorder}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isHighlighted && !isSelected ? `0 0 0 3px ${SPEC.rowSelectWash}` : undefined,
          }}
        >
          {dotInner}
        </span>
      </span>

      {/* Col 3 — Service icon */}
      <span style={{ display: "flex", justifyContent: "center" }}>
        <ServiceTypeIcon actionType={actionType} iconCfg={iconCfg} size={36} />
      </span>

      {/* Col 4 — Title + subtitle */}
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 13.5,
            fontWeight: 700,
            color: SPEC.textPrimary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.25,
          }}
        >
          {entry.mainTitle}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 11.5,
            color: SPEC.textSecondary,
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {isStateUpdate
            ? (entry.stateUpdateSubtitle ?? entry.compactMetricsLine)
            : entry.secondaryTitle}
        </span>
      </span>

      {/* Col 5 — Cost */}
      <RowMetric
        icon={<CoinSvg />}
        value={cost ?? "—"}
        label="Стоимость"
        emphasize={!!cost}
        emphasizeColor={C.green}
      />

      {/* Col 6 — Interval */}
      <RowMetric icon={<ClockSvg />} value={intervalLabel} label="Интервал" />

      {/* Col 7 — Performer */}
      <RowMetric icon={<PersonSvg />} value={performerLabel} label="Исполнитель" />

      {/* Col 8 — Chevron */}
      <span
        style={{
          fontSize: 16,
          color: isSelected ? SPEC.accent : SPEC.textMuted,
          display: "flex",
          justifyContent: "flex-end",
          lineHeight: 1,
        }}
      >
        ›
      </span>
    </button>
  );
}

function RowMetric({
  icon,
  value,
  label,
  emphasize = false,
  emphasizeColor,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  emphasize?: boolean;
  emphasizeColor?: string;
}) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontWeight: 700,
          fontSize: 12.5,
          color: emphasize && emphasizeColor ? emphasizeColor : SPEC.textPrimary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <span style={{ color: SPEC.textSecondary, display: "inline-flex" }}>{icon}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
      </span>
      <span
        style={{
          fontSize: 9.5,
          color: SPEC.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </span>
  );
}

// ─── Details panel ─────────────────────────────────────────────────────────────

function ServiceLogEventDetails({
  entry,
  event,
  originWishlistItemIds,
  onOpenWishlistOrigin,
  onClearSelection,
  onRepeat,
  onEdit,
  onDelete,
}: {
  entry: ServiceLogEntryViewModel;
  event: ServiceEventItem | null;
  originWishlistItemIds: string[];
  onOpenWishlistOrigin: (wishlistItemId: string) => void;
  onClearSelection: () => void;
  onRepeat: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isStateUpdate = entry.eventKind === "STATE_UPDATE";
  const actionType = getFirstActionType(entry, event);
  const iconCfg = getServiceIconConfig(actionType);
  const cost = getCompactCost(entry);
  const intervalLabel = getIntervalLabel(event);
  const performerLabel = getPerformerLabel(event?.performedBy);
  const linkedExpenses = event?.expenseItems ?? [];
  const linkedExpenseTotals = new Map<string, number>();
  for (const expense of linkedExpenses) {
    linkedExpenseTotals.set(expense.currency, (linkedExpenseTotals.get(expense.currency) ?? 0) + expense.amount);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Panel header */}
      <div style={{ padding: "18px 24px 14px", borderBottom: SPEC.borderSubtle }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
            <ServiceTypeIcon actionType={actionType} iconCfg={iconCfg} size={40} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: SPEC.textPrimary, lineHeight: 1.2 }}>
                {entry.mainTitle}
              </p>
              <p style={{ fontSize: 12, color: SPEC.textMuted, marginTop: 3 }}>
                {isStateUpdate ? (entry.stateUpdateSubtitle ?? "") : entry.secondaryTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            aria-label="Закрыть панель"
            style={{
              background: "none",
              border: "none",
              color: SPEC.textMuted,
              cursor: "pointer",
              fontSize: 18,
              padding: 2,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 6,
              padding: "3px 9px",
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: isStateUpdate ? C.wash : "rgba(34,197,94,0.14)",
              border: isStateUpdate ? SPEC.borderSubtle : "1px solid rgba(34,197,94,0.3)",
              color: isStateUpdate ? C.text3 : "#4ade80",
            }}
          >
            {isStateUpdate ? "Обновление состояния" : "Выполнено"}
          </span>
        </div>
      </div>

      {/* 4-column flat metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          borderBottom: SPEC.borderSubtle,
          flexShrink: 0,
        }}
      >
        <MetricCol label="Дата" value={entry.dateLabel} />
        <MetricCol label="Пробег" value={entry.odometerLabel} />
        <MetricCol label="Интервал" value={intervalLabel} />
        <MetricCol label="Стоимость" value={cost ?? "—"} accent={!!cost} noRightBorder />
      </div>

      {/* Scrollable body */}
      <div style={{ overflowY: "auto", flex: 1 }}>

        {/* Parts / work items */}
        {!isStateUpdate && entry.bundleItemsSummary.length > 0 ? (
          <div style={{ padding: "14px 24px", borderBottom: SPEC.borderSubtle }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <PanelSectionTitle>Установленные запчасти</PanelSectionTitle>
              <span style={{ fontSize: 11, color: C.text3 }}>
                {entry.bundleItemsSummary.length} позиций
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {entry.bundleItemsSummary.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 10,
                    backgroundColor: C.row,
                    border: SPEC.borderSubtle,
                  }}
                >
                  {/* Placeholder thumbnail */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      backgroundColor: C.wash,
                      border: SPEC.borderSubtle,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: C.text3,
                    }}
                  >
                    <BoxSvg />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.partName ?? item.actionLabelRu}
                    </p>
                    <p style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                      {item.sku ? `SKU: ${item.sku}` : item.nodeName}
                      {item.quantity != null ? ` · ${item.quantity} шт.` : ""}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: item.lineCostRu ? C.green : C.text3,
                      flexShrink: 0,
                      textAlign: "right",
                    }}
                  >
                    {item.lineCostRu ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* State update lines */}
        {isStateUpdate ? (
          <div style={{ padding: "14px 24px", borderBottom: SPEC.borderSubtle }}>
            <PanelSectionTitle>Изменения состояния</PanelSectionTitle>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {(entry.stateUpdateLines.length > 0 ? entry.stateUpdateLines : [entry.stateUpdateSubtitle]).map((line) =>
                line ? (
                  <p key={line} style={{ fontSize: 13, color: C.text2 }}>
                    {line}
                  </p>
                ) : null
              )}
            </div>
          </div>
        ) : null}

        {/* Comment */}
        {entry.comment ? (
          <div style={{ padding: "14px 24px", borderBottom: SPEC.borderSubtle }}>
            <PanelSectionTitle>Комментарий</PanelSectionTitle>
            <p
              style={{
                marginTop: 8,
                fontSize: 13,
                color: C.text2,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {entry.comment}
            </p>
          </div>
        ) : null}

        {/* Performer */}
        <div style={{ padding: "14px 24px", borderBottom: SPEC.borderSubtle }}>
          <PanelSectionTitle>Исполнитель</PanelSectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: C.wash,
                border: SPEC.borderSubtle,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.text3,
                flexShrink: 0,
              }}
            >
              <PersonSvg />
            </div>
            <span style={{ fontSize: 13, color: C.text2 }}>{performerLabel}</span>
            {event?.serviceProviderNote ? (
              <span style={{ fontSize: 12, color: C.text3 }}>· {event.serviceProviderNote}</span>
            ) : null}
          </div>
        </div>

        {/* Sources / wishlist origin */}
        <div style={{ padding: "14px 24px", borderBottom: SPEC.borderSubtle }}>
          <PanelSectionTitle>Источники</PanelSectionTitle>
          {originWishlistItemIds.length > 0 ? (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {originWishlistItemIds.map((wid, idx) => (
                <button
                  key={wid}
                  type="button"
                  onClick={() => onOpenWishlistOrigin(wid)}
                  style={{
                    ...mutedBtnStyle,
                    height: 28,
                    fontSize: 11,
                    textDecoration: "underline",
                    textDecorationStyle: "dotted",
                  }}
                >
                  {originWishlistItemIds.length === 1 ? (entry.wishlistOriginLabelRu ?? "Из списка покупок") : `Позиция ${idx + 1}`}
                </button>
              ))}
            </div>
          ) : entry.wishlistOriginLabelRu ? (
            <p style={{ marginTop: 6, fontSize: 13, color: C.text2 }}>{entry.wishlistOriginLabelRu}</p>
          ) : (
            <p style={{ marginTop: 6, fontSize: 13, color: C.text3 }}>—</p>
          )}
        </div>

        {/* Expenses */}
        {!isStateUpdate && linkedExpenses.length > 0 ? (
          <div style={{ padding: "14px 24px", borderBottom: SPEC.borderSubtle }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <PanelSectionTitle>Расходы</PanelSectionTitle>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
                {Array.from(linkedExpenseTotals.entries())
                  .map(([cur, amt]) => `${formatExpenseAmountRu(amt)} ${cur}`)
                  .join(" · ")}
              </span>
            </div>
            {linkedExpenses.map((expense) => (
              <div
                key={expense.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "5px 0",
                  borderTop: SPEC.borderSubtle,
                }}
              >
                <span style={{ fontSize: 12, color: C.text2 }}>
                  {expense.title} · {expenseCategoryLabelsRu[expense.category]}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                  {formatExpenseAmountRu(expense.amount)} {expense.currency}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Fixed bottom actions */}
      {!isStateUpdate ? (
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "14px 24px 16px",
            borderTop: SPEC.borderSubtle,
            backgroundColor: SPEC.bgPanel,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onEdit}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              border: SPEC.borderSubtle,
              backgroundColor: "transparent",
              color: SPEC.textPrimary,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <EditSvg /> Редактировать
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              border: SPEC.borderSubtle,
              backgroundColor: "transparent",
              color: C.danger,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <TrashSvg /> Удалить
          </button>
          <button
            type="button"
            onClick={onRepeat}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              border: SPEC.borderSubtle,
              backgroundColor: "transparent",
              color: SPEC.textPrimary,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <RepeatSvg /> Повторить ТО
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Small components ──────────────────────────────────────────────────────────

function ServiceTypeIcon({
  actionType,
  iconCfg,
  size = 36,
}: {
  actionType: ActionType;
  iconCfg: { bg: string; iconColor: string; variant: ActionType };
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: iconCfg.bg,
        border: `1px solid rgba(255,255,255,0.08)`,
        color: iconCfg.iconColor,
        flexShrink: 0,
      }}
    >
      {actionType === "INSPECT" ? <InspectSvg /> : actionType === "STATE_UPDATE" ? <StateSvg /> : <WrenchSvg />}
    </span>
  );
}

function MetricCol({
  label,
  value,
  accent = false,
  noRightBorder = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  noRightBorder?: boolean;
}) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRight: noRightBorder ? undefined : SPEC.borderSubtle,
      }}
    >
      <p
        style={{
          fontSize: 10,
          color: SPEC.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 4,
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: 14, fontWeight: 700, color: accent ? C.green : SPEC.textPrimary }}>
        {value}
      </p>
    </div>
  );
}

function PanelSectionTitle({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: SPEC.textSecondary,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
      }}
    >
      {children}
    </p>
  );
}

// ─── SVG icons ─────────────────────────────────────────────────────────────────

function WrenchSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Обслуживание</title>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

/** Иконка ключа для кнопки «Добавить событие» в шапке (референс ~15×15). */
function WrenchHeaderSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <title>Добавить событие</title>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

/** Монета с ₽ — иконка слева у метрики «Стоимость» (см. референс service-log-web.png). */
function CoinSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <title>Стоимость</title>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 8h4.2a2.6 2.6 0 0 1 0 5.2H9" />
      <path d="M9 8v9" />
      <path d="M7.5 13.2H12" />
    </svg>
  );
}

function InspectSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Осмотр</title>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function StateSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Состояние</title>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function ClockSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Интервал</title>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PersonSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Исполнитель</title>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BoxSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <title>Деталь</title>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

function ChevronBackSvg() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <title>Назад</title>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function PlusSmallSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <title>Плюс</title>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function FilterSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Фильтры</title>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function EditSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Редактировать</title>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function TrashSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Удалить</title>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function RepeatSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Повторить</title>
      <path d="M17 3.34V7a5 5 0 0 1 5 5" />
      <path d="M22 12h-4" />
      <path d="M7 20.66V17a5 5 0 0 1-5-5" />
      <path d="M2 12h4" />
      <path d="M17 3.34A10 10 0 0 1 9.71 21M7 20.66A10 10 0 0 0 14.29 3" />
    </svg>
  );
}

function CheckSvg({ color = "currentColor", size = 10 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <title>Выполнено</title>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SearchSvg() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={REF_TOP.searchPlaceholder}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <title>Поиск</title>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function ListSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Список</title>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function GridSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Сетка</title>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
