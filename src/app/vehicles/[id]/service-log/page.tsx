"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  buildServiceLogTimelineProps,
  buildYandexMapsUrlForInstallLocation,
  canOpenServiceInstallLocationOnMap,
  expenseCategoryLabelsRu,
  getServiceInstallLocationAddress,
  buildRestrictedPlanVehicleLeafPickerSets,
  filterPaidServiceEvents,
  findNodeTreeItemById,
  formatExpenseAmountRu,
  formatIsoCalendarDateRu,
  getTodayDateYmdLocal,
  getWishlistItemIdsFromInstalledPartsJson,
  resolveWishlistItemIdForServiceBundleItem,
  resolvePrimaryCatalogNodeForServiceLogIcon,
  SERVICE_LOG_DETAIL_LEADING_ICON_PX,
  SERVICE_LOG_JOURNAL_LEADING_ICON_PX,
  isServiceLogTimelineQueryActive,
  SERVICE_ACTION_TYPE_OPTIONS,
} from "@mototwin/domain";
import { productSemanticColors, radiusScale } from "@mototwin/design-tokens";
import { Button } from "@/components/ui";
import { GarageSidebar } from "@/app/garage/_components/GarageSidebar";
import { useSidebarCollapsed } from "@/lib/use-sidebar-collapsed";
import { InternalPageChrome } from "@/components/navigation/InternalPageChrome";
import { NodePickerModal } from "@/app/vehicles/[id]/_components/node-picker/NodePickerModal";
import { useSubscription } from "@/lib/use-subscription";
import type {
  NodeTreeItem,
  ServiceActionType,
  ServiceEventItem,
  ServiceEventsFilters,
  ServiceEventsSortDirection,
  ServiceEventsSortField,
  ServiceLogBundleItemSummary,
  ServiceLogEntryViewModel,
  ServiceLogMonthGroupViewModel,
  ServiceLogNodeFilter,
  ServiceNodeItem,
  TopServiceNodeItem,
} from "@mototwin/types";
import { getNodeTreeIconWebSrc } from "@/node-tree-icons";

/** Тип строки журнала: действие по узлу или запись состояния. */
type ServiceRowActionKind = ServiceActionType | "STATE_UPDATE";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));
const SERVICE_LOG_UI_SNAPSHOT_VERSION = 1 as const;

type ServiceLogUiSnapshotV1 = {
  v: typeof SERVICE_LOG_UI_SNAPSHOT_VERSION;
  filters: ServiceEventsFilters;
  sort: { field: ServiceEventsSortField; direction: ServiceEventsSortDirection };
  filtersExpanded: boolean;
};

function serviceLogUiSnapshotStorageKey(vehicleId: string): string {
  return `mototwin:service-log-ui-snapshot:v${SERVICE_LOG_UI_SNAPSHOT_VERSION}:${vehicleId}`;
}

function persistServiceLogUiSnapshot(
  vehicleId: string,
  state: Pick<ServiceLogUiSnapshotV1, "filters" | "sort" | "filtersExpanded">
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      serviceLogUiSnapshotStorageKey(vehicleId),
      JSON.stringify({ v: SERVICE_LOG_UI_SNAPSHOT_VERSION, ...state })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

function clearServiceLogUiSnapshot(vehicleId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(serviceLogUiSnapshotStorageKey(vehicleId));
  } catch {
    /* ignore */
  }
}

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
  sortComboRadius: 8,
  filterBadgeBg: SPEC.accent,
  filterBadgeColor: productSemanticColors.onPrimaryAction,
  /** Строка журнала в карточке месяца: правый отступ меньше левого — карточка события ближе к правой границе блока. */
  monthJournalRowPadRight: 4,
  /** Вертикальный зазор между событиями в месяце = отступ первого события от шапки месяца (минимально). */
  monthJournalEntryVGap: 2,
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
  padding: "8px 0 14px",
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
  marginTop: 6,
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

/** Вертикальные отступы секций правой панели деталей (визуальное разделение блоков). */
const detailPanelSectionPad: CSSProperties["padding"] = "12px 20px 14px";
const detailPanelHeaderPad: CSSProperties["padding"] = "14px 20px 10px";
const detailPanelMetricsPad: CSSProperties["padding"] = "10px 20px 12px";
const detailPanelFooterPad: CSSProperties["padding"] = "12px 20px 14px";

/** Правая панель журнала: бейджи узлов в одной шкале с телом панели (~11–13px). */
const detailPanelNodeChipStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.01em",
  color: SPEC.textPrimary,
  lineHeight: 1.35,
  padding: "2px 8px",
  borderRadius: 6,
  backgroundColor: "rgba(255,255,255,0.04)",
  border: SPEC.borderSubtle,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
};

const detailPanelCostTextLinkStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: SPEC.textSecondary,
  lineHeight: 1.35,
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  textDecoration: "underline",
  textDecorationStyle: "dotted",
  textDecorationColor: "rgba(148,163,184,0.45)",
  textUnderlineOffset: 2,
};

const detailPanelCostTotalLinkStyle: CSSProperties = {
  ...detailPanelCostTextLinkStyle,
  fontWeight: 600,
  color: C.green,
  textAlign: "right",
  textDecorationColor: "rgba(74,222,128,0.35)",
  maxWidth: "56%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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

function getServiceIconConfig(actionType: ServiceRowActionKind): {
  bg: string;
  iconColor: string;
  variant: ServiceRowActionKind;
} {
  if (actionType === "REPLACE") return { bg: "#172440", iconColor: "#60a5fa", variant: "REPLACE" };
  if (actionType === "INSPECT") return { bg: "#0a2524", iconColor: "#5eead4", variant: "INSPECT" };
  if (actionType === "STATE_UPDATE") return { bg: "rgba(255,255,255,0.055)", iconColor: C.text3, variant: "STATE_UPDATE" };
  if (actionType === "CLEAN") return { bg: "#082026", iconColor: "#22d3ee", variant: "CLEAN" };
  if (actionType === "ADJUST") return { bg: "#241c0a", iconColor: "#fbbf24", variant: "ADJUST" };
  /* ТО / сервис — тёмно-зелёный круг + неоново-зелёная иконка (референс «Замена масла»). */
  return { bg: "#0a2518", iconColor: "#4ade80", variant: "SERVICE" };
}

function getRowActionKind(entry: ServiceLogEntryViewModel, event: ServiceEventItem | null): ServiceRowActionKind {
  if (entry.eventKind === "STATE_UPDATE") return "STATE_UPDATE";
  const raw = event?.items?.[0]?.actionType;
  if (
    raw === "REPLACE" ||
    raw === "INSPECT" ||
    raw === "CLEAN" ||
    raw === "ADJUST" ||
    raw === "SERVICE"
  ) {
    return raw;
  }
  return "SERVICE";
}

/** Цвет линии таймлайна и обводки/заливки маркера по типу действия (без выбранной строки). */
function getTimelineColors(kind: ServiceRowActionKind): { rail: string; dotBorder: string; dotBg: string } {
  if (kind === "STATE_UPDATE") {
    return {
      rail: "rgba(148,163,184,0.38)",
      dotBorder: "rgba(255,255,255,0.24)",
      dotBg: "rgba(15,23,42,0.92)",
    };
  }
  if (kind === "REPLACE") {
    return {
      rail: "rgba(96,165,250,0.52)",
      dotBorder: "rgba(147,197,253,0.95)",
      dotBg: "#0c1524",
    };
  }
  if (kind === "INSPECT") {
    return {
      rail: "rgba(45,212,191,0.52)",
      dotBorder: "rgba(94,234,212,0.92)",
      dotBg: "#0a1f1c",
    };
  }
  if (kind === "CLEAN") {
    return {
      rail: "rgba(34,211,238,0.48)",
      dotBorder: "rgba(34,211,238,0.9)",
      dotBg: "#071a1f",
    };
  }
  if (kind === "ADJUST") {
    return {
      rail: "rgba(251,191,36,0.48)",
      dotBorder: "rgba(252,211,77,0.92)",
      dotBg: "#1c1708",
    };
  }
  /* SERVICE */
  return {
    rail: "rgba(34,197,94,0.55)",
    dotBorder: "rgba(74,222,128,0.95)",
    dotBg: "#0f1711",
  };
}

function getPerformerLabel(performedBy: string | null | undefined): string {
  if (performedBy === "SELF") return "Самостоятельно";
  if (performedBy === "SERVICE") return "Сервис";
  if (performedBy === "OTHER") return "Другой";
  return "—";
}

function ServiceInstallLocationDetail({ event }: { event: ServiceEventItem | null }) {
  const address = getServiceInstallLocationAddress(event);
  if (!address) return null;

  const mapsUrl = buildYandexMapsUrlForInstallLocation(event);
  const canOpenMap = canOpenServiceInstallLocationOnMap(event) && mapsUrl != null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
      <p style={{ margin: 0, fontSize: 12, color: C.text2, lineHeight: 1.45 }}>
        <span style={{ color: C.text3 }}>Адрес сервиса: </span>
        {address}
      </p>
      {canOpenMap ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...mutedBtnStyle,
            alignSelf: "flex-start",
            height: 28,
            fontSize: 11,
            textDecoration: "none",
          }}
        >
          На карте
        </a>
      ) : null}
    </div>
  );
}

function buildMultiNodeLabel(nodeTree: NodeTreeItem[], ids: string[]): string {
  if (ids.length === 0) return "";
  const names = ids.map((id) => findNodeTreeItemById(nodeTree, id)?.name ?? id);
  if (names.length === 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

function localDateToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function periodToolbarLabel(dateFrom: string, dateTo: string): string {
  const a = dateFrom.trim();
  const b = dateTo.trim();
  if (!a && !b) return "Все время";
  const left = a ? formatIsoCalendarDateRu(`${a}T12:00:00`) : "…";
  const right = b ? formatIsoCalendarDateRu(`${b}T12:00:00`) : "…";
  return `${left} – ${right}`;
}

/** Трёхбуквенные сокращения месяцев (ширина колонки даты считается по контенту). */
const ROW_DATE_MONTH_3 = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"] as const;

/** Первая строка: «14 апр», вторая: год. При невалидной дате — подпись из журнала в первой строке. */
function formatRowDateColumnParts(iso: string, fallbackLabel: string): { dayMonth: string; year: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { dayMonth: fallbackLabel.trim() || iso.slice(0, 10), year: "" };
  }
  const day = date.getDate();
  const mon = ROW_DATE_MONTH_3[date.getMonth()];
  return { dayMonth: `${day} ${mon}`, year: String(date.getFullYear()) };
}

function getIntervalLabel(event: ServiceEventItem | null): string {
  if (!event) return "—";
  if (event.nextReminderOdometer) return `${event.nextReminderOdometer.toLocaleString("ru-RU")} км`;
  if (event.nextReminderEngineHours) return `${event.nextReminderEngineHours} ч`;
  if (event.nextReminderDate) return event.nextReminderDate.slice(0, 10).split("-").reverse().join(".");
  return "—";
}

/** Уникальные узлы для детальной панели: из bundle или якорь события (в т.ч. STATE_UPDATE). */
function getDetailPanelNodeRows(
  entry: ServiceLogEntryViewModel,
  event: ServiceEventItem | null
): { nodeId: string; name: string }[] {
  if (entry.bundleItemsSummary.length > 0) {
    const byId = new Map<string, string>();
    for (const item of entry.bundleItemsSummary) {
      byId.set(item.nodeId, item.nodeName);
    }
    return [...byId.entries()].map(([nodeId, name]) => ({ nodeId, name }));
  }
  if (event?.nodeId) {
    const name = event.node?.name?.trim() || event.nodeId;
    return [{ nodeId: event.nodeId, name }];
  }
  return [];
}

/** Полное описание напоминания (пробег / моточасы / дата). */
function formatFullServiceReminder(event: ServiceEventItem | null): string | null {
  if (!event) return null;
  const bits: string[] = [];
  if (event.nextReminderOdometer != null && Number.isFinite(event.nextReminderOdometer)) {
    bits.push(`пробег ${event.nextReminderOdometer.toLocaleString("ru-RU")} км`);
  }
  if (event.nextReminderEngineHours != null && Number.isFinite(event.nextReminderEngineHours)) {
    bits.push(`моточасы ${event.nextReminderEngineHours} ч`);
  }
  if (event.nextReminderDate?.trim()) {
    bits.push(`дата ${formatIsoCalendarDateRu(event.nextReminderDate)}`);
  }
  if (bits.length === 0) return null;
  const on = event.nextReminderEnabled === true ? "Включено: " : event.nextReminderEnabled === false ? "Выключено (параметры сохранены): " : "";
  return `${on}${bits.join(" · ")}`;
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
  const [serviceMeta, setServiceMeta] = useState<{
    visibleLimit: number | null;
    hiddenCount: number;
    plan: "FREE" | "RIDER" | "PRO";
  } | null>(null);
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);
  const [serviceCatalogNodes, setServiceCatalogNodes] = useState<ServiceNodeItem[]>([]);
  const { subscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [sidebarCollapsed, toggleSidebar] = useSidebarCollapsed(SIDEBAR_COLLAPSED_KEY);
  const [selectedEventId, setSelectedEventId] = useState(highlightedServiceEventId ?? "");
  const [visibleCount, setVisibleCount] = useState(LOAD_MORE_STEP);
  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [periodPopoverOpen, setPeriodPopoverOpen] = useState(false);
  const periodPopoverRef = useRef<HTMLDivElement | null>(null);
  /** Prevents URL highlight params from re-forcing selection on every `selectedEventId` change (e.g. after return from expenses). */
  const appliedServiceLogHighlightFromUrlRef = useRef<string | null>(null);
  const [filters, setFilters] = useState<ServiceEventsFilters>({
    dateFrom: "",
    dateTo: "",
    eventKind: "",
    serviceType: "",
    node: "",
    odometerMin: "",
    odometerMax: "",
    costMin: "",
    costMax: "",
    performerKind: "",
    actionType: "",
    paidOnly: paidOnlyFromQuery ? true : undefined,
  });
  const [sort, setSort] = useState<{
    field: ServiceEventsSortField;
    direction: ServiceEventsSortDirection;
  }>({ field: "eventDate", direction: "desc" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = serviceLogUiSnapshotStorageKey(vehicleId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<ServiceLogUiSnapshotV1>;
      if (parsed.v !== SERVICE_LOG_UI_SNAPSHOT_VERSION || !parsed.filters || !parsed.sort) {
        sessionStorage.removeItem(key);
        return;
      }
      setFilters(parsed.filters);
      setSort(parsed.sort);
      if (typeof parsed.filtersExpanded === "boolean") {
        setFiltersExpanded(parsed.filtersExpanded);
      }
    } catch {
      /* ignore malformed */
    }
    sessionStorage.removeItem(key);
  }, [vehicleId]);

  const nodeFilter = useMemo<ServiceLogNodeFilter | null>(() => {
    const resolvedNodeIds = nodeIdsFromQuery
      ? nodeIdsFromQuery.split(",").filter(Boolean)
      : nodeIdFromQuery
        ? [nodeIdFromQuery]
        : [];
    if (!resolvedNodeIds.length) return null;
    return { nodeIds: resolvedNodeIds, displayLabel: nodeLabelFromQuery || "Узел" };
  }, [nodeIdFromQuery, nodeIdsFromQuery, nodeLabelFromQuery]);

  const nodePickerSelectedIds = useMemo(() => {
    const resolved =
      nodeIdsFromQuery && nodeIdsFromQuery.length > 0
        ? nodeIdsFromQuery.split(",").filter(Boolean)
        : nodeIdFromQuery
          ? [nodeIdFromQuery]
          : [];
    return new Set(resolved);
  }, [nodeIdFromQuery, nodeIdsFromQuery]);

  const vehicleLeafPickerSets = useMemo(
    () =>
      buildRestrictedPlanVehicleLeafPickerSets({
        nodeTree,
        catalogNodes: serviceCatalogNodes,
        topServiceNodes,
        canSelectChildNode: subscription?.capabilities?.canSelectChildNode ?? true,
      }),
    [
      nodeTree,
      serviceCatalogNodes,
      subscription?.capabilities?.canSelectChildNode,
      topServiceNodes,
    ]
  );
  const nodePickerOptions = vehicleLeafPickerSets.allLeaves;
  const nodePickerTopOptions = vehicleLeafPickerSets.showTopToggle
    ? vehicleLeafPickerSets.topLeaves
    : undefined;

  const applyNodePickerSelection = useCallback(
    (nodeIds: string[]) => {
      const q = new URLSearchParams(searchParams.toString());
      q.delete("nodeId");
      if (nodeIds.length === 0) {
        q.delete("nodeIds");
        q.delete("nodeLabel");
      } else {
        q.set("nodeIds", nodeIds.join(","));
        q.set("nodeLabel", buildMultiNodeLabel(nodeTree, nodeIds));
      }
      router.replace(`/vehicles/${vehicleId}/service-log${q.toString() ? `?${q.toString()}` : ""}`);
    },
    [nodeTree, router, searchParams, vehicleId]
  );

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
      const [detail, service, treeRes, topRes, catalogRes] = await Promise.all([
        api.getVehicleDetail(vehicleId),
        api.getServiceEvents(vehicleId),
        api.getNodeTree(vehicleId),
        api.getTopServiceNodes(),
        api.getServiceNodes(),
      ]);
      const vehicle = detail.vehicle;
      const title =
        vehicle?.nickname ||
        `${vehicle?.brandName || ""} ${vehicle?.modelFamilyName || ""}`.trim() ||
        "Мотоцикл";
      setVehicleTitle(title);
      setVehicleVin(vehicle?.vin ?? null);
      setEvents(service.serviceEvents ?? []);
      setServiceMeta(service.meta ?? null);
      setNodeTree(treeRes.nodeTree ?? []);
      setTopServiceNodes(topRes.nodes ?? []);
      setServiceCatalogNodes(catalogRes.nodes ?? []);
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

  useEffect(() => {
    if (highlightedServiceEventId) {
      if (appliedServiceLogHighlightFromUrlRef.current !== highlightedServiceEventId) {
        appliedServiceLogHighlightFromUrlRef.current = highlightedServiceEventId;
        setSelectedEventId(highlightedServiceEventId);
      }
      return;
    }
    appliedServiceLogHighlightFromUrlRef.current = null;
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
      const q = new URLSearchParams(searchParams.toString());
      if (!q.get("serviceEventId") && !q.get("highlightServiceEventId")) {
        return;
      }
      q.delete("serviceEventId");
      q.delete("highlightServiceEventId");
      const qs = q.toString();
      router.replace(`/vehicles/${vehicleId}/service-log${qs ? `?${qs}` : ""}`, { scroll: false });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [groups, highlightedServiceEventId, isLoading, router, searchParams, vehicleId]);

  const hasAnyPaid = useMemo(() => filterPaidServiceEvents(events).length > 0, [events]);
  const isQueryActive = useMemo(
    () => isServiceLogTimelineQueryActive(
      filters, sort,
      effectiveNodeIds ? { nodeIds: effectiveNodeIds, displayLabel: "" } : null
    ),
    [filters, sort, effectiveNodeIds]
  );
  const visibleEventCount = flatEntries.length;
  const activeFilterCount = useMemo(
    () =>
      [
        filters.dateFrom,
        filters.dateTo,
        filters.eventKind,
        filters.serviceType,
        filters.node,
        filters.odometerMin,
        filters.odometerMax,
        filters.costMin,
        filters.costMax,
        filters.performerKind,
        filters.actionType,
        filters.paidOnly === true ? "paidOnly" : "",
        effectiveNodeIds?.length ? "nodeLink" : "",
      ].filter(Boolean).length,
    [filters, effectiveNodeIds]
  );

  const updateFilter = (field: keyof ServiceEventsFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [field]: value }));

  const resetFilters = () => {
    clearServiceLogUiSnapshot(vehicleId);
    setFilters({
      dateFrom: "",
      dateTo: "",
      eventKind: "",
      serviceType: "",
      node: "",
      odometerMin: "",
      odometerMax: "",
      costMin: "",
      costMax: "",
      performerKind: "",
      actionType: "",
      paidOnly: undefined,
    });
    setSort({ field: "eventDate", direction: "desc" });
    setFiltersExpanded(false);
    setPeriodPopoverOpen(false);
    router.replace(`/vehicles/${vehicleId}/service-log`);
  };

  useEffect(() => {
    if (!periodPopoverOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      const el = periodPopoverRef.current;
      if (el && target && !el.contains(target)) {
        setPeriodPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [periodPopoverOpen]);

  const setPaidOnly = (next: boolean) => {
    const q = new URLSearchParams(searchParams.toString());
    if (next) q.set("paidOnly", "1");
    else q.delete("paidOnly");
    router.replace(`/vehicles/${vehicleId}/service-log${q.toString() ? `?${q.toString()}` : ""}`);
  };

  const applyPeriodPreset = useCallback((kind: "month" | "quarter" | "year" | "all") => {
    if (kind === "all") {
      setFilters((p) => ({ ...p, dateFrom: "", dateTo: "" }));
      return;
    }
    const todayYmd = getTodayDateYmdLocal();
    const y = Number(todayYmd.slice(0, 4));
    const mo = Number(todayYmd.slice(5, 7)) - 1;
    const day = Number(todayYmd.slice(8, 10));
    const today = new Date(y, mo, day);
    let from = new Date(today);
    if (kind === "month") {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (kind === "quarter") {
      from = new Date(today);
      from.setMonth(from.getMonth() - 3);
    } else {
      from = new Date(today.getFullYear(), 0, 1);
    }
    setFilters((p) => ({
      ...p,
      dateFrom: localDateToYmd(from),
      dateTo: todayYmd,
    }));
  }, []);

  const serviceLogReturnTo = useMemo(() => {
    const path = `/vehicles/${vehicleId}/service-log`;
    const qs = searchParams.toString();
    const full = qs ? `${path}?${qs}` : path;
    return encodeURIComponent(full);
  }, [vehicleId, searchParams]);

  const serviceLogHighlightReturnPath = useCallback(
    (eventId: string) => {
      const q = new URLSearchParams();
      q.set("highlightServiceEventId", eventId);
      return `/vehicles/${vehicleId}/service-log?${q.toString()}`;
    },
    [vehicleId]
  );

  const openExpensesForServiceEvent = useCallback(
    (eventId: string, opts?: { highlightExpenseId?: string; expenseDateIso?: string }) => {
      const ev = serviceEventById.get(eventId);
      const rawYear = opts?.expenseDateIso
        ? new Date(opts.expenseDateIso).getFullYear()
        : ev?.eventDate
          ? new Date(ev.eventDate).getFullYear()
          : new Date().getFullYear();
      const year = Number.isFinite(rawYear) && rawYear > 1900 ? rawYear : new Date().getFullYear();
      const q = new URLSearchParams();
      q.set("year", String(year));
      q.set("serviceEventId", eventId);
      if (opts?.highlightExpenseId) {
        q.set("highlightExpenseId", opts.highlightExpenseId);
      }
      q.set("returnTo", serviceLogHighlightReturnPath(eventId));
      router.push(`/vehicles/${vehicleId}/expenses?${q.toString()}`);
    },
    [router, serviceEventById, serviceLogHighlightReturnPath, vehicleId]
  );

  const openPartsSelectionFromLog = useCallback(
    (eventId: string, opts: { wishlistItemId?: string; nodeId?: string; partsSearch?: string } = {}) => {
      const q = new URLSearchParams();
      if (opts.wishlistItemId) {
        q.set("wishlistItemId", opts.wishlistItemId);
      }
      if (opts.nodeId) {
        q.set("nodeId", opts.nodeId);
      }
      if (opts.partsSearch?.trim()) {
        q.set("partsSearch", opts.partsSearch.trim());
      }
      q.set("returnTo", serviceLogHighlightReturnPath(eventId));
      router.push(`/vehicles/${vehicleId}/parts?${q.toString()}`);
    },
    [router, serviceLogHighlightReturnPath, vehicleId]
  );

  const openNodeTreeFromLog = useCallback(
    (nodeId: string) => {
      router.push(`/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(nodeId)}`);
    },
    [router, vehicleId]
  );

  const openCreate = () => {
    persistServiceLogUiSnapshot(vehicleId, { filters, sort, filtersExpanded });
    router.push(`/vehicles/${vehicleId}/service-events/new?returnTo=${serviceLogReturnTo}`);
  };

  const openRepeat = (id: string) => {
    if (serviceEventById.get(id)?.eventKind === "STATE_UPDATE") return;
    persistServiceLogUiSnapshot(vehicleId, { filters, sort, filtersExpanded });
    router.push(`/vehicles/${vehicleId}/service-events/new?repeatOf=${encodeURIComponent(id)}&returnTo=${serviceLogReturnTo}`);
  };

  const openEdit = (id: string) => {
    if (serviceEventById.get(id)?.eventKind === "STATE_UPDATE") return;
    persistServiceLogUiSnapshot(vehicleId, { filters, sort, filtersExpanded });
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
    if (returnNodeIdFromQuery) {
      router.push(`/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(returnNodeIdFromQuery)}`);
      return;
    }
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(`/vehicles/${vehicleId}`);
  };

  const serviceLogBreadcrumbs = useMemo(
    () => [
      { label: "Гараж", href: "/garage" },
      { label: vehicleTitle, href: `/vehicles/${vehicleId}` },
      { label: "Журнал" },
    ],
    [vehicleId, vehicleTitle]
  );

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
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
            <InternalPageChrome
              variant="journalRef"
              onBack={navigateBack}
              breadcrumbs={serviceLogBreadcrumbs}
              title="Журнал обслуживания"
              subtitle={
                <>
                  {vehicleTitle}
                  {vehicleVin ? ` · VIN: ${vehicleVin}` : ""}
                </>
              }
              actions={
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
              }
            />
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
            {!isLoading && !error && serviceMeta?.plan === "FREE" ? (
              <div
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(251,146,60,0.35)",
                  backgroundColor: "rgba(251,146,60,0.12)",
                  color: productSemanticColors.textPrimary,
                  padding: "8px 12px",
                  fontSize: 12,
                  marginBottom: 10,
                }}
              >
                Free: отображаются последние {serviceMeta.visibleLimit ?? 10} сервисных событий.
                {serviceMeta.hiddenCount > 0 ? ` Еще ${serviceMeta.hiddenCount} сохранены в истории.` : ""}
              </div>
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

                    {/* 3 — узел (мультивыбор через модальное окно) */}
                    <button
                      type="button"
                      onClick={() => setNodePickerOpen(true)}
                      style={{
                        ...serviceLogFilterDropdownBase,
                        border: TOOLBAR_REF.moduleBorder,
                        backgroundColor: TOOLBAR_REF.moduleBg,
                        borderRadius: TOOLBAR_REF.moduleRadius,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                      aria-label="Выбрать узлы для фильтра"
                    >
                      <span style={serviceLogFilterLabelStyle}>Узел</span>
                      <span
                        style={{
                          ...serviceLogFilterValueStyle,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "100%",
                        }}
                      >
                        {nodeFilter ? nodeFilter.displayLabel : "Все узлы"}
                      </span>
                      <span style={toolbarDropdownChevronStyle}>▾</span>
                    </button>

                    {/* 4 — период (календарь + пресеты) */}
                    <div
                      ref={periodPopoverRef}
                      style={{
                        ...serviceLogFilterDropdownBase,
                        border: TOOLBAR_REF.moduleBorder,
                        backgroundColor: TOOLBAR_REF.moduleBg,
                        borderRadius: TOOLBAR_REF.moduleRadius,
                        position: "relative",
                        padding: 0,
                        /* Иначе панель с датами (absolute ниже блока) целиком режется базовым overflow:hidden */
                        overflow: "visible",
                        ...(periodPopoverOpen ? { zIndex: 50 } : {}),
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setPeriodPopoverOpen((o) => !o)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          justifyContent: "center",
                          gap: 0,
                          width: "100%",
                          height: "100%",
                          minHeight: REF_TOP.searchH - 4,
                          margin: 0,
                          padding: "2px 14px 2px 5px",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "inherit",
                          color: "inherit",
                          boxSizing: "border-box",
                          position: "relative",
                        }}
                        aria-expanded={periodPopoverOpen}
                        aria-label="Выбрать период"
                      >
                        <span style={serviceLogFilterLabelStyle}>Период</span>
                        <span style={serviceLogFilterValueStyle}>
                          {periodToolbarLabel(filters.dateFrom, filters.dateTo)}
                        </span>
                        <span style={toolbarDropdownChevronStyle}>▾</span>
                      </button>
                      {periodPopoverOpen ? (
                        <div
                          role="dialog"
                          aria-label="Период"
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            left: 0,
                            minWidth: 280,
                            maxWidth: "min(360px, 92vw)",
                            zIndex: 40,
                            padding: 12,
                            borderRadius: 12,
                            border: TOOLBAR_REF.moduleBorder,
                            backgroundColor: SPEC.bgPanel,
                            boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
                            boxSizing: "border-box",
                          }}
                        >
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                            {(
                              [
                                { k: "month" as const, label: "Этот месяц" },
                                { k: "quarter" as const, label: "90 дней" },
                                { k: "year" as const, label: "Год" },
                                { k: "all" as const, label: "Всё время" },
                              ] as const
                            ).map(({ k, label }) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => {
                                  applyPeriodPreset(k);
                                  if (k === "all") setPeriodPopoverOpen(false);
                                }}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 8,
                                  border: SPEC.borderSubtle,
                                  backgroundColor: C.wash,
                                  color: SPEC.textPrimary,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  cursor: "pointer",
                                }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: SPEC.textSecondary }}>
                              С даты
                              <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => updateFilter("dateFrom", e.target.value)}
                                style={{
                                  height: 36,
                                  borderRadius: 8,
                                  border: REF_TOP.searchBorder,
                                  backgroundColor: REF_TOP.searchBg,
                                  color: SPEC.textPrimary,
                                  fontSize: 14,
                                  padding: "0 10px",
                                  boxSizing: "border-box",
                                }}
                              />
                            </label>
                            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: SPEC.textSecondary }}>
                              По дату
                              <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => updateFilter("dateTo", e.target.value)}
                                style={{
                                  height: 36,
                                  borderRadius: 8,
                                  border: REF_TOP.searchBorder,
                                  backgroundColor: REF_TOP.searchBg,
                                  color: SPEC.textPrimary,
                                  fontSize: 14,
                                  padding: "0 10px",
                                  boxSizing: "border-box",
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      ) : null}
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

                    {/* 6 — раскрытие доп. фильтров */}
                    <div style={{ display: "flex", alignItems: "center", flexShrink: 0, alignSelf: "center" }}>
                      <button
                        type="button"
                        onClick={() => setFiltersExpanded((v) => !v)}
                        aria-expanded={filtersExpanded}
                        aria-label="Дополнительные фильтры"
                        style={{
                          position: "relative",
                          height: REF_TOP.searchH,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          padding: "0 10px 0 8px",
                          borderRadius: TOOLBAR_REF.moduleRadius,
                          border: TOOLBAR_REF.moduleBorder,
                          backgroundColor: TOOLBAR_REF.moduleBg,
                          color: SPEC.textPrimary,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                      >
                        <FilterSvg />
                        Фильтры
                        <span style={{ fontSize: 10, color: SPEC.textSecondary, marginLeft: 2 }}>
                          {filtersExpanded ? "▴" : "▾"}
                        </span>
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
                  </div>

                  {filtersExpanded ? (
                    <div
                      style={{
                        padding: "6px 0 12px",
                        borderBottom: SPEC.borderSubtle,
                        width: "100%",
                        boxSizing: "border-box",
                        overflowX: "auto",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          flexWrap: "nowrap",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          minWidth: "min-content",
                          boxSizing: "border-box",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            flexShrink: 0,
                          }}
                          title="Пробег, км"
                        >
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: TOOLBAR_REF.labelColor,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Пробег
                          </span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={filters.odometerMin}
                            onChange={(e) => updateFilter("odometerMin", e.target.value)}
                            placeholder="от"
                            aria-label="Пробег от, км"
                            className="service-log-ref-ph"
                            style={{
                              width: 72,
                              height: 30,
                              borderRadius: 6,
                              border: REF_TOP.searchBorder,
                              backgroundColor: REF_TOP.searchBg,
                              color: SPEC.textPrimary,
                              fontSize: 12,
                              padding: "0 6px",
                              boxSizing: "border-box",
                            }}
                          />
                          <span style={{ fontSize: 11, color: SPEC.textMuted, padding: "0 1px" }}>—</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={filters.odometerMax}
                            onChange={(e) => updateFilter("odometerMax", e.target.value)}
                            placeholder="до"
                            aria-label="Пробег до, км"
                            className="service-log-ref-ph"
                            style={{
                              width: 72,
                              height: 30,
                              borderRadius: 6,
                              border: REF_TOP.searchBorder,
                              backgroundColor: REF_TOP.searchBg,
                              color: SPEC.textPrimary,
                              fontSize: 12,
                              padding: "0 6px",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            flexShrink: 0,
                          }}
                          title="Сумма события"
                        >
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: TOOLBAR_REF.labelColor,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Сумма
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={filters.costMin}
                            onChange={(e) => updateFilter("costMin", e.target.value)}
                            placeholder="от"
                            aria-label="Сумма от"
                            className="service-log-ref-ph"
                            style={{
                              width: 68,
                              height: 30,
                              borderRadius: 6,
                              border: REF_TOP.searchBorder,
                              backgroundColor: REF_TOP.searchBg,
                              color: SPEC.textPrimary,
                              fontSize: 12,
                              padding: "0 6px",
                              boxSizing: "border-box",
                            }}
                          />
                          <span style={{ fontSize: 11, color: SPEC.textMuted, padding: "0 1px" }}>—</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={filters.costMax}
                            onChange={(e) => updateFilter("costMax", e.target.value)}
                            placeholder="до"
                            aria-label="Сумма до"
                            className="service-log-ref-ph"
                            style={{
                              width: 68,
                              height: 30,
                              borderRadius: 6,
                              border: REF_TOP.searchBorder,
                              backgroundColor: REF_TOP.searchBg,
                              color: SPEC.textPrimary,
                              fontSize: 12,
                              padding: "0 6px",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            flexShrink: 0,
                            margin: 0,
                            cursor: "pointer",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: TOOLBAR_REF.labelColor,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Тип
                          </span>
                          <select
                            value={filters.actionType}
                            onChange={(e) => updateFilter("actionType", e.target.value)}
                            aria-label="Тип работы"
                            style={{
                              width: 118,
                              height: 30,
                              borderRadius: 6,
                              border: REF_TOP.searchBorder,
                              backgroundColor: REF_TOP.searchBg,
                              color: SPEC.textPrimary,
                              fontSize: 11,
                              padding: "0 4px",
                              boxSizing: "border-box",
                              cursor: "pointer",
                            }}
                          >
                            <option value="">Все</option>
                            {SERVICE_ACTION_TYPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            flexShrink: 0,
                            margin: 0,
                            cursor: "pointer",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: TOOLBAR_REF.labelColor,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Исп.
                          </span>
                          <select
                            value={filters.performerKind}
                            onChange={(e) => updateFilter("performerKind", e.target.value)}
                            aria-label="Исполнитель"
                            style={{
                              width: 108,
                              height: 30,
                              borderRadius: 6,
                              border: REF_TOP.searchBorder,
                              backgroundColor: REF_TOP.searchBg,
                              color: SPEC.textPrimary,
                              fontSize: 11,
                              padding: "0 4px",
                              boxSizing: "border-box",
                              cursor: "pointer",
                            }}
                          >
                            <option value="">Все</option>
                            <option value="SELF">{getPerformerLabel("SELF")}</option>
                            <option value="SERVICE">{getPerformerLabel("SERVICE")}</option>
                            <option value="OTHER">{getPerformerLabel("OTHER")}</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={resetFilters}
                          disabled={!isQueryActive}
                          aria-label="Сбросить все фильтры"
                          style={{
                            height: 30,
                            marginLeft: "auto",
                            padding: "0 10px",
                            borderRadius: 6,
                            border: TOOLBAR_REF.moduleBorder,
                            backgroundColor: "transparent",
                            color: SPEC.textSecondary,
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: isQueryActive ? "pointer" : "not-allowed",
                            opacity: isQueryActive ? 1 : 0.45,
                            boxSizing: "border-box",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Сброс
                        </button>
                      </div>
                    </div>
                  ) : null}

                    {/* Вторая строка: найдено, сортировка (не в полоске фильтров) */}
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
                      <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            height: REF_TOP.sortComboH,
                            padding: "0 30px 0 12px",
                            borderRadius: REF_TOP.sortComboRadius,
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
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: REF_TOP.monthJournalEntryVGap,
                            paddingTop: REF_TOP.monthJournalEntryVGap,
                          }}
                        >
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
                                      onOpenNodeInTree={(nodeId) => openNodeTreeFromLog(nodeId)}
                                      onOpenExpenses={(opts) => openExpensesForServiceEvent(entry.id, opts)}
                                      onOpenParts={(opts) => openPartsSelectionFromLog(entry.id, opts)}
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
                      onOpenNodeInTree={(nodeId) => openNodeTreeFromLog(nodeId)}
                      onOpenExpenses={(opts) => openExpensesForServiceEvent(selectedEntry.id, opts)}
                      onOpenParts={(opts) => openPartsSelectionFromLog(selectedEntry.id, opts)}
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
      <NodePickerModal
        key={
          nodePickerOpen
            ? `open:${[...nodePickerSelectedIds].sort().join("|")}`
            : "node-picker-shut"
        }
        open={nodePickerOpen}
        title="Узлы для фильтра"
        options={nodePickerOptions}
        topOptions={nodePickerTopOptions}
        mode="multi"
        selectedIds={nodePickerSelectedIds}
        confirmLabel="Применить"
        onClose={() => setNodePickerOpen(false)}
        onConfirm={applyNodePickerSelection}
      />
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

// ─── Timeline marker glyph (внутри кружка на шкале, ~10px) ─────────────────────

function TimelineMarkerGlyph({ kind, color }: { kind: ServiceRowActionKind; color: string }) {
  const sw = 2.2;
  if (kind === "STATE_UPDATE") {
    return (
      <svg width={10} height={10} viewBox="0 0 24 24" aria-hidden>
        <circle cx="7" cy="12" r="2" fill={color} />
        <circle cx="12" cy="12" r="2" fill={color} />
        <circle cx="17" cy="12" r="2" fill={color} />
      </svg>
    );
  }
  if (kind === "REPLACE") {
    return (
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  if (kind === "SERVICE") {
    return (
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3c-4 7-8 9.5-8 14a8 8 0 0 0 16 0c0-4.5-4-7-8-14z" />
      </svg>
    );
  }
  if (kind === "INSPECT") {
    return (
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="7.5" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    );
  }
  if (kind === "CLEAN") {
    return (
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v2.5M12 18.5V21M4.2 4.2l1.8 1.8M18 18l1.8 1.8M3 12h2.5M18.5 12H21M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
      </svg>
    );
  }
  /* ADJUST */
  return (
    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="4" y1="8" x2="20" y2="8" />
      <circle cx="9" cy="8" r="2" fill={color} stroke="none" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="15" cy="12" r="2" fill={color} stroke="none" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="11" cy="16" r="2" fill={color} stroke="none" />
    </svg>
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
  const actionKind = getRowActionKind(entry, event);
  const iconCfg = getServiceIconConfig(actionKind);
  const cost = getCompactCost(entry);
  const intervalLabel = getIntervalLabel(event);
  const performerLabel = getPerformerLabel(event?.performedBy);
  const dateParts = formatRowDateColumnParts(event?.eventDate ?? "", entry.dateLabel);

  const timelineBase = getTimelineColors(actionKind);
  const railLineColor = isSelected ? "rgba(249,115,22,0.5)" : timelineBase.rail;
  const dotBg = isSelected ? SPEC.accent : timelineBase.dotBg;
  const dotBorder = isSelected ? SPEC.accent : timelineBase.dotBorder;
  const glyphColor = isSelected ? "#ffffff" : actionKind === "STATE_UPDATE" ? "rgba(226,232,240,0.85)" : timelineBase.dotBorder;
  const dotInner = <TimelineMarkerGlyph kind={actionKind} color={glyphColor} />;
  const dotSize = 18;

  const cardBorder = isSelected
    ? `1px solid ${productSemanticColors.primaryAction}55`
    : "1px solid rgba(148,163,184,0.22)";
  const cardBg = isSelected ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.032)";

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        gap: 10,
        width: "100%",
        boxSizing: "border-box",
        minHeight: isStateUpdate ? 56 : 68,
        padding: `2px ${REF_TOP.monthJournalRowPadRight}px 2px ${REF_TOP.padX}px`,
        textAlign: "left",
        background: isSelected ? SPEC.rowSelectWash : "transparent",
        border: "none",
        cursor: "pointer",
        transition: "background 0.12s",
      }}
      aria-expanded={isSelected}
    >
      {/* Левая колонка: дата по ширине контента (день + 3 буквы месяца, год ниже) + пробег; шкала времени. */}
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          gap: 0,
        }}
      >
        <div
          style={{
            flex: "0 0 auto",
            width: "max-content",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 2,
            paddingRight: 4,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: SPEC.textPrimary,
              lineHeight: 1.15,
              whiteSpace: "nowrap",
            }}
          >
            {dateParts.dayMonth}
          </span>
          {dateParts.year ? (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: SPEC.textPrimary,
                lineHeight: 1.15,
                whiteSpace: "nowrap",
              }}
            >
              {dateParts.year}
            </span>
          ) : null}
          <span
            style={{
              fontSize: 12,
              fontWeight: 400,
              color: SPEC.textSecondary,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              marginTop: 1,
            }}
          >
            {entry.odometerValue}
          </span>
        </div>
        <div
          style={{
            width: 22,
            flexShrink: 0,
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 48,
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              marginLeft: -1,
              top: isFirst ? "50%" : 0,
              bottom: isLast ? "50%" : 0,
              width: 2,
              borderRadius: 1,
              backgroundColor: railLineColor,
            }}
          />
          <span
            style={{
              position: "relative",
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              backgroundColor: dotBg,
              border: `2px solid ${dotBorder}`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: isHighlighted && !isSelected ? `0 0 0 3px ${SPEC.rowSelectWash}` : undefined,
            }}
          >
            {dotInner}
          </span>
        </div>
      </div>

      {/* Карточка события — ~80–85% ширины, скругление и тонкая рамка. */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.05fr) repeat(3, minmax(0, 1fr)) 20px",
          columnGap: 10,
          rowGap: 4,
          alignItems: "center",
          padding: "10px 12px 10px 10px",
          borderRadius: 9,
          border: cardBorder,
          backgroundColor: cardBg,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 }}>
          <ServiceLogLeadingEventIcon event={event} actionKind={actionKind} iconCfg={iconCfg} size={SERVICE_LOG_JOURNAL_LEADING_ICON_PX} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                color: SPEC.textPrimary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
            >
              {entry.mainTitle}
            </span>
            <span
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 400,
                color: SPEC.textSecondary,
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.25,
              }}
            >
              {isStateUpdate
                ? (entry.stateUpdateSubtitle ?? entry.compactMetricsLine)
                : entry.secondaryTitle}
            </span>
          </div>
        </div>

        <RowMetric icon={<HandCoinMetricSvg />} value={cost ?? "—"} label="Стоимость" />
        <RowMetric icon={<ClockSvg size={14} />} value={intervalLabel} label="Интервал" />
        <RowMetric icon={<PersonSvg size={14} />} value={performerLabel} label="Исполнитель" />

        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isSelected ? SPEC.accent : "rgba(148,163,184,0.55)",
          }}
          aria-hidden
        >
          <ChevronRightThinSvg />
        </span>
      </div>
    </button>
  );
}

function RowMetric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  const metricIconColor = "rgba(248,250,252,0.78)";
  return (
    <span
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minWidth: 0,
        width: "100%",
        justifyContent: "center",
      }}
    >
      <span style={{ color: metricIconColor, display: "inline-flex", flexShrink: 0 }}>{icon}</span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontWeight: 700,
            fontSize: 12,
            color: SPEC.textPrimary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 11,
            color: SPEC.textSecondary,
            fontWeight: 400,
            lineHeight: 1.2,
            letterSpacing: "0.01em",
          }}
        >
          {label}
        </span>
      </span>
    </span>
  );
}

/** Строка установленной запчасти: переход в подбор по клику на карточку (без меню «⋯»). */
function InstalledPartRow({
  item,
  event,
  onOpenParts,
}: {
  item: ServiceLogBundleItemSummary;
  event: ServiceEventItem | null;
  onOpenParts: (opts: { wishlistItemId?: string; nodeId?: string; partsSearch?: string }) => void;
}) {
  const wishId = event ? resolveWishlistItemIdForServiceBundleItem(event, item.id) : null;
  const partsSearchLabel = (item.partName ?? item.actionLabelRu ?? "").trim();
  const canOpenParts = Boolean(wishId || item.nodeId || partsSearchLabel);

  const openPartsNow = () => {
    if (!canOpenParts) return;
    if (wishId) {
      onOpenParts({ wishlistItemId: wishId, nodeId: item.nodeId });
    } else if (item.nodeId) {
      onOpenParts({
        nodeId: item.nodeId,
        partsSearch: partsSearchLabel || undefined,
      });
    } else if (partsSearchLabel) {
      onOpenParts({ partsSearch: partsSearchLabel });
    }
  };

  return (
    <button
      type="button"
      disabled={!canOpenParts}
      onClick={openPartsNow}
      title={
        wishId
          ? "Подбор запчастей: позиция из списка"
          : item.nodeId || partsSearchLabel
            ? "Подбор запчастей: узел и поиск по названию"
            : undefined
      }
      style={{
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        gap: 6,
        alignItems: "center",
        padding: "5px 8px",
        borderRadius: 8,
        backgroundColor: C.row,
        border: SPEC.borderSubtle,
        textAlign: "left",
        cursor: canOpenParts ? "pointer" : "default",
        fontFamily: "inherit",
        opacity: canOpenParts ? 1 : 0.85,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 6,
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
        <p style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>
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
    </button>
  );
}

// ─── Details panel ─────────────────────────────────────────────────────────────

function ServiceLogEventDetails({
  entry,
  event,
  originWishlistItemIds,
  onOpenNodeInTree,
  onOpenExpenses,
  onOpenParts,
  onClearSelection,
  onRepeat,
  onEdit,
  onDelete,
}: {
  entry: ServiceLogEntryViewModel;
  event: ServiceEventItem | null;
  originWishlistItemIds: string[];
  onOpenNodeInTree: (nodeId: string) => void;
  onOpenExpenses: (opts?: { highlightExpenseId?: string; expenseDateIso?: string }) => void;
  onOpenParts: (opts: { wishlistItemId?: string; nodeId?: string; partsSearch?: string }) => void;
  onClearSelection: () => void;
  onRepeat: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isStateUpdate = entry.eventKind === "STATE_UPDATE";
  const actionKind = getRowActionKind(entry, event);
  const iconCfg = getServiceIconConfig(actionKind);
  const cost = getCompactCost(entry);
  const intervalLabel = getIntervalLabel(event);
  const performerLabel = getPerformerLabel(event?.performedBy);
  const linkedExpenses = event?.expenseItems ?? [];
  const linkedExpenseTotals = new Map<string, number>();
  for (const expense of linkedExpenses) {
    linkedExpenseTotals.set(expense.currency, (linkedExpenseTotals.get(expense.currency) ?? 0) + expense.amount);
  }

  const detailNodes = getDetailPanelNodeRows(entry, event);
  const fullReminderText = formatFullServiceReminder(event);

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
      <div style={{ padding: detailPanelHeaderPad, borderBottom: SPEC.borderSubtle }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
            <ServiceLogLeadingEventIcon event={event} actionKind={actionKind} iconCfg={iconCfg} size={SERVICE_LOG_DETAIL_LEADING_ICON_PX} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: SPEC.textPrimary, lineHeight: 1.2 }}>
                {entry.mainTitle}
              </p>
              <p style={{ fontSize: 12, color: SPEC.textMuted, marginTop: 2 }}>
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
        <div style={{ marginTop: 5 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 6,
              padding: "2px 8px",
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
          padding: detailPanelMetricsPad,
        }}
      >
        <MetricCol label="Дата" value={entry.dateLabel} />
        <MetricCol label="Пробег" value={entry.odometerValue} />
        <MetricCol label="Интервал" value={intervalLabel} />
        <MetricCol
          label="Стоимость"
          value={cost ?? "—"}
          accent={!!cost}
          noRightBorder
          valueSize="sm"
          onNavigate={
            !isStateUpdate && event && (linkedExpenses.length > 0 || cost)
              ? () => onOpenExpenses()
              : undefined
          }
          navigateLabel="Открыть расходы по этому событию"
        />
      </div>

      {/* Узлы — бейджи в ряд с переносом */}
      <div style={{ padding: detailPanelSectionPad, borderBottom: SPEC.borderSubtle, flexShrink: 0 }}>
        <PanelSectionTitle>Узлы</PanelSectionTitle>
        {detailNodes.length > 0 ? (
          <ul
            style={{
              margin: "2px 0 0",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
            }}
          >
            {detailNodes.map((row) => (
              <li key={row.nodeId} style={{ listStyle: "none" }}>
                <button
                  type="button"
                  onClick={() => onOpenNodeInTree(row.nodeId)}
                  title={`Дерево узлов: ${row.name}`}
                  style={detailPanelNodeChipStyle}
                >
                  {row.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ marginTop: 2, fontSize: 12, color: C.text3 }}>Узел не указан</p>
        )}
      </div>

      {/* 2. Режим bundle */}
      {!isStateUpdate ? (
        <div style={{ padding: detailPanelSectionPad, borderBottom: SPEC.borderSubtle, flexShrink: 0 }}>
          <PanelSectionTitle>Режим записи</PanelSectionTitle>
          <p style={{ marginTop: 2, fontSize: 13, fontWeight: 600, color: SPEC.textPrimary }}>{entry.modeBadgeRu}</p>
          <p style={{ marginTop: 2, fontSize: 11, color: C.text3, lineHeight: 1.4 }}>
            {entry.mode === "ADVANCED"
              ? "Отдельные поля по каждому узлу: запчасть, SKU, количество, стоимость."
              : "Одна форма на событие: общий тип работ и комментарий по узлам."}
          </p>
        </div>
      ) : null}

      {/* 3. Моточасы */}
      {entry.engineHoursValue !== null ? (
        <div style={{ padding: detailPanelSectionPad, borderBottom: SPEC.borderSubtle, flexShrink: 0 }}>
          <PanelSectionTitle>{entry.engineHoursLabel ?? "Моточасы"}</PanelSectionTitle>
          <p style={{ marginTop: 2, fontSize: 13, fontWeight: 600, color: SPEC.textPrimary }}>{entry.engineHoursValue}</p>
        </div>
      ) : null}

      {/* 4. Напоминание целиком */}
      {fullReminderText ? (
        <div style={{ padding: detailPanelSectionPad, borderBottom: SPEC.borderSubtle, flexShrink: 0 }}>
          <PanelSectionTitle>Следующее напоминание</PanelSectionTitle>
          <p style={{ marginTop: 2, fontSize: 13, color: C.text2, lineHeight: 1.4 }}>{fullReminderText}</p>
        </div>
      ) : null}

      {/* 5. Комментарии по позициям bundle */}
      {!isStateUpdate && entry.bundleItemsSummary.some((i) => i.comment?.trim()) ? (
        <div style={{ padding: detailPanelSectionPad, borderBottom: SPEC.borderSubtle, flexShrink: 0 }}>
          <PanelSectionTitle>Комментарии по работам</PanelSectionTitle>
          <div style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 4 }}>
            {entry.bundleItemsSummary
              .filter((i) => i.comment?.trim())
              .map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "5px 8px",
                    borderRadius: 6,
                    backgroundColor: C.wash,
                    border: SPEC.borderSubtle,
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: SPEC.textPrimary }}>
                    {(item.partName ?? item.actionLabelRu).trim()}
                    <span style={{ fontWeight: 500, color: C.text3 }}> · {item.nodeName}</span>
                  </p>
                  <p style={{ marginTop: 2, fontSize: 12, color: C.text2, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                    {item.comment!.trim()}
                  </p>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {/* 6. Детали и работа в одну строку (итого — в сетке метрик сверху) */}
      {!isStateUpdate && (entry.partsCostLabel || entry.laborCostLabel) ? (
        <div style={{ padding: detailPanelSectionPad, borderBottom: SPEC.borderSubtle, flexShrink: 0 }}>
          <PanelSectionTitle>Стоимость по статьям</PanelSectionTitle>
          <button
            type="button"
            onClick={() => onOpenExpenses()}
            title="Открыть расходы по этому событию"
            style={{
              margin: "2px 0 0",
              ...detailPanelCostTextLinkStyle,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
              width: "100%",
            }}
          >
            {[entry.partsCostLabel, entry.laborCostLabel].filter(Boolean).join(" · ")}
          </button>
        </div>
      ) : null}

      {/* Scrollable body */}
      <div style={{ overflowY: "auto", flex: 1 }}>

        {/* Установленные запчасти — только ADVANCED; в BASIC строки bundle = узлы/работы. */}
        {!isStateUpdate && entry.mode === "ADVANCED" && entry.bundleItemsSummary.length > 0 ? (
          <div style={{ padding: detailPanelSectionPad, borderBottom: SPEC.borderSubtle }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <PanelSectionTitle>Установленные запчасти</PanelSectionTitle>
              <span style={{ fontSize: 11, color: C.text3 }}>
                {entry.bundleItemsSummary.length} позиций
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {entry.bundleItemsSummary.map((item) => (
                <InstalledPartRow key={item.id} item={item} event={event} onOpenParts={onOpenParts} />
              ))}
            </div>
          </div>
        ) : null}

        {/* State update lines */}
        {isStateUpdate ? (
          <div style={{ padding: detailPanelSectionPad, borderBottom: SPEC.borderSubtle }}>
            <PanelSectionTitle>Изменения состояния</PanelSectionTitle>
            <div style={{ marginTop: 3, display: "flex", flexDirection: "column", gap: 2 }}>
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
          <div style={{ padding: detailPanelSectionPad, borderBottom: SPEC.borderSubtle }}>
            <PanelSectionTitle>Комментарий</PanelSectionTitle>
            <p
              style={{
                marginTop: 3,
                fontSize: 12,
                color: C.text2,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
              }}
            >
              {entry.comment}
            </p>
          </div>
        ) : null}

        {/* Performer */}
        <div style={{ padding: detailPanelSectionPad, borderBottom: SPEC.borderSubtle }}>
          <PanelSectionTitle>Исполнитель</PanelSectionTitle>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 3 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: C.wash,
                border: SPEC.borderSubtle,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.text3,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <PersonSvg />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 13, color: C.text2, lineHeight: 1.35 }}>
                {performerLabel}
                {event?.performedBy !== "SERVICE" && event?.serviceProviderNote?.trim() ? (
                  <span style={{ fontSize: 12, color: C.text3 }}> · {event.serviceProviderNote.trim()}</span>
                ) : null}
              </span>
              {event?.performedBy === "SERVICE" ? (
                <p style={{ margin: 0, fontSize: 12, color: C.text2, lineHeight: 1.4 }}>
                  <span style={{ color: C.text3 }}>Название сервиса: </span>
                  {event.serviceProviderNote?.trim() ? event.serviceProviderNote.trim() : "—"}
                </p>
              ) : null}
              <ServiceInstallLocationDetail event={event} />
            </div>
          </div>
        </div>

        {/* Sources / wishlist origin */}
        <div style={{ padding: detailPanelSectionPad, borderBottom: SPEC.borderSubtle }}>
          <PanelSectionTitle>Источники</PanelSectionTitle>
          {originWishlistItemIds.length > 0 ? (
            <div style={{ marginTop: 3, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {originWishlistItemIds.map((wid, idx) => (
                <button
                  key={wid}
                  type="button"
                  onClick={() => onOpenParts({ wishlistItemId: wid })}
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
            <p style={{ marginTop: 3, fontSize: 12, color: C.text2 }}>{entry.wishlistOriginLabelRu}</p>
          ) : (
            <p style={{ marginTop: 3, fontSize: 12, color: C.text3 }}>—</p>
          )}
        </div>

        {/* Expenses */}
        {!isStateUpdate && linkedExpenses.length > 0 ? (
          <div style={{ padding: detailPanelSectionPad, borderBottom: SPEC.borderSubtle }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <PanelSectionTitle>Расходы</PanelSectionTitle>
              <button
                type="button"
                onClick={() => onOpenExpenses()}
                title="Открыть расходы по этому событию"
                style={detailPanelCostTotalLinkStyle}
              >
                {Array.from(linkedExpenseTotals.entries())
                  .map(([cur, amt]) => `${formatExpenseAmountRu(amt)} ${cur}`)
                  .join(" · ")}
              </button>
            </div>
            {linkedExpenses.map((expense) => (
              <button
                key={expense.id}
                type="button"
                onClick={() =>
                  onOpenExpenses({ highlightExpenseId: expense.id, expenseDateIso: expense.expenseDate })
                }
                title="Показать расход в списке"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  padding: "2px 0",
                  borderTop: SPEC.borderSubtle,
                  width: "100%",
                  background: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  borderBottom: "none",
                  cursor: "pointer",
                  font: "inherit",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: C.text2,
                    lineHeight: 1.35,
                    minWidth: 0,
                    flex: 1,
                    textAlign: "left",
                  }}
                >
                  {expense.title} · {expenseCategoryLabelsRu[expense.category]}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: SPEC.textPrimary,
                    lineHeight: 1.35,
                    flexShrink: 0,
                    textDecoration: "underline",
                    textDecorationStyle: "dotted",
                    textDecorationColor: "rgba(148,163,184,0.35)",
                    textUnderlineOffset: 2,
                  }}
                >
                  {formatExpenseAmountRu(expense.amount)} {expense.currency}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Fixed bottom actions */}
      {!isStateUpdate ? (
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: detailPanelFooterPad,
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
              height: 36,
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
              gap: 6,
            }}
          >
            <EditSvg /> Редактировать
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{
              flex: 1,
              height: 36,
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
              gap: 6,
            }}
          >
            <TrashSvg /> Удалить
          </button>
          <button
            type="button"
            onClick={onRepeat}
            style={{
              flex: 1,
              height: 36,
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
              gap: 6,
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

function ServiceLogLeadingEventIcon({
  event,
  actionKind,
  iconCfg,
  size,
}: {
  event: ServiceEventItem | null;
  actionKind: ServiceRowActionKind;
  iconCfg: ReturnType<typeof getServiceIconConfig>;
  size: number;
}) {
  const node = resolvePrimaryCatalogNodeForServiceLogIcon(event);
  if (node?.code) {
    const src = getNodeTreeIconWebSrc(node.code, node.name);
    if (src) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: size,
            height: size,
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static asset URL from bundled node-tree-icons */}
          <img
            src={src}
            alt=""
            width={size}
            height={size}
            style={{ objectFit: "contain", display: "block" }}
          />
        </span>
      );
    }
  }
  return <ServiceTypeIcon actionKind={actionKind} iconCfg={iconCfg} size={size} />;
}

function ServiceTypeIcon({
  actionKind,
  iconCfg,
  size = 36,
}: {
  actionKind: ServiceRowActionKind;
  iconCfg: { bg: string; iconColor: string; variant: ServiceRowActionKind };
  size?: number;
}) {
  const glyph =
    actionKind === "INSPECT" ? (
      <InspectSvg />
    ) : actionKind === "STATE_UPDATE" ? (
      <StateSvg />
    ) : actionKind === "SERVICE" ? (
      <OilCanSvg />
    ) : actionKind === "CLEAN" ? (
      <SparkleSvg />
    ) : actionKind === "ADJUST" ? (
      <SlidersSvg />
    ) : (
      <WrenchSvg />
    );
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
      {glyph}
    </span>
  );
}

function MetricCol({
  label,
  value,
  accent = false,
  noRightBorder = false,
  onNavigate,
  navigateLabel,
  valueSize = "default",
}: {
  label: string;
  value: string;
  accent?: boolean;
  noRightBorder?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
  valueSize?: "default" | "sm";
}) {
  const valueFontSize = valueSize === "sm" ? 11 : 13;
  const valueFontWeight = valueSize === "sm" ? 600 : 700;
  const valueIsLink = Boolean(onNavigate);
  const body = (
    <>
      <p
        style={{
          fontSize: 10,
          color: SPEC.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 2,
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: valueFontSize,
          fontWeight: valueFontWeight,
          color: accent ? C.green : SPEC.textPrimary,
          ...(valueIsLink
            ? {
                textDecoration: "underline",
                textDecorationStyle: "dotted" as const,
                textDecorationColor: accent ? "rgba(74,222,128,0.35)" : "rgba(148,163,184,0.45)",
                textUnderlineOffset: 2,
              }
            : {}),
        }}
      >
        {value}
      </p>
    </>
  );
  return (
    <div
      style={{
        padding: "5px 8px",
        borderRight: noRightBorder ? undefined : SPEC.borderSubtle,
      }}
    >
      {onNavigate ? (
        <button
          type="button"
          onClick={onNavigate}
          aria-label={navigateLabel ?? label}
          title={navigateLabel}
          style={{
            display: "block",
            width: "100%",
            margin: 0,
            padding: 0,
            border: "none",
            background: "none",
            cursor: "pointer",
            textAlign: "left",
            font: "inherit",
            color: "inherit",
          }}
        >
          {body}
        </button>
      ) : (
        body
      )}
    </div>
  );
}

function PanelSectionTitle({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 10,
        fontWeight: 700,
        color: SPEC.textSecondary,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        lineHeight: 1.2,
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

/** Канистра с носиком — референс «ТО / масло» в журнале. */
function OilCanSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <title>ТО</title>
      <path d="M10 3h4v3h-4z" />
      <path d="M8 6h10l1 4v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10l1-4z" />
      <path d="M18 8h2.5a1 1 0 0 1 1 1v2h-2" />
    </svg>
  );
}

function SparkleSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <title>Очистка</title>
      <path d="M12 3v2.5M12 18.5V21M4.2 4.2l1.8 1.8M18 18l1.8 1.8M3 12h2.5M18.5 12H21M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
    </svg>
  );
}

function SlidersSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <title>Регулировка</title>
      <line x1="3" y1="8" x2="21" y2="8" />
      <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" stroke="none" />
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

function ClockSvg({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Интервал</title>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PersonSvg({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <title>Исполнитель</title>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/** Рука с монетой — метрика «Стоимость» (белый контур, референс). */
function HandCoinMetricSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <title>Стоимость</title>
      <ellipse cx="9.5" cy="10" rx="2.8" ry="2.8" />
      <path d="M12.5 8.5c2 0 3.5 1.6 3.5 3.5V14" />
      <path d="M6 14.5c0-1.1.9-2 2-2h1.5" />
      <path d="M5.5 19.5v-3c0-1.4 1.1-2.5 2.5-2.5H11" />
      <path d="M16 12v4.5a2 2 0 0 1-2 2h-1" />
      <path d="M13 18.5H8.5" />
    </svg>
  );
}

function ChevronRightThinSvg() {
  return (
    <svg width="10" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 6l6 6-6 6" />
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

