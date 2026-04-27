"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  buildExpenseSummaryFromServiceEvents,
  buildServiceLogTimelineProps,
  filterPaidServiceExpenseEvents,
  createInitialAddServiceEventFormValues,
  createInitialEditServiceEventValues,
  filterPaidServiceEvents,
  flattenNodeTreeToSelectOptions,
  formatExpenseAmountRu,
  formatExpenseMonthLabelRu,
  formatIsoCalendarDateRu,
  getCurrentExpenseMonthKey,
  getExpenseMonthDateRange,
  addMonthsToExpenseMonthKey,
  getNodeAndDescendantIds,
  getTopLevelNodeTreeItems,
  getServiceLogEventKindBadgeLabel,
  isServiceLogTimelineQueryActive,
  normalizeAddServiceEventPayload,
  normalizeEditServiceEventPayload,
  SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS,
  validateAddServiceEventFormValues,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import type {
  AddServiceEventFormValues,
  NodeTreeItem,
  ServiceEventItem,
  ServiceEventsFilters,
  ServiceEventsSortDirection,
  ServiceEventsSortField,
  ServiceLogNodeFilter,
} from "@mototwin/types";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

function parsePaidOnly(v: string | null): boolean {
  return v === "1" || v === "true";
}

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
  const monthFromQuery = searchParams.get("month");

  const [vehicleTitle, setVehicleTitle] = useState("Мотоцикл");
  const [vehicleOdometer, setVehicleOdometer] = useState<number | null>(null);
  const [events, setEvents] = useState<ServiceEventItem[]>([]);
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [isExpenseExpanded, setIsExpenseExpanded] = useState(false);
  const [isExpenseMonthPickerOpen, setIsExpenseMonthPickerOpen] = useState(false);
  const expenseMonthWheelRef = useRef<HTMLDivElement | null>(null);
  const expenseMonthScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expenseMonthKey, setExpenseMonthKey] = useState<string>(getCurrentExpenseMonthKey());
  const [expenseSectionFilter, setExpenseSectionFilter] = useState<string | null>(null);
  const [isServiceEventModalOpen, setIsServiceEventModalOpen] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [editingServiceEventId, setEditingServiceEventId] = useState<string | null>(null);
  const [serviceEventForm, setServiceEventForm] = useState<AddServiceEventFormValues>(
    createInitialAddServiceEventFormValues()
  );
  const [serviceEventFormError, setServiceEventFormError] = useState("");
  const [isSavingServiceEvent, setIsSavingServiceEvent] = useState(false);
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
    if (!resolvedNodeIds.length) {
      return null;
    }
    return {
      nodeIds: resolvedNodeIds,
      displayLabel: nodeLabelFromQuery || "Узел",
    };
  }, [nodeIdFromQuery, nodeIdsFromQuery, nodeLabelFromQuery]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, paidOnly: paidOnlyFromQuery ? true : undefined }));
  }, [paidOnlyFromQuery]);

  useEffect(() => {
    if (expandExpensesFromQuery === "1" || expandExpensesFromQuery === "true") {
      setIsExpenseExpanded(true);
      setFilters((prev) => ({ ...prev, paidOnly: true }));
    }
  }, [expandExpensesFromQuery]);

  useEffect(() => {
    const raw = (monthFromQuery ?? "").toLowerCase();
    if (/^\d{4}-\d{2}$/.test(raw)) {
      setExpenseMonthKey(raw);
      return;
    }
    if (raw === "month") {
      setExpenseMonthKey(getCurrentExpenseMonthKey());
    }
  }, [monthFromQuery]);

  useEffect(() => {
    const range = getExpenseMonthDateRange(expenseMonthKey);
    const inclusiveTo = new Date(`${range.dateTo}T00:00:00.000Z`);
    inclusiveTo.setUTCDate(inclusiveTo.getUTCDate() - 1);
    setFilters((prev) => ({
      ...prev,
      dateFrom: range.dateFrom,
      dateTo: inclusiveTo.toISOString().slice(0, 10),
    }));
  }, [expenseMonthKey]);

  useEffect(() => {
    if (isExpenseExpanded && filters.paidOnly !== true) {
      setIsExpenseExpanded(false);
      setExpenseSectionFilter(null);
    }
  }, [filters.paidOnly, isExpenseExpanded]);

  const load = async () => {
    try {
      setIsLoading(true);
      setError("");
      const [detail, service, tree] = await Promise.all([
        api.getVehicleDetail(vehicleId),
        api.getServiceEvents(vehicleId),
        api.getNodeTree(vehicleId),
      ]);
      const vehicle = detail.vehicle;
      const title =
        vehicle?.nickname ||
        `${vehicle?.brandName || ""} ${vehicle?.modelName || ""}`.trim() ||
        "Мотоцикл";
      setVehicleTitle(title);
      setVehicleOdometer(vehicle?.odometer ?? null);
      setEvents(service.serviceEvents ?? []);
      setNodeTree(tree.nodeTree ?? []);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Не удалось загрузить журнал обслуживания.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [vehicleId]);

  const topLevelNodes = useMemo(() => getTopLevelNodeTreeItems(nodeTree), [nodeTree]);
  const expenseSectionNodeIds = useMemo(() => {
    if (!expenseSectionFilter) {
      return null;
    }
    const sectionNode = topLevelNodes.find((node) => node.id === expenseSectionFilter);
    if (!sectionNode) {
      return null;
    }
    return getNodeAndDescendantIds(sectionNode);
  }, [expenseSectionFilter, topLevelNodes]);
  const effectiveNodeIds = useMemo(
    () => expenseSectionNodeIds ?? nodeFilter?.nodeIds ?? null,
    [expenseSectionNodeIds, nodeFilter]
  );

  const groups = useMemo(
    () => buildServiceLogTimelineProps(events, filters, sort, "default", effectiveNodeIds).monthGroups,
    [events, filters, sort, effectiveNodeIds]
  );
  const hasAnyPaid = useMemo(() => filterPaidServiceEvents(events).length > 0, [events]);
  const paidEventsForDashboard = useMemo(() => {
    const visibleIds = new Set(groups.flatMap((group) => group.entries.map((entry) => entry.id)));
    return filterPaidServiceExpenseEvents(events.filter((event) => visibleIds.has(event.id))).sort(
      (left, right) => new Date(right.eventDate).getTime() - new Date(left.eventDate).getTime()
    );
  }, [events, groups]);
  const dashboardSummary = useMemo(
    () => buildExpenseSummaryFromServiceEvents(paidEventsForDashboard),
    [paidEventsForDashboard]
  );
  const sectionBreakdown = useMemo(() => {
    const totals = new Map<string, { label: string; amount: number; currency: string; count: number }>();
    const topLevelById = new Map(topLevelNodes.map((node) => [node.id, node]));
    for (const event of paidEventsForDashboard) {
      const topLevel =
        event.node?.topLevelNodeId && topLevelById.has(event.node.topLevelNodeId)
          ? topLevelById.get(event.node.topLevelNodeId)!
          : topLevelNodes.find((node) => getNodeAndDescendantIds(node).includes(event.nodeId)) ?? null;
      const key = `${topLevel?.id ?? "none"}:${event.currency}`;
      const prev = totals.get(key) ?? {
        label: topLevel?.name ?? "Без раздела",
        amount: 0,
        currency: event.currency ?? "",
        count: 0,
      };
      totals.set(key, {
        label: prev.label,
        amount: prev.amount + (event.costAmount ?? 0),
        currency: prev.currency,
        count: prev.count + 1,
      });
    }
    return Array.from(totals.entries())
      .map(([key, value]) => {
        const [sectionId] = key.split(":");
        return { sectionId: sectionId === "none" ? null : sectionId, ...value };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [paidEventsForDashboard, topLevelNodes]);
  const expenseMonthOptions = useMemo(() => {
    const base = new Date();
    const options: string[] = [];
    for (let offset = -24; offset <= 24; offset += 1) {
      const next = new Date(base.getFullYear(), base.getMonth() + offset, 1);
      const y = next.getFullYear();
      const m = String(next.getMonth() + 1).padStart(2, "0");
      options.push(`${y}-${m}`);
    }
    return options.sort().reverse();
  }, []);
  const expenseMonthOptionHeight = 44;
  const expenseMonthWheelVisibleItems = 5;
  const expenseMonthWheelHeight = expenseMonthOptionHeight * expenseMonthWheelVisibleItems;
  const expenseMonthWheelPadding = expenseMonthOptionHeight * Math.floor(expenseMonthWheelVisibleItems / 2);

  useEffect(() => {
    if (!isExpenseMonthPickerOpen || !expenseMonthWheelRef.current) {
      return;
    }
    const index = expenseMonthOptions.findIndex((item) => item === expenseMonthKey);
    if (index < 0) {
      return;
    }
    const target = index * expenseMonthOptionHeight;
    expenseMonthWheelRef.current.scrollTo({ top: target, behavior: "auto" });
  }, [isExpenseMonthPickerOpen, expenseMonthKey, expenseMonthOptions]);

  useEffect(() => {
    return () => {
      if (expenseMonthScrollTimeout.current) {
        clearTimeout(expenseMonthScrollTimeout.current);
      }
    };
  }, []);
  const isQueryActive = useMemo(
    () =>
      isServiceLogTimelineQueryActive(filters, sort, effectiveNodeIds ? { nodeIds: effectiveNodeIds, displayLabel: "" } : null),
    [filters, sort, effectiveNodeIds]
  );

  const updateFilter = (field: keyof ServiceEventsFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const leafNodeOptions = useMemo(
    () => flattenNodeTreeToSelectOptions(nodeTree).filter((option) => !option.hasChildren),
    [nodeTree]
  );

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      eventKind: "",
      serviceType: "",
      node: "",
      paidOnly: undefined,
    });
    setSort({ field: "eventDate", direction: "desc" });
    router.replace(`/vehicles/${vehicleId}/service-log`);
  };

  const setPaidOnly = (next: boolean) => {
    const q = new URLSearchParams(searchParams.toString());
    if (next) q.set("paidOnly", "1");
    else q.delete("paidOnly");
    router.replace(`/vehicles/${vehicleId}/service-log${q.toString() ? `?${q.toString()}` : ""}`);
  };

  const clearNodeFilter = () => {
    const q = new URLSearchParams(searchParams.toString());
    q.delete("nodeId");
    q.delete("nodeIds");
    q.delete("nodeLabel");
    router.replace(`/vehicles/${vehicleId}/service-log${q.toString() ? `?${q.toString()}` : ""}`);
  };

  const openCreate = () => {
    setEditingServiceEventId(null);
    setServiceEventForm(createInitialAddServiceEventFormValues());
    setServiceEventFormError("");
    setIsServiceEventModalOpen(true);
  };

  const openEdit = (eventId: string) => {
    const event = events.find((item) => item.id === eventId);
    if (!event || event.eventKind === "STATE_UPDATE") {
      return;
    }
    setEditingServiceEventId(eventId);
    setServiceEventForm(createInitialEditServiceEventValues(event));
    setServiceEventFormError("");
    setIsServiceEventModalOpen(true);
  };

  const saveServiceEvent = async () => {
    const validation = validateAddServiceEventFormValues(serviceEventForm, {
      todayDateYmd: new Date().toISOString().slice(0, 10),
      currentVehicleOdometer: vehicleOdometer,
      isLeafNode: true,
    });
    if (validation.errors.length > 0) {
      setServiceEventFormError(validation.errors[0]);
      return;
    }
    try {
      setIsSavingServiceEvent(true);
      setServiceEventFormError("");
      if (editingServiceEventId) {
        await api.updateServiceEvent(
          vehicleId,
          editingServiceEventId,
          normalizeEditServiceEventPayload(serviceEventForm)
        );
        setActionMessage("Сервисное событие обновлено. Статусы и расходы обновлены.");
      } else {
        await api.createServiceEvent(vehicleId, normalizeAddServiceEventPayload(serviceEventForm));
        setActionMessage("Сервисное событие добавлено. Статусы и расходы обновлены.");
      }
      setIsServiceEventModalOpen(false);
      setEditingServiceEventId(null);
      await load();
    } catch (e) {
      console.error(e);
      setServiceEventFormError(
        e instanceof Error ? e.message : "Не удалось сохранить сервисное событие."
      );
    } finally {
      setIsSavingServiceEvent(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    const ok = window.confirm("Удалить сервисное событие?\n\nЭто может изменить статус узла и суммы расходов.");
    if (!ok) return;
    try {
      await api.deleteServiceEvent(vehicleId, eventId);
      setActionMessage("Сервисное событие удалено. Статусы и расходы обновлены.");
      await load();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Не удалось удалить сервисное событие.");
    }
  };

  const sortIndicator = (field: ServiceEventsSortField) => {
    if (sort.field !== field) {
      return "↕";
    }
    return sort.direction === "asc" ? "↑" : "↓";
  };
  const navigateBackWithFallback = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(`/vehicles/${vehicleId}`);
  };
  const filterLabelStyle = { color: productSemanticColors.textSecondary };
  const filterControlStyle = {
    backgroundColor: productSemanticColors.cardSubtle,
    borderColor: productSemanticColors.borderStrong,
    color: productSemanticColors.textPrimary,
  };
  const filterActionStyle = {
    backgroundColor: productSemanticColors.cardSubtle,
    borderColor: productSemanticColors.borderStrong,
    color: productSemanticColors.textPrimary,
  };
  const sortButtonStyle = {
    backgroundColor: productSemanticColors.cardMuted,
    borderColor: productSemanticColors.borderStrong,
    color: productSemanticColors.textSecondary,
  };

  return (
    <main
      className="mt-internal-page min-h-screen px-6 py-12"
      style={{ backgroundColor: productSemanticColors.canvas, color: productSemanticColors.textPrimary }}
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <button
          type="button"
          onClick={navigateBackWithFallback}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
          style={{
            backgroundColor: productSemanticColors.card,
            borderColor: productSemanticColors.borderStrong,
            color: productSemanticColors.textPrimary,
          }}
        >
          Назад к мотоциклу
        </button>
        <header
          className="rounded-2xl border border-gray-200 bg-white px-5 py-4"
          style={{
            backgroundColor: productSemanticColors.card,
            borderColor: productSemanticColors.borderStrong,
            color: productSemanticColors.textPrimary,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500" style={{ color: productSemanticColors.textSecondary }}>
                {vehicleTitle}
              </p>
              <h1
                className="text-2xl font-semibold tracking-tight text-gray-950"
                style={{ color: productSemanticColors.textPrimary }}
              >
                Журнал обслуживания
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsExpenseExpanded((prev) => {
                    const next = !prev;
                    if (next) {
                      setFilters((current) => ({ ...current, paidOnly: true }));
                    } else {
                      setExpenseSectionFilter(null);
                    }
                    return next;
                  });
                }}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                  color: productSemanticColors.textPrimary,
                }}
              >
                Окно расходов {isExpenseExpanded ? "▾" : "▸"}
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-950 px-3.5 text-sm font-medium text-white transition hover:bg-gray-800"
                style={{
                  backgroundColor: productSemanticColors.primaryAction,
                  color: productSemanticColors.onPrimaryAction,
                }}
              >
                Добавить сервисное событие
              </button>
            </div>
          </div>
        </header>

        {actionMessage ? (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            style={{
              backgroundColor: productSemanticColors.successSurface,
              borderColor: productSemanticColors.successBorder,
              color: productSemanticColors.successText,
            }}
          >
            {actionMessage}
          </div>
        ) : null}

        {isExpenseExpanded ? (
          <section
            className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
            style={{
              backgroundColor: productSemanticColors.card,
              borderColor: productSemanticColors.borderStrong,
              color: productSemanticColors.textPrimary,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-gray-950" style={{ color: productSemanticColors.textPrimary }}>
                Расходы на обслуживание
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <button
                  type="button"
                  onClick={() => setExpenseMonthKey((prev) => addMonthsToExpenseMonthKey(prev, -1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white"
                  aria-label="Предыдущий месяц"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpenseMonthPickerOpen((prev) => !prev)}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
                >
                  Период: {formatExpenseMonthLabelRu(expenseMonthKey)} ▼
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseMonthKey((prev) => addMonthsToExpenseMonthKey(prev, 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white"
                  aria-label="Следующий месяц"
                >
                  ›
                </button>
              </div>
              {isExpenseMonthPickerOpen ? (
                <div className="mt-2 w-full max-w-xs rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                  <div className="relative">
                    <div
                      className="pointer-events-none absolute inset-x-1 z-20 rounded-md border border-gray-400/70 bg-white/30"
                      style={{
                        top: expenseMonthWheelPadding,
                        height: expenseMonthOptionHeight,
                      }}
                    />
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-white via-white/70 to-transparent"
                      style={{ height: expenseMonthWheelPadding }}
                    />
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white/70 to-transparent"
                      style={{ height: expenseMonthWheelPadding }}
                    />
                    <div
                      ref={expenseMonthWheelRef}
                      className="overflow-y-auto snap-y snap-mandatory"
                      style={{
                        height: expenseMonthWheelHeight,
                        paddingTop: expenseMonthWheelPadding,
                        paddingBottom: expenseMonthWheelPadding,
                      }}
                      onScroll={(event) => {
                        const offsetY = event.currentTarget.scrollTop;
                        const index = Math.round(offsetY / expenseMonthOptionHeight);
                        const normalizedIndex = Math.min(Math.max(index, 0), expenseMonthOptions.length - 1);
                        const monthKey = expenseMonthOptions[normalizedIndex];
                        if (monthKey && monthKey !== expenseMonthKey) {
                          if (expenseMonthScrollTimeout.current) {
                            clearTimeout(expenseMonthScrollTimeout.current);
                          }
                          expenseMonthScrollTimeout.current = setTimeout(() => {
                            setExpenseMonthKey(monthKey);
                          }, 40);
                        }
                      }}
                    >
                      {expenseMonthOptions.map((monthKey) => (
                        <div
                          key={monthKey}
                          className={`flex w-full snap-center items-center justify-center px-2 text-center text-sm transition ${
                            monthKey === expenseMonthKey ? "font-semibold text-gray-950" : "text-gray-500"
                          }`}
                          style={{ height: expenseMonthOptionHeight }}
                        >
                          {formatExpenseMonthLabelRu(monthKey)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-gray-600" style={{ color: productSemanticColors.textSecondary }}>
              Расходы считаются по сервисным событиям с указанной стоимостью.
            </p>
            {dashboardSummary.paidEventCount === 0 ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="font-medium text-gray-900">Расходов за выбранный месяц нет</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="space-y-1">
                    {dashboardSummary.totalsByCurrency.map((row) => (
                      <p key={row.currency} className="text-2xl font-semibold text-gray-950">
                        {dashboardSummary.totalsByCurrency.length === 1 ? "" : `${row.currency}: `}
                        {formatExpenseAmountRu(row.totalAmount)} {row.currency}
                      </p>
                    ))}
                    <p className="text-sm text-gray-600">
                      {dashboardSummary.paidEventCount} событий с затратами
                    </p>
                    {dashboardSummary.totalsByCurrency.length > 1 ? (
                      <p className="text-xs text-gray-500">
                        Суммы в разных валютах не объединяются
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">По разделам:</p>
                    {expenseSectionFilter ? (
                      <button
                        type="button"
                        onClick={() => setExpenseSectionFilter(null)}
                        className="text-xs text-gray-600 underline"
                      >
                        Все разделы
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {sectionBreakdown.map((row) => (
                      <button
                        key={`${row.sectionId ?? "none"}:${row.currency}`}
                        type="button"
                        onClick={() => setExpenseSectionFilter(row.sectionId)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-2 text-left text-sm transition ${
                          expenseSectionFilter === row.sectionId
                            ? "border-gray-900 bg-gray-100"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-gray-900">{row.label}</span>
                        <span className="font-medium text-gray-900">
                          {formatExpenseAmountRu(row.amount)} {row.currency}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-gray-900">Последние расходы:</p>
                  <div className="space-y-2">
                    {paidEventsForDashboard.slice(0, 5).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(`service-log-event-${event.id}`);
                          el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="text-gray-700">
                          {formatIsoCalendarDateRu(event.eventDate)} {event.serviceType}
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatExpenseAmountRu(event.costAmount ?? 0)} {event.currency}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, paidOnly: true }));
                    document.getElementById("service-log-events-list")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  className="text-sm font-medium text-gray-700 underline"
                >
                  Все расходы в журнале →
                </button>
              </div>
            )}
          </section>
        ) : null}

        {nodeFilter ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="text-gray-900">
              <span className="font-medium text-gray-950">Фильтр по узлу: </span>
              {nodeFilter.displayLabel}
            </p>
            <button
              type="button"
              onClick={clearNodeFilter}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-white"
            >
              Сбросить фильтр
            </button>
          </div>
        ) : null}

        {filters.paidOnly === true ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-amber-50/80 px-4 py-3 text-sm">
            <p className="text-gray-900">
              <span className="font-medium text-gray-950">Показаны события с расходами</span>
              <span className="text-gray-600"> — только записи с суммой &gt; 0 и валютой.</span>
            </p>
            <button
              type="button"
              onClick={() => setPaidOnly(false)}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
            >
              Сбросить фильтр
            </button>
          </div>
        ) : null}

        <div
          className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3"
          style={{
            backgroundColor: productSemanticColors.card,
            borderColor: productSemanticColors.borderStrong,
            color: productSemanticColors.textPrimary,
          }}
        >
          <button
            type="button"
            onClick={() => setIsFiltersExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left"
          >
            <span className="text-sm font-semibold text-gray-900" style={{ color: productSemanticColors.textPrimary }}>
              Фильтры и сортировка
            </span>
            <span className="text-sm text-gray-600" style={{ color: productSemanticColors.textSecondary }}>
              {isFiltersExpanded ? "▾" : "▸"}
            </span>
          </button>

          {isFiltersExpanded ? (
            <>
          <div className="mt-2 grid gap-2.5 md:grid-cols-2 lg:grid-cols-12">
            <label
              className="flex min-w-0 flex-col gap-1 text-xs font-medium lg:col-span-2"
              style={filterLabelStyle}
            >
              Дата с
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter("dateFrom", e.target.value)}
                className="h-10 w-full min-w-0 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 focus:ring-slate-600"
                style={filterControlStyle}
              />
            </label>
            <label
              className="flex min-w-0 flex-col gap-1 text-xs font-medium lg:col-span-2"
              style={filterLabelStyle}
            >
              Дата по
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter("dateTo", e.target.value)}
                className="h-10 w-full min-w-0 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 focus:ring-slate-600"
                style={filterControlStyle}
              />
            </label>
            <label
              className="flex min-w-0 flex-col gap-1 text-xs font-medium lg:col-span-3"
              style={filterLabelStyle}
            >
              Узел
              <input
                value={filters.node}
                onChange={(e) => updateFilter("node", e.target.value)}
                placeholder="Первые буквы узла"
                className="h-10 w-full min-w-0 rounded-lg border px-3 text-sm outline-none transition placeholder:text-slate-500 focus:ring-2 focus:ring-slate-600"
                style={filterControlStyle}
              />
            </label>
            <label
              className="flex min-w-0 flex-col gap-1 text-xs font-medium lg:col-span-2"
              style={filterLabelStyle}
            >
              Тип записи
              <select
                value={filters.eventKind}
                onChange={(e) => updateFilter("eventKind", e.target.value)}
                className="h-10 w-full min-w-0 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 focus:ring-slate-600"
                style={filterControlStyle}
              >
                <option value="">Все</option>
                <option value="SERVICE">Сервис</option>
                <option value="STATE_UPDATE">Обновление состояния</option>
              </select>
            </label>
            <label
              className="flex min-w-0 flex-col gap-1 text-xs font-medium lg:col-span-2"
              style={filterLabelStyle}
            >
              Тип сервиса
              <input
                value={filters.serviceType}
                onChange={(e) => updateFilter("serviceType", e.target.value)}
                placeholder="Текст типа сервиса"
                className="h-10 w-full min-w-0 rounded-lg border px-3 text-sm outline-none transition placeholder:text-slate-500 focus:ring-2 focus:ring-slate-600"
                style={filterControlStyle}
              />
            </label>
            <div className="flex items-end lg:col-span-1">
              <button
                type="button"
                onClick={resetFilters}
                disabled={!isQueryActive}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                style={filterActionStyle}
              >
                Сбросить
              </button>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <label
              className="flex cursor-pointer items-center gap-2 text-xs font-medium"
              style={filterLabelStyle}
            >
              <input
                type="checkbox"
                checked={filters.paidOnly === true}
                onChange={(e) => setPaidOnly(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: productSemanticColors.primaryAction }}
              />
              Только события с расходами
            </label>
          </div>
          <div
            className="mt-2.5 flex flex-wrap items-center gap-2 text-xs"
            style={{ color: productSemanticColors.textSecondary }}
          >
            <button
              type="button"
              onClick={() =>
                setSort((prev) => ({
                  field: "eventDate",
                  direction:
                    prev.field === "eventDate" && prev.direction === "asc" ? "desc" : "asc",
                }))
              }
              className="rounded-full border px-3 py-1 transition"
              style={sortButtonStyle}
            >
              Дата {sortIndicator("eventDate")}
            </button>
            <button
              type="button"
              onClick={() =>
                setSort((prev) => ({
                  field: "eventKind",
                  direction:
                    prev.field === "eventKind" && prev.direction === "asc" ? "desc" : "asc",
                }))
              }
              className="rounded-full border px-3 py-1 transition"
              style={sortButtonStyle}
            >
              Тип {sortIndicator("eventKind")}
            </button>
            <button
              type="button"
              onClick={() =>
                setSort((prev) => ({
                  field: "serviceType",
                  direction:
                    prev.field === "serviceType" && prev.direction === "asc" ? "desc" : "asc",
                }))
              }
              className="rounded-full border px-3 py-1 transition"
              style={sortButtonStyle}
            >
              Сервис {sortIndicator("serviceType")}
            </button>
            <button
              type="button"
              onClick={() =>
                setSort((prev) => ({
                  field: "node",
                  direction: prev.field === "node" && prev.direction === "asc" ? "desc" : "asc",
                }))
              }
              className="rounded-full border px-3 py-1 transition"
              style={sortButtonStyle}
            >
              Узел {sortIndicator("node")}
            </button>
            <button
              type="button"
              onClick={() =>
                setSort((prev) => ({
                  field: "odometer",
                  direction:
                    prev.field === "odometer" && prev.direction === "asc" ? "desc" : "asc",
                }))
              }
              className="rounded-full border px-3 py-1 transition"
              style={sortButtonStyle}
            >
              Пробег {sortIndicator("odometer")}
            </button>
            <button
              type="button"
              onClick={() =>
                setSort((prev) => ({
                  field: "engineHours",
                  direction:
                    prev.field === "engineHours" && prev.direction === "asc" ? "desc" : "asc",
                }))
              }
              className="rounded-full border px-3 py-1 transition"
              style={sortButtonStyle}
            >
              Моточасы {sortIndicator("engineHours")}
            </button>
            <button
              type="button"
              onClick={() =>
                setSort((prev) => ({
                  field: "cost",
                  direction: prev.field === "cost" && prev.direction === "asc" ? "desc" : "asc",
                }))
              }
              className="rounded-full border px-3 py-1 transition"
              style={sortButtonStyle}
            >
              Стоимость {sortIndicator("cost")}
            </button>
            <button
              type="button"
              onClick={() =>
                setSort((prev) => ({
                  field: "comment",
                  direction:
                    prev.field === "comment" && prev.direction === "asc" ? "desc" : "asc",
                }))
              }
              className="rounded-full border px-3 py-1 transition"
              style={sortButtonStyle}
            >
              Комментарий {sortIndicator("comment")}
            </button>
          </div>
            </>
          ) : null}
        </div>

        {isLoading ? <p className="text-sm text-gray-600">Загрузка журнала обслуживания...</p> : null}
        {!isLoading && error ? <p className="text-sm text-red-600">{error}</p> : null}

        {!isLoading && !error && groups.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
            <p className="font-medium text-gray-900">
              {filters.paidOnly === true && !hasAnyPaid ? "Расходов пока нет" : "Ничего не найдено"}
            </p>
            <p className="mt-1">
              {filters.paidOnly === true && !hasAnyPaid
                ? "Нет сервисных записей с суммой больше нуля и указанной валютой. Добавьте стоимость при создании события."
                : nodeFilter
                  ? `Для узла «${nodeFilter.displayLabel}» в журнале нет записей с учётом текущих фильтров. Сбросьте фильтр по узлу или измените условия.`
                  : "По текущим фильтрам нет записей. Измените условия или сбросьте фильтры."}
            </p>
          </div>
        ) : null}

        {!isLoading && !error && groups.length > 0 ? (
          <div
            className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
            style={{
              backgroundColor: productSemanticColors.card,
              borderColor: productSemanticColors.borderStrong,
              color: productSemanticColors.textPrimary,
            }}
          >
            <div id="service-log-events-list" className="space-y-6">
              {groups.map((group) => (
                <section key={group.monthKey} className="space-y-3">
                  <div className="sticky top-0 z-[1] -mx-1 px-1 py-1">
                    <div
                      className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold capitalize tracking-tight text-gray-700"
                      style={{
                        backgroundColor: productSemanticColors.cardMuted,
                        borderColor: productSemanticColors.border,
                        color: productSemanticColors.textPrimary,
                      }}
                    >
                      {group.label}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {group.summary.serviceCount > 0 ? (
                      <span
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700"
                        style={{
                          backgroundColor: productSemanticColors.cardMuted,
                        borderColor: productSemanticColors.border,
                          color: productSemanticColors.textSecondary,
                        }}
                      >
                        Обслуживание: {group.summary.serviceCount}
                      </span>
                    ) : null}
                    {group.summary.stateUpdateCount > 0 ? (
                      <span
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700"
                        style={{
                          backgroundColor: productSemanticColors.cardMuted,
                        borderColor: productSemanticColors.border,
                          color: productSemanticColors.textSecondary,
                        }}
                      >
                        Обновления состояния: {group.summary.stateUpdateCount}
                      </span>
                    ) : null}
                    {group.summary.costLabel ? (
                      <span
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700"
                        style={{
                          backgroundColor: productSemanticColors.cardMuted,
                        borderColor: productSemanticColors.borderStrong,
                          color: productSemanticColors.textSecondary,
                        }}
                      >
                        Расходы: {group.summary.costLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    {group.entries.map((entry) => {
                      const isStateUpdate = entry.eventKind === "STATE_UPDATE";
                      return (
                        <article
                          key={entry.id}
                          id={`service-log-event-${entry.id}`}
                          className="relative pl-10"
                        >
                          <div
                            className="absolute bottom-0 left-4 top-0 w-px"
                            style={{ backgroundColor: productSemanticColors.border }}
                          />
                          <div
                            className="absolute left-[9px] top-6 h-3 w-3 rounded-full border-2"
                            style={{
                              borderColor: isStateUpdate ? productSemanticColors.timelineStateBorder : productSemanticColors.timelineServiceBorder,
                              backgroundColor: isStateUpdate ? productSemanticColors.timelineStateFill : productSemanticColors.timelineServiceFill,
                            }}
                          />
                          <div
                            className={`rounded-2xl border px-4 py-3 sm:px-5 ${isStateUpdate ? "" : "shadow-sm"}`}
                            style={{
                              borderColor: productSemanticColors.border,
                              backgroundColor: isStateUpdate
                                ? productSemanticColors.cardMuted
                                : productSemanticColors.card,
                            }}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-tight"
                                  style={isStateUpdate ? { borderColor: productSemanticColors.borderStrong, backgroundColor: productSemanticColors.divider, color: productSemanticColors.textMuted } : { borderColor: productSemanticColors.indigoSoftBorder, backgroundColor: productSemanticColors.serviceBadgeBg, color: productSemanticColors.serviceBadgeText }}
                                >
                                  {getServiceLogEventKindBadgeLabel(entry.eventKind)}
                                </span>
                                <span className="text-xs text-gray-500" style={{ color: productSemanticColors.textSecondary }}>
                                  {entry.dateLabel}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`text-xs ${isStateUpdate ? "text-gray-500" : "text-gray-600"}`}
                                  style={{ color: productSemanticColors.textSecondary }}
                                >
                                  {entry.secondaryTitle}
                                </span>
                                {!isStateUpdate ? (
                                  <div className="flex items-center gap-3">
                                    <div className="group relative">
                                      <button
                                        type="button"
                                        onClick={() => openEdit(entry.id)}
                                        title="Редактировать"
                                        aria-label="Редактировать"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 hover:text-gray-950"
                                        style={{
                                          backgroundColor: productSemanticColors.cardSubtle,
                                          borderColor: productSemanticColors.borderStrong,
                                          color: productSemanticColors.textPrimary,
                                        }}
                                      >
                                        <EditIcon />
                                      </button>
                                      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">Редактировать</span>
                                    </div>
                                    <div className="group relative">
                                      <button
                                        type="button"
                                        onClick={() => void deleteEvent(entry.id)}
                                        title="Удалить"
                                        aria-label="Удалить"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 hover:text-rose-900"
                                        style={{
                                          backgroundColor: productSemanticColors.errorSurface,
                                          borderColor: productSemanticColors.errorBorder,
                                          color: productSemanticColors.error,
                                        }}
                                      >
                                        <TrashIcon />
                                      </button>
                                      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">Удалить</span>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-2">
                              {isStateUpdate ? (
                                <>
                                  <h3 className="text-sm font-medium text-gray-700" style={{ color: productSemanticColors.textPrimary }}>
                                    {entry.mainTitle}
                                  </h3>
                                  {entry.stateUpdateLines.length > 0 ? (
                                    <div className="mt-1 space-y-1">
                                      {entry.stateUpdateLines.map((line) => (
                                        <p
                                          key={`${entry.id}.${line}`}
                                          className="text-xs text-gray-500"
                                          style={{ color: productSemanticColors.textSecondary }}
                                        >
                                          {line}
                                        </p>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="mt-1 text-xs text-gray-500" style={{ color: productSemanticColors.textSecondary }}>
                                      {entry.stateUpdateSubtitle}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <>
                                  <h3 className="text-base font-semibold text-gray-950" style={{ color: productSemanticColors.textPrimary }}>
                                    {entry.mainTitle}
                                  </h3>
                                  {entry.wishlistOriginLabelRu ? (
                                    <p className="mt-0.5 text-xs text-gray-500" style={{ color: productSemanticColors.textSecondary }}>
                                      {entry.wishlistOriginLabelRu}
                                    </p>
                                  ) : null}
                                </>
                              )}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              <span
                                className="rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700"
                                style={{
                                  backgroundColor: productSemanticColors.cardMuted,
                                  color: productSemanticColors.textSecondary,
                                }}
                              >
                                {entry.odometerLabel}: {entry.odometerValue}
                              </span>
                              {entry.engineHoursValue !== null ? (
                                <span
                                  className="rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700"
                                  style={{
                                    backgroundColor: productSemanticColors.cardMuted,
                                    color: productSemanticColors.textSecondary,
                                  }}
                                >
                                  {entry.engineHoursLabel}: {entry.engineHoursValue}
                                </span>
                              ) : null}
                              {!isStateUpdate && entry.costAmount !== null && entry.costCurrency ? (
                                <span
                                  className="rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700"
                                  style={{
                                    backgroundColor: productSemanticColors.cardMuted,
                                    color: productSemanticColors.textSecondary,
                                  }}
                                >
                                  {entry.costLabel}: {entry.costAmount} {entry.costCurrency}
                                </span>
                              ) : null}
                            </div>

                            {entry.comment ? (
                              <div
                                className="mt-3 border-t border-gray-100 pt-3"
                                style={{ borderTopColor: productSemanticColors.border }}
                              >
                                <p
                                  className={`text-sm ${isStateUpdate ? "text-gray-500" : "text-gray-700"}`}
                                  style={{ color: productSemanticColors.textSecondary }}
                                >
                                  {expandedComments[entry.id] ? entry.comment : `${entry.comment.slice(0, SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS)}${entry.comment.length > SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS ? "..." : ""}`}
                                </p>
                                {entry.comment.length > SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS ? (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedComments((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                                    className="mt-1 text-xs font-medium text-gray-600 underline decoration-dotted underline-offset-2 transition hover:text-gray-900"
                                  >
                                    {expandedComments[entry.id] ? "Скрыть" : "Показать"}
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {isServiceEventModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 py-6 sm:items-center">
          <div
            className="w-full max-w-4xl rounded-3xl border border-gray-200 bg-white shadow-xl"
            style={{
              backgroundColor: productSemanticColors.card,
              borderColor: productSemanticColors.borderStrong,
              color: productSemanticColors.textPrimary,
            }}
          >
            <div
              className="flex items-center justify-between border-b border-gray-200 px-6 py-4"
              style={{ borderBottomColor: productSemanticColors.borderStrong }}
            >
              <h2
                className="text-xl font-semibold tracking-tight text-gray-950"
                style={{ color: productSemanticColors.textPrimary }}
              >
                {editingServiceEventId ? "Редактировать сервисное событие" : "Добавить сервисное событие"}
              </h2>
              <button
                type="button"
                onClick={() => setIsServiceEventModalOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                  color: productSemanticColors.textPrimary,
                }}
              >
                Закрыть
              </button>
            </div>
            <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
              <div className="space-y-5">
                <div
                  className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4"
                  style={{
                    backgroundColor: productSemanticColors.cardMuted,
                    borderColor: productSemanticColors.border,
                  }}
                >
                  <h3 className="text-sm font-semibold text-gray-950" style={{ color: productSemanticColors.textPrimary }}>
                    Выбор узла
                  </h3>
                  <label className="mt-3 block text-xs font-medium text-gray-600">
                    Узел (leaf)
                    <select
                      value={serviceEventForm.nodeId}
                      onChange={(e) => setServiceEventForm((prev) => ({ ...prev, nodeId: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-950"
                    >
                      <option value="">Выберите узел</option>
                      {leafNodeOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {`${"— ".repeat(Math.max(0, option.level - 1))}${option.name}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                  style={{
                    backgroundColor: productSemanticColors.cardMuted,
                    borderColor: productSemanticColors.border,
                  }}
                >
                  <h3 className="text-sm font-semibold text-gray-950" style={{ color: productSemanticColors.textPrimary }}>
                    Данные события
                  </h3>
                  <div className="mt-3 grid gap-4.5 sm:grid-cols-2">
                    <label className="text-xs font-medium text-gray-600">
                      Дата события
                      <input
                        type="date"
                        value={serviceEventForm.eventDate}
                        onChange={(e) => setServiceEventForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-950"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600">
                      Тип сервиса
                      <input
                        value={serviceEventForm.serviceType}
                        onChange={(e) => setServiceEventForm((prev) => ({ ...prev, serviceType: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-950"
                        placeholder="Например: Oil change"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600">
                      Пробег, км
                      <input
                        value={serviceEventForm.odometer}
                        onChange={(e) => setServiceEventForm((prev) => ({ ...prev, odometer: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-950"
                        inputMode="numeric"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600">
                      Моточасы
                      <input
                        value={serviceEventForm.engineHours}
                        onChange={(e) => setServiceEventForm((prev) => ({ ...prev, engineHours: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-950"
                        inputMode="numeric"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600">
                      Стоимость
                      <input
                        value={serviceEventForm.costAmount}
                        onChange={(e) => setServiceEventForm((prev) => ({ ...prev, costAmount: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-950"
                        inputMode="decimal"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600">
                      Валюта
                      <input
                        value={serviceEventForm.currency}
                        onChange={(e) => setServiceEventForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-950"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block text-xs font-medium text-gray-600">
                    Комментарий
                    <textarea
                      value={serviceEventForm.comment}
                      onChange={(e) => setServiceEventForm((prev) => ({ ...prev, comment: e.target.value }))}
                      className="mt-1 min-h-28 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-950"
                      placeholder="Опционально"
                    />
                  </label>

                  <label className="mt-4 block text-xs font-medium text-gray-600">
                    Установленные запчасти (JSON)
                    <textarea
                      value={serviceEventForm.installedPartsJson}
                      onChange={(e) => setServiceEventForm((prev) => ({ ...prev, installedPartsJson: e.target.value }))}
                      className="mt-1 min-h-28 w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-xs text-gray-900 outline-none transition focus:border-gray-950"
                    />
                  </label>
                </div>

                {serviceEventFormError ? (
                  <p className="text-sm" style={{ color: productSemanticColors.error }}>
                    {serviceEventFormError}
                  </p>
                ) : null}

                <div className="flex justify-end gap-2 border-t border-gray-100 pt-5" style={{ borderTopColor: productSemanticColors.border }}>
                  <button
                    type="button"
                    onClick={() => setIsServiceEventModalOpen(false)}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                    style={{
                      backgroundColor: productSemanticColors.cardSubtle,
                      borderColor: productSemanticColors.borderStrong,
                      color: productSemanticColors.textPrimary,
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveServiceEvent()}
                    disabled={isSavingServiceEvent}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-950 px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      backgroundColor: productSemanticColors.primaryAction,
                      color: productSemanticColors.onPrimaryAction,
                    }}
                  >
                    {isSavingServiceEvent ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </main>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <title>Редактировать</title>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <title>Удалить</title>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}
