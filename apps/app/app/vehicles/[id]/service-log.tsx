import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import type {
  ServiceEventItem,
  ServiceEventsFilters,
  ServiceEventsSortDirection,
  ServiceEventsSortField,
  ServiceLogEntryViewModel,
  ServiceLogMonthGroupViewModel,
  ServiceLogNodeFilter,
} from "@mototwin/types";
import {
  buildServiceLogTimelineProps,
  filterPaidServiceEvents,
  getServiceLogEventKindBadgeLabel,
  isServiceLogTimelineQueryActive,
  SERVICE_LOG_COMMENT_PREVIEW_MAX_CHARS,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import { getApiBaseUrl } from "../../../src/api-base-url";

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
  paidOnly: boolean
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
  return `/vehicles/${vehicleId}/service-log${q.length ? `?${q.join("&")}` : ""}`;
}

// ─── Event cards ──────────────────────────────────────────────────────────────

function ServiceCard({
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
    <View style={[styles.eventCard, styles.serviceCard]}>
      <View style={styles.eventKindBadge}>
        <Text style={styles.eventKindText}>
          {getServiceLogEventKindBadgeLabel(entry.eventKind)}
        </Text>
      </View>
      <Text style={styles.eventTitle}>{entry.mainTitle}</Text>
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
      {entry.stateUpdateSubtitle ? (
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
}: {
  group: ServiceLogMonthGroupViewModel;
  expandedComments: Record<string, boolean>;
  onToggleComment: (entryId: string) => void;
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
  }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";

  const [events, setEvents] = useState<ServiceEventItem[]>([]);
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

  const apiBaseUrl = getApiBaseUrl();

  const nodeSubtreeFilter = useMemo(
    () => parseServiceLogNodeFilterFromParams(params.nodeIds, params.nodeLabel),
    [params.nodeIds, params.nodeLabel]
  );

  const paidOnlyActive = useMemo(
    () => parsePaidOnlyFromParams(params.paidOnly),
    [params.paidOnly]
  );

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
        const client = createApiClient({ baseUrl: apiBaseUrl });
        const endpoints = createMotoTwinEndpoints(client);
        const data = await endpoints.getServiceEvents(vehicleId);
        const nextEvents = data.serviceEvents ?? [];
        setEvents(nextEvents);
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
        nodeSubtreeFilter?.nodeIds ?? null
      ).monthGroups,
    [events, effectiveFilters, sortField, sortDirection, nodeSubtreeFilter]
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={c.textPrimary} />
          <Text style={styles.stateText}>Загрузка журнала...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Ошибка загрузки</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (events.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={() => router.push(`/vehicles/${vehicleId}/service-events/new`)}
        >
          <Text style={styles.addButtonText}>+ Добавить сервисное событие</Text>
        </Pressable>

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
            <View>
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
            </View>
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
            onToggleComment={(entryId) =>
              setExpandedComments((prev) => ({
                ...prev,
                [entryId]: !prev[entryId],
              }))
            }
          />
        ))}
      </ScrollView>
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
    paddingBottom: 40,
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
    backgroundColor: c.primaryAction,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  addButtonPressed: {
    opacity: 0.9,
  },
  addButtonText: {
    color: c.textInverse,
    fontSize: 14,
    fontWeight: "700",
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
    color: c.textInverse,
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
    fontSize: 15,
    fontWeight: "600",
    color: c.textPrimary,
    lineHeight: 20,
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
});
