import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  expenseCategoryLabelsRu,
  expenseInstallStatusLabelsRu,
  formatExpenseAmountRu,
  buildExpenseAnalyticsFromItems,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type {
  ExpenseAmountByCurrency,
  ExpenseAnalyticsRow,
  ExpenseAnalyticsSummary,
  ExpenseItem,
  ExpenseInstallStatus,
  NodeTreeItem,
} from "@mototwin/types";
import { getApiBaseUrl } from "../../../src/api-base-url";
import { ScreenHeader } from "../../components/screen-header";
import { GarageBottomNav } from "../../../components/garage/GarageBottomNav";

function formatTotals(rows: ExpenseAmountByCurrency[]): string {
  if (rows.length === 0) {
    return "—";
  }
  return rows.map((row) => `${formatExpenseAmountRu(row.totalAmount)} ${row.currency}`).join(" · ");
}

function collectNodeAndDescendantIds(nodes: NodeTreeItem[], nodeId: string): Set<string> {
  const result = new Set<string>();
  const addSubtree = (node: NodeTreeItem) => {
    result.add(node.id);
    for (const child of node.children ?? []) {
      addSubtree(child);
    }
  };
  const findTarget = (node: NodeTreeItem): boolean => {
    if (node.id === nodeId) {
      addSubtree(node);
      return true;
    }
    return (node.children ?? []).some(findTarget);
  };
  nodes.some(findTarget);
  return result;
}

export default function VehicleExpensesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; nodeId?: string; year?: string }>();
  const vehicleId = String(params.id ?? "");
  const targetNodeId = typeof params.nodeId === "string" ? params.nodeId : "";
  const requestedYear = typeof params.year === "string" ? Number.parseInt(params.year, 10) : NaN;
  const selectedYear = Number.isFinite(requestedYear) ? requestedYear : new Date().getFullYear();
  const [analytics, setAnalytics] = useState<ExpenseAnalyticsSummary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [installStatusFilter, setInstallStatusFilter] = useState<ExpenseInstallStatus | "ALL">("ALL");
  const [busyExpenseId, setBusyExpenseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const client = createApiClient({ baseUrl: getApiBaseUrl() });
      const endpoints = createMotoTwinEndpoints(client);
      const [result, treeData] = await Promise.all([
        endpoints.getExpenses({ vehicleId, year: selectedYear }),
        targetNodeId ? endpoints.getNodeTree(vehicleId) : Promise.resolve({ nodeTree: [] as NodeTreeItem[] }),
      ]);
      setNodeTree(treeData.nodeTree ?? []);
      setAnalytics(result.analytics);
      setExpenses(result.expenses);
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить расходы. Проверьте подключение к backend.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, targetNodeId, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const scopedExpenses = useMemo(() => {
    const nodeIds = targetNodeId ? collectNodeAndDescendantIds(nodeTree, targetNodeId) : null;
    return expenses.filter((expense) => {
      if (nodeIds && (!expense.nodeId || !nodeIds.has(expense.nodeId))) {
        return false;
      }
      if (installStatusFilter !== "ALL" && expense.installStatus !== installStatusFilter) {
        return false;
      }
      return true;
    });
  }, [expenses, installStatusFilter, nodeTree, targetNodeId]);
  const scopedAnalytics = useMemo(
    () => buildExpenseAnalyticsFromItems(scopedExpenses, selectedYear),
    [scopedExpenses, selectedYear]
  );

  async function markInstalled(expense: ExpenseItem) {
    try {
      setBusyExpenseId(expense.id);
      const client = createApiClient({ baseUrl: getApiBaseUrl() });
      const endpoints = createMotoTwinEndpoints(client);
      await endpoints.markExpenseInstalled(expense.id, {
        installedAt: new Date().toISOString().slice(0, 10),
        odometer: expense.odometer ?? null,
        engineHours: expense.engineHours ?? null,
      });
      await load();
    } catch (requestError) {
      console.error(requestError);
      Alert.alert("Расходы", "Не удалось отметить расход установленным.");
    } finally {
      setBusyExpenseId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScreenHeader title="Расходы" onBack={() => router.push(`/vehicles/${vehicleId}`)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Статистика расходов</Text>
          <Text style={styles.title}>Расходы мотоцикла</Text>
          <Text style={styles.subtitle}>
            Технические расходы: обслуживание, запчасти, ремонт, диагностика и работа сервиса.
          </Text>
          <Pressable
            onPress={() => router.push(`/vehicles/${vehicleId}/service-log?paidOnly=1`)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryButtonText}>Открыть расходы в журнале</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <StateCard>
            <ActivityIndicator color={c.primaryAction} />
            <Text style={styles.stateText}>Загружаю статистику расходов...</Text>
          </StateCard>
        ) : error ? (
          <StateCard>
            <Text style={[styles.stateText, { color: c.error }]}>{error}</Text>
          </StateCard>
        ) : !analytics || expenses.length === 0 ? (
          <StateCard>
            <Text style={styles.stateTitle}>Расходов пока нет</Text>
            <Text style={styles.stateText}>
              Добавьте технический расход или стоимость в сервисное событие.
            </Text>
          </StateCard>
        ) : (
          <>
            {targetNodeId ? (
              <View style={styles.scopeCard}>
                <Text style={styles.scopeTitle}>Фильтр по узлу и дочерним узлам</Text>
                <Text style={styles.scopeText}>Показаны расходы выбранного поддерева за сезон {selectedYear}.</Text>
              </View>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              {(["ALL", "BOUGHT_NOT_INSTALLED", "INSTALLED", "NOT_APPLICABLE"] as const).map((status) => (
                <Pressable
                  key={status}
                  onPress={() => setInstallStatusFilter(status)}
                  style={[
                    styles.filterChip,
                    installStatusFilter === status && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      installStatusFilter === status && styles.filterChipTextActive,
                    ]}
                  >
                    {status === "ALL" ? "Все" : expenseInstallStatusLabelsRu[status]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.metricsGrid}>
              <MetricCard label="Всего" value={formatTotals(scopedAnalytics.totalsByCurrency)} />
              <MetricCard
                label={`Сезон ${scopedAnalytics.selectedYear}`}
                value={formatTotals(scopedAnalytics.selectedYearTotalsByCurrency)}
              />
              <MetricCard
                label="Куплено, но не установлено"
                value={`${scopedAnalytics.boughtNotInstalledCount} · ${formatTotals(scopedAnalytics.boughtNotInstalledTotalsByCurrency)}`}
              />
              <MetricCard
                label="Операций в сезоне"
                value={String(scopedAnalytics.selectedYearExpenseCount)}
              />
            </View>

            <ExpenseRowsSection
              title="По годам"
              rows={scopedAnalytics.byYear}
            />

            <ExpenseRowsSection
              title="По месяцам"
              rows={scopedAnalytics.byMonth}
            />

            <ExpenseRowsSection
              title="По категориям"
              rows={scopedAnalytics.byCategory}
            />

            <Section title="По узлам">
              <View style={styles.rowsList}>
                {scopedAnalytics.byNode.map((node) => (
                  <View key={node.key} style={styles.nodeRow}>
                    <Text style={styles.rowLabel}>{node.label}</Text>
                    <Text style={styles.rowAmount}>{formatTotals(node.totalsByCurrency)}</Text>
                  </View>
                ))}
              </View>
            </Section>

            <Section title="Все расходы">
              <View style={styles.rowsList}>
                {scopedExpenses.length === 0 ? (
                  <View style={styles.emptyInline}>
                    <Text style={styles.stateText}>По выбранным фильтрам расходов нет.</Text>
                  </View>
                ) : null}
                {scopedExpenses.map((expense) => (
                  <View key={expense.id} style={styles.eventCard}>
                    <Text style={styles.eventMeta}>
                      {new Date(expense.expenseDate).toLocaleDateString("ru-RU")} ·{" "}
                      {expenseCategoryLabelsRu[expense.category]} ·{" "}
                      {expenseInstallStatusLabelsRu[expense.installStatus]}
                    </Text>
                    <Text style={styles.eventTitle}>{expense.title}</Text>
                    <Text style={styles.eventAmount}>
                      {formatExpenseAmountRu(expense.amount)} {expense.currency}
                    </Text>
                    <View style={styles.eventActions}>
                      {expense.installationStatus === "NOT_INSTALLED" &&
                      expense.purchaseStatus === "PURCHASED" &&
                      !expense.serviceEventId ? (
                        <Pressable
                          disabled={busyExpenseId === expense.id}
                          onPress={() => void markInstalled(expense)}
                          style={[styles.actionButton, busyExpenseId === expense.id && styles.actionButtonDisabled]}
                        >
                          <Text style={styles.actionButtonText}>
                            {busyExpenseId === expense.id ? "Сохраняю..." : "Отметить установленным"}
                          </Text>
                        </Pressable>
                      ) : null}
                      {expense.serviceEventId ? (
                        <Pressable
                          onPress={() =>
                            router.push(
                              `/vehicles/${vehicleId}/service-log?expandExpenses=1&serviceEventId=${encodeURIComponent(expense.serviceEventId ?? "")}`
                            )
                          }
                          style={styles.secondaryButton}
                        >
                          <Text style={styles.secondaryButtonText}>Открыть сервисное событие</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </Section>
          </>
        )}
      </ScrollView>
      <GarageBottomNav
        activeKey="expenses"
        onOpenGarage={() => router.push("/")}
        onOpenNodes={() => router.push(`/vehicles/${vehicleId}/nodes`)}
        onOpenJournal={() => router.push(`/vehicles/${vehicleId}/service-log`)}
        onOpenExpenses={() => undefined}
        onOpenProfile={() => router.push(`/vehicles/${vehicleId}/profile`)}
        hasVehicleContext
      />
    </SafeAreaView>
  );
}

function StateCard(props: { children: ReactNode }) {
  return <View style={styles.stateCard}>{props.children}</View>;
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      <View style={styles.sectionBody}>{props.children}</View>
    </View>
  );
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{props.label}</Text>
      <Text style={styles.metricValue}>{props.value}</Text>
    </View>
  );
}

function ExpenseRowsSection(props: {
  title: string;
  rows: ExpenseAnalyticsRow[];
}) {
  return (
    <Section title={props.title}>
      <View style={styles.rowsList}>
        {props.rows.map((row) => (
          <ExpenseRow
            key={row.key}
            label={row.label}
            totals={row.totalsByCurrency}
          />
        ))}
      </View>
    </Section>
  );
}

function ExpenseRow(props: {
  label: string;
  totals: ExpenseAmountByCurrency[];
}) {
  return (
    <View style={styles.expenseRow}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowLabel}>{props.label}</Text>
        <Text style={styles.rowAmount}>{formatTotals(props.totals)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.canvas,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 18,
  },
  eyebrow: {
    color: c.textMeta,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 8,
    color: c.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 8,
    color: c.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: c.primaryAction,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: c.onPrimaryAction,
    fontSize: 14,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.82,
  },
  metricsGrid: {
    gap: 10,
  },
  scopeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 14,
    gap: 4,
  },
  scopeTitle: {
    color: c.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  scopeText: {
    color: c.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  filterChips: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: c.primaryAction,
    backgroundColor: c.primaryAction,
  },
  filterChipText: {
    color: c.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: c.onPrimaryAction,
  },
  metricCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 16,
  },
  metricLabel: {
    color: c.textMeta,
    fontSize: 12,
    fontWeight: "700",
  },
  metricValue: {
    marginTop: 6,
    color: c.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  section: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 16,
  },
  sectionTitle: {
    color: c.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionBody: {
    marginTop: 12,
  },
  stateCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 18,
    gap: 8,
  },
  stateTitle: {
    color: c.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  stateText: {
    color: c.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  eventCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 14,
  },
  eventMeta: {
    color: c.textMeta,
    fontSize: 12,
    fontWeight: "600",
  },
  eventTitle: {
    marginTop: 6,
    color: c.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  eventAmount: {
    marginTop: 6,
    color: c.primaryAction,
    fontSize: 14,
    fontWeight: "800",
  },
  eventActions: {
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    borderRadius: 14,
    backgroundColor: c.primaryAction,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: c.onPrimaryAction,
    fontSize: 12,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.borderStrong,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: c.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyInline: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 12,
  },
  rowsList: {
    gap: 10,
  },
  expenseRow: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 14,
  },
  nodeRow: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 14,
    gap: 5,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  rowLabel: {
    flex: 1,
    color: c.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  rowAmount: {
    color: c.primaryAction,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  progressTrack: {
    marginTop: 10,
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: c.cardSubtle,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: c.primaryAction,
  },
});
