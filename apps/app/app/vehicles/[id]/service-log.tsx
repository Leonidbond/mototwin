import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import type {
  NodeTreeItem,
  ServiceEventItem,
  ServiceEventsFilters,
  ServiceEventsSortDirection,
  ServiceEventsSortField,
  ServiceLogEntryViewModel,
  ServiceLogMonthGroupViewModel,
  ServiceLogNodeFilter,
} from "@mototwin/types";
import {
  buildExpenseSummaryFromServiceEvents,
  buildServiceLogTimelineProps,
  filterPaidServiceEvents,
  filterPaidServiceExpenseEvents,
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
  SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../../../src/api-base-url";
import { KeyboardAwareScrollScreen } from "../../components/keyboard-aware-scroll-screen";
import { ScreenHeader } from "../../components/screen-header";
import { ActionIconButton } from "../../components/action-icon-button";

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
  options?: { expandExpenses?: boolean; month?: string }
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
  return `/vehicles/${vehicleId}/service-log${q.length ? `?${q.join("&")}` : ""}`;
}

// ─── Event cards ──────────────────────────────────────────────────────────────

function ServiceCard({
  entry,
  isCommentExpanded,
  onToggleComment,
  onEdit,
  onDelete,
}: {
  entry: ServiceLogEntryViewModel;
  isCommentExpanded: boolean;
  onToggleComment: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const comment = entry.comment;
  const commentLong =
    comment != null && comment.length > SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS;

  return (
    <View style={[styles.eventCard, styles.serviceCard]}>
      <View style={styles.eventKindBadge}>
        <Text style={styles.eventKindText}>
          {getServiceLogEventKindBadgeLabel(entry.eventKind)}
        </Text>
      </View>
      <View style={styles.serviceCardHeaderRow}>
        <Text style={styles.eventTitle}>{entry.mainTitle}</Text>
        <View style={styles.rowActionsTop}>
          <ActionIconButton
            onPress={onEdit}
            accessibilityLabel="Редактировать сервисное событие"
            variant="subtle"
            icon={<MaterialIcons name="edit" size={15} color={c.textSecondary} />}
          />
          <ActionIconButton
            onPress={onDelete}
            accessibilityLabel="Удалить сервисное событие"
            variant="danger"
            icon={<MaterialIcons name="delete-outline" size={15} color={c.error} />}
          />
        </View>
      </View>
      {entry.wishlistOriginLabelRu ? (
        <Text style={styles.wishlistOriginLabel}>{entry.wishlistOriginLabelRu}</Text>
      ) : null}
      <Text style={styles.eventNode}>{entry.secondaryTitle}</Text>
      <View style={styles.eventMeta}>
        <Text style={styles.eventMetaText}>{entry.dateLabel}</Text>
        <Text style={styles.eventMetaDot}>·</Text>
        <Text style={styles.eventMetaText}>{entry.compactMetricsLine}</Text>
      </View>
      {comment ? (
        <View style={styles.commentBlock}>
          <Text style={styles.eventComment}>
            {isCommentExpanded || !commentLong
              ? comment
              : `${comment.slice(0, SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS)}...`}
          </Text>
          {commentLong ? (
            <Pressable onPress={onToggleComment} hitSlop={6}>
              <Text style={styles.commentToggle}>
                {isCommentExpanded ? "Скрыть" : "Показать"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {entry.costAmount != null && entry.costCurrency ? (
        <Text style={styles.eventCost}>
          {entry.costAmount.toLocaleString("ru-RU")} {entry.costCurrency}
        </Text>
      ) : null}
    </View>
  );
}

function StateUpdateCard({
  entry,
  isCommentExpanded,
  onToggleComment,
}: {
  entry: ServiceLogEntryViewModel;
  isCommentExpanded: boolean;
  onToggleComment: () => void;
}) {
  const comment = entry.comment;
  const commentLong =
    comment != null && comment.length > SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS;

  return (
    <View style={[styles.eventCard, styles.stateUpdateCard]}>
      <View style={[styles.eventKindBadge, styles.stateUpdateBadge]}>
        <Text style={[styles.eventKindText, styles.stateUpdateBadgeText]}>
          {getServiceLogEventKindBadgeLabel(entry.eventKind)}
        </Text>
      </View>
      <Text style={[styles.eventTitle, styles.stateUpdateMainTitle]}>{entry.mainTitle}</Text>
      {entry.stateUpdateLines.length > 0 ? (
        <View style={styles.stateUpdateLines}>
          {entry.stateUpdateLines.map((line) => (
            <Text key={`${entry.id}.${line}`} style={styles.stateUpdateSubtitle}>
              {line}
            </Text>
          ))}
        </View>
      ) : entry.stateUpdateSubtitle ? (
        <Text style={styles.stateUpdateSubtitle}>{entry.stateUpdateSubtitle}</Text>
      ) : null}
      <View style={styles.eventMeta}>
        <Text style={styles.eventMetaText}>{entry.dateLabel}</Text>
        <Text style={styles.eventMetaDot}>·</Text>
        <Text style={styles.eventMetaText}>{entry.compactMetricsLine}</Text>
      </View>
      {comment ? (
        <View style={styles.commentBlock}>
          <Text style={[styles.eventComment, styles.stateUpdateComment]}>
            {isCommentExpanded || !commentLong
              ? comment
              : `${comment.slice(0, SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS)}...`}
          </Text>
          {commentLong ? (
            <Pressable onPress={onToggleComment} hitSlop={6}>
              <Text style={styles.commentToggleMuted}>
                {isCommentExpanded ? "Скрыть" : "Показать"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ─── Month group ──────────────────────────────────────────────────────────────

function MonthGroup({
  group,
  expandedComments,
  onToggleComment,
  onEditServiceEvent,
  onDeleteServiceEvent,
}: {
  group: ServiceLogMonthGroupViewModel;
  expandedComments: Record<string, boolean>;
  onToggleComment: (entryId: string) => void;
  onEditServiceEvent: (entryId: string) => void;
  onDeleteServiceEvent: (entryId: string) => void;
}) {
  const hasServiceCount = group.summary.serviceCount > 0;
  const hasStateUpdates = group.summary.stateUpdateCount > 0;
  const hasCost = Boolean(group.summary.costLabel);

  return (
    <View style={styles.monthGroup}>
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
      <View style={styles.timelineList}>
        {group.entries.map((entry) => {
          const isStateUpdate = entry.eventKind === "STATE_UPDATE";
          return (
            <View key={entry.id} style={styles.timelineItem}>
              <View style={styles.timelineRail}>
                <View style={styles.timelineLine} />
                <View
                  style={[
                    styles.timelineDot,
                    isStateUpdate ? styles.timelineDotState : styles.timelineDotService,
                  ]}
                />
              </View>
              <View style={styles.timelineContent}>
                {isStateUpdate ? (
                  <StateUpdateCard
                    entry={entry}
                    isCommentExpanded={Boolean(expandedComments[entry.id])}
                    onToggleComment={() => onToggleComment(entry.id)}
                  />
                ) : (
                  <ServiceCard
                    entry={entry}
                    isCommentExpanded={Boolean(expandedComments[entry.id])}
                    onToggleComment={() => onToggleComment(entry.id)}
                    onEdit={() => onEditServiceEvent(entry.id)}
                    onDelete={() => onDeleteServiceEvent(entry.id)}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
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
  }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";

  const [events, setEvents] = useState<ServiceEventItem[]>([]);
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ServiceEventsFilters>({
    dateFrom: "",
    dateTo: "",
    eventKind: "",
    serviceType: "",
    node: "",
  });
  const [sortField, setSortField] = useState<ServiceEventsSortField>("eventDate");
  const [sortDirection, setSortDirection] = useState<ServiceEventsSortDirection>("desc");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [isExpenseExpanded, setIsExpenseExpanded] = useState(false);
  const [isExpenseMonthPickerOpen, setIsExpenseMonthPickerOpen] = useState(false);
  const expenseMonthWheelRef = useRef<ScrollView | null>(null);
  const [expenseMonthKey, setExpenseMonthKey] = useState<string>(getCurrentExpenseMonthKey());
  const [expenseSectionFilter, setExpenseSectionFilter] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    tone: "success" | "error";
    title: string;
    details?: string;
  } | null>(null);

  const apiBaseUrl = getApiBaseUrl();

  const nodeSubtreeFilter = useMemo(
    () => parseServiceLogNodeFilterFromParams(params.nodeIds, params.nodeLabel),
    [params.nodeIds, params.nodeLabel]
  );

  const paidOnlyActive = useMemo(
    () => parsePaidOnlyFromParams(params.paidOnly),
    [params.paidOnly]
  );
  const expandExpensesActive = useMemo(
    () => parsePaidOnlyFromParams(params.expandExpenses),
    [params.expandExpenses]
  );
  const monthFromParams = useMemo(
    () => readSearchParam(params.month),
    [params.month]
  );

  useEffect(() => {
    if (expandExpensesActive) {
      setIsExpenseExpanded(true);
    }
  }, [expandExpensesActive]);

  useEffect(() => {
    const raw = (monthFromParams ?? "").toLowerCase();
    if (/^\d{4}-\d{2}$/.test(raw)) {
      setExpenseMonthKey(raw);
    }
  }, [monthFromParams]);

  useEffect(() => {
    const range = getExpenseMonthDateRange(expenseMonthKey);
    const inclusiveTo = new Date(`${range.dateTo}T00:00:00.000Z`);
    inclusiveTo.setUTCDate(inclusiveTo.getUTCDate() - 1);
    setFilters((prev) => ({
      ...prev,
      dateFrom: range.dateFrom,
      dateTo: inclusiveTo.toISOString().slice(0, 10),
      paidOnly: true,
    }));
  }, [expenseMonthKey]);

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
    router.replace(buildVehicleServiceLogHref(vehicleId, nodeSubtreeFilter, paidOnlyActive));
  }, [params.feedback, paidOnlyActive, nodeSubtreeFilter, router, vehicleId]);

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
      paidOnly: paidOnlyActive || isExpenseExpanded ? true : undefined,
    }),
    [filters, paidOnlyActive, isExpenseExpanded]
  );

  const hasAnyPaidInEvents = useMemo(
    () => filterPaidServiceEvents(events).length > 0,
    [events]
  );
  const topLevelNodes = useMemo(() => getTopLevelNodeTreeItems(nodeTree), [nodeTree]);
  const expenseSectionNodeIds = useMemo(() => {
    if (!expenseSectionFilter) {
      return null;
    }
    const section = topLevelNodes.find((node) => node.id === expenseSectionFilter);
    if (!section) {
      return null;
    }
    return getNodeAndDescendantIds(section);
  }, [expenseSectionFilter, topLevelNodes]);

  const load = useCallback(async () => {
      if (!vehicleId) {
        setError("Не удалось определить ID мотоцикла.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const client = createApiClient({ baseUrl: apiBaseUrl });
        const endpoints = createMotoTwinEndpoints(client);
        const [data, tree] = await Promise.all([
          endpoints.getServiceEvents(vehicleId),
          endpoints.getNodeTree(vehicleId),
        ]);
        setEvents(data.serviceEvents ?? []);
        setNodeTree(tree.nodeTree ?? []);
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить журнал обслуживания.");
      } finally {
        setIsLoading(false);
      }
    }, [apiBaseUrl, vehicleId]);

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
        expenseSectionNodeIds ?? nodeSubtreeFilter?.nodeIds ?? null
      ).monthGroups,
    [events, effectiveFilters, sortField, sortDirection, nodeSubtreeFilter, expenseSectionNodeIds]
  );
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

  const paidEventsForDashboard = useMemo(() => {
    const ids = new Set(visibleGroups.flatMap((group) => group.entries.map((entry) => entry.id)));
    return filterPaidServiceExpenseEvents(events.filter((event) => ids.has(event.id))).sort(
      (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
    );
  }, [events, visibleGroups]);
  const dashboardSummary = useMemo(
    () => buildExpenseSummaryFromServiceEvents(paidEventsForDashboard),
    [paidEventsForDashboard]
  );
  const sectionBreakdown = useMemo(() => {
    const topLevelById = new Map(topLevelNodes.map((node) => [node.id, node]));
    const bySection = new Map<string, { sectionId: string | null; label: string; amount: number; currency: string }>();
    for (const event of paidEventsForDashboard) {
      const topLevel =
        event.node?.topLevelNodeId && topLevelById.has(event.node.topLevelNodeId)
          ? topLevelById.get(event.node.topLevelNodeId)!
          : null;
      const key = `${topLevel?.id ?? "none"}:${event.currency}`;
      const prev = bySection.get(key) ?? {
        sectionId: topLevel?.id ?? null,
        label: topLevel?.name ?? "Без раздела",
        amount: 0,
        currency: event.currency ?? "",
      };
      bySection.set(key, { ...prev, amount: prev.amount + (event.costAmount ?? 0) });
    }
    return Array.from(bySection.values()).sort((a, b) => b.amount - a.amount).slice(0, 4);
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
  const expenseMonthItemHeight = 40;

  useEffect(() => {
    if (!isExpenseMonthPickerOpen || !expenseMonthWheelRef.current) {
      return;
    }
    const index = expenseMonthOptions.findIndex((item) => item === expenseMonthKey);
    if (index < 0) {
      return;
    }
    expenseMonthWheelRef.current.scrollTo({
      y: index * expenseMonthItemHeight,
      animated: true,
    });
  }, [isExpenseMonthPickerOpen, expenseMonthKey, expenseMonthOptions]);

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
    });
    setSortField("eventDate");
    setSortDirection("desc");
    router.replace(`/vehicles/${vehicleId}/service-log`);
  };

  const clearNodeSubtreeFilter = () => {
    router.replace(buildVehicleServiceLogHref(vehicleId, null, paidOnlyActive));
  };

  const clearPaidOnlyFilter = () => {
    router.replace(
      buildVehicleServiceLogHref(vehicleId, nodeSubtreeFilter, false)
    );
  };

  const togglePaidOnlyFilter = () => {
    router.replace(
      buildVehicleServiceLogHref(vehicleId, nodeSubtreeFilter, !paidOnlyActive)
    );
  };

  const openEditServiceEvent = (eventId: string) => {
    router.push(
      `/vehicles/${vehicleId}/service-events/new?source=service-log&eventId=${encodeURIComponent(eventId)}`
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
                const endpoints = createMotoTwinEndpoints(createApiClient({ baseUrl: apiBaseUrl }));
                await endpoints.deleteServiceEvent(vehicleId, eventId);
                await load();
                setActionMessage({
                  tone: "success",
                  title: "Сервисное событие удалено",
                  details: "Статусы и расходы обновлены",
                });
              } catch (deleteError) {
                console.error(deleteError);
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

  if (events.length === 0) {
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
      <ScreenHeader title="Журнал обслуживания" />
      <KeyboardAwareScrollScreen contentContainerStyle={styles.scrollContent}>
        <View style={styles.topActionsRow}>
          <Pressable
            style={({ pressed }) => [styles.expensesButton, pressed && styles.expensesButtonPressed]}
            onPress={() =>
              setIsExpenseExpanded((prev) => {
                if (prev) {
                  setExpenseSectionFilter(null);
                }
                return !prev;
              })
            }
          >
            <Text style={styles.expensesButtonText}>
              Окно расходов {isExpenseExpanded ? "▾" : "▸"}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            onPress={() => router.push(`/vehicles/${vehicleId}/service-events/new`)}
          >
            <Text style={styles.addButtonText}>Добавить сервисное событие</Text>
          </Pressable>
        </View>

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

        {isExpenseExpanded ? (
          <View style={styles.expenseInlineCard}>
            <Text style={styles.expenseInlineTitle}>Расходы на обслуживание</Text>
            <View style={styles.expensePeriodRow}>
              <Pressable
                style={styles.expenseMonthArrow}
                onPress={() =>
                  setExpenseMonthKey((prev) => addMonthsToExpenseMonthKey(prev, -1))
                }
              >
                <Text style={styles.expenseMonthArrowText}>‹</Text>
              </Pressable>
              <Pressable onPress={() => setIsExpenseMonthPickerOpen((prev) => !prev)}>
                <Text style={styles.expensePeriodLabel}>
                  Период: {formatExpenseMonthLabelRu(expenseMonthKey)} ▼
                </Text>
              </Pressable>
              <Pressable
                style={styles.expenseMonthArrow}
                onPress={() =>
                  setExpenseMonthKey((prev) => addMonthsToExpenseMonthKey(prev, 1))
                }
              >
                <Text style={styles.expenseMonthArrowText}>›</Text>
              </Pressable>
            </View>
            {isExpenseMonthPickerOpen ? (
              <View style={styles.expenseMonthPickerListCard}>
                <View style={styles.expenseMonthPickerCenterMarker} />
                <ScrollView
                  ref={expenseMonthWheelRef}
                  style={styles.expenseMonthPickerList}
                  contentContainerStyle={styles.expenseMonthPickerListContent}
                  snapToInterval={expenseMonthItemHeight}
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const offsetY = event.nativeEvent.contentOffset.y;
                    const index = Math.round(offsetY / expenseMonthItemHeight);
                    const normalizedIndex = Math.min(
                      Math.max(index, 0),
                      expenseMonthOptions.length - 1
                    );
                    const monthKey = expenseMonthOptions[normalizedIndex];
                    if (monthKey && monthKey !== expenseMonthKey) {
                      setExpenseMonthKey(monthKey);
                    }
                  }}
                >
                  {expenseMonthOptions.map((monthKey) => {
                    const active = monthKey === expenseMonthKey;
                    return (
                      <Pressable
                        key={monthKey}
                        style={[
                          styles.expenseMonthPickerItem,
                          active && styles.expenseMonthPickerItemActive,
                        ]}
                        onPress={() => {
                          setExpenseMonthKey(monthKey);
                          setIsExpenseMonthPickerOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.expenseMonthPickerItemText,
                            active && styles.expenseMonthPickerItemTextActive,
                          ]}
                        >
                          {formatExpenseMonthLabelRu(monthKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
            <Text style={styles.expenseInlineHint}>
              Расходы считаются по сервисным событиям с указанной стоимостью. Суммы в разных
              валютах не объединяются.
            </Text>
            {dashboardSummary.paidEventCount === 0 ? (
              <View style={styles.expenseModalEmptyBox}>
                <Text style={styles.expenseModalEmptyTitle}>Расходов за выбранный месяц нет</Text>
              </View>
            ) : (
              <View style={styles.expenseModalBody}>
                <View style={styles.expenseTotalBox}>
                  {dashboardSummary.totalsByCurrency.map((row) => (
                    <Text key={row.currency} style={styles.expenseTotalValue}>
                      {dashboardSummary.totalsByCurrency.length === 1
                        ? ""
                        : `${row.currency}: `}
                      {formatExpenseAmountRu(row.totalAmount)} {row.currency}
                    </Text>
                  ))}
                  <Text style={styles.expenseModalStatLabel}>
                    {dashboardSummary.paidEventCount} событий с затратами
                  </Text>
                </View>
                <Text style={styles.expenseModalSubheading}>По разделам</Text>
                {sectionBreakdown.map((row) => (
                  <Pressable
                    key={`${row.sectionId ?? "none"}:${row.currency}`}
                    style={[
                      styles.expenseModalCurrencyRow,
                      expenseSectionFilter === row.sectionId && styles.expenseSectionRowActive,
                    ]}
                    onPress={() => setExpenseSectionFilter(row.sectionId)}
                  >
                    <Text style={styles.expenseModalCurrencyCode}>{row.label}</Text>
                    <Text style={styles.expenseModalCurrencyAmount}>
                      {formatExpenseAmountRu(row.amount)} {row.currency}
                    </Text>
                  </Pressable>
                ))}
                {expenseSectionFilter ? (
                  <Pressable onPress={() => setExpenseSectionFilter(null)}>
                    <Text style={styles.expenseClearSectionText}>Все разделы</Text>
                  </Pressable>
                ) : null}
                <Text style={styles.expenseModalSubheading}>Последние расходы</Text>
                {paidEventsForDashboard.slice(0, 5).map((event) => (
                  <View key={event.id} style={styles.expenseModalCurrencyRow}>
                    <Text style={styles.expenseModalCurrencyCode}>
                      {formatIsoCalendarDateRu(event.eventDate)} {event.serviceType}
                    </Text>
                    <Text style={styles.expenseModalCurrencyAmount}>
                      {formatExpenseAmountRu(event.costAmount ?? 0)} {event.currency}
                    </Text>
                  </View>
                ))}
                <Pressable
                  onPress={() =>
                    router.replace(
                      buildVehicleServiceLogHref(vehicleId, nodeSubtreeFilter, true, {
                        expandExpenses: true,
                        month: expenseMonthKey,
                      })
                    )
                  }
                >
                  <Text style={styles.expenseAllInJournalText}>Все расходы в журнале →</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

        {nodeSubtreeFilter ? (
          <View style={styles.nodeFilterBanner}>
            <Text style={styles.nodeFilterBannerText}>
              <Text style={styles.nodeFilterBannerStrong}>Фильтр по узлу: </Text>
              {nodeSubtreeFilter.displayLabel}
            </Text>
            <Pressable
              onPress={clearNodeSubtreeFilter}
              style={({ pressed }) => [
                styles.nodeFilterClearButton,
                pressed && styles.nodeFilterClearButtonPressed,
              ]}
            >
              <Text style={styles.nodeFilterClearButtonText}>Сбросить фильтр</Text>
            </Pressable>
          </View>
        ) : null}

        {paidOnlyActive ? (
          <View style={styles.paidFilterBanner}>
            <Text style={styles.paidFilterBannerText}>
              <Text style={styles.paidFilterBannerStrong}>Показаны события с расходами</Text>
              {" — только записи с суммой > 0 и валютой."}
            </Text>
            <Pressable
              onPress={clearPaidOnlyFilter}
              style={({ pressed }) => [
                styles.nodeFilterClearButton,
                pressed && styles.nodeFilterClearButtonPressed,
              ]}
            >
              <Text style={styles.nodeFilterClearButtonText}>Сбросить фильтр</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.filterCard}>
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
                  <Text style={styles.filterLabel}>Дата с</Text>
                  <TextInput
                    value={filters.dateFrom}
                    onChangeText={(value) => updateFilter("dateFrom", value)}
                    placeholder="YYYY-MM-DD"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterLabel}>Дата по</Text>
                  <TextInput
                    value={filters.dateTo}
                    onChangeText={(value) => updateFilter("dateTo", value)}
                    placeholder="YYYY-MM-DD"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
              </View>
              <View style={styles.filterRow}>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterLabel}>Узел</Text>
                  <TextInput
                    value={filters.node}
                    onChangeText={(value) => updateFilter("node", value)}
                    placeholder="Первые буквы узла"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterLabel}>Тип сервиса</Text>
                  <TextInput
                    value={filters.serviceType}
                    onChangeText={(value) => updateFilter("serviceType", value)}
                    placeholder="Например, масло"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
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

              <Pressable
                style={({ pressed }) => [
                  styles.resetButton,
                  pressed && styles.resetButtonPressed,
                  !hasActiveFilters && styles.resetButtonDisabled,
                ]}
                onPress={resetFiltersAndSort}
                disabled={!hasActiveFilters}
              >
                <Text style={styles.resetButtonText}>Сбросить</Text>
              </Pressable>
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
            expandedComments={expandedComments}
            onEditServiceEvent={openEditServiceEvent}
            onDeleteServiceEvent={openDeleteServiceEventConfirm}
            onToggleComment={(entryId) =>
              setExpandedComments((prev) => ({
                ...prev,
                [entryId]: !prev[entryId],
              }))
            }
          />
        ))}
      </KeyboardAwareScrollScreen>

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
  addButton: {
    flex: 1,
    backgroundColor: c.primaryAction,
    borderRadius: 12,
    minHeight: 42,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonPressed: {
    opacity: 0.9,
  },
  addButtonText: {
    color: c.onPrimaryAction,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  expensesButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    minHeight: 42,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  topActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  expensesButtonPressed: {
    opacity: 0.9,
  },
  expensesButtonText: {
    color: c.textPrimary,
    fontSize: 13,
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
    backgroundColor: "rgba(255,255,255,0.28)",
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
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
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
    flexDirection: "row",
    alignItems: "stretch",
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

  // Event card base
  eventCard: {
    backgroundColor: c.card,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginBottom: 0,
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
  expenseModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
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
