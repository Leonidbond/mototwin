import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { createMobileApiClient } from "../../../src/create-mobile-api-client";
import { withAuthGuard } from "../../../src/mobile-auth-guard";
import type {
  NodeTreeItem,
  VehicleDetail,
  VehicleDetailApiRecord,
  ServiceActionType,
  ServiceEventItem,
  ServiceEventsFilters,
  ServiceEventsSortDirection,
  ServiceEventsSortField,
  ServiceLogBundleItemSummary,
  ServiceLogEntryViewModel,
  ServiceLogMonthGroupViewModel,
  ServiceLogNodeFilter,
  SubscriptionPlan,
  ServiceNodeItem,
  TopServiceNodeItem,
} from "@mototwin/types";
import {
  buildServiceLogTimelineProps,
  buildYandexMapsUrlForInstallLocation,
  canOpenServiceInstallLocationOnMap,
  getServiceInstallLocationAddress,
  vehicleDetailFromApiRecord,
  expenseCategoryLabelsRu,
  buildRestrictedPlanVehicleLeafPickerSets,
  filterPaidServiceEvents,
  findNodeTreeItemById,
  formatExpenseAmountRu,
  formatIsoCalendarDateRu,
  getTodayDateYmdLocal,
  getWishlistItemIdsFromInstalledPartsJson,
  isServiceLogTimelineQueryActive,
  resolveWishlistItemIdForServiceBundleItem,
  resolvePrimaryCatalogNodeForServiceLogIcon,
  SERVICE_LOG_DETAIL_LEADING_ICON_PX,
  SERVICE_LOG_JOURNAL_LEADING_ICON_PX,
  SERVICE_ACTION_TYPE_OPTIONS,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { getNodeTreeIconAsset } from "../../../../../src/node-tree-icons";
import { KeyboardAwareScrollScreen } from "../../../components/expo-shell/keyboard-aware-scroll-screen";
import { InternalScreenChrome } from "../../../components/expo-shell/internal-screen-chrome";
import { GarageVehicleContextPlaque } from "../../../components/garage/GarageVehicleContextPlaque";
import { GarageBottomNav } from "../../../components/garage/GarageBottomNav";
import { buildVehicleWishlistItemHighlightHref } from "../../../components/vehicle-wishlist/hrefs";
import { MobileNodePickerModal, type MobileNodePickerOption } from "../../../components/vehicle-detail/mobile-node-picker-modal";
import { ServiceLogActionGlyph, type ServiceLogGlyphKind } from "../../../components/vehicle-detail/service-log-action-glyph";
import { SubscriptionLockBanner } from "../../../components/subscription/subscription-lock-banner";
import { useMobileSubscription } from "../../../src/use-mobile-subscription";

function readSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseServiceLogNodeFilterFromParams(
  nodeIdsRaw: string | string[] | undefined,
  nodeLabelRaw: string | string[] | undefined
): ServiceLogNodeFilter | null {
  const rawIds = readSearchParam(nodeIdsRaw);
  if (typeof rawIds !== "string" || !rawIds.trim()) {
    return null;
  }
  const nodeIds = rawIds
    .split(",")
    .map((id) => {
      try {
        return decodeURIComponent(id.trim());
      } catch {
        return id.trim();
      }
    })
    .filter(Boolean);
  if (!nodeIds.length) {
    return null;
  }
  const labelRaw = readSearchParam(nodeLabelRaw);
  let displayLabel = "Узел";
  if (typeof labelRaw === "string" && labelRaw.trim()) {
    try {
      displayLabel = decodeURIComponent(labelRaw);
    } catch {
      displayLabel = labelRaw;
    }
  }
  return { nodeIds, displayLabel };
}

function parsePaidOnlyFromParams(
  paidOnlyRaw: string | string[] | undefined
): boolean {
  const v = readSearchParam(paidOnlyRaw);
  return v === "1" || v === "true";
}

export function buildVehicleServiceLogHref(
  vehicleId: string,
  nodeFilter: ServiceLogNodeFilter | null,
  paidOnly: boolean,
  options?: {
    expandExpenses?: boolean;
    month?: string;
    serviceEventId?: string;
    returnNodeId?: string;
    returnOrigin?: "node-tree" | "attention";
    returnAttentionNodeId?: string;
  }
): string {
  const q: string[] = [];
  if (nodeFilter?.nodeIds.length) {
    const nodeIdsParam = nodeFilter.nodeIds.map(encodeURIComponent).join(",");
    q.push(`nodeIds=${nodeIdsParam}`);
    q.push(`nodeLabel=${encodeURIComponent(nodeFilter.displayLabel)}`);
  }
  if (paidOnly) {
    q.push("paidOnly=1");
  }
  if (options?.expandExpenses) {
    q.push("expandExpenses=1");
  }
  if (options?.month) {
    q.push(`month=${options.month}`);
  }
  if (options?.serviceEventId) {
    q.push(`serviceEventId=${encodeURIComponent(options.serviceEventId)}`);
  }
  if (options?.returnNodeId) {
    q.push(`returnNodeId=${encodeURIComponent(options.returnNodeId)}`);
  }
  if (options?.returnOrigin) {
    q.push(`returnOrigin=${encodeURIComponent(options.returnOrigin)}`);
  }
  if (options?.returnAttentionNodeId) {
    q.push(`returnAttentionNodeId=${encodeURIComponent(options.returnAttentionNodeId)}`);
  }
  return `/vehicles/${vehicleId}/service-log${q.length ? `?${q.join("&")}` : ""}`;
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

function periodToolbarLabelRu(dateFrom: string, dateTo: string): string {
  const a = dateFrom.trim();
  const b = dateTo.trim();
  if (!a && !b) return "Все время";
  const left = a ? formatIsoCalendarDateRu(`${a}T12:00:00`) : "…";
  const right = b ? formatIsoCalendarDateRu(`${b}T12:00:00`) : "…";
  return `${left} – ${right}`;
}

function parseYmdToLocalDate(ymd: string): Date {
  const t = ymd.trim();
  if (t.length >= 10) {
    const y = Number(t.slice(0, 4));
    const mo = Number(t.slice(5, 7)) - 1;
    const day = Number(t.slice(8, 10));
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(day)) {
      return new Date(y, mo, day);
    }
  }
  const today = getTodayDateYmdLocal();
  const y = Number(today.slice(0, 4));
  const mo = Number(today.slice(5, 7)) - 1;
  const day = Number(today.slice(8, 10));
  return new Date(y, mo, day);
}

// ─── Паритет с web `ServiceLogRow` (хелперы + строка ленты) ────────────────────

type ServiceRowActionKind = ServiceActionType | "STATE_UPDATE";

const ROW_DATE_MONTH_3 = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"] as const;

function formatRowDateColumnParts(iso: string, fallbackLabel: string): { dayMonth: string; year: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { dayMonth: fallbackLabel.trim() || iso.slice(0, 10), year: "" };
  }
  const day = date.getDate();
  const mon = ROW_DATE_MONTH_3[date.getMonth()];
  return { dayMonth: `${day} ${mon}`, year: String(date.getFullYear()) };
}

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

  const openOnMap = () => {
    if (!mapsUrl) return;
    void Linking.openURL(mapsUrl).catch(() => {
      Alert.alert("Карта", "Не удалось открыть Яндекс.Карты на этом устройстве.");
    });
  };

  return (
    <View style={styles.detailInstallLocationBlock}>
      <Text style={styles.detailPerformerService}>
        <Text style={styles.detailMuted}>Адрес сервиса: </Text>
        {address}
      </Text>
      {canOpenMap ? (
        <Pressable
          onPress={openOnMap}
          accessibilityRole="link"
          accessibilityLabel="Открыть адрес на карте"
          style={({ pressed }) => [styles.detailMapLink, pressed && styles.cardPressed]}
        >
          <MaterialIcons name="place" size={14} color={c.primaryAction} />
          <Text style={styles.detailMapLinkText}>На карте</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function getIntervalLabel(event: ServiceEventItem | null): string {
  if (!event) return "—";
  if (event.nextReminderOdometer) return `${event.nextReminderOdometer.toLocaleString("ru-RU")} км`;
  if (event.nextReminderEngineHours) return `${event.nextReminderEngineHours} ч`;
  if (event.nextReminderDate) return event.nextReminderDate.slice(0, 10).split("-").reverse().join(".");
  return "—";
}

/** Уникальные узлы для детальной панели: из bundle или якорь события (в т.ч. STATE_UPDATE). Как web. */
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

/** Полное описание напоминания (пробег / моточасы / дата). Как web. */
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
  const on =
    event.nextReminderEnabled === true
      ? "Включено: "
      : event.nextReminderEnabled === false
        ? "Выключено (параметры сохранены): "
        : "";
  return `${on}${bits.join(" · ")}`;
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
} {
  if (actionType === "REPLACE") return { bg: "#172440", iconColor: "#60a5fa" };
  if (actionType === "INSPECT") return { bg: "#0a2524", iconColor: "#5eead4" };
  if (actionType === "STATE_UPDATE") return { bg: "rgba(255,255,255,0.055)", iconColor: c.textMuted };
  if (actionType === "CLEAN") return { bg: "#082026", iconColor: "#22d3ee" };
  if (actionType === "ADJUST") return { bg: "#241c0a", iconColor: "#fbbf24" };
  return { bg: "#0a2518", iconColor: "#4ade80" };
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

function ServiceLogJournalLeadingIcon({
  event,
  actionKind,
  size,
}: {
  event: ServiceEventItem | null;
  actionKind: ServiceRowActionKind;
  size: number;
}) {
  const iconCfg = getServiceIconConfig(actionKind);
  const node = resolvePrimaryCatalogNodeForServiceLogIcon(event);
  if (node?.code) {
    const src = getNodeTreeIconAsset(node.code, node.name) as ImageSourcePropType;
    return (
      <Image
        alt=""
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        source={src}
        style={{ width: size, height: size, flexShrink: 0 }}
        resizeMode="contain"
      />
    );
  }
  const glyphSize = Math.round(size * 0.5);
  return (
    <View
      style={[
        styles.journalTypeIcon,
        {
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: iconCfg.bg,
        },
      ]}
    >
      <ServiceLogActionGlyph kind={actionKind as ServiceLogGlyphKind} size={glyphSize} color={iconCfg.iconColor} />
    </View>
  );
}

function JournalTimelineRow({
  entry,
  event,
  isSelected,
  isHighlighted,
  isFirst,
  isLast,
  onPress,
}: {
  entry: ServiceLogEntryViewModel;
  event: ServiceEventItem | null;
  isSelected: boolean;
  isHighlighted: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const isStateUpdate = entry.eventKind === "STATE_UPDATE";
  const actionKind = getRowActionKind(entry, event);
  const dateParts = formatRowDateColumnParts(event?.eventDate ?? "", entry.dateLabel);
  const timelineBase = getTimelineColors(actionKind);
  const railLineColor = isSelected ? "rgba(249,115,22,0.5)" : timelineBase.rail;
  const dotBg = isSelected ? c.primaryAction : timelineBase.dotBg;
  const dotBorder = isSelected ? c.primaryAction : timelineBase.dotBorder;
  const glyphColor =
    isSelected ? "#ffffff" : actionKind === "STATE_UPDATE" ? "rgba(226,232,240,0.85)" : timelineBase.dotBorder;
  const nodeOrSubtitleLine = isStateUpdate
    ? (entry.stateUpdateSubtitle ?? entry.compactMetricsLine)
    : (entry.expoServiceNodeLabel ?? entry.secondaryTitle);
  const cost = isStateUpdate
    ? null
    : (getCompactCost(entry)?.replace(/^Итого\s+/u, "") ?? null);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.journalRowPressable, pressed && styles.cardPressed]}
      accessibilityRole="button"
    >
      <View style={styles.journalRowOuter}>
        <View style={styles.journalDateCol}>
          <Text style={styles.journalDateDay}>{dateParts.dayMonth}</Text>
          {dateParts.year ? <Text style={styles.journalDateYear}>{dateParts.year}</Text> : null}
          <Text style={styles.journalDateOdo}>{entry.odometerValue}</Text>
        </View>
        <View style={styles.journalRailWrap}>
          <View
            style={[
              styles.journalRailLine,
              {
                backgroundColor: railLineColor,
                top: isFirst ? "50%" : 0,
                bottom: isLast ? "50%" : 0,
              },
            ]}
          />
          <View
            style={[
              styles.journalDot,
              {
                backgroundColor: dotBg,
                borderColor: dotBorder,
              },
              isHighlighted && !isSelected ? styles.journalDotHighlightRing : null,
            ]}
          >
            <ServiceLogActionGlyph kind={actionKind as ServiceLogGlyphKind} size={10} color={glyphColor} />
          </View>
        </View>
        <View
          style={[
            styles.journalCard,
            isSelected ? styles.journalCardSelected : null,
          ]}
        >
          <View style={styles.journalCardInner}>
            <View style={styles.journalTitleBlock}>
              <ServiceLogJournalLeadingIcon event={event} actionKind={actionKind} size={SERVICE_LOG_JOURNAL_LEADING_ICON_PX} />
              <View style={styles.journalTitleTexts}>
                <Text
                  style={[styles.journalMainTitle, isStateUpdate && styles.journalMainTitleState]}
                  numberOfLines={2}
                >
                  {entry.mainTitle}
                </Text>
                <Text style={styles.journalSubtitle} numberOfLines={2}>
                  {nodeOrSubtitleLine}
                </Text>
              </View>
            </View>
            {cost ? (
              <Text style={styles.journalCost} numberOfLines={1}>
                {cost}
              </Text>
            ) : null}
            <MaterialIcons name="chevron-right" size={18} color={isSelected ? c.primaryAction : "rgba(148,163,184,0.55)"} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function serviceLogHighlightReturnPath(vehicleId: string, eventId: string): string {
  return `/vehicles/${vehicleId}/service-log?highlightServiceEventId=${encodeURIComponent(eventId)}`;
}

function buildExpensesHrefForServiceEvent(
  vehicleId: string,
  eventId: string,
  event: ServiceEventItem | null,
  opts?: { highlightExpenseId?: string; expenseDateIso?: string }
): string {
  const rawYear = opts?.expenseDateIso
    ? new Date(opts.expenseDateIso).getFullYear()
    : event?.eventDate
      ? new Date(event.eventDate).getFullYear()
      : new Date().getFullYear();
  const year = Number.isFinite(rawYear) && rawYear > 1900 ? rawYear : new Date().getFullYear();
  const q = new URLSearchParams();
  q.set("year", String(year));
  q.set("serviceEventId", eventId);
  if (opts?.highlightExpenseId) {
    q.set("highlightExpenseId", opts.highlightExpenseId);
  }
  q.set("returnTo", encodeURIComponent(serviceLogHighlightReturnPath(vehicleId, eventId)));
  return `/vehicles/${vehicleId}/expenses?${q.toString()}`;
}

/** Как web `openPartsSelectionFromLog`: «Корзина замен» → `/parts`, не подбор в wishlist/picker. */
function buildPartsCartHrefFromServiceLog(
  vehicleId: string,
  eventId: string,
  opts: { wishlistItemId?: string; nodeId?: string; partsSearch?: string }
): string {
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
  q.set("returnTo", encodeURIComponent(serviceLogHighlightReturnPath(vehicleId, eventId)));
  return `/vehicles/${vehicleId}/parts?${q.toString()}`;
}

// ─── Month group ──────────────────────────────────────────────────────────────

function MonthGroup({
  group,
  highlightedServiceEventId,
  selectedEventId,
  serviceEventById,
  onEventLayout,
  onSelectEvent,
}: {
  group: ServiceLogMonthGroupViewModel;
  highlightedServiceEventId: string;
  selectedEventId: string;
  serviceEventById: Map<string, ServiceEventItem>;
  onEventLayout: (entryId: string, y: number) => void;
  onSelectEvent: (entryId: string) => void;
}) {
  const hasServiceCount = group.summary.serviceCount > 0;
  const hasStateUpdates = group.summary.stateUpdateCount > 0;
  const hasCost = Boolean(group.summary.costLabel);
  const groupYRef = useRef(0);
  const listYRef = useRef(0);

  return (
    <View
      style={styles.monthGroup}
      onLayout={(event) => {
        groupYRef.current = event.nativeEvent.layout.y;
      }}
    >
      <View style={styles.monthHeaderCard}>
        <Text style={styles.monthLabel}>{group.label}</Text>
        <View style={styles.monthSummaryRow}>
          {hasServiceCount ? (
            <View style={styles.monthSummaryChip}>
              <Text style={styles.monthSummaryChipText}>
                Обслуживание: {group.summary.serviceCount}
              </Text>
            </View>
          ) : null}
          {hasStateUpdates ? (
            <View style={styles.monthSummaryChip}>
              <Text style={styles.monthSummaryChipText}>
                Обновления состояния: {group.summary.stateUpdateCount}
              </Text>
            </View>
          ) : null}
          {hasCost ? (
            <View style={styles.monthSummaryChip}>
              <Text style={styles.monthSummaryChipText}>Расходы: {group.summary.costLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View
        style={styles.timelineList}
        onLayout={(event) => {
          listYRef.current = event.nativeEvent.layout.y;
        }}
      >
        {group.entries.map((entry, idx) => {
          const isHighlighted = entry.id === highlightedServiceEventId;
          const rawEvent = serviceEventById.get(entry.id) ?? null;
          return (
            <View
              key={entry.id}
              style={styles.timelineItem}
              onLayout={(event) =>
                onEventLayout(entry.id, groupYRef.current + listYRef.current + event.nativeEvent.layout.y)
              }
            >
              <JournalTimelineRow
                entry={entry}
                event={rawEvent}
                isSelected={entry.id === selectedEventId}
                isHighlighted={isHighlighted}
                isFirst={idx === 0}
                isLast={idx === group.entries.length - 1}
                onPress={() => onSelectEvent(entry.id)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SheetInstalledPartRow({
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
    <Pressable
      onPress={openPartsNow}
      disabled={!canOpenParts}
      style={({ pressed }) => [
        styles.sheetInstalledPartRow,
        !canOpenParts && styles.sheetInstalledPartRowDisabled,
        pressed && canOpenParts && styles.cardPressed,
      ]}
    >
      <View style={styles.sheetInstalledPartThumb}>
        <MaterialIcons name="inventory-2" size={18} color={c.textMuted} />
      </View>
      <View style={styles.sheetInstalledPartMain}>
        <Text style={styles.sheetInstalledPartTitle} numberOfLines={1}>
          {item.partName ?? item.actionLabelRu}
        </Text>
        <Text style={styles.sheetInstalledPartMeta} numberOfLines={2}>
          {item.sku ? `SKU: ${item.sku}` : item.nodeName}
          {item.quantity != null ? ` · ${item.quantity} шт.` : ""}
        </Text>
      </View>
      <Text style={[styles.sheetInstalledPartCost, item.lineCostRu ? styles.sheetInstalledPartCostAccent : null]}>
        {item.lineCostRu ?? "—"}
      </Text>
    </Pressable>
  );
}

function MobileEventDetailSheet({
  entry,
  event,
  originWishlistItemIds,
  visible,
  onClose,
  onOpenNodeInTree,
  onOpenExpenses,
  onOpenParts,
  onOpenWishlistOrigin,
  onRepeat,
  onEdit,
  onDelete,
}: {
  entry: ServiceLogEntryViewModel | null;
  event: ServiceEventItem | null;
  originWishlistItemIds: string[];
  visible: boolean;
  onClose: () => void;
  onOpenNodeInTree: (nodeId: string) => void;
  onOpenExpenses: (opts?: { highlightExpenseId?: string; expenseDateIso?: string }) => void;
  onOpenParts: (opts: { wishlistItemId?: string; nodeId?: string; partsSearch?: string }) => void;
  onOpenWishlistOrigin: (wishlistItemId: string) => void;
  onRepeat: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!entry) {
    return null;
  }
  const isStateUpdate = entry.eventKind === "STATE_UPDATE";
  const actionKind = getRowActionKind(entry, event);
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
  const subtitleLine = isStateUpdate ? (entry.stateUpdateSubtitle ?? "") : entry.secondaryTitle;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailSheetOverlay}>
        <Pressable style={styles.detailSheetBackdrop} onPress={onClose} />
        <View style={styles.detailSheet}>
          <View style={styles.detailSheetHandle} />
          <View style={styles.detailSheetHeader}>
            <View style={styles.detailSheetHeaderRow}>
              <ServiceLogJournalLeadingIcon event={event} actionKind={actionKind} size={SERVICE_LOG_DETAIL_LEADING_ICON_PX} />
              <View style={styles.detailSheetHeaderText}>
                <Text style={styles.detailSheetTitle} numberOfLines={2}>
                  {entry.mainTitle}
                </Text>
                <Text style={styles.detailSheetSubtitle} numberOfLines={2}>
                  {subtitleLine}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.detailSheetCloseBtn}>
                <MaterialIcons name="close" size={22} color={c.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.detailStatusBadgeWrap}>
              <View style={[styles.detailStatusBadge, isStateUpdate ? styles.detailStatusBadgeMuted : styles.detailStatusBadgeOk]}>
                <Text style={[styles.detailStatusBadgeText, isStateUpdate ? styles.detailStatusBadgeTextMuted : styles.detailStatusBadgeTextOk]}>
                  {isStateUpdate ? "Обновление состояния" : "Выполнено"}
                </Text>
              </View>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.detailSheetBody}>
            <View style={styles.detailMetricsGrid}>
              <View style={styles.detailMetricsRow3}>
                <View style={styles.detailMetricCellThird}>
                  <DetailMetric label="Дата" value={entry.dateLabel} containerStyle={styles.detailMetricFill} />
                </View>
                <View style={styles.detailMetricCellThird}>
                  <DetailMetric label="Пробег" value={entry.odometerValue} containerStyle={styles.detailMetricFill} />
                </View>
                <View style={styles.detailMetricCellThird}>
                  <DetailMetric label="Интервал" value={intervalLabel} containerStyle={styles.detailMetricFill} />
                </View>
              </View>
              {!isStateUpdate && event && (linkedExpenses.length > 0 || Boolean(cost)) ? (
                <Pressable onPress={() => onOpenExpenses()} style={styles.detailMetricCostRow}>
                  <DetailMetric
                    label="Стоимость"
                    value={cost ?? "—"}
                    accent={Boolean(cost)}
                    containerStyle={styles.detailMetricFill}
                  />
                </Pressable>
              ) : (
                <View style={styles.detailMetricCostRow}>
                  <DetailMetric
                    label="Стоимость"
                    value={cost ?? "—"}
                    accent={Boolean(cost)}
                    containerStyle={styles.detailMetricFill}
                  />
                </View>
              )}
            </View>

            <View style={styles.detailSheetSection}>
              <Text style={styles.detailSectionTitle}>Узлы</Text>
              {detailNodes.length > 0 ? (
                <View style={styles.detailNodeChipsRow}>
                  {detailNodes.map((row) => (
                    <Pressable
                      key={row.nodeId}
                      onPress={() => onOpenNodeInTree(row.nodeId)}
                      style={({ pressed }) => [styles.detailNodeChip, pressed && styles.cardPressed]}
                    >
                      <Text style={styles.detailNodeChipText} numberOfLines={1}>
                        {row.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.detailMuted}>Узел не указан</Text>
              )}
            </View>

            {!isStateUpdate ? (
              <View style={styles.detailSheetSection}>
                <Text style={styles.detailSectionTitle}>Режим записи</Text>
                <Text style={styles.detailModeTitle}>{entry.modeBadgeRu}</Text>
                <Text style={styles.detailModeHint}>
                  {entry.mode === "ADVANCED"
                    ? "Отдельные поля по каждому узлу: запчасть, SKU, количество, стоимость."
                    : "Одна форма на событие: общий тип работ и комментарий по узлам."}
                </Text>
              </View>
            ) : null}

            {entry.engineHoursValue !== null ? (
              <View style={styles.detailSheetSection}>
                <Text style={styles.detailSectionTitle}>{entry.engineHoursLabel ?? "Моточасы"}</Text>
                <Text style={styles.detailModeTitle}>{entry.engineHoursValue}</Text>
              </View>
            ) : null}

            {fullReminderText ? (
              <View style={styles.detailSheetSection}>
                <Text style={styles.detailSectionTitle}>Следующее напоминание</Text>
                <Text style={styles.detailReminderText}>{fullReminderText}</Text>
              </View>
            ) : null}

            {!isStateUpdate && entry.bundleItemsSummary.some((i) => i.comment?.trim()) ? (
              <View style={styles.detailSheetSection}>
                <Text style={styles.detailSectionTitle}>Комментарии по работам</Text>
                {entry.bundleItemsSummary
                  .filter((i) => i.comment?.trim())
                  .map((item) => (
                    <View key={item.id} style={styles.detailBundleCommentCard}>
                      <Text style={styles.detailBundleCommentTitle} numberOfLines={2}>
                        {(item.partName ?? item.actionLabelRu).trim()}
                        <Text style={styles.detailBundleCommentNode}> · {item.nodeName}</Text>
                      </Text>
                      <Text style={styles.detailBundleCommentBody}>{item.comment!.trim()}</Text>
                    </View>
                  ))}
              </View>
            ) : null}

            {!isStateUpdate && (entry.partsCostLabel || entry.laborCostLabel) ? (
              <View style={styles.detailSheetSection}>
                <Text style={styles.detailSectionTitle}>Стоимость по статьям</Text>
                <Pressable onPress={() => onOpenExpenses()}>
                  <Text style={styles.detailCostArticlesLink} numberOfLines={2}>
                    {[entry.partsCostLabel, entry.laborCostLabel].filter(Boolean).join(" · ")}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {!isStateUpdate && entry.mode === "ADVANCED" && entry.bundleItemsSummary.length > 0 ? (
              <View style={styles.detailSheetSection}>
                <View style={styles.detailInstalledHeader}>
                  <Text style={styles.detailSectionTitle}>Установленные запчасти</Text>
                  <Text style={styles.detailInstalledCount}>{entry.bundleItemsSummary.length} позиций</Text>
                </View>
                {entry.bundleItemsSummary.map((item) => (
                  <SheetInstalledPartRow key={item.id} item={item} event={event} onOpenParts={onOpenParts} />
                ))}
              </View>
            ) : null}

            {isStateUpdate ? (
              <View style={styles.detailSheetSection}>
                <Text style={styles.detailSectionTitle}>Изменения состояния</Text>
                {(entry.stateUpdateLines.length > 0 ? entry.stateUpdateLines : [entry.stateUpdateSubtitle]).map((line) =>
                  line ? (
                    <Text key={line} style={styles.detailMuted}>
                      {line}
                    </Text>
                  ) : null
                )}
              </View>
            ) : null}

            {entry.comment ? (
              <View style={styles.detailSheetSection}>
                <Text style={styles.detailSectionTitle}>Комментарий</Text>
                <Text style={styles.detailComment}>{entry.comment}</Text>
              </View>
            ) : null}

            <View style={styles.detailSheetSection}>
              <Text style={styles.detailSectionTitle}>Исполнитель</Text>
              <View style={styles.detailPerformerRow}>
                <View style={styles.detailPerformerAvatar}>
                  <MaterialIcons name="person" size={16} color={c.textMuted} />
                </View>
                <View style={styles.detailPerformerTexts}>
                  <Text style={styles.detailPerformerMain}>
                    {performerLabel}
                    {event?.performedBy !== "SERVICE" && event?.serviceProviderNote?.trim() ? (
                      <Text style={styles.detailPerformerNote}> · {event.serviceProviderNote.trim()}</Text>
                    ) : null}
                  </Text>
                  {event?.performedBy === "SERVICE" ? (
                    <Text style={styles.detailPerformerService}>
                      <Text style={styles.detailMuted}>Название сервиса: </Text>
                      {event.serviceProviderNote?.trim() ? event.serviceProviderNote.trim() : "—"}
                    </Text>
                  ) : null}
                  <ServiceInstallLocationDetail event={event} />
                </View>
              </View>
            </View>

            <View style={styles.detailSheetSection}>
              <Text style={styles.detailSectionTitle}>Источники</Text>
              {originWishlistItemIds.length > 0 ? (
                <View style={styles.detailOriginRow}>
                  {originWishlistItemIds.map((wid, idx) => (
                    <Pressable
                      key={wid}
                      onPress={() => onOpenWishlistOrigin(wid)}
                      style={({ pressed }) => [styles.detailOriginLink, pressed && styles.cardPressed]}
                    >
                      <Text style={styles.detailOriginLinkText}>
                        {originWishlistItemIds.length === 1
                          ? (entry.wishlistOriginLabelRu ?? "Из списка покупок")
                          : `Позиция ${idx + 1}`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : entry.wishlistOriginLabelRu ? (
                <Text style={styles.detailMuted}>{entry.wishlistOriginLabelRu}</Text>
              ) : (
                <Text style={styles.detailMuted}>—</Text>
              )}
            </View>

            {!isStateUpdate && linkedExpenses.length > 0 ? (
              <View style={styles.detailSheetSection}>
                <View style={styles.detailInstalledHeader}>
                  <Text style={styles.detailSectionTitle}>Расходы</Text>
                  <Pressable onPress={() => onOpenExpenses()}>
                    <Text style={styles.detailExpensesTotalLink}>
                      {Array.from(linkedExpenseTotals.entries())
                        .map(([cur, amt]) => `${formatExpenseAmountRu(amt)} ${cur}`)
                        .join(" · ")}
                    </Text>
                  </Pressable>
                </View>
                {linkedExpenses.map((expense) => (
                  <Pressable
                    key={expense.id}
                    onPress={() =>
                      onOpenExpenses({ highlightExpenseId: expense.id, expenseDateIso: expense.expenseDate })
                    }
                    style={({ pressed }) => [styles.detailExpenseRow, pressed && styles.cardPressed]}
                  >
                    <Text style={styles.detailExpenseTitle} numberOfLines={2}>
                      {expense.title} · {expenseCategoryLabelsRu[expense.category]}
                    </Text>
                    <Text style={styles.detailExpenseAmount}>
                      {formatExpenseAmountRu(expense.amount)} {expense.currency}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>
          <View style={styles.detailSheetActions}>
            {!isStateUpdate ? (
              <>
                <Pressable onPress={onEdit} style={styles.detailAction}>
                  <Text style={styles.detailActionText}>Редактировать</Text>
                </Pressable>
                <Pressable onPress={onDelete} style={[styles.detailAction, styles.detailActionDanger]}>
                  <Text style={[styles.detailActionText, styles.detailActionTextDanger]}>Удалить</Text>
                </Pressable>
                <Pressable onPress={onRepeat} style={styles.detailAction}>
                  <Text style={styles.detailActionText}>Повторить ТО</Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={onClose} style={styles.detailAction}>
                <Text style={styles.detailActionText}>Закрыть</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailMetric({
  label,
  value,
  accent = false,
  containerStyle,
}: {
  label: string;
  value: string;
  accent?: boolean;
  containerStyle?: ViewStyle;
}) {
  return (
    <View style={[styles.detailMetric, containerStyle, accent && styles.detailMetricAccent]}>
      <Text style={styles.detailMetricLabel}>{label}</Text>
      <Text style={[styles.detailMetricValue, accent && styles.detailMetricValueAccent]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ServiceLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    nodeIds?: string;
    nodeLabel?: string;
    paidOnly?: string;
    feedback?: string;
    expandExpenses?: string;
    month?: string;
    serviceEventId?: string;
    highlightServiceEventId?: string;
    returnNodeId?: string;
    returnOrigin?: string;
    returnAttentionNodeId?: string;
  }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const highlightedServiceEventId =
    typeof params.serviceEventId === "string"
      ? params.serviceEventId
      : typeof params.highlightServiceEventId === "string"
        ? params.highlightServiceEventId
        : "";
  const returnNodeId = typeof params.returnNodeId === "string" ? params.returnNodeId : "";
  const returnOrigin = typeof params.returnOrigin === "string" ? params.returnOrigin : "";
  const returnAttentionNodeId =
    typeof params.returnAttentionNodeId === "string" ? params.returnAttentionNodeId : "";

  const [events, setEvents] = useState<ServiceEventItem[]>([]);
  const [serviceMeta, setServiceMeta] = useState<{
    visibleLimit: number | null;
    hiddenCount: number;
    plan: SubscriptionPlan;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
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
  });
  const [sortField, setSortField] = useState<ServiceEventsSortField>("eventDate");
  const [sortDirection, setSortDirection] = useState<ServiceEventsSortDirection>("desc");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(highlightedServiceEventId);
  const [detailSheetEntryId, setDetailSheetEntryId] = useState("");
  const [actionMessage, setActionMessage] = useState<{
    tone: "success" | "error";
    title: string;
    details?: string;
  } | null>(null);
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);
  const [vehicleDisplayName, setVehicleDisplayName] = useState("");
  const [contextVehicleDetail, setContextVehicleDetail] = useState<VehicleDetail | null>(null);
  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [datePickField, setDatePickField] = useState<null | "from" | "to">(null);
  const [headerScrollY, setHeaderScrollY] = useState(0);

  const scrollRef = useRef<ScrollView | null>(null);
  const eventYByIdRef = useRef<Record<string, number>>({});
  /** Как web: не перетирать выбор при каждом изменении `selectedEventId`, пока открыт deep link. */
  const appliedServiceLogHighlightFromUrlRef = useRef<string | null>(null);

  const nodeSubtreeFilter = useMemo(
    () => parseServiceLogNodeFilterFromParams(params.nodeIds, params.nodeLabel),
    [params.nodeIds, params.nodeLabel]
  );

  const paidOnlyActive = useMemo(
    () => parsePaidOnlyFromParams(params.paidOnly),
    [params.paidOnly]
  );

  const expandExpensesFromParams = useMemo(
    () => readSearchParam(params.expandExpenses) === "1" || readSearchParam(params.expandExpenses) === "true",
    [params.expandExpenses]
  );

  const monthQueryParam =
    typeof params.month === "string" && params.month.trim() ? params.month : undefined;

  const serviceLogNavOptions = useMemo(
    () => ({
      expandExpenses: expandExpensesFromParams ? true as const : undefined,
      month: monthQueryParam,
      returnNodeId: returnNodeId || undefined,
      returnOrigin:
        returnOrigin === "node-tree" || returnOrigin === "attention"
          ? (returnOrigin as "node-tree" | "attention")
          : undefined,
      returnAttentionNodeId: returnAttentionNodeId || undefined,
    }),
    [expandExpensesFromParams, monthQueryParam, returnNodeId, returnOrigin, returnAttentionNodeId]
  );

  const vehicleLeafPickerSets = useMemo(
    () =>
      buildRestrictedPlanVehicleLeafPickerSets({
        nodeTree,
        catalogNodes: serviceCatalogNodes,
        topServiceNodes,
        canSelectChildNode: subscriptionCapabilities?.canSelectChildNode ?? true,
      }),
    [nodeTree, serviceCatalogNodes, subscriptionCapabilities?.canSelectChildNode, topServiceNodes]
  );
  const leafRowsForNodePicker = vehicleLeafPickerSets.allLeaves;
  const topLeafRowsForNodePicker = vehicleLeafPickerSets.showTopToggle
    ? vehicleLeafPickerSets.topLeaves
    : undefined;

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

  const applyNodePickerSelection = useCallback(
    (nodeIds: string[]) => {
      const nextFilter: ServiceLogNodeFilter | null =
        nodeIds.length === 0
          ? null
          : { nodeIds, displayLabel: buildMultiNodeLabel(nodeTree, nodeIds) };
      router.replace(buildVehicleServiceLogHref(vehicleId, nextFilter, paidOnlyActive, serviceLogNavOptions));
      setNodePickerOpen(false);
    },
    [nodeTree, paidOnlyActive, router, serviceLogNavOptions, vehicleId]
  );

  useEffect(() => {
    const feedback = typeof params.feedback === "string" ? params.feedback : "";
    if (!feedback) {
      return;
    }
    if (feedback === "created") {
      setActionMessage({
        tone: "success",
        title: "Сервисное событие добавлено",
        details: "Статусы и расходы обновлены",
      });
    } else if (feedback === "updated") {
      setActionMessage({
        tone: "success",
        title: "Сервисное событие обновлено",
        details: "Статусы и расходы обновлены",
      });
    }
    router.replace(
      buildVehicleServiceLogHref(vehicleId, nodeSubtreeFilter, paidOnlyActive, {
        ...serviceLogNavOptions,
        serviceEventId: highlightedServiceEventId || undefined,
      })
    );
  }, [
    params.feedback,
    paidOnlyActive,
    nodeSubtreeFilter,
    router,
    serviceLogNavOptions,
    vehicleId,
    highlightedServiceEventId,
  ]);

  useEffect(() => {
    if (!actionMessage) {
      return;
    }
    const timeoutId = setTimeout(() => {
      setActionMessage(null);
    }, 4500);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [actionMessage]);

  const effectiveFilters = useMemo(
    (): ServiceEventsFilters => ({
      ...filters,
      paidOnly: paidOnlyActive ? true : undefined,
    }),
    [filters, paidOnlyActive]
  );

  const hasAnyPaidInEvents = useMemo(
    () => filterPaidServiceEvents(events).length > 0,
    [events]
  );

  const load = useCallback(async () => {
      if (!vehicleId) {
        setError("Не удалось определить ID мотоцикла.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        setContextVehicleDetail(null);
        const endpoints = createMobileApiClient();
        const payload = await withAuthGuard(
          () =>
            Promise.all([
              endpoints.getServiceEvents(vehicleId),
              endpoints.getNodeTree(vehicleId),
              endpoints.getTopServiceNodes(),
              endpoints.getServiceNodes(),
              endpoints.getVehicleDetail(vehicleId),
            ]),
          () => router.replace("/login")
        );
        if (!payload) {
          return;
        }
        const [data, treeRes, topRes, catalogRes, vehicleRes] = payload;
        setEvents(data.serviceEvents ?? []);
        setServiceMeta(data.meta ?? null);
        setNodeTree(treeRes.nodeTree ?? []);
        setTopServiceNodes(topRes.nodes ?? []);
        setServiceCatalogNodes(catalogRes.nodes ?? []);
        const v = vehicleRes.vehicle;
        setVehicleDisplayName(
          v?.nickname?.trim() || (v ? `${v.brandName} ${v.modelFamilyName}`.trim() : "") || "Мотоцикл"
        );
        const rawVehicle = vehicleRes.vehicle as VehicleDetailApiRecord | null | undefined;
        setContextVehicleDetail(rawVehicle ? vehicleDetailFromApiRecord(rawVehicle) : null);
      } catch (err) {
        setError("Не удалось загрузить журнал обслуживания.");
      } finally {
        setIsLoading(false);
      }
    }, [router, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visibleGroups = useMemo(
    () =>
      buildServiceLogTimelineProps(
        events,
        effectiveFilters,
        {
          field: sortField,
          direction: sortDirection,
        },
        "compact",
        nodeSubtreeFilter?.nodeIds ?? null
      ).monthGroups,
    [events, effectiveFilters, sortField, sortDirection, nodeSubtreeFilter]
  );
  const wishlistItemIdsByServiceEventId = useMemo(() => {
    const byServiceEventId = new Map<string, string[]>();
    for (const event of events) {
      const ids = getWishlistItemIdsFromInstalledPartsJson(event.installedPartsJson);
      if (ids.length > 0) {
        byServiceEventId.set(event.id, ids);
      }
    }
    return byServiceEventId;
  }, [events]);
  const serviceEventById = useMemo(() => {
    const m = new Map<string, ServiceEventItem>();
    for (const ev of events) {
      m.set(ev.id, ev);
    }
    return m;
  }, [events]);
  const flatVisibleEntries = useMemo(
    () => visibleGroups.flatMap((group) => group.entries),
    [visibleGroups]
  );
  const detailSheetEntry = useMemo(
    () => flatVisibleEntries.find((entry) => entry.id === detailSheetEntryId) ?? null,
    [detailSheetEntryId, flatVisibleEntries]
  );
  const detailSheetEvent = useMemo(
    () => (detailSheetEntryId ? (serviceEventById.get(detailSheetEntryId) ?? null) : null),
    [detailSheetEntryId, serviceEventById]
  );
  const serviceLogHrefWithoutHighlight = useMemo(
    () => buildVehicleServiceLogHref(vehicleId, nodeSubtreeFilter, paidOnlyActive, serviceLogNavOptions),
    [vehicleId, nodeSubtreeFilter, paidOnlyActive, serviceLogNavOptions]
  );
  useEffect(() => {
    if (highlightedServiceEventId) {
      if (appliedServiceLogHighlightFromUrlRef.current !== highlightedServiceEventId) {
        appliedServiceLogHighlightFromUrlRef.current = highlightedServiceEventId;
        setSelectedEventId(highlightedServiceEventId);
      }
      return;
    }
    appliedServiceLogHighlightFromUrlRef.current = null;
    if (selectedEventId && !flatVisibleEntries.some((entry) => entry.id === selectedEventId)) {
      setSelectedEventId("");
    }
  }, [flatVisibleEntries, highlightedServiceEventId, selectedEventId]);
  useEffect(() => {
    if (!highlightedServiceEventId || visibleGroups.length === 0) {
      return;
    }
    const timeoutId = setTimeout(() => {
      const y = eventYByIdRef.current[highlightedServiceEventId];
      if (typeof y === "number") {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 90), animated: true });
      }
      const hasHighlightInUrl =
        typeof params.serviceEventId === "string" || typeof params.highlightServiceEventId === "string";
      if (hasHighlightInUrl) {
        router.replace(serviceLogHrefWithoutHighlight);
      }
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [
    highlightedServiceEventId,
    visibleGroups,
    params.serviceEventId,
    params.highlightServiceEventId,
    router,
    serviceLogHrefWithoutHighlight,
  ]);
  const hasActiveFilters = useMemo(
    () =>
      isServiceLogTimelineQueryActive(
        effectiveFilters,
        {
          field: sortField,
          direction: sortDirection,
        },
        nodeSubtreeFilter
      ),
    [effectiveFilters, sortField, sortDirection, nodeSubtreeFilter]
  );

  const updateFilter = (field: keyof ServiceEventsFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const resetFiltersAndSort = () => {
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
    });
    setSortField("eventDate");
    setSortDirection("desc");
    setPeriodModalOpen(false);
    setDatePickField(null);
    router.replace(buildVehicleServiceLogHref(vehicleId, null, false, serviceLogNavOptions));
  };

  const togglePaidOnlyFilter = () => {
    router.replace(
      buildVehicleServiceLogHref(vehicleId, nodeSubtreeFilter, !paidOnlyActive, serviceLogNavOptions)
    );
  };

  const closeDetailSheet = useCallback(() => {
    setDetailSheetEntryId("");
    setSelectedEventId("");
  }, []);

  const openEditServiceEvent = (eventId: string) => {
    closeDetailSheet();
    router.push(
      `/vehicles/${vehicleId}/service-events/new?source=service-log&eventId=${encodeURIComponent(eventId)}`
    );
  };

  const openRepeatServiceEvent = (eventId: string) => {
    closeDetailSheet();
    router.push(
      `/vehicles/${vehicleId}/service-events/new?source=service-log&repeatFrom=${encodeURIComponent(eventId)}`
    );
  };

  const openDeleteServiceEventConfirm = (eventId: string) => {
    const event = events.find((item) => item.id === eventId);
    if (!event || event.eventKind === "STATE_UPDATE") {
      return;
    }
    Alert.alert(
      "Удалить сервисное событие?",
      "Это может изменить статус узла и суммы расходов.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setError("");
                const endpoints = createMobileApiClient();
                const deleted = await withAuthGuard(
                  () => endpoints.deleteServiceEvent(vehicleId, eventId),
                  () => router.replace("/login")
                );
                if (!deleted) {
                  return;
                }
                closeDetailSheet();
                await load();
                setActionMessage({
                  tone: "success",
                  title: "Сервисное событие удалено",
                  details: "Статусы и расходы обновлены",
                });
              } catch (deleteError) {
                setError("Не удалось удалить сервисное событие.");
                setActionMessage({
                  tone: "error",
                  title: "Не удалось удалить сервисное событие",
                });
              }
            })();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={c.textPrimary} />
          <Text style={styles.stateText}>Загрузка журнала...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Ошибка загрузки</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (events.length === 0 && !(serviceMeta?.plan === "FREE" && (serviceMeta.hiddenCount ?? 0) > 0)) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.stateContainer}>
          <Text style={styles.emptyTitle}>Журнал пуст</Text>
          <Text style={styles.emptyText}>
            Сервисные записи появятся здесь после первого обслуживания.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <InternalScreenChrome
        crumbs={[
          { label: "Мой гараж", href: "/" },
          { label: vehicleDisplayName || "Мотоцикл", href: `/vehicles/${vehicleId}` },
          { label: "Журнал обслуживания" },
        ]}
        title="Журнал обслуживания"
        declutterMobile
        scrollOffsetY={headerScrollY}
        belowNavRow={
          contextVehicleDetail ? (
            <GarageVehicleContextPlaque
              vehicle={contextVehicleDetail}
              currentVehicleId={vehicleId}
              compactByDefault
            />
          ) : null
        }
        actions={
          <Pressable
            style={({ pressed }) => [styles.journalAddButton, pressed && styles.addButtonPressed]}
            onPress={() => router.push(`/vehicles/${vehicleId}/service-events/new`)}
          >
            <Text style={styles.addButtonText}>Добавить событие</Text>
          </Pressable>
        }
        onBack={() => {
          if (returnOrigin === "attention") {
            const q = new URLSearchParams({ returnFocus: "attention" });
            if (returnAttentionNodeId) {
              q.set("attentionNodeId", returnAttentionNodeId);
            }
            router.replace(`/vehicles/${vehicleId}?${q.toString()}`);
            return;
          }
          if (returnNodeId) {
            router.replace(`/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(returnNodeId)}`);
            return;
          }
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace(`/vehicles/${vehicleId}`);
        }}
      />
      <KeyboardAwareScrollScreen
        contentContainerStyle={styles.scrollContent}
        scrollViewRef={scrollRef}
        scrollViewProps={{
          onScroll: (event) => setHeaderScrollY(event.nativeEvent.contentOffset.y),
          scrollEventThrottle: 16,
        }}
      >
        {actionMessage ? (
          <View
            style={[
              styles.actionMessageCard,
              actionMessage.tone === "success"
                ? styles.actionMessageSuccess
                : styles.actionMessageError,
            ]}
          >
            <View style={styles.actionMessageBody}>
              <Text style={styles.actionMessageTitle}>{actionMessage.title}</Text>
              {actionMessage.details ? (
                <Text style={styles.actionMessageDetails}>{actionMessage.details}</Text>
              ) : null}
            </View>
            <Pressable onPress={() => setActionMessage(null)}>
              <Text style={styles.actionMessageDismiss}>Скрыть</Text>
            </Pressable>
          </View>
        ) : null}

        {serviceMeta?.plan === "FREE" ? (
          <View style={{ marginBottom: 10 }}>
            <SubscriptionLockBanner
              title="Ограничение тарифа Free"
              description={`Отображаются последние ${serviceMeta.visibleLimit ?? 10} сервисных событий.${serviceMeta.hiddenCount > 0 ? ` Ещё ${serviceMeta.hiddenCount} сохранены в истории.` : ""}`}
              requiredPlan="RIDER"
            />
          </View>
        ) : null}

        <View style={styles.filterCard}>
          <View style={styles.filterToolbarRow}>
            <View style={styles.filterSearchInner}>
              <MaterialIcons name="search" size={18} color={c.textMuted} style={styles.filterSearchIcon} />
              <TextInput
                value={filters.serviceType}
                onChangeText={(value) => updateFilter("serviceType", value)}
                placeholder="Поиск…"
                placeholderTextColor={c.textMuted}
                autoCapitalize="none"
                style={styles.filterSearchInputToolbar}
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.filterToolbarChip,
                pressed && styles.filterHeaderButtonPressed,
              ]}
              onPress={() => setNodePickerOpen(true)}
            >
              <View style={styles.filterToolbarChipTextCol}>
                <Text style={styles.filterToolbarChipMeta}>Узел</Text>
                <Text style={styles.filterToolbarChipVal} numberOfLines={1}>
                  {nodeSubtreeFilter ? nodeSubtreeFilter.displayLabel : "Все"}
                </Text>
              </View>
              <Text style={styles.filterToolbarChipChevron}>▾</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.filterToolbarChip,
                pressed && styles.filterHeaderButtonPressed,
              ]}
              onPress={() => {
                setDatePickField(null);
                setPeriodModalOpen(true);
              }}
            >
              <View style={styles.filterToolbarChipTextCol}>
                <Text style={styles.filterToolbarChipMeta}>Период</Text>
                <Text style={styles.filterToolbarChipVal} numberOfLines={1}>
                  {periodToolbarLabelRu(filters.dateFrom, filters.dateTo)}
                </Text>
              </View>
              <Text style={styles.filterToolbarChipChevron}>▾</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.filterResetToolbar,
                pressed && hasActiveFilters && styles.filterResetToolbarPressed,
                !hasActiveFilters && styles.filterResetToolbarDisabled,
              ]}
              onPress={resetFiltersAndSort}
              disabled={!hasActiveFilters}
            >
              <Text
                style={[
                  styles.filterResetToolbarText,
                  !hasActiveFilters && styles.filterResetToolbarTextDisabled,
                ]}
              >
                Сброс
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.filterHeaderButton,
              pressed && styles.filterHeaderButtonPressed,
            ]}
            onPress={() => setIsFiltersExpanded((prev) => !prev)}
          >
            <Text style={styles.filterTitle}>Фильтры и сортировка</Text>
            <Text style={styles.filterChevron}>{isFiltersExpanded ? "▾" : "▸"}</Text>
          </Pressable>

          {isFiltersExpanded ? (
            <>
              <View style={styles.filterRow}>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterLabel}>Пробег от, км</Text>
                  <TextInput
                    value={filters.odometerMin}
                    onChangeText={(value) => updateFilter("odometerMin", value)}
                    placeholder="от"
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterLabel}>Пробег до, км</Text>
                  <TextInput
                    value={filters.odometerMax}
                    onChangeText={(value) => updateFilter("odometerMax", value)}
                    placeholder="до"
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
              </View>
              <View style={styles.filterRow}>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterLabel}>Сумма от</Text>
                  <TextInput
                    value={filters.costMin}
                    onChangeText={(value) => updateFilter("costMin", value)}
                    placeholder="от"
                    keyboardType="decimal-pad"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterLabel}>Сумма до</Text>
                  <TextInput
                    value={filters.costMax}
                    onChangeText={(value) => updateFilter("costMax", value)}
                    placeholder="до"
                    keyboardType="decimal-pad"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
              </View>
              <Text style={styles.filterLabel}>Тип работы</Text>
              <View style={styles.chipsRow}>
                <Pressable
                  style={[styles.chip, !filters.actionType && styles.chipActive]}
                  onPress={() => updateFilter("actionType", "")}
                >
                  <Text style={[styles.chipText, !filters.actionType && styles.chipTextActive]}>Все</Text>
                </Pressable>
                {SERVICE_ACTION_TYPE_OPTIONS.map((opt) => {
                  const active = filters.actionType === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => updateFilter("actionType", opt.value)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.filterLabel}>Исполнитель</Text>
              <View style={styles.chipsRow}>
                {[
                  { value: "", label: "Все" },
                  { value: "SELF", label: getPerformerLabel("SELF") },
                  { value: "SERVICE", label: getPerformerLabel("SERVICE") },
                  { value: "OTHER", label: getPerformerLabel("OTHER") },
                ].map((opt) => {
                  const active = filters.performerKind === opt.value;
                  return (
                    <Pressable
                      key={opt.label}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => updateFilter("performerKind", opt.value)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.filterLabel}>Тип записи</Text>
              <View style={styles.chipsRow}>
                {[
                  { value: "", label: "Все" },
                  { value: "SERVICE", label: "Сервис" },
                  { value: "STATE_UPDATE", label: "Обновление состояния" },
                ].map((option) => {
                  const active = filters.eventKind === option.value;
                  return (
                    <Pressable
                      key={option.label}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => updateFilter("eventKind", option.value)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.filterLabel}>Расходы</Text>
              <View style={styles.chipsRow}>
                <Pressable
                  style={[styles.chip, paidOnlyActive && styles.chipActive]}
                  onPress={togglePaidOnlyFilter}
                >
                  <Text style={[styles.chipText, paidOnlyActive && styles.chipTextActive]}>
                    Только события с расходами
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.filterLabel}>Сортировка</Text>
              <View style={styles.chipsRow}>
                {[
                  { value: "eventDate" as ServiceEventsSortField, label: "Дата" },
                  { value: "eventKind" as ServiceEventsSortField, label: "Тип" },
                  { value: "serviceType" as ServiceEventsSortField, label: "Сервис" },
                  { value: "node" as ServiceEventsSortField, label: "Узел" },
                  { value: "odometer" as ServiceEventsSortField, label: "Пробег" },
                  { value: "engineHours" as ServiceEventsSortField, label: "Моточасы" },
                  { value: "cost" as ServiceEventsSortField, label: "Стоимость" },
                  { value: "comment" as ServiceEventsSortField, label: "Комментарий" },
                ].map((option) => {
                  const active = sortField === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setSortField(option.value)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.chipsRow}>
                {[
                  { value: "desc" as ServiceEventsSortDirection, label: "По убыванию" },
                  { value: "asc" as ServiceEventsSortDirection, label: "По возрастанию" },
                ].map((option) => {
                  const active = sortDirection === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setSortDirection(option.value)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>

        {visibleGroups.length === 0 ? (
          <View style={styles.filteredEmptyCard}>
            <Text style={styles.filteredEmptyTitle}>
              {paidOnlyActive && !hasAnyPaidInEvents
                ? "Расходов пока нет"
                : "Ничего не найдено"}
            </Text>
            <Text style={styles.filteredEmptyText}>
              {paidOnlyActive && !hasAnyPaidInEvents
                ? "Нет сервисных записей с суммой больше нуля и указанной валютой. Добавьте стоимость при создании события."
                : nodeSubtreeFilter
                  ? `Для узла «${nodeSubtreeFilter.displayLabel}» в журнале нет записей с учётом текущих фильтров. Сбросьте фильтр по узлу или измените условия.`
                  : "По текущим фильтрам нет записей. Измените условия или сбросьте фильтры."}
            </Text>
          </View>
        ) : null}

        {visibleGroups.map((group) => (
          <MonthGroup
            key={group.monthKey}
            group={group}
            highlightedServiceEventId={highlightedServiceEventId}
            selectedEventId={selectedEventId}
            serviceEventById={serviceEventById}
            onEventLayout={(entryId, y) => {
              eventYByIdRef.current[entryId] = y;
            }}
            onSelectEvent={(entryId) => {
              setSelectedEventId(entryId);
              setDetailSheetEntryId(entryId);
            }}
          />
        ))}
      </KeyboardAwareScrollScreen>

      <Modal
        visible={periodModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPeriodModalOpen(false);
          setDatePickField(null);
        }}
      >
        <View style={styles.periodModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setPeriodModalOpen(false);
              setDatePickField(null);
            }}
          />
          <View style={styles.periodModalCard}>
            <Text style={styles.periodModalTitle}>Период</Text>
            <View style={styles.periodPresetRow}>
              {(
                [
                  { k: "month" as const, label: "Этот месяц" },
                  { k: "quarter" as const, label: "90 дней" },
                  { k: "year" as const, label: "Год" },
                  { k: "all" as const, label: "Всё время" },
                ] as const
              ).map(({ k, label }) => (
                <Pressable
                  key={k}
                  style={({ pressed }) => [styles.periodPresetChip, pressed && styles.filterHeaderButtonPressed]}
                  onPress={() => {
                    applyPeriodPreset(k);
                    if (k === "all") {
                      setPeriodModalOpen(false);
                      setDatePickField(null);
                    }
                  }}
                >
                  <Text style={styles.periodPresetChipText}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [styles.periodDateLine, pressed && styles.filterHeaderButtonPressed]}
              onPress={() => setDatePickField("from")}
            >
              <Text style={styles.periodModalFieldLabel}>С даты</Text>
              <Text style={styles.periodDateValue}>{filters.dateFrom || "…"}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.periodDateLine, pressed && styles.filterHeaderButtonPressed]}
              onPress={() => setDatePickField("to")}
            >
              <Text style={styles.periodModalFieldLabel}>По дату</Text>
              <Text style={styles.periodDateValue}>{filters.dateTo || "…"}</Text>
            </Pressable>
            {datePickField ? (
              <View style={styles.periodPickerBlock}>
                <DateTimePicker
                  value={parseYmdToLocalDate(datePickField === "from" ? filters.dateFrom : filters.dateTo)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  {...(Platform.OS === "ios"
                    ? {
                        themeVariant: "dark" as const,
                        textColor: c.textPrimary,
                        accentColor: c.primaryAction,
                      }
                    : { accentColor: c.primaryAction })}
                  onChange={(ev, date) => {
                    if (Platform.OS === "android") {
                      setDatePickField(null);
                      if (ev.type === "dismissed") return;
                      if (date) {
                        updateFilter(
                          datePickField === "from" ? "dateFrom" : "dateTo",
                          localDateToYmd(date)
                        );
                      }
                      return;
                    }
                    if (date) {
                      updateFilter(
                        datePickField === "from" ? "dateFrom" : "dateTo",
                        localDateToYmd(date)
                      );
                    }
                  }}
                />
                {Platform.OS === "ios" ? (
                  <Pressable style={styles.periodIosDone} onPress={() => setDatePickField(null)}>
                    <Text style={styles.periodIosDoneText}>Готово</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <Pressable
              style={styles.periodCloseFooter}
              onPress={() => {
                setPeriodModalOpen(false);
                setDatePickField(null);
              }}
            >
              <Text style={styles.periodCloseFooterText}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <MobileNodePickerModal
        visible={nodePickerOpen}
        title="Узлы журнала"
        searchPlaceholder="Поиск по названию узла"
        options={leafRowsForNodePicker}
        topOptions={topLeafRowsForNodePicker}
        selectedIds={nodeSubtreeFilter?.nodeIds ?? []}
        onClose={() => setNodePickerOpen(false)}
        onSelect={() => {}}
        onConfirmSelection={(ids) => {
          applyNodePickerSelection(ids);
        }}
      />

      <MobileEventDetailSheet
        entry={detailSheetEntry}
        event={detailSheetEvent}
        originWishlistItemIds={
          detailSheetEntry ? (wishlistItemIdsByServiceEventId.get(detailSheetEntry.id) ?? []) : []
        }
        visible={Boolean(detailSheetEntry)}
        onClose={() => {
          setDetailSheetEntryId("");
          setSelectedEventId("");
        }}
        onOpenNodeInTree={(nodeId) => {
          closeDetailSheet();
          router.push(`/vehicles/${vehicleId}/nodes?nodeId=${encodeURIComponent(nodeId)}`);
        }}
        onOpenExpenses={(opts) => {
          if (!detailSheetEntry) return;
          closeDetailSheet();
          const ev = serviceEventById.get(detailSheetEntry.id) ?? null;
          router.push(buildExpensesHrefForServiceEvent(vehicleId, detailSheetEntry.id, ev, opts));
        }}
        onOpenParts={(opts) => {
          if (!detailSheetEntry) return;
          closeDetailSheet();
          router.push(buildPartsCartHrefFromServiceLog(vehicleId, detailSheetEntry.id, opts));
        }}
        onOpenWishlistOrigin={(wishlistItemId) => {
          closeDetailSheet();
          router.push(buildVehicleWishlistItemHighlightHref(vehicleId, wishlistItemId));
        }}
        onRepeat={() => (detailSheetEntry ? openRepeatServiceEvent(detailSheetEntry.id) : undefined)}
        onEdit={() => (detailSheetEntry ? openEditServiceEvent(detailSheetEntry.id) : undefined)}
        onDelete={() => (detailSheetEntry ? openDeleteServiceEventConfirm(detailSheetEntry.id) : undefined)}
      />
      <GarageBottomNav
        activeKey="journal"
        onOpenGarage={() => router.push("/garage")}
        onOpenNodes={() => router.push(`/vehicles/${vehicleId}/nodes`)}
        onOpenJournal={() => undefined}
        onOpenPicker={() => router.push(`/vehicles/${vehicleId}/wishlist`)}
        onOpenExpenses={() => router.push(`/vehicles/${vehicleId}/expenses`)}
        onOpenProfile={() => router.push("/profile")}
        hasVehicleContext
        currentVehicleId={vehicleId}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    color: c.textSecondary,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
    textAlign: "center",
  },
  errorText: {
    marginTop: 8,
    color: c.error,
    textAlign: "center",
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: c.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  journalAddButton: {
    backgroundColor: c.primaryAction,
    borderRadius: 10,
    minHeight: 34,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonPressed: {
    opacity: 0.9,
  },
  addButtonText: {
    color: c.onPrimaryAction,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  actionMessageCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  actionMessageSuccess: {
    borderColor: c.successBorder,
    backgroundColor: c.successSurface,
  },
  actionMessageError: {
    borderColor: c.errorBorder,
    backgroundColor: c.errorSurface,
  },
  actionMessageBody: {
    flex: 1,
  },
  actionMessageTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
  },
  actionMessageDetails: {
    marginTop: 2,
    fontSize: 12,
    color: c.textSecondary,
  },
  actionMessageDismiss: {
    fontSize: 12,
    fontWeight: "600",
    color: c.textSecondary,
    textDecorationLine: "underline",
  },
  expenseInlineCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    backgroundColor: c.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  expenseInlineTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
  },
  expenseInlineHint: {
    marginTop: 4,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 17,
  },
  expensePeriodRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 6,
  },
  expenseMonthArrow: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 8,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.card,
  },
  expenseMonthArrowText: {
    fontSize: 18,
    color: c.textSecondary,
    lineHeight: 18,
  },
  expensePeriodLabel: {
    fontSize: 12,
    color: c.textPrimary,
    fontWeight: "600",
  },
  expenseMonthPickerListCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    backgroundColor: c.card,
    overflow: "hidden",
    position: "relative",
  },
  expenseMonthPickerCenterMarker: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 70,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardMuted,
    pointerEvents: "none",
    zIndex: 1,
  },
  expenseMonthPickerList: {
    maxHeight: 180,
  },
  expenseMonthPickerListContent: {
    paddingVertical: 70,
  },
  expenseMonthPickerItem: {
    paddingHorizontal: 10,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  expenseMonthPickerItemActive: {
    backgroundColor: c.cardSubtle,
  },
  expenseMonthPickerItemText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  expenseMonthPickerItemTextActive: {
    color: c.textPrimary,
    fontWeight: "700",
  },
  expenseTotalBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardSubtle,
    padding: 10,
    gap: 3,
  },
  expenseTotalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
  },
  expenseSectionRowActive: {
    borderColor: c.textPrimary,
    backgroundColor: c.cardSubtle,
  },
  expenseClearSectionText: {
    fontSize: 12,
    color: c.textSecondary,
    textDecorationLine: "underline",
  },
  expenseAllInJournalText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: c.textSecondary,
    textDecorationLine: "underline",
  },
  nodeFilterBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  nodeFilterBannerText: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
  },
  nodeFilterBannerStrong: {
    fontWeight: "700",
    color: c.textPrimary,
  },
  paidFilterBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardMuted,
  },
  paidFilterBannerText: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
  },
  paidFilterBannerStrong: {
    fontWeight: "700",
    color: c.textPrimary,
  },
  nodeFilterClearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.canvas,
  },
  nodeFilterClearButtonPressed: {
    opacity: 0.92,
  },
  nodeFilterClearButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: c.textPrimary,
  },
  filterCard: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  filterToolbarRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
  },
  filterSearchInner: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: c.cardMuted,
  },
  filterSearchIcon: {
    flexShrink: 0,
  },
  filterSearchInputToolbar: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: c.textPrimary,
    paddingVertical: 4,
  },
  filterToolbarChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 108,
    minWidth: 76,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: c.cardMuted,
  },
  filterToolbarChipTextCol: {
    flex: 1,
    minWidth: 0,
  },
  filterToolbarChipMeta: {
    fontSize: 9,
    fontWeight: "800",
    color: c.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  filterToolbarChipVal: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textPrimary,
    marginTop: 1,
  },
  filterToolbarChipChevron: {
    fontSize: 10,
    color: c.textMuted,
    flexShrink: 0,
    alignSelf: "center",
  },
  filterResetToolbar: {
    flexShrink: 0,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardMuted,
  },
  filterResetToolbarPressed: {
    opacity: 0.88,
  },
  filterResetToolbarDisabled: {
    opacity: 0.42,
  },
  filterResetToolbarText: {
    fontSize: 12,
    fontWeight: "800",
    color: c.textSecondary,
  },
  filterResetToolbarTextDisabled: {
    color: c.textMuted,
  },
  periodModalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: c.overlayModal,
  },
  periodModalCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 16,
    gap: 12,
  },
  periodModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: c.textPrimary,
  },
  periodPresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  periodPresetChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardMuted,
  },
  periodPresetChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: c.textPrimary,
  },
  periodDateLine: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: c.cardMuted,
  },
  periodModalFieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: c.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.35,
    marginBottom: 2,
  },
  periodDateValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "700",
    color: c.textPrimary,
  },
  periodPickerBlock: {
    marginTop: 4,
  },
  periodIosDone: {
    marginTop: 8,
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: c.primaryAction,
  },
  periodIosDoneText: {
    fontSize: 14,
    fontWeight: "700",
    color: c.onPrimaryAction,
  },
  periodCloseFooter: {
    marginTop: 4,
    paddingVertical: 10,
    alignItems: "center",
  },
  periodCloseFooterText: {
    fontSize: 14,
    fontWeight: "600",
    color: c.textSecondary,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
  },
  filterHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 2,
  },
  filterHeaderButtonPressed: {
    opacity: 0.92,
  },
  filterChevron: {
    fontSize: 16,
    color: c.textMuted,
    width: 16,
    textAlign: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  filterHalf: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 11,
    color: c.textMuted,
    marginBottom: 5,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: c.textPrimary,
    backgroundColor: c.card,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  chipActive: {
    borderColor: c.primaryAction,
    backgroundColor: c.primaryAction,
  },
  chipText: {
    fontSize: 12,
    color: c.textSecondary,
    fontWeight: "500",
  },
  chipTextActive: {
    color: c.onPrimaryAction,
    fontWeight: "600",
  },
  resetButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: c.card,
  },
  resetButtonPressed: {
    backgroundColor: c.cardSubtle,
  },
  resetButtonDisabled: {
    opacity: 0.5,
  },
  resetButtonText: {
    fontSize: 12,
    color: c.textMeta,
    fontWeight: "600",
  },
  filteredEmptyCard: {
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: c.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  filteredEmptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
  },
  filteredEmptyText: {
    marginTop: 4,
    fontSize: 13,
    color: c.textMuted,
    lineHeight: 18,
  },

  // Month group
  monthGroup: {
    marginBottom: 22,
  },
  monthHeaderCard: {
    borderColor: c.border,
    borderWidth: 1,
    backgroundColor: c.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: c.textPrimary,
    textTransform: "capitalize",
  },
  monthSummaryRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  monthSummaryChip: {
    borderRadius: 999,
    borderColor: c.border,
    borderWidth: 1,
    backgroundColor: c.chipBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  monthSummaryChipText: {
    fontSize: 11,
    color: c.textSecondary,
    fontWeight: "600",
  },

  timelineList: {
    gap: 8,
  },
  timelineItem: {
    width: "100%",
  },
  timelineRail: {
    width: 22,
    alignItems: "center",
    paddingTop: 10,
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: c.border,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2,
  },
  timelineDotService: {
    borderColor: c.timelineServiceBorder,
    backgroundColor: c.timelineServiceFill,
  },
  timelineDotState: {
    borderColor: c.timelineStateBorder,
    backgroundColor: c.timelineStateFill,
  },
  timelineContent: {
    flex: 1,
  },

  journalRowPressable: {
    width: "100%",
    paddingVertical: 1,
  },
  journalRowOuter: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    width: "100%",
  },
  journalDateCol: {
    flexShrink: 0,
    justifyContent: "center",
    gap: 1,
    paddingRight: 2,
    minWidth: 44,
    maxWidth: 56,
  },
  journalDateDay: {
    fontSize: 12,
    fontWeight: "600",
    color: c.textPrimary,
    lineHeight: 15,
  },
  journalDateYear: {
    fontSize: 11,
    fontWeight: "600",
    color: c.textPrimary,
    lineHeight: 14,
  },
  journalDateOdo: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "400",
    color: c.textSecondary,
    lineHeight: 13,
  },
  journalRailWrap: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    position: "relative",
  },
  journalRailLine: {
    position: "absolute",
    left: "50%",
    marginLeft: -1,
    width: 2,
    borderRadius: 1,
  },
  journalDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  journalDotHighlightRing: {
    shadowColor: c.primaryAction,
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  journalCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    backgroundColor: "rgba(255,255,255,0.032)",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  journalCardSelected: {
    borderColor: `${c.primaryAction}55`,
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  journalCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "nowrap",
  },
  journalTitleBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  journalTypeIcon: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  journalTitleTexts: {
    flex: 1,
    minWidth: 0,
  },
  journalMainTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
    letterSpacing: -0.1,
  },
  journalMainTitleState: {
    fontWeight: "500",
    color: c.textMeta,
  },
  journalSubtitle: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "400",
    color: c.textSecondary,
    lineHeight: 14,
  },
  journalCost: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
    letterSpacing: -0.1,
    flexShrink: 0,
    marginLeft: 6,
  },

  // Event card base
  eventCard: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginBottom: 0,
  },
  compactEventCard: {
    paddingVertical: 10,
  },
  eventCardExpanded: {
    borderColor: c.primaryAction,
    backgroundColor: c.cardSubtle,
  },
  cardPressed: {
    opacity: 0.92,
  },
  eventCardHighlighted: {
    borderColor: c.primaryAction,
    shadowColor: c.primaryAction,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  serviceCard: {
    shadowColor: c.shadow,
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  stateUpdateCard: {
    backgroundColor: c.cardMuted,
    borderColor: c.border,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
  },
  compactMain: {
    flex: 1,
    minWidth: 0,
  },
  compactTopLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  compactDotService: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: c.timelineServiceBorder,
    backgroundColor: c.timelineServiceFill,
  },
  compactDotState: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: c.timelineStateBorder,
    backgroundColor: c.timelineStateFill,
  },
  compactDate: {
    fontSize: 11,
    color: c.textMeta,
    fontWeight: "600",
  },
  compactBadge: {
    borderWidth: 1,
    borderColor: c.indigoSoftBorder,
    borderRadius: 999,
    backgroundColor: c.serviceBadgeBg,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  compactBadgeMuted: {
    borderColor: c.borderStrong,
    backgroundColor: c.divider,
  },
  compactBadgeText: {
    fontSize: 9,
    color: c.serviceBadgeText,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  compactBadgeTextMuted: {
    color: c.textMuted,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: c.textPrimary,
  },
  compactMeta: {
    marginTop: 2,
    fontSize: 12,
    color: c.textSecondary,
  },
  compactTrailing: {
    maxWidth: 98,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  compactCost: {
    fontSize: 11,
    fontWeight: "800",
    color: c.successStrong,
    marginBottom: 2,
  },
  expandedDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },

  // Kind badge
  eventKindBadge: {
    alignSelf: "flex-start",
    backgroundColor: c.serviceBadgeBg,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 6,
  },
  stateUpdateBadge: {
    backgroundColor: c.divider,
  },
  eventKindText: {
    fontSize: 11,
    fontWeight: "700",
    color: c.serviceBadgeText,
  },
  stateUpdateBadgeText: {
    color: c.textMuted,
  },

  // Event content
  eventTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: c.textPrimary,
    lineHeight: 20,
    paddingRight: 6,
  },
  wishlistOriginLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: c.textMuted,
  },
  wishlistOriginLink: {
    textDecorationLine: "underline",
    color: c.textSecondary,
  },
  wishlistOriginRow: {
    marginTop: 2,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  wishlistOriginLinksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  partDetails: {
    marginTop: 6,
    gap: 4,
  },
  partDetailLine: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 16,
  },
  partDetailLabel: {
    fontWeight: "600",
    color: c.textMuted,
  },
  bundleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  bundleModeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.indigoSoftBorder,
    backgroundColor: c.serviceBadgeBg,
  },
  bundleModeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: c.serviceBadgeText,
    textTransform: "uppercase",
  },
  bundleNodeCount: {
    fontSize: 11,
    fontWeight: "600",
    color: c.textMuted,
  },
  bundleChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  bundleChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
  },
  bundleChipText: {
    fontSize: 11,
    color: c.textSecondary,
  },
  bundleItemsList: {
    marginTop: 6,
    gap: 3,
  },
  bundleItemLine: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 17,
  },
  bundleItemAction: {
    fontWeight: "700",
    color: c.textPrimary,
  },
  bundleItemMuted: {
    color: c.textMuted,
  },
  bundleCostsRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  bundleCostMuted: {
    fontSize: 12,
    color: c.textSecondary,
  },
  stateUpdateMainTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: c.textMeta,
  },
  stateUpdateSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 16,
  },
  stateUpdateLines: {
    marginTop: 4,
    gap: 2,
  },
  eventNode: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "600",
    color: c.textMuted,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  eventMetaText: {
    fontSize: 12,
    color: c.textTertiary,
  },
  eventMetaDot: {
    fontSize: 12,
    color: c.borderStrong,
  },
  commentBlock: {
    marginTop: 6,
  },
  eventComment: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },
  stateUpdateComment: {
    color: c.textMuted,
  },
  commentToggle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: c.textSecondary,
    textDecorationLine: "underline",
  },
  commentToggleMuted: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: c.textMuted,
    textDecorationLine: "underline",
  },
  eventCost: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "600",
    color: c.successStrong,
  },
  serviceCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  rowActionsTop: {
    flexDirection: "row",
    gap: 8,
    flexShrink: 0,
  },
  rowActionsExpanded: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  detailsButton: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.primaryAction,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: "auto",
  },
  detailsButtonText: {
    color: c.primaryAction,
    fontSize: 12,
    fontWeight: "800",
  },
  detailSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: c.overlayModal,
  },
  detailSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  detailSheet: {
    maxHeight: "90%",
    minHeight: "82%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    overflow: "hidden",
  },
  detailSheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: c.borderStrong,
    marginTop: 8,
    marginBottom: 8,
  },
  detailSheetHeader: {
    flexDirection: "column",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  detailSheetHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  detailSheetHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  detailSheetCloseBtn: {
    padding: 4,
    marginTop: -2,
  },
  detailStatusBadgeWrap: {
    flexDirection: "row",
  },
  detailStatusBadge: {
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  detailStatusBadgeMuted: {
    backgroundColor: c.cardMuted,
    borderColor: c.border,
  },
  detailStatusBadgeOk: {
    backgroundColor: "rgba(34,197,94,0.14)",
    borderColor: "rgba(34,197,94,0.3)",
  },
  detailStatusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  detailStatusBadgeTextMuted: {
    color: c.textTertiary,
  },
  detailStatusBadgeTextOk: {
    color: c.successStrong,
  },
  detailSheetKicker: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  detailSheetTitle: {
    marginTop: 0,
    fontSize: 18,
    lineHeight: 23,
    color: c.textPrimary,
    fontWeight: "800",
  },
  detailSheetSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: c.textSecondary,
  },
  detailSheetBody: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  detailSheetSection: {
    gap: 8,
    paddingTop: 2,
  },
  detailNodeChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  detailNodeChip: {
    maxWidth: "100%",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
  },
  detailNodeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: c.textPrimary,
  },
  detailModeTitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
  },
  detailModeHint: {
    marginTop: 4,
    fontSize: 11,
    color: c.textTertiary,
    lineHeight: 16,
  },
  detailReminderText: {
    marginTop: 2,
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 20,
  },
  detailBundleCommentCard: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: c.cardMuted,
    borderWidth: 1,
    borderColor: c.border,
  },
  detailBundleCommentTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textPrimary,
  },
  detailBundleCommentNode: {
    fontWeight: "500",
    color: c.textTertiary,
  },
  detailBundleCommentBody: {
    marginTop: 4,
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 18,
  },
  detailCostArticlesLink: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: c.primaryAction,
    textDecorationLine: "underline",
  },
  detailInstalledHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  detailInstalledCount: {
    fontSize: 11,
    color: c.textTertiary,
  },
  sheetInstalledPartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    marginBottom: 6,
  },
  sheetInstalledPartRowDisabled: {
    opacity: 0.85,
  },
  sheetInstalledPartThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetInstalledPartMain: {
    flex: 1,
    minWidth: 0,
  },
  sheetInstalledPartTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
  },
  sheetInstalledPartMeta: {
    marginTop: 2,
    fontSize: 11,
    color: c.textTertiary,
  },
  sheetInstalledPartCost: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textTertiary,
    flexShrink: 0,
  },
  sheetInstalledPartCostAccent: {
    color: c.successStrong,
  },
  detailPerformerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 4,
  },
  detailPerformerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: c.cardMuted,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  detailPerformerTexts: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  detailPerformerMain: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },
  detailPerformerNote: {
    fontSize: 12,
    color: c.textTertiary,
  },
  detailPerformerService: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 18,
  },
  detailInstallLocationBlock: {
    gap: 6,
    marginTop: 2,
  },
  detailMapLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
  },
  detailMapLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: c.primaryAction,
  },
  detailOriginRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  detailOriginLink: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
  },
  detailOriginLinkText: {
    fontSize: 11,
    fontWeight: "600",
    color: c.textSecondary,
    textDecorationLine: "underline",
  },
  detailExpensesTotalLink: {
    fontSize: 11,
    fontWeight: "700",
    color: c.primaryAction,
    textDecorationLine: "underline",
  },
  detailExpenseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  detailExpenseTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "500",
    color: c.textSecondary,
    lineHeight: 15,
  },
  detailExpenseAmount: {
    fontSize: 11,
    fontWeight: "700",
    color: c.textPrimary,
    textDecorationLine: "underline",
    textDecorationColor: "rgba(148,163,184,0.35)",
  },
  detailMetricsGrid: {
    gap: 8,
  },
  detailMetricsRow3: {
    flexDirection: "row",
    gap: 8,
    alignItems: "stretch",
  },
  detailMetricCellThird: {
    flex: 1,
    minWidth: 0,
  },
  detailMetricCostRow: {
    alignSelf: "stretch",
    width: "100%",
  },
  detailMetricFill: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
  },
  detailMetric: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 10,
  },
  detailMetricAccent: {
    borderColor: c.primaryAction,
    backgroundColor: c.cardSubtle,
  },
  detailMetricLabel: {
    fontSize: 10,
    color: c.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailMetricValue: {
    marginTop: 4,
    fontSize: 12,
    color: c.textPrimary,
    fontWeight: "800",
  },
  detailMetricValueAccent: {
    color: c.primaryAction,
  },
  detailSection: {
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailPartRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.cardMuted,
    padding: 10,
  },
  detailPartThumb: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  detailPartMain: {
    flex: 1,
    minWidth: 0,
  },
  detailPartTitle: {
    fontSize: 13,
    color: c.textPrimary,
    fontWeight: "800",
  },
  detailPartMeta: {
    marginTop: 3,
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 17,
  },
  detailPartCost: {
    maxWidth: 74,
    fontSize: 12,
    color: c.successStrong,
    fontWeight: "800",
    textAlign: "right",
  },
  detailMuted: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
  },
  detailComment: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 20,
  },
  detailSheetActions: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.card,
  },
  detailAction: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  detailActionDanger: {
    borderColor: c.errorBorder,
  },
  detailActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: c.textPrimary,
  },
  detailActionTextDanger: {
    color: c.error,
  },
  expenseModalOverlay: {
    flex: 1,
    backgroundColor: c.overlayModal,
    justifyContent: "center",
    padding: 16,
  },
  expenseModalCard: {
    maxHeight: "80%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 12,
  },
  expenseModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  expenseModalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
  },
  expenseModalClose: {
    fontSize: 13,
    color: c.textMeta,
    fontWeight: "600",
  },
  expenseModalHint: {
    marginTop: 6,
    fontSize: 12,
    color: c.textMuted,
  },
  expenseModalMuted: {
    marginTop: 10,
    fontSize: 12,
    color: c.textMuted,
  },
  expenseModalError: {
    marginTop: 10,
    fontSize: 12,
    color: c.error,
  },
  expenseModalEmptyBox: {
    marginTop: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.border,
    borderRadius: 10,
    backgroundColor: c.cardMuted,
    padding: 12,
  },
  expenseModalEmptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
  },
  expenseModalEmptyText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
  },
  expenseModalBody: {
    marginTop: 10,
    paddingBottom: 4,
    gap: 10,
  },
  expenseModalStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseModalStatLabel: {
    fontSize: 12,
    color: c.textMuted,
  },
  expenseModalStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
  },
  expenseModalLatestBlock: {
    gap: 3,
  },
  expenseModalLatestMain: {
    fontSize: 13,
    color: c.textPrimary,
    fontWeight: "600",
  },
  expenseModalLatestMeta: {
    fontSize: 12,
    color: c.textSecondary,
  },
  expenseModalSubheading: {
    marginTop: 2,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: c.textMuted,
    fontWeight: "700",
  },
  expenseModalCurrencyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  expenseModalCurrencyCode: {
    fontSize: 13,
    color: c.textPrimary,
  },
  expenseModalCurrencyAmount: {
    fontSize: 13,
    color: c.textPrimary,
    fontWeight: "600",
  },
  expenseModalCurrencyCount: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: "400",
  },
  expenseModalMonthBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 10,
    gap: 4,
  },
  expenseModalMonthTitle: {
    fontSize: 12,
    color: c.textSecondary,
    fontWeight: "600",
  },
});
