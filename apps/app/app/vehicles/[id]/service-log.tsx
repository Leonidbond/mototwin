import { useCallback, useState } from "react";
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
  MonthlyServiceLogGroup,
  ServiceEventItem,
  ServiceEventsFilters,
  ServiceEventsSortDirection,
  ServiceEventsSortField,
} from "@mototwin/types";
import {
  filterAndSortServiceEvents,
  getMonthlyCostLabel,
  groupServiceEventsByMonth,
  getStateUpdateSummary,
} from "@mototwin/domain";
import { getApiBaseUrl } from "../../../src/api-base-url";

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString.slice(0, 10);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Event cards ──────────────────────────────────────────────────────────────

function ServiceCard({ event }: { event: ServiceEventItem }) {
  const nodeName = event.node?.name ?? "—";
  const date = formatDate(event.eventDate);
  const odometerLine = `${event.odometer} км${event.engineHours != null ? ` · ${event.engineHours} ч` : ""}`;

  return (
    <View style={[styles.eventCard, styles.serviceCard]}>
      <View style={styles.eventKindBadge}>
        <Text style={styles.eventKindText}>Сервис</Text>
      </View>
      <Text style={styles.eventTitle}>{event.serviceType}</Text>
      <Text style={styles.eventNode}>{nodeName}</Text>
      <View style={styles.eventMeta}>
        <Text style={styles.eventMetaText}>{date}</Text>
        <Text style={styles.eventMetaDot}>·</Text>
        <Text style={styles.eventMetaText}>{odometerLine}</Text>
      </View>
      {event.comment ? (
        <Text style={styles.eventComment}>{event.comment}</Text>
      ) : null}
      {event.costAmount != null && event.costAmount > 0 && event.currency ? (
        <Text style={styles.eventCost}>
          {event.costAmount.toLocaleString("ru-RU")} {event.currency}
        </Text>
      ) : null}
    </View>
  );
}

function StateUpdateCard({ event }: { event: ServiceEventItem }) {
  const date = formatDate(event.eventDate);
  const summary = getStateUpdateSummary(event);
  const odometerLine = `${event.odometer} км${event.engineHours != null ? ` · ${event.engineHours} ч` : ""}`;

  return (
    <View style={[styles.eventCard, styles.stateUpdateCard]}>
      <View style={[styles.eventKindBadge, styles.stateUpdateBadge]}>
        <Text style={[styles.eventKindText, styles.stateUpdateBadgeText]}>Состояние</Text>
      </View>
      <Text style={styles.eventTitle}>{summary}</Text>
      <View style={styles.eventMeta}>
        <Text style={styles.eventMetaText}>{date}</Text>
        <Text style={styles.eventMetaDot}>·</Text>
        <Text style={styles.eventMetaText}>{odometerLine}</Text>
      </View>
    </View>
  );
}

// ─── Month group ──────────────────────────────────────────────────────────────

function MonthGroup({ group }: { group: MonthlyServiceLogGroup }) {
  const costLabel = getMonthlyCostLabel(group.summary.costByCurrency);
  const hasServiceCount = group.summary.serviceCount > 0;
  const hasStateUpdates = group.summary.stateUpdateCount > 0;
  const hasCost = Boolean(costLabel);

  return (
    <View style={styles.monthGroup}>
      <View style={styles.monthHeaderCard}>
        <Text style={styles.monthLabel}>{group.label}</Text>
        <View style={styles.monthSummaryRow}>
          {hasServiceCount ? (
            <View style={styles.monthSummaryChip}>
              <Text style={styles.monthSummaryChipText}>
                SERVICE: {group.summary.serviceCount}
              </Text>
            </View>
          ) : null}
          {hasStateUpdates ? (
            <View style={styles.monthSummaryChip}>
              <Text style={styles.monthSummaryChipText}>
                STATE_UPDATE: {group.summary.stateUpdateCount}
              </Text>
            </View>
          ) : null}
          {hasCost ? (
            <View style={styles.monthSummaryChip}>
              <Text style={styles.monthSummaryChipText}>Расходы: {costLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.timelineList}>
        {group.events.map((event) => {
          const isStateUpdate = event.eventKind === "STATE_UPDATE";
          return (
            <View key={event.id} style={styles.timelineItem}>
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
                  <StateUpdateCard event={event} />
                ) : (
                  <ServiceCard event={event} />
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
  const params = useLocalSearchParams<{ id?: string }>();
  const vehicleId = typeof params.id === "string" ? params.id : "";

  const [groups, setGroups] = useState<MonthlyServiceLogGroup[]>([]);
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

  const apiBaseUrl = getApiBaseUrl();

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
        const data = await endpoints.getVehicleServiceEvents(vehicleId);
        const nextEvents = data.serviceEvents ?? [];
        setEvents(nextEvents);
        const grouped = groupServiceEventsByMonth(nextEvents);
        setGroups(grouped);
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

  const sortedAndFilteredEvents = filterAndSortServiceEvents(events, filters, {
    field: sortField,
    direction: sortDirection,
  });
  const visibleGroups = groupServiceEventsByMonth(sortedAndFilteredEvents);
  const hasActiveFilters =
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo) ||
    Boolean(filters.eventKind) ||
    Boolean(filters.serviceType.trim()) ||
    Boolean(filters.node.trim()) ||
    sortField !== "eventDate" ||
    sortDirection !== "desc";

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
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#111827" />
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
                  { value: "SERVICE", label: "SERVICE" },
                  { value: "STATE_UPDATE", label: "STATE_UPDATE" },
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

              <Text style={styles.filterLabel}>Сортировка</Text>
              <View style={styles.chipsRow}>
                {[
                  { value: "eventDate" as ServiceEventsSortField, label: "Дата" },
                  { value: "odometer" as ServiceEventsSortField, label: "Пробег" },
                  { value: "node" as ServiceEventsSortField, label: "Узел" },
                  { value: "eventKind" as ServiceEventsSortField, label: "Тип" },
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
            <Text style={styles.filteredEmptyTitle}>Ничего не найдено</Text>
            <Text style={styles.filteredEmptyText}>
              По текущим фильтрам нет записей. Измените условия или сбросьте фильтры.
            </Text>
          </View>
        ) : null}

        {visibleGroups.map((group) => (
          <MonthGroup key={group.monthKey} group={group} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F7",
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
    color: "#4B5563",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  errorText: {
    marginTop: 8,
    color: "#B91C1C",
    textAlign: "center",
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  addButtonPressed: {
    opacity: 0.9,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  filterCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
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
    color: "#6B7280",
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
    color: "#6B7280",
    marginBottom: 5,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  chipActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  chipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  resetButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
  },
  resetButtonPressed: {
    backgroundColor: "#F9FAFB",
  },
  resetButtonDisabled: {
    opacity: 0.5,
  },
  resetButtonText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  filteredEmptyCard: {
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  filteredEmptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  filteredEmptyText: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  // Month group
  monthGroup: {
    marginBottom: 22,
  },
  monthHeaderCard: {
    borderColor: "#E5E7EB",
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
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
    borderColor: "#E5E7EB",
    borderWidth: 1,
    backgroundColor: "#FCFCFD",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  monthSummaryChipText: {
    fontSize: 11,
    color: "#4B5563",
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
    borderColor: "#4F46E5",
    backgroundColor: "#E0E7FF",
  },
  timelineDotState: {
    borderColor: "#9CA3AF",
    backgroundColor: "#F3F4F6",
  },
  timelineContent: {
    flex: 1,
  },

  // Event card base
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginBottom: 0,
  },
  serviceCard: {
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  stateUpdateCard: {
    backgroundColor: "#FAFAFA",
    borderColor: "#E5E7EB",
  },

  // Kind badge
  eventKindBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EDE9FE",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 6,
  },
  stateUpdateBadge: {
    backgroundColor: "#F3F4F6",
  },
  eventKindText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6D28D9",
  },
  stateUpdateBadgeText: {
    color: "#6B7280",
  },

  // Event content
  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 20,
  },
  eventNode: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  eventMetaText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  eventMetaDot: {
    fontSize: 12,
    color: "#D1D5DB",
  },
  eventComment: {
    marginTop: 6,
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  eventCost: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
  },
});
