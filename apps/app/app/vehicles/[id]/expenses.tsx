import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  buildExpenseAnalyticsFromItems,
  expenseCategoryLabelsRu,
  expenseInstallStatusLabelsRu,
  formatExpenseAmountRu,
  getExpenseMonthKeyFromIso,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type {
  ExpenseAmountByCurrency,
  ExpenseCategory,
  ExpenseInstallStatus,
  ExpenseItem,
  NodeTreeItem,
} from "@mototwin/types";
import { getApiBaseUrl } from "../../../src/api-base-url";
import { ScreenHeader } from "../../components/screen-header";
import { GarageBottomNav } from "../../../components/garage/GarageBottomNav";

const categoryOptions: ExpenseCategory[] = [
  "PART",
  "CONSUMABLE",
  "SERVICE_WORK",
  "REPAIR",
  "DIAGNOSTICS",
  "OTHER",
];

const installStatusOptions: ExpenseInstallStatus[] = [
  "BOUGHT_NOT_INSTALLED",
  "INSTALLED",
  "NOT_APPLICABLE",
];

const categoryColors: Record<ExpenseCategory, string> = {
  PART: "#3b82f6",
  CONSUMABLE: "#6fbf5f",
  SERVICE_WORK: "#f59e0b",
  REPAIR: "#ef4444",
  DIAGNOSTICS: "#9ca3af",
  OTHER: "#8b5cf6",
};

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTotals(rows: ExpenseAmountByCurrency[]): string {
  if (rows.length === 0) {
    return "—";
  }
  return rows.map((row) => `${formatExpenseAmountRu(row.totalAmount)} ${row.currency}`).join(" · ");
}

function formatAverageMonthly(rows: ExpenseAmountByCurrency[]): string {
  if (rows.length === 0) {
    return "—";
  }
  return rows
    .map((row) => `${formatExpenseAmountRu(row.totalAmount / 12)} ${row.currency}`)
    .join(" · ");
}

function formatCurrencyAmount(amount: number, currency: string): string {
  return `${formatExpenseAmountRu(amount)} ${currency}`;
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

function getMonthLabel(monthKey: string): string {
  const date = new Date(`${monthKey}-01T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return monthKey;
  }
  return date.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
}

function getFullMonthLabel(monthKey: string): string {
  const date = new Date(`${monthKey}-01T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return monthKey || "—";
  }
  return date.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
}

function sumByCurrency(expenses: ExpenseItem[], currency: string): number {
  return expenses
    .filter((expense) => expense.currency === currency)
    .reduce((sum, expense) => sum + expense.amount, 0);
}

function getInstallationStatusLabel(expense: ExpenseItem): string {
  if (expense.installStatus === "NOT_APPLICABLE") {
    return expenseInstallStatusLabelsRu.NOT_APPLICABLE;
  }
  return expense.installationStatus === "NOT_INSTALLED"
    ? "Куплено, не установлено"
    : "Установлено";
}

export default function VehicleExpensesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobileLayout = width < 720;
  const scrollViewRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ id: string; nodeId?: string; year?: string }>();
  const vehicleId = String(params.id ?? "");
  const targetNodeId = typeof params.nodeId === "string" ? params.nodeId : "";
  const requestedYear = typeof params.year === "string" ? Number.parseInt(params.year, 10) : NaN;
  const selectedYear = Number.isFinite(requestedYear) ? requestedYear : new Date().getFullYear();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [nodeTree, setNodeTree] = useState<NodeTreeItem[]>([]);
  const [installStatusFilter, setInstallStatusFilter] = useState<ExpenseInstallStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "ALL">("ALL");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [monthFilters, setMonthFilters] = useState<string[]>([]);
  const [isMobileFiltersCollapsed, setIsMobileFiltersCollapsed] = useState(true);
  const [filtersSectionY, setFiltersSectionY] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [busyExpenseId, setBusyExpenseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    amount: "",
    currency: "RUB",
    category: "PART" as ExpenseCategory,
    installStatus: "BOUGHT_NOT_INSTALLED" as ExpenseInstallStatus,
    expenseDate: todayYmd(),
    comment: "",
  });

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
      setExpenses(result.expenses);
      setYears(result.years ?? []);
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

  const currencyOptions = useMemo(
    () => Array.from(new Set(expenses.map((expense) => expense.currency).filter(Boolean))).sort((a, b) => a.localeCompare(b, "en")),
    [expenses]
  );
  const defaultCurrency = currencyOptions.includes("RUB") ? "RUB" : currencyOptions[0] || "RUB";
  const primaryCurrency = currencyFilter || defaultCurrency;

  const monthOptions = useMemo(() => {
    const months = new Map<string, string>();
    for (const expense of expenses) {
      const key = getExpenseMonthKeyFromIso(expense.expenseDate);
      months.set(key, getFullMonthLabel(key));
    }
    return Array.from(months.entries()).map(([key, label]) => ({ key, label })).sort((a, b) => b.key.localeCompare(a.key));
  }, [expenses]);

  const scopedExpenses = useMemo(() => {
    const nodeIds = targetNodeId ? collectNodeAndDescendantIds(nodeTree, targetNodeId) : null;
    const query = searchQuery.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (nodeIds && (!expense.nodeId || !nodeIds.has(expense.nodeId))) return false;
      if (installStatusFilter !== "ALL" && expense.installStatus !== installStatusFilter) return false;
      if (categoryFilter !== "ALL" && expense.category !== categoryFilter) return false;
      if (currencyFilter && expense.currency !== currencyFilter) return false;
      if (monthFilters.length > 0 && !monthFilters.includes(getExpenseMonthKeyFromIso(expense.expenseDate))) return false;
      if (query) {
        const haystack = [
          expense.title,
          expense.comment ?? "",
          expense.node?.name ?? "",
          expense.partSku ?? "",
          expenseCategoryLabelsRu[expense.category],
          getInstallationStatusLabel(expense),
        ].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [categoryFilter, currencyFilter, expenses, installStatusFilter, monthFilters, nodeTree, searchQuery, targetNodeId]);

  const toggleMonthFilter = useCallback((monthKey: string) => {
    setMonthFilters((prev) =>
      prev.includes(monthKey) ? prev.filter((key) => key !== monthKey) : [...prev, monthKey]
    );
  }, []);

  const analytics = useMemo(
    () => buildExpenseAnalyticsFromItems(scopedExpenses, selectedYear),
    [scopedExpenses, selectedYear]
  );

  const selectedYearExpenses = useMemo(
    () => scopedExpenses.filter((expense) => {
      const date = new Date(expense.expenseDate);
      return !Number.isNaN(date.getTime()) && date.getFullYear() === selectedYear;
    }),
    [scopedExpenses, selectedYear]
  );

  const monthlySeries = useMemo(() => {
    const rows = Array.from({ length: 12 }, (_, index) => {
      const key = `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
      return { key, label: getMonthLabel(key), amount: 0 };
    });
    for (const expense of selectedYearExpenses) {
      if (expense.currency !== primaryCurrency) continue;
      const month = new Date(expense.expenseDate).getMonth();
      if (month >= 0 && month < rows.length) {
        rows[month].amount += expense.amount;
      }
    }
    return rows;
  }, [primaryCurrency, selectedYear, selectedYearExpenses]);

  const categoryRows = useMemo(() => {
    const total = Math.max(sumByCurrency(selectedYearExpenses, primaryCurrency), 1);
    return categoryOptions
      .map((category) => {
        const amount = selectedYearExpenses
          .filter((expense) => expense.currency === primaryCurrency && expense.category === category)
          .reduce((sum, expense) => sum + expense.amount, 0);
        return {
          category,
          amount,
          percent: Math.round((amount / total) * 100),
        };
      })
      .filter((row) => row.amount > 0);
  }, [primaryCurrency, selectedYearExpenses]);

  const nodeRows = useMemo(() => {
    const rows = analytics.byNode
      .map((row) => {
        const amount = row.totalsByCurrency.find((total) => total.currency === primaryCurrency)?.totalAmount ?? 0;
        return { key: row.key, label: row.label, amount, totalsLabel: formatTotals(row.totalsByCurrency) };
      })
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    const max = Math.max(...rows.map((row) => row.amount), 1);
    return rows.map((row) => ({ ...row, percent: Math.round((row.amount / max) * 100) }));
  }, [analytics.byNode, primaryCurrency]);

  const uninstalledExpenses = scopedExpenses
    .filter((expense) => expense.purchaseStatus === "PURCHASED" && expense.installationStatus === "NOT_INSTALLED" && expense.serviceEventId == null)
    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  const topNode = nodeRows[0] ?? null;
  const latestExpense = [...scopedExpenses].sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())[0] ?? null;
  const biggestMonth = monthlySeries.reduce((best, row) => row.amount > best.amount ? row : best, monthlySeries[0] ?? { key: "", label: "—", amount: 0 });

  async function createExpense() {
    const amount = Number(form.amount.replace(",", "."));
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Заполните название и положительную сумму.");
      return;
    }
    try {
      setIsSaving(true);
      setError("");
      const client = createApiClient({ baseUrl: getApiBaseUrl() });
      const endpoints = createMotoTwinEndpoints(client);
      await endpoints.createExpense({
        vehicleId,
        title: form.title.trim(),
        amount,
        currency: form.currency.trim().toUpperCase(),
        category: form.category,
        installStatus: form.installStatus,
        expenseDate: form.expenseDate,
        comment: form.comment.trim() || null,
      });
      setForm((prev) => ({ ...prev, title: "", amount: "", comment: "" }));
      setShowAddForm(false);
      await load();
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось сохранить расход.");
    } finally {
      setIsSaving(false);
    }
  }

  async function markInstalled(expense: ExpenseItem) {
    try {
      setBusyExpenseId(expense.id);
      const client = createApiClient({ baseUrl: getApiBaseUrl() });
      const endpoints = createMotoTwinEndpoints(client);
      await endpoints.markExpenseInstalled(expense.id, {
        installedAt: todayYmd(),
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

  function openBoughtPartsPage() {
    router.push(`/vehicles/${vehicleId}/wishlist?partsStatus=BOUGHT`);
  }

  function openInstallFromExpense(expense: ExpenseItem) {
    if (expense.shoppingListItemId) {
      router.push(
        `/vehicles/${vehicleId}/wishlist?partsStatus=BOUGHT&wishlistItemId=${encodeURIComponent(expense.shoppingListItemId)}&installWishlistItemId=${encodeURIComponent(expense.shoppingListItemId)}`
      );
      return;
    }
    void markInstalled(expense);
  }

  function openFiltersSection() {
    if (isMobileLayout) {
      setIsMobileFiltersCollapsed(false);
    }
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: Math.max(filtersSectionY - 10, 0), animated: true });
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScreenHeader title="Расходы" onBack={() => router.push(`/vehicles/${vehicleId}`)} />
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Расходы</Text>
              <Text style={styles.subtitle}>Техническая стоимость владения: обслуживание, запчасти и ремонт.</Text>
            </View>
            <Pressable onPress={() => setShowAddForm((prev) => !prev)} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Добавить</Text>
            </Pressable>
          </View>
          {isMobileLayout ? (
            <ChipRow>
              {years.length > 0 ? (
                years.slice(0, 4).map((year) => (
                  <Pressable
                    key={year}
                    onPress={() => router.setParams({ year: String(year) })}
                    style={[styles.chip, selectedYear === year && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selectedYear === year && styles.chipTextActive]}>{year}</Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Сезон {selectedYear}</Text>
                </View>
              )}
              <FilterChip active={monthFilters.length === 0} label="Все месяцы" onPress={() => setMonthFilters([])} />
              {monthOptions.slice(0, 12).map((month) => (
                <FilterChip
                  key={month.key}
                  active={monthFilters.includes(month.key)}
                  label={month.label}
                  onPress={() => toggleMonthFilter(month.key)}
                />
              ))}
            </ChipRow>
          ) : (
            <View style={styles.filterRow}>
              {years.length > 0 ? (
                years.slice(0, 4).map((year) => (
                  <Pressable
                    key={year}
                    onPress={() => router.setParams({ year: String(year) })}
                    style={[styles.chip, selectedYear === year && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selectedYear === year && styles.chipTextActive]}>{year}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.scopeText}>Сезон {selectedYear}</Text>
              )}
            </View>
          )}
          {targetNodeId ? (
            <Text style={styles.scopeText}>Открыто из дерева: показан выбранный узел и дочерние узлы.</Text>
          ) : null}
        </View>

        {showAddForm ? (
          <Section title="Добавить технический расход">
            <Field label="Название">
              <TextInput value={form.title} onChangeText={(title) => setForm((prev) => ({ ...prev, title }))} style={styles.input} />
            </Field>
            <View style={styles.twoCols}>
              <Field label="Сумма">
                <TextInput value={form.amount} onChangeText={(amount) => setForm((prev) => ({ ...prev, amount }))} keyboardType="decimal-pad" style={styles.input} />
              </Field>
              <Field label="Валюта">
                <TextInput value={form.currency} onChangeText={(currency) => setForm((prev) => ({ ...prev, currency }))} autoCapitalize="characters" style={styles.input} />
              </Field>
            </View>
            <Field label="Дата">
              <TextInput value={form.expenseDate} onChangeText={(expenseDate) => setForm((prev) => ({ ...prev, expenseDate }))} style={styles.input} />
            </Field>
            <Text style={styles.smallLabel}>Категория</Text>
            <ChipRow>
              {categoryOptions.map((category) => (
                <FilterChip key={category} active={form.category === category} label={expenseCategoryLabelsRu[category]} onPress={() => setForm((prev) => ({ ...prev, category }))} />
              ))}
            </ChipRow>
            <Text style={styles.smallLabel}>Статус</Text>
            <ChipRow>
              {installStatusOptions.map((status) => (
                <FilterChip key={status} active={form.installStatus === status} label={expenseInstallStatusLabelsRu[status]} onPress={() => setForm((prev) => ({ ...prev, installStatus: status }))} />
              ))}
            </ChipRow>
            <Field label="Комментарий">
              <TextInput value={form.comment} onChangeText={(comment) => setForm((prev) => ({ ...prev, comment }))} style={styles.input} />
            </Field>
            <Pressable disabled={isSaving} onPress={() => void createExpense()} style={[styles.primaryButton, isSaving && styles.disabledButton]}>
              <Text style={styles.primaryButtonText}>{isSaving ? "Сохраняю..." : "Сохранить расход"}</Text>
            </Pressable>
          </Section>
        ) : null}

        <Section title="Фильтры">
          <View onLayout={(event) => setFiltersSectionY(event.nativeEvent.layout.y)} style={styles.filtersSectionContent}>
            {isMobileLayout ? (
              <Pressable
                onPress={() => setIsMobileFiltersCollapsed((prev) => !prev)}
                style={({ pressed }) => [styles.filtersCollapseButton, pressed && styles.filtersCollapseButtonPressed]}
              >
                <Text style={styles.filtersCollapseButtonText}>{isMobileFiltersCollapsed ? "Показать фильтры" : "Скрыть фильтры"}</Text>
              </Pressable>
            ) : null}
            {!isMobileLayout || !isMobileFiltersCollapsed ? (
              <View style={styles.filtersExpandedContent}>
                <ChipRow>
                  {(["ALL", "BOUGHT_NOT_INSTALLED", "INSTALLED", "NOT_APPLICABLE"] as const).map((status) => (
                    <FilterChip
                      key={status}
                      active={installStatusFilter === status}
                      label={status === "ALL" ? "Все" : expenseInstallStatusLabelsRu[status]}
                      onPress={() => setInstallStatusFilter(status)}
                    />
                  ))}
                </ChipRow>
                <ChipRow>
                  <FilterChip active={categoryFilter === "ALL"} label="Все категории" onPress={() => setCategoryFilter("ALL")} />
                  {categoryOptions.map((category) => (
                    <FilterChip key={category} active={categoryFilter === category} label={expenseCategoryLabelsRu[category]} onPress={() => setCategoryFilter(category)} />
                  ))}
                </ChipRow>
                <ChipRow>
                  <FilterChip active={!currencyFilter} label="Все валюты" onPress={() => setCurrencyFilter("")} />
                  {currencyOptions.map((currency) => (
                    <FilterChip key={currency} active={currencyFilter === currency} label={currency} onPress={() => setCurrencyFilter(currency)} />
                  ))}
                </ChipRow>
                {!isMobileLayout ? (
                  <ChipRow>
                    <FilterChip active={monthFilters.length === 0} label="Все месяцы" onPress={() => setMonthFilters([])} />
                    {monthOptions.slice(0, 12).map((month) => (
                      <FilterChip
                        key={month.key}
                        active={monthFilters.includes(month.key)}
                        label={month.label}
                        onPress={() => toggleMonthFilter(month.key)}
                      />
                    ))}
                  </ChipRow>
                ) : null}
              </View>
            ) : null}
          </View>
        </Section>

        {isLoading ? (
          <StateCard>
            <ActivityIndicator color={c.primaryAction} />
            <Text style={styles.stateText}>Загружаю статистику расходов...</Text>
          </StateCard>
        ) : error ? (
          <StateCard>
            <Text style={[styles.stateText, { color: c.error }]}>{error}</Text>
          </StateCard>
        ) : expenses.length === 0 ? (
          <StateCard>
            <Text style={styles.stateTitle}>Расходов пока нет</Text>
            <Text style={styles.stateText}>Добавьте технический расход или стоимость в сервисное событие.</Text>
          </StateCard>
        ) : (
          <>
            <View style={styles.metricsGrid}>
              <MetricCard tone="blue" label="Всего расходов" value={formatTotals(analytics.totalsByCurrency)} hint="за выбранный период" />
              <MetricCard tone="green" label={`За сезон ${selectedYear}`} value={formatTotals(analytics.selectedYearTotalsByCurrency)} hint="с начала сезона" />
              <MetricCard tone="violet" label="Событий" value={String(analytics.selectedYearExpenseCount)} hint="всего расходов" />
              <MetricCard tone="amber" label="Средний расход в месяц" value={formatAverageMonthly(analytics.selectedYearTotalsByCurrency)} hint="среднее значение" />
              <MetricCard tone="orange" label="Куплено, не установлено" value={`${analytics.boughtNotInstalledCount} позиции`} hint={formatTotals(analytics.boughtNotInstalledTotalsByCurrency)} />
              <MetricCard tone="red" label="Самый дорогой узел" value={topNode?.label ?? "—"} hint={topNode ? formatCurrencyAmount(topNode.amount, primaryCurrency) : "нет данных"} />
            </View>

            <Section title="Расходы по месяцам">
              <MonthlyBars rows={monthlySeries} currency={primaryCurrency} />
            </Section>

            <Section title="Структура расходов">
              <CategoryStructure rows={categoryRows} currency={primaryCurrency} />
            </Section>

            <Section title="По узлам">
              <NodeBars rows={nodeRows} currency={primaryCurrency} />
            </Section>

            <Section
              title="Куплено, не установлено"
              actionLabel="›"
              onAction={openBoughtPartsPage}
            >
              <UninstalledList
                expenses={uninstalledExpenses.slice(0, 4)}
                onOpenExpense={openInstallFromExpense}
                busyExpenseId={busyExpenseId}
              />
            </Section>

            <Section title="Быстрые выводы">
              <Insight label="Самый дорогой месяц" value={biggestMonth.amount > 0 ? getFullMonthLabel(biggestMonth.key) : "—"} />
              <Insight label="Больше всего затрат" value={topNode?.label ?? "—"} />
              <Insight label="Последний расход" value={latestExpense ? new Date(latestExpense.expenseDate).toLocaleDateString("ru-RU") : "—"} />
              <Insight label="Валюты" value={currencyOptions.length > 0 ? `${currencyOptions.join(", ")} отдельно` : "—"} />
            </Section>

            <Section
              title="Все расходы"
              actionLabel={isMobileLayout ? "Фильтры" : undefined}
              onAction={isMobileLayout ? openFiltersSection : undefined}
              compactAction={isMobileLayout}
            >
              <View style={styles.rowsList}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Поиск по расходам"
                  placeholderTextColor={c.textMuted}
                  style={styles.input}
                />
                {scopedExpenses.length === 0 ? (
                  <View style={styles.emptyInline}>
                    <Text style={styles.stateText}>По выбранным фильтрам расходов нет.</Text>
                  </View>
                ) : null}
                {scopedExpenses.map((expense) => (
                  <View key={expense.id} style={styles.eventCard}>
                    <Text style={styles.eventMeta}>
                      {new Date(expense.expenseDate).toLocaleDateString("ru-RU")} · {expenseCategoryLabelsRu[expense.category]} · {getInstallationStatusLabel(expense)}
                    </Text>
                    <Text style={styles.eventTitle}>{expense.title}</Text>
                    <Text style={styles.eventNode}>{expense.node?.name ?? "Без узла"}</Text>
                    <Text style={styles.eventAmount}>{formatCurrencyAmount(expense.amount, expense.currency)}</Text>
                    <View style={styles.eventActions}>
                      {expense.installationStatus === "NOT_INSTALLED" && expense.purchaseStatus === "PURCHASED" && !expense.serviceEventId ? (
                        <Pressable
                          disabled={busyExpenseId === expense.id}
                          onPress={() => void markInstalled(expense)}
                          style={[styles.actionButton, busyExpenseId === expense.id && styles.disabledButton]}
                        >
                          <Text style={styles.actionButtonText}>{busyExpenseId === expense.id ? "Сохраняю..." : "Отметить установленным"}</Text>
                        </Pressable>
                      ) : null}
                      {expense.serviceEventId ? (
                        <Pressable
                          onPress={() => router.push(`/vehicles/${vehicleId}/service-log?expandExpenses=1&serviceEventId=${encodeURIComponent(expense.serviceEventId ?? "")}`)}
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
        onOpenProfile={() => router.push("/profile")}
        hasVehicleContext
        currentVehicleId={vehicleId}
      />
    </SafeAreaView>
  );
}

function StateCard(props: { children: ReactNode }) {
  return <View style={styles.stateCard}>{props.children}</View>;
}

function Section(props: {
  title: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  compactAction?: boolean;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{props.title}</Text>
        {props.onAction && props.actionLabel ? (
          <Pressable
            onPress={props.onAction}
            hitSlop={8}
            style={[styles.sectionAction, props.compactAction && styles.sectionActionCompact]}
          >
            <Text style={[styles.sectionActionText, props.compactAction && styles.sectionActionCompactText]}>
              {props.actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.sectionBody}>{props.children}</View>
    </View>
  );
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.smallLabel}>{props.label}</Text>
      {props.children}
    </View>
  );
}

function ChipRow(props: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
      {props.children}
    </ScrollView>
  );
}

function FilterChip(props: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={[styles.filterChip, props.active && styles.filterChipActive]}>
      <Text style={[styles.filterChipText, props.active && styles.filterChipTextActive]}>{props.label}</Text>
    </Pressable>
  );
}

function MetricCard(props: { tone: "blue" | "green" | "violet" | "amber" | "orange" | "red"; label: string; value: string; hint: string }) {
  const toneStyle =
    props.tone === "blue" ? styles.metricIcon_blue :
    props.tone === "green" ? styles.metricIcon_green :
    props.tone === "violet" ? styles.metricIcon_violet :
    props.tone === "amber" ? styles.metricIcon_amber :
    props.tone === "orange" ? styles.metricIcon_orange :
    styles.metricIcon_red;
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, toneStyle]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.metricLabel}>{props.label}</Text>
        <Text style={styles.metricValue}>{props.value}</Text>
        <Text style={styles.metricHint}>{props.hint}</Text>
      </View>
    </View>
  );
}

function MonthlyBars(props: { rows: { key: string; label: string; amount: number }[]; currency: string }) {
  const max = Math.max(...props.rows.map((row) => row.amount), 1);
  return (
    <View style={styles.monthChart}>
      {props.rows.map((row) => {
        const height = Math.max(4, Math.round((row.amount / max) * 120));
        return (
          <View key={row.key} style={styles.monthColumn}>
            <View style={styles.monthBarTrack}>
              <View style={[styles.monthBarFill, { height }]} />
            </View>
            <Text style={styles.monthLabel}>{row.label}</Text>
          </View>
        );
      })}
      <Text style={styles.chartHint}>Пиковое значение: {formatCurrencyAmount(max, props.currency)}</Text>
    </View>
  );
}

function CategoryStructure(props: { rows: { category: ExpenseCategory; amount: number; percent: number }[]; currency: string }) {
  if (props.rows.length === 0) {
    return <Text style={styles.stateText}>Нет данных за сезон.</Text>;
  }
  return (
    <View style={styles.structureList}>
      {props.rows.map((row) => (
        <View key={row.category} style={styles.structureRow}>
          <View style={[styles.categoryDot, { backgroundColor: categoryColors[row.category] }]} />
          <Text style={styles.structureLabel}>{expenseCategoryLabelsRu[row.category]}</Text>
          <Text style={styles.structureAmount}>{formatCurrencyAmount(row.amount, props.currency)}</Text>
          <Text style={styles.structurePercent}>{row.percent}%</Text>
        </View>
      ))}
    </View>
  );
}

function NodeBars(props: { rows: { key: string; label: string; amount: number; totalsLabel: string; percent: number }[]; currency: string }) {
  if (props.rows.length === 0) {
    return <Text style={styles.stateText}>Нет расходов по узлам.</Text>;
  }
  return (
    <View style={styles.nodeBars}>
      {props.rows.map((row) => (
        <View key={row.key} style={styles.nodeBarRow}>
          <View style={styles.nodeBarHeader}>
            <Text style={styles.nodeBarLabel}>{row.label}</Text>
            <Text style={styles.nodeBarAmount}>{row.totalsLabel || formatCurrencyAmount(row.amount, props.currency)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${row.percent}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function UninstalledList(props: {
  expenses: ExpenseItem[];
  busyExpenseId: string | null;
  onOpenExpense: (expense: ExpenseItem) => void;
}) {
  if (props.expenses.length === 0) {
    return <Text style={styles.stateText}>Нет купленных деталей в ожидании установки.</Text>;
  }
  return (
    <View style={styles.rowsList}>
      {props.expenses.map((expense) => (
        <Pressable
          key={expense.id}
          onPress={() => props.onOpenExpense(expense)}
          style={({ pressed }) => [styles.uninstalledRow, pressed && styles.uninstalledRowPressed]}
        >
          <View style={styles.partIcon}><Text style={styles.partIconText}>▣</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>{expense.title}</Text>
            <Text style={styles.eventMeta}>{expense.node?.name ?? "Без узла"} · {formatCurrencyAmount(expense.amount, expense.currency)}</Text>
          </View>
          <View style={[styles.smallAction, props.busyExpenseId === expense.id && styles.disabledButton]}>
            <Text style={styles.smallActionText}>Установлено</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function Insight(props: { label: string; value: string }) {
  return (
    <View style={styles.insightRow}>
      <Text style={styles.insightLabel}>{props.label}</Text>
      <Text style={styles.insightValue}>{props.value}</Text>
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
    gap: 12,
  },
  headerCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 16,
    gap: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  title: {
    color: c.textPrimary,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 4,
    color: c.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  addButton: {
    borderRadius: 14,
    backgroundColor: c.primaryAction,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButtonText: {
    color: c.onPrimaryAction,
    fontSize: 12,
    fontWeight: "900",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filtersCollapseButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardSubtle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersCollapseButtonPressed: {
    opacity: 0.85,
  },
  filtersCollapseButtonText: {
    color: c.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  filtersSectionContent: {
    gap: 10,
  },
  filtersExpandedContent: {
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: c.primaryAction,
    backgroundColor: c.primaryAction,
  },
  chipText: {
    color: c.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  chipTextActive: {
    color: c.onPrimaryAction,
  },
  scopeText: {
    color: c.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 14,
  },
  sectionTitle: {
    color: c.textPrimary,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionAction: {
    minWidth: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionActionText: {
    color: c.textMuted,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 28,
  },
  sectionActionCompact: {
    minWidth: 0,
    minHeight: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sectionActionCompactText: {
    color: c.textSecondary,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "800",
  },
  sectionBody: {
    marginTop: 12,
    gap: 10,
  },
  stateCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 18,
    gap: 8,
  },
  stateTitle: {
    color: c.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  stateText: {
    color: c.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  metricsGrid: {
    gap: 10,
  },
  metricCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 14,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
  },
  metricIcon_blue: { backgroundColor: "rgba(37,99,235,0.35)" },
  metricIcon_green: { backgroundColor: "rgba(34,197,94,0.3)" },
  metricIcon_violet: { backgroundColor: "rgba(139,92,246,0.32)" },
  metricIcon_amber: { backgroundColor: "rgba(245,158,11,0.34)" },
  metricIcon_orange: { backgroundColor: "rgba(234,88,12,0.34)" },
  metricIcon_red: { backgroundColor: "rgba(239,68,68,0.34)" },
  metricLabel: {
    color: c.textMeta,
    fontSize: 11,
    fontWeight: "800",
  },
  metricValue: {
    marginTop: 4,
    color: c.textPrimary,
    fontSize: 21,
    fontWeight: "900",
  },
  metricHint: {
    marginTop: 2,
    color: c.textMuted,
    fontSize: 11,
  },
  field: {
    gap: 5,
  },
  smallLabel: {
    color: c.textMeta,
    fontSize: 12,
    fontWeight: "800",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardSubtle,
    color: c.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  twoCols: {
    flexDirection: "row",
    gap: 10,
  },
  filterChips: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardSubtle,
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
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: c.onPrimaryAction,
  },
  primaryButton: {
    borderRadius: 14,
    backgroundColor: c.primaryAction,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: c.onPrimaryAction,
    fontSize: 13,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.6,
  },
  monthChart: {
    minHeight: 170,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
    paddingTop: 12,
  },
  monthColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  monthBarTrack: {
    height: 128,
    width: "100%",
    borderRadius: 999,
    backgroundColor: c.cardSubtle,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  monthBarFill: {
    width: "100%",
    borderRadius: 999,
    backgroundColor: c.primaryAction,
  },
  monthLabel: {
    color: c.textMuted,
    fontSize: 10,
  },
  chartHint: {
    position: "absolute",
    left: 0,
    bottom: -18,
    color: c.textMuted,
    fontSize: 11,
  },
  structureList: {
    gap: 10,
  },
  structureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  structureLabel: {
    flex: 1,
    color: c.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  structureAmount: {
    color: c.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  structurePercent: {
    width: 40,
    color: c.textMuted,
    fontSize: 12,
    textAlign: "right",
  },
  nodeBars: {
    gap: 12,
  },
  nodeBarRow: {
    gap: 7,
  },
  nodeBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  nodeBarLabel: {
    flex: 1,
    color: c.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  nodeBarAmount: {
    color: c.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  progressTrack: {
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
  rowsList: {
    gap: 10,
  },
  uninstalledRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 10,
  },
  uninstalledRowPressed: {
    opacity: 0.82,
  },
  partIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.cardSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  partIconText: {
    color: c.primaryAction,
    fontSize: 15,
    fontWeight: "900",
  },
  smallAction: {
    borderRadius: 999,
    backgroundColor: "rgba(245,158,11,0.18)",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  smallActionText: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "900",
  },
  insightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 10,
  },
  insightLabel: {
    color: c.textSecondary,
    fontSize: 13,
  },
  insightValue: {
    color: c.textPrimary,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
  eventCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 12,
  },
  eventMeta: {
    color: c.textMeta,
    fontSize: 11,
    fontWeight: "700",
  },
  eventTitle: {
    marginTop: 5,
    color: c.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  eventNode: {
    marginTop: 4,
    color: c.textSecondary,
    fontSize: 12,
  },
  eventAmount: {
    marginTop: 6,
    color: c.primaryAction,
    fontSize: 14,
    fontWeight: "900",
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
  actionButtonText: {
    color: c.onPrimaryAction,
    fontSize: 12,
    fontWeight: "900",
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
    fontWeight: "900",
  },
  emptyInline: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
    padding: 12,
  },
});
