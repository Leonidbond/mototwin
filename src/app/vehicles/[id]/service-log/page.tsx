"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  buildServiceLogTimelineProps,
  createInitialAddServiceEventFormValues,
  createInitialEditServiceEventValues,
  createInitialRepeatServiceEventValues,
  filterPaidServiceEvents,
  flattenNodeTreeToSelectOptions,
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
  PartSkuViewModel,
  ServiceEventItem,
  ServiceEventsFilters,
  ServiceEventsSortDirection,
  ServiceEventsSortField,
  ServiceLogNodeFilter,
} from "@mototwin/types";

/** Native controls default to browser light styling; anchor them to Garage dark palette. */
const SERVICE_EVENT_MODAL_FIELD_BASE: CSSProperties = {
  marginTop: 4,
  width: "100%",
  borderRadius: "0.75rem",
  border: `1px solid ${productSemanticColors.borderStrong}`,
  backgroundColor: productSemanticColors.cardSubtle,
  color: productSemanticColors.textPrimary,
  padding: "12px 16px",
  fontSize: "0.875rem",
  outline: "none",
};

const SERVICE_EVENT_MODAL_LABEL_STYLE: CSSProperties = {
  color: productSemanticColors.textMeta,
};

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

function parsePaidOnly(v: string | null): boolean {
  return v === "1" || v === "true";
}

function normalizePartNumber(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function pickSkuPartNumberOrFallback(
  sku: PartSkuViewModel,
  fallback: string
): string {
  const first = sku.partNumbers[0]?.number?.trim() ?? "";
  return first || fallback;
}

function getWishlistItemIdFromInstalledPartsJson(payload: unknown): string | null {
  let parsed = payload;
  if (typeof payload === "string") {
    try {
      parsed = JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const record = parsed as { source?: unknown; wishlistItemId?: unknown };
  if (record.source !== "wishlist" || typeof record.wishlistItemId !== "string") {
    return null;
  }
  return record.wishlistItemId.trim() || null;
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
  const highlightedServiceEventId =
    searchParams.get("serviceEventId") ?? searchParams.get("highlightServiceEventId");

  const [vehicleTitle, setVehicleTitle] = useState("Мотоцикл");
  const [vehicleOdometer, setVehicleOdometer] = useState<number | null>(null);
  const [vehicleEngineHours, setVehicleEngineHours] = useState<number | null>(null);
  const [events, setEvents] = useState<ServiceEventItem[]>([]);
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [isServiceEventModalOpen, setIsServiceEventModalOpen] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [editingServiceEventId, setEditingServiceEventId] = useState<string | null>(null);
  const [serviceEventForm, setServiceEventForm] = useState<AddServiceEventFormValues>(
    createInitialAddServiceEventFormValues()
  );
  const [serviceEventFormError, setServiceEventFormError] = useState("");
  const [isSavingServiceEvent, setIsSavingServiceEvent] = useState(false);
  const [serviceEventSkuLookup, setServiceEventSkuLookup] = useState("");
  const [serviceEventSkuResults, setServiceEventSkuResults] = useState<PartSkuViewModel[]>([]);
  const [serviceEventSkuLoading, setServiceEventSkuLoading] = useState(false);
  const [serviceEventSkuError, setServiceEventSkuError] = useState("");
  const serviceEventSkuSearchGen = useRef(0);
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
      setFilters((prev) => ({ ...prev, paidOnly: true }));
    }
  }, [expandExpensesFromQuery]);

  useEffect(() => {
    if (!isServiceEventModalOpen) {
      setServiceEventSkuLookup("");
      setServiceEventSkuResults([]);
      setServiceEventSkuError("");
      setServiceEventSkuLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setServiceEventSkuLookup(serviceEventForm.partSku.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [isServiceEventModalOpen, serviceEventForm.partSku]);

  useEffect(() => {
    if (!isServiceEventModalOpen) {
      return;
    }
    const query = serviceEventSkuLookup;
    if (query.length < 2) {
      setServiceEventSkuResults([]);
      setServiceEventSkuError("");
      setServiceEventSkuLoading(false);
      return;
    }
    const gen = serviceEventSkuSearchGen.current + 1;
    serviceEventSkuSearchGen.current = gen;
    setServiceEventSkuLoading(true);
    setServiceEventSkuError("");
    void api
      .getPartSkus({
        search: query,
        nodeId: serviceEventForm.nodeId.trim() || undefined,
      })
      .then((res) => {
        if (serviceEventSkuSearchGen.current !== gen) {
          return;
        }
        const list = res.skus ?? [];
        const normalizedQuery = normalizePartNumber(query);
        const exact = list.find((sku) =>
          sku.partNumbers.some((partNumber) => normalizePartNumber(partNumber.number) === normalizedQuery)
        );
        const ordered = exact
          ? [exact, ...list.filter((candidate) => candidate.id !== exact.id)]
          : list;
        setServiceEventSkuResults(ordered.slice(0, 6));
      })
      .catch(() => {
        if (serviceEventSkuSearchGen.current !== gen) {
          return;
        }
        setServiceEventSkuResults([]);
        setServiceEventSkuError("Не удалось выполнить поиск по каталогу.");
      })
      .finally(() => {
        if (serviceEventSkuSearchGen.current !== gen) {
          return;
        }
        setServiceEventSkuLoading(false);
      });
  }, [isServiceEventModalOpen, serviceEventForm.nodeId, serviceEventSkuLookup]);

  const load = useCallback(async () => {
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
      setVehicleEngineHours(vehicle?.engineHours ?? null);
      setEvents(service.serviceEvents ?? []);
      setNodeTree(tree.nodeTree ?? []);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Не удалось загрузить журнал обслуживания.");
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const effectiveNodeIds = useMemo(() => nodeFilter?.nodeIds ?? null, [nodeFilter]);

  const groups = useMemo(
    () => buildServiceLogTimelineProps(events, filters, sort, "default", effectiveNodeIds).monthGroups,
    [events, filters, sort, effectiveNodeIds]
  );
  const wishlistItemIdByServiceEventId = useMemo(() => {
    const byServiceEventId = new Map<string, string>();
    for (const event of events) {
      const wishlistItemId = getWishlistItemIdFromInstalledPartsJson(event.installedPartsJson);
      if (wishlistItemId) {
        byServiceEventId.set(event.id, wishlistItemId);
      }
    }
    return byServiceEventId;
  }, [events]);
  useEffect(() => {
    if (isLoading || !highlightedServiceEventId || groups.length === 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const eventCard = document.getElementById(`service-log-event-${highlightedServiceEventId}`);
      eventCard?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [groups, highlightedServiceEventId, isLoading]);
  const hasAnyPaid = useMemo(() => filterPaidServiceEvents(events).length > 0, [events]);
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

  const openRepeat = (eventId: string) => {
    const event = events.find((item) => item.id === eventId);
    if (!event || event.eventKind === "STATE_UPDATE") {
      return;
    }
    const odometerForForm = vehicleOdometer ?? event.odometer;
    setEditingServiceEventId(null);
    setServiceEventForm(
      createInitialRepeatServiceEventValues(
        event,
        { odometer: odometerForForm, engineHours: vehicleEngineHours ?? null },
        { todayDateYmd: new Date().toISOString().slice(0, 10) }
      )
    );
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

  const applyServiceEventSkuSuggestion = (sku: PartSkuViewModel) => {
    setServiceEventForm((prev) => ({
      ...prev,
      partSku: pickSkuPartNumberOrFallback(sku, prev.partSku.trim()),
      partName: sku.canonicalName?.trim() || prev.partName,
    }));
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
                onClick={() => router.push(`/vehicles/${vehicleId}/expenses`)}
                className="inline-flex h-9 items-center justify-center rounded-lg border px-3.5 text-sm font-medium transition hover:opacity-90"
                style={{
                  borderColor: productSemanticColors.borderStrong,
                  backgroundColor: productSemanticColors.cardSubtle,
                  color: productSemanticColors.textPrimary,
                }}
              >
                Статистика расходов
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
                      const isHighlightedServiceEvent = entry.id === highlightedServiceEventId;
                      const originWishlistItemId = wishlistItemIdByServiceEventId.get(entry.id);
                      return (
                        <article
                          key={entry.id}
                          id={`service-log-event-${entry.id}`}
                          className="relative scroll-mt-24 pl-10"
                          aria-current={isHighlightedServiceEvent ? "true" : undefined}
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
                              borderColor: isHighlightedServiceEvent
                                ? productSemanticColors.primaryAction
                                : productSemanticColors.border,
                              backgroundColor: isStateUpdate
                                ? productSemanticColors.cardMuted
                                : productSemanticColors.card,
                              boxShadow: isHighlightedServiceEvent
                                ? `0 0 0 2px ${productSemanticColors.primaryAction}`
                                : undefined,
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
                                        onClick={() => openRepeat(entry.id)}
                                        title="Повторить событие"
                                        aria-label="Повторить сервисное событие с актуальными пробегом и моточасами"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 hover:text-gray-950"
                                        style={{
                                          backgroundColor: productSemanticColors.cardSubtle,
                                          borderColor: productSemanticColors.borderStrong,
                                          color: productSemanticColors.textPrimary,
                                        }}
                                      >
                                        <RepeatIcon />
                                      </button>
                                      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">Повторить</span>
                                    </div>
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
                                    originWishlistItemId ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          router.push(
                                            `/vehicles/${vehicleId}/parts?wishlistItemId=${encodeURIComponent(originWishlistItemId)}`
                                          )
                                        }
                                        className="mt-0.5 text-xs font-medium underline decoration-dotted underline-offset-2 transition hover:opacity-80"
                                        style={{ color: productSemanticColors.textSecondary }}
                                      >
                                        {entry.wishlistOriginLabelRu}
                                      </button>
                                    ) : (
                                      <p
                                        className="mt-0.5 text-xs text-gray-500"
                                        style={{ color: productSemanticColors.textSecondary }}
                                      >
                                        {entry.wishlistOriginLabelRu}
                                      </p>
                                    )
                                  ) : null}
                                  {!isStateUpdate && (entry.partName || entry.partSku) ? (
                                    <div className="mt-2 space-y-1 text-sm">
                                      {entry.partName ? (
                                        <p style={{ color: productSemanticColors.textSecondary }}>
                                          <span
                                            className="font-medium"
                                            style={{ color: productSemanticColors.textMeta }}
                                          >
                                            Запчасть:{" "}
                                          </span>
                                          {entry.partName}
                                        </p>
                                      ) : null}
                                      {entry.partSku ? (
                                        <p style={{ color: productSemanticColors.textSecondary }}>
                                          <span
                                            className="font-medium"
                                            style={{ color: productSemanticColors.textMeta }}
                                          >
                                            SKU / артикул:{" "}
                                          </span>
                                          {entry.partSku}
                                        </p>
                                      ) : null}
                                    </div>
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
                  <label className="mt-3 block text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                    Узел (leaf)
                    <select
                      value={serviceEventForm.nodeId}
                      onChange={(e) => setServiceEventForm((prev) => ({ ...prev, nodeId: e.target.value }))}
                      style={{
                        ...SERVICE_EVENT_MODAL_FIELD_BASE,
                        colorScheme: "dark",
                      }}
                      className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                    >
                      <option
                        value=""
                        style={{
                          backgroundColor: productSemanticColors.card,
                          color: productSemanticColors.textPrimary,
                        }}
                      >
                        Выберите узел
                      </option>
                      {leafNodeOptions.map((option) => (
                        <option
                          key={option.id}
                          value={option.id}
                          style={{
                            backgroundColor: productSemanticColors.card,
                            color: productSemanticColors.textPrimary,
                          }}
                        >
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
                    <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                      Дата события
                      <input
                        type="date"
                        value={serviceEventForm.eventDate}
                        onChange={(e) => setServiceEventForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                        style={{ ...SERVICE_EVENT_MODAL_FIELD_BASE, colorScheme: "dark" }}
                        className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                      />
                    </label>
                    <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                      Тип сервиса
                      <input
                        value={serviceEventForm.serviceType}
                        onChange={(e) => setServiceEventForm((prev) => ({ ...prev, serviceType: e.target.value }))}
                        placeholder="Например: Oil change"
                        style={SERVICE_EVENT_MODAL_FIELD_BASE}
                        className="[&::placeholder]:text-[#AAB4C0] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                      />
                    </label>
                    <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                      Пробег, км
                      <input
                        value={serviceEventForm.odometer}
                        onChange={(e) => setServiceEventForm((prev) => ({ ...prev, odometer: e.target.value }))}
                        inputMode="numeric"
                        style={SERVICE_EVENT_MODAL_FIELD_BASE}
                        className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                      />
                    </label>
                    <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                      Моточасы
                      <input
                        value={serviceEventForm.engineHours}
                        onChange={(e) => setServiceEventForm((prev) => ({ ...prev, engineHours: e.target.value }))}
                        inputMode="numeric"
                        style={SERVICE_EVENT_MODAL_FIELD_BASE}
                        className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                      />
                    </label>
                    <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                      Стоимость
                      <input
                        value={serviceEventForm.costAmount}
                        onChange={(e) => setServiceEventForm((prev) => ({ ...prev, costAmount: e.target.value }))}
                        inputMode="decimal"
                        style={SERVICE_EVENT_MODAL_FIELD_BASE}
                        className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                      />
                    </label>
                    <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                      Валюта
                      <input
                        value={serviceEventForm.currency}
                        onChange={(e) =>
                          setServiceEventForm((prev) => ({
                            ...prev,
                            currency: e.target.value.toUpperCase(),
                          }))
                        }
                        style={SERVICE_EVENT_MODAL_FIELD_BASE}
                        className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                      Артикул (SKU)
                      <input
                        value={serviceEventForm.partSku}
                        onChange={(e) =>
                          setServiceEventForm((prev) => ({ ...prev, partSku: e.target.value }))
                        }
                        maxLength={200}
                        placeholder="Опционально"
                        autoComplete="off"
                        style={SERVICE_EVENT_MODAL_FIELD_BASE}
                        className="[&::placeholder]:text-[#AAB4C0] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                      />
                    </label>
                    <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                      Наименование запчасти
                      <input
                        value={serviceEventForm.partName}
                        onChange={(e) =>
                          setServiceEventForm((prev) => ({ ...prev, partName: e.target.value }))
                        }
                        maxLength={500}
                        placeholder="Опционально"
                        style={SERVICE_EVENT_MODAL_FIELD_BASE}
                        className="[&::placeholder]:text-[#AAB4C0] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                      />
                    </label>
                  </div>

                  {serviceEventForm.partSku.trim().length >= 2 ? (
                    <div className="mt-2 rounded-xl border px-3 py-2" style={{ borderColor: productSemanticColors.borderStrong, backgroundColor: productSemanticColors.cardSubtle }}>
                      <p className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
                        Поиск в каталоге по артикулу
                      </p>
                      {serviceEventSkuLoading ? (
                        <p className="mt-1 text-xs" style={{ color: productSemanticColors.textMuted }}>
                          Ищем совпадения...
                        </p>
                      ) : null}
                      {!serviceEventSkuLoading && serviceEventSkuError ? (
                        <p className="mt-1 text-xs" style={{ color: productSemanticColors.error }}>
                          {serviceEventSkuError}
                        </p>
                      ) : null}
                      {!serviceEventSkuLoading && !serviceEventSkuError && serviceEventSkuResults.length === 0 ? (
                        <p className="mt-1 text-xs" style={{ color: productSemanticColors.textMuted }}>
                          Ничего не найдено.
                        </p>
                      ) : null}
                      {!serviceEventSkuLoading && serviceEventSkuResults.length > 0 ? (
                        <div className="mt-2 space-y-1.5">
                          {serviceEventSkuResults.map((sku) => {
                            const partNumber = pickSkuPartNumberOrFallback(sku, "");
                            return (
                              <button
                                key={sku.id}
                                type="button"
                                onClick={() => applyServiceEventSkuSuggestion(sku)}
                                className="w-full rounded-lg border px-2.5 py-2 text-left text-xs transition hover:opacity-90"
                                style={{
                                  borderColor: productSemanticColors.borderStrong,
                                  backgroundColor: productSemanticColors.cardMuted,
                                  color: productSemanticColors.textPrimary,
                                }}
                              >
                                <div style={{ fontWeight: 600 }}>{partNumber || "Без артикула"}</div>
                                <div style={{ color: productSemanticColors.textSecondary }}>{sku.brandName} · {sku.canonicalName}</div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <label className="mt-4 block text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                    Комментарий
                    <textarea
                      value={serviceEventForm.comment}
                      onChange={(e) => setServiceEventForm((prev) => ({ ...prev, comment: e.target.value }))}
                      placeholder="Опционально"
                      style={{ ...SERVICE_EVENT_MODAL_FIELD_BASE, minHeight: "7rem" }}
                      className="[&::placeholder]:text-[#AAB4C0] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 resize-y"
                    />
                  </label>

                  <label className="mt-4 block text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                    Установленные запчасти (JSON)
                    <textarea
                      value={serviceEventForm.installedPartsJson}
                      onChange={(e) =>
                        setServiceEventForm((prev) => ({ ...prev, installedPartsJson: e.target.value }))
                      }
                      style={{
                        ...SERVICE_EVENT_MODAL_FIELD_BASE,
                        minHeight: "7rem",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        fontSize: "0.75rem",
                      }}
                      className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 resize-y"
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

function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <title>Повторить</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 3.34V7a5 5 0 015 5"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 20.66V17a5 5 0 01-5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h4" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 3.34A10 10 0 019.71 21M7 20.66A10 10 0 0014.29 3"
      />
    </svg>
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
