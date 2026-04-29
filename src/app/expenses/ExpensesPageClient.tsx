"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GarageSidebar } from "@/app/garage/_components/GarageSidebar";
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
  GarageVehicleItem,
  NodeTreeItem,
} from "@mototwin/types";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));
const SIDEBAR_COLLAPSED_KEY = "expenses.sidebar.collapsed";

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

function formatCurrencyAmount(amount: number, currency: string): string {
  return `${formatExpenseAmountRu(amount)} ${currency}`;
}

function formatAverageMonthly(rows: ExpenseAmountByCurrency[]): string {
  if (rows.length === 0) {
    return "—";
  }
  return rows
    .map((row) => `${formatExpenseAmountRu(row.totalAmount / 12)} ${row.currency}`)
    .join(" · ");
}

function getInstallationStatusLabel(expense: ExpenseItem): string {
  if (expense.installStatus === "NOT_APPLICABLE") {
    return expenseInstallStatusLabelsRu.NOT_APPLICABLE;
  }
  return expense.installationStatus === "NOT_INSTALLED"
    ? "Куплено, не установлено"
    : "Установлено";
}

function getVehicleLabel(vehicle: GarageVehicleItem): string {
  return vehicle.nickname || `${vehicle.brand.name} ${vehicle.model.name}`;
}

function getExpenseVehicleLabel(expense: ExpenseItem): string {
  if (!expense.vehicle) {
    return "Мотоцикл";
  }
  return expense.vehicle.nickname || `${expense.vehicle.brandName} ${expense.vehicle.modelName}`;
}

function collectNodeAndDescendantIds(nodes: NodeTreeItem[], targetNodeId: string): Set<string> {
  const addSubtree = (node: NodeTreeItem, result: Set<string>) => {
    result.add(node.id);
    for (const child of node.children) {
      addSubtree(child, result);
    }
  };

  for (const node of nodes) {
    if (node.id === targetNodeId) {
      const result = new Set<string>();
      addSubtree(node, result);
      return result;
    }
    const childIds = collectNodeAndDescendantIds(node.children, targetNodeId);
    if (childIds.size > 0) {
      return childIds;
    }
  }

  return new Set();
}

function sumByCurrency(expenses: ExpenseItem[], currency: string): number {
  return expenses
    .filter((expense) => expense.currency === currency)
    .reduce((sum, expense) => sum + expense.amount, 0);
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
    return monthKey;
  }
  return date.toLocaleDateString("ru-RU", { month: "long" });
}

export function ExpensesPageClient(props: {
  vehicleId?: string;
  title: string;
  subtitle: string;
  backHref?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedYearDefault = Number(searchParams.get("year")) || new Date().getFullYear();
  const vehicleIdFromQuery = searchParams.get("vehicleId")?.trim() || "";
  const nodeIdFromQuery = searchParams.get("nodeId")?.trim() || "";
  const effectiveVehicleId = props.vehicleId ?? vehicleIdFromQuery;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedYear, setSelectedYear] = useState(selectedYearDefault);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [nodeScopeIds, setNodeScopeIds] = useState<Set<string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filtersPanelRef = useRef<HTMLDivElement | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    vehicleId: effectiveVehicleId,
    title: "",
    amount: "",
    currency: "RUB",
    category: "PART" as ExpenseCategory,
    installStatus: "BOUGHT_NOT_INSTALLED" as ExpenseInstallStatus,
    expenseDate: todayYmd(),
    comment: "",
  });
  const [filters, setFilters] = useState({
    vehicleId: effectiveVehicleId,
    category: "",
    installStatus: "",
    installationStatus: "",
    currency: "",
    nodeId: nodeIdFromQuery,
    monthKey: "",
    source: "",
    search: "",
  });

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
        setSidebarCollapsed(true);
      }
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Ignore persistence failures.
      }
      return next;
    });
  }, []);

  const yearOptions = useMemo(() => {
    const set = new Set([selectedYearDefault, selectedYear, ...years]);
    return Array.from(set).filter(Number.isFinite).sort((a, b) => b - a);
  }, [selectedYear, selectedYearDefault, years]);

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        if (filters.vehicleId && expense.vehicleId !== filters.vehicleId) return false;
        if (filters.category && expense.category !== filters.category) return false;
        if (filters.installStatus && expense.installStatus !== filters.installStatus) return false;
        if (filters.installationStatus === "NOT_INSTALLED" && expense.installationStatus !== "NOT_INSTALLED") return false;
        if (filters.installationStatus === "INSTALLED" && expense.installationStatus !== "INSTALLED") return false;
        if (filters.installationStatus === "NOT_APPLICABLE" && expense.installStatus !== "NOT_APPLICABLE") return false;
        if (filters.currency && expense.currency !== filters.currency) return false;
        if (filters.nodeId) {
          if (nodeScopeIds && nodeScopeIds.size > 0) {
            if (!expense.nodeId || !nodeScopeIds.has(expense.nodeId)) return false;
          } else if (expense.nodeId !== filters.nodeId) {
            return false;
          }
        }
        if (filters.monthKey && getExpenseMonthKeyFromIso(expense.expenseDate) !== filters.monthKey) return false;
        if (filters.source === "service" && !expense.serviceEventId) return false;
        if (filters.source === "wishlist" && !expense.shoppingListItemId) return false;
        if (filters.source === "manual" && (expense.serviceEventId || expense.shoppingListItemId)) return false;
        if (filters.search.trim()) {
          const query = filters.search.trim().toLowerCase();
          const haystack = [
            expense.title,
            expense.comment ?? "",
            expense.node?.name ?? "",
            expense.partSku ?? "",
            getExpenseVehicleLabel(expense),
            expenseCategoryLabelsRu[expense.category],
            getInstallationStatusLabel(expense),
          ].join(" ").toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      }),
    [expenses, filters, nodeScopeIds]
  );

  const visibleAnalytics = useMemo(
    () => buildExpenseAnalyticsFromItems(filteredExpenses, selectedYear),
    [filteredExpenses, selectedYear]
  );

  const currencyOptions = useMemo(
    () => Array.from(new Set(expenses.map((expense) => expense.currency).filter(Boolean))).sort((a, b) => a.localeCompare(b, "en")),
    [expenses]
  );
  const defaultCurrency = currencyOptions.includes("RUB") ? "RUB" : currencyOptions[0] || "RUB";
  const primaryCurrency = filters.currency || defaultCurrency;

  const nodeOptions = useMemo(
    () =>
      Array.from(
        new Map(
          expenses
            .filter((expense) => expense.nodeId && expense.node?.name)
            .map((expense) => [expense.nodeId as string, expense.node!.name])
        ).entries()
      ).sort((a, b) => a[1].localeCompare(b[1], "ru-RU")),
    [expenses]
  );

  const monthOptions = useMemo(() => {
    const months = new Map<string, string>();
    for (const expense of expenses) {
      const key = getExpenseMonthKeyFromIso(expense.expenseDate);
      months.set(key, getFullMonthLabel(key));
    }
    return Array.from(months.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [expenses]);

  const selectedYearExpenses = useMemo(
    () => filteredExpenses.filter((expense) => {
      const date = new Date(expense.expenseDate);
      return !Number.isNaN(date.getTime()) && date.getFullYear() === selectedYear;
    }),
    [filteredExpenses, selectedYear]
  );

  const monthlySeries = useMemo(() => {
    const rows = Array.from({ length: 12 }, (_, index) => {
      const key = `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
      return {
        key,
        label: getMonthLabel(key),
        amount: 0,
      };
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

  const categoryBreakdown = useMemo(() => {
    const total = sumByCurrency(selectedYearExpenses, primaryCurrency);
    return categoryOptions
      .map((category) => {
        const amount = selectedYearExpenses
          .filter((expense) => expense.currency === primaryCurrency && expense.category === category)
          .reduce((sum, expense) => sum + expense.amount, 0);
        return {
          category,
          label: expenseCategoryLabelsRu[category],
          amount,
          percent: total > 0 ? Math.round((amount / total) * 100) : 0,
          color: categoryColors[category],
        };
      })
      .filter((row) => row.amount > 0);
  }, [primaryCurrency, selectedYearExpenses]);

  const nodeRows = useMemo(() => {
    const rows = visibleAnalytics.byNode
      .map((row) => {
        const currencyTotal = row.totalsByCurrency.find((total) => total.currency === primaryCurrency)?.totalAmount ?? 0;
        return {
          key: row.key,
          label: row.label,
          amount: currencyTotal,
          totalsLabel: formatTotals(row.totalsByCurrency),
        };
      })
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    const max = Math.max(...rows.map((row) => row.amount), 1);
    return rows.map((row) => ({ ...row, percent: Math.round((row.amount / max) * 100) }));
  }, [primaryCurrency, visibleAnalytics.byNode]);

  const totalInPrimaryCurrency = sumByCurrency(filteredExpenses, primaryCurrency);
  const seasonTotalInPrimaryCurrency = sumByCurrency(selectedYearExpenses, primaryCurrency);
  const uninstalledExpenses = filteredExpenses
    .filter((expense) => expense.purchaseStatus === "PURCHASED" && expense.installationStatus === "NOT_INSTALLED" && expense.serviceEventId == null)
    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  const topNode = nodeRows[0] ?? null;
  const latestExpense = [...filteredExpenses].sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())[0] ?? null;
  const hasFilters = useMemo(() => {
    const hasVehicleFilter = Boolean(filters.vehicleId && filters.vehicleId !== effectiveVehicleId);
    return Boolean(
      hasVehicleFilter ||
      filters.category ||
      filters.installStatus ||
      filters.installationStatus ||
      filters.currency ||
      filters.nodeId ||
      filters.monthKey ||
      filters.source ||
      filters.search.trim()
    );
  }, [effectiveVehicleId, filters]);

  async function load(year = selectedYear) {
    try {
      setIsLoading(true);
      setError("");
      const shouldLoadNodeScope = Boolean(effectiveVehicleId && nodeIdFromQuery);
      const [expensesResult, vehiclesResult, nodeTreeResult] = await Promise.all([
        api.getExpenses({ year, vehicleId: effectiveVehicleId || undefined }),
        effectiveVehicleId ? Promise.resolve(null) : api.getGarageVehicles(),
        shouldLoadNodeScope ? api.getNodeTree(effectiveVehicleId) : Promise.resolve(null),
      ]);
      setExpenses(expensesResult.expenses);
      setYears(expensesResult.years);
      setNodeScopeIds(
        nodeTreeResult && nodeIdFromQuery
          ? collectNodeAndDescendantIds(nodeTreeResult.nodeTree ?? [], nodeIdFromQuery)
          : null
      );
      if (vehiclesResult) {
        setVehicles(vehiclesResult.vehicles ?? []);
        setForm((prev) => ({ ...prev, vehicleId: prev.vehicleId || vehiclesResult.vehicles?.[0]?.id || "" }));
      }
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить расходы.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load(selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveVehicleId, selectedYear]);

  async function createExpense() {
    const amount = Number(form.amount.replace(",", "."));
    if (!form.vehicleId || !form.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Заполните мотоцикл, название и положительную сумму.");
      return;
    }
    try {
      setIsSaving(true);
      setError("");
      await api.createExpense({
        vehicleId: form.vehicleId,
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
      await load(selectedYear);
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось сохранить расход.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteExpense(expenseId: string) {
    try {
      setError("");
      await api.deleteExpense(expenseId);
      await load(selectedYear);
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось удалить расход.");
    }
  }

  async function markExpenseInstalled(expenseId: string) {
    try {
      setError("");
      await api.markExpenseInstalled(expenseId, {
        installedAt: todayYmd(),
      });
      await load(selectedYear);
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось отметить расход как установленный.");
    }
  }

  function navigateBack() {
    if (props.backHref) {
      router.push(props.backHref);
      return;
    }
    if (window.history.length > 1) {
      router.back();
      return;
    }
    if (effectiveVehicleId) {
      router.push(`/vehicles/${effectiveVehicleId}`);
      return;
    }
    router.push("/garage");
  }

  function resetFilters() {
    setFilters({
      vehicleId: effectiveVehicleId,
      category: "",
      installStatus: "",
      installationStatus: "",
      currency: "",
      nodeId: "",
      monthKey: "",
      source: "",
      search: "",
    });
  }

  function openBoughtPartsPage() {
    if (!effectiveVehicleId) {
      setFilters((prev) => ({
        ...prev,
        source: "wishlist",
        installStatus: "BOUGHT_NOT_INSTALLED",
        installationStatus: "NOT_INSTALLED",
      }));
      setShowFilters(true);
      return;
    }
    router.push(`/vehicles/${effectiveVehicleId}/parts?partsStatus=BOUGHT`);
  }

  function openInstallFromExpense(expense: ExpenseItem) {
    if (expense.shoppingListItemId) {
      const q = new URLSearchParams({
        partsStatus: "BOUGHT",
        wishlistItemId: expense.shoppingListItemId,
        installWishlistItemId: expense.shoppingListItemId,
      });
      router.push(`/vehicles/${expense.vehicleId}/parts?${q.toString()}`);
      return;
    }
    void markExpenseInstalled(expense.id);
  }

  function openFiltersFromTable() {
    setShowFilters(true);
    requestAnimationFrame(() => {
      filtersPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <main style={pageShellStyle}>
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: `${sidebarCollapsed ? 64 : 220}px minmax(0, 1fr)`,
          alignItems: "start",
          transition: "grid-template-columns 0.18s ease",
        }}
      >
        <GarageSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <section style={contentStyle}>
          <header style={headerStyle}>
            <div>
              <button type="button" onClick={navigateBack} style={backButtonStyle}>
                ← Назад
              </button>
              <h1 style={titleStyle}>{props.title}</h1>
              <p style={subtitleStyle}>{props.subtitle}</p>
              {nodeIdFromQuery ? (
                <p style={scopePillStyle}>Фильтр из дерева: выбранный узел и все дочерние узлы</p>
              ) : null}
            </div>
            <div style={headerControlsStyle}>
              {!props.vehicleId ? (
                <select value={filters.vehicleId} onChange={(event) => setFilters((prev) => ({ ...prev, vehicleId: event.target.value }))} style={controlStyle}>
                  <option value="">Все мотоциклы</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{getVehicleLabel(vehicle)}</option>
                  ))}
                </select>
              ) : null}
              <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} style={controlStyle}>
                {yearOptions.map((year) => <option key={year} value={year}>Сезон {year}</option>)}
              </select>
              <select value={filters.monthKey} onChange={(event) => setFilters((prev) => ({ ...prev, monthKey: event.target.value }))} style={controlStyle}>
                <option value="">Все месяцы</option>
                {monthOptions.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}
              </select>
              <button type="button" onClick={() => setShowAddForm((prev) => !prev)} style={primaryButtonStyle}>
                + Добавить расход
              </button>
            </div>
          </header>

          {error ? <StateCard isError>{error}</StateCard> : null}

          {showAddForm ? (
            <Panel title="Добавить технический расход">
              <div style={formGridStyle}>
                {!effectiveVehicleId ? (
                  <Field label="Мотоцикл">
                    <select value={form.vehicleId} onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))} style={fieldStyle}>
                      <option value="">Выберите</option>
                      {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{getVehicleLabel(vehicle)}</option>)}
                    </select>
                  </Field>
                ) : null}
                <Field label="Название">
                  <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} style={fieldStyle} />
                </Field>
                <Field label="Сумма">
                  <input value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} inputMode="decimal" style={fieldStyle} />
                </Field>
                <Field label="Валюта">
                  <input value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))} style={fieldStyle} />
                </Field>
                <Field label="Дата">
                  <input type="date" value={form.expenseDate} onChange={(e) => setForm((prev) => ({ ...prev, expenseDate: e.target.value }))} style={fieldStyle} />
                </Field>
                <Field label="Категория">
                  <select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as ExpenseCategory }))} style={fieldStyle}>
                    {categoryOptions.map((category) => <option key={category} value={category}>{expenseCategoryLabelsRu[category]}</option>)}
                  </select>
                </Field>
                <Field label="Статус">
                  <select value={form.installStatus} onChange={(e) => setForm((prev) => ({ ...prev, installStatus: e.target.value as ExpenseInstallStatus }))} style={fieldStyle}>
                    {installStatusOptions.map((status) => <option key={status} value={status}>{expenseInstallStatusLabelsRu[status]}</option>)}
                  </select>
                </Field>
                <Field label="Комментарий">
                  <input value={form.comment} onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))} style={fieldStyle} />
                </Field>
              </div>
              <button type="button" onClick={createExpense} disabled={isSaving} style={{ ...primaryButtonStyle, marginTop: 14, opacity: isSaving ? 0.7 : 1 }}>
                {isSaving ? "Сохраняю..." : "Сохранить расход"}
              </button>
            </Panel>
          ) : null}

          <div ref={filtersPanelRef}>
            <Panel
              title="Фильтры"
              action={
                <div style={filtersPanelHeaderRowStyle}>
                  {!showFilters ? (
                    <span style={filtersHeaderCompactTextStyle}>
                      {hasFilters ? "Есть активные фильтры" : "Фильтры свернуты"}
                    </span>
                  ) : null}
                  {hasFilters && !showFilters ? (
                    <button type="button" onClick={resetFilters} style={filtersHeaderCompactButtonStyle}>
                      Сбросить
                    </button>
                  ) : null}
                  <button type="button" onClick={() => setShowFilters((prev) => !prev)} style={filtersHeaderCompactButtonStyle}>
                    {showFilters ? "Свернуть" : "Развернуть"}
                  </button>
                </div>
              }
            >
              {showFilters ? (
                <>
                  <div style={filtersInlineRowStyle}>
                    <select aria-label="Категория расходов" value={filters.category} onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))} style={{ ...fieldStyle, ...compactFilterControlStyle }}>
                      <option value="">Категория: все</option>
                      {categoryOptions.map((category) => <option key={category} value={category}>{expenseCategoryLabelsRu[category]}</option>)}
                    </select>
                    <select aria-label="Статус расходов" value={filters.installStatus} onChange={(e) => setFilters((prev) => ({ ...prev, installStatus: e.target.value }))} style={{ ...fieldStyle, ...compactFilterControlStyle }}>
                      <option value="">Статус: все</option>
                      {installStatusOptions.map((status) => <option key={status} value={status}>{expenseInstallStatusLabelsRu[status]}</option>)}
                    </select>
                    <select aria-label="Статус установки" value={filters.installationStatus} onChange={(e) => setFilters((prev) => ({ ...prev, installationStatus: e.target.value }))} style={{ ...fieldStyle, ...compactFilterControlStyle }}>
                      <option value="">Установка: все</option>
                      <option value="NOT_INSTALLED">Куплено, не установлено</option>
                      <option value="INSTALLED">Установлено</option>
                      <option value="NOT_APPLICABLE">Не требует установки</option>
                    </select>
                    <select aria-label="Фильтр по узлу" value={filters.nodeId} onChange={(e) => setFilters((prev) => ({ ...prev, nodeId: e.target.value }))} style={{ ...fieldStyle, ...compactFilterControlStyle }}>
                      <option value="">Узел: все</option>
                      {nodeOptions.map(([nodeId, nodeName]) => <option key={nodeId} value={nodeId}>{nodeName}</option>)}
                    </select>
                    <select aria-label="Фильтр по валюте" value={filters.currency} onChange={(e) => setFilters((prev) => ({ ...prev, currency: e.target.value }))} style={{ ...fieldStyle, ...compactFilterControlStyle }}>
                      <option value="">Валюта: все</option>
                      {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </select>
                    <select aria-label="Фильтр по источнику" value={filters.source} onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))} style={{ ...fieldStyle, ...compactFilterControlStyle }}>
                      <option value="">Источник: все</option>
                      <option value="service">ServiceEvent</option>
                      <option value="wishlist">Список покупок</option>
                      <option value="manual">Ручной расход</option>
                    </select>
                    <button type="button" onClick={resetFilters} style={{ ...ghostButtonStyle, marginTop: 0, whiteSpace: "nowrap" }}>Сбросить</button>
                  </div>
                </>
              ) : null}
            </Panel>
          </div>

          {isLoading ? (
            <StateCard>Загружаю расходы...</StateCard>
          ) : (
            <>
              <section style={metricGridStyle}>
                <MetricCard tone="blue" label="Всего расходов" value={formatTotals(visibleAnalytics.totalsByCurrency)} hint="за выбранный период" icon="₽" />
                <MetricCard tone="green" label="За сезон" value={formatTotals(visibleAnalytics.selectedYearTotalsByCurrency)} hint="с начала сезона" icon="↗" />
                <MetricCard tone="violet" label="Событий" value={String(visibleAnalytics.selectedYearExpenseCount)} hint="всего расходов" icon="☷" />
                <MetricCard tone="amber" label="Средний расход в месяц" value={formatAverageMonthly(visibleAnalytics.selectedYearTotalsByCurrency)} hint="среднее значение" icon="⌁" />
                <MetricCard tone="orange" label="Куплено, не установлено" value={`${visibleAnalytics.boughtNotInstalledCount} позиции`} hint={formatTotals(visibleAnalytics.boughtNotInstalledTotalsByCurrency)} icon="♙" />
                <MetricCard tone="red" label="Самый дорогой узел" value={topNode ? topNode.label : "—"} hint={topNode ? `${formatCurrencyAmount(topNode.amount, primaryCurrency)} · ${Math.round((topNode.amount / Math.max(totalInPrimaryCurrency, 1)) * 100)}%` : "нет данных"} icon="☆" />
              </section>

              <section style={dashboardGridStyle}>
                <div style={leftColumnStyle}>
                  <Panel
                    title="Расходы по месяцам"
                    action={
                      <select value={filters.currency} onChange={(event) => setFilters((prev) => ({ ...prev, currency: event.target.value }))} style={miniSelectStyle}>
                        <option value="">Все валюты</option>
                        {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                      </select>
                    }
                  >
                    <MonthlyChart rows={monthlySeries} currency={primaryCurrency} />
                  </Panel>
                  <Panel title="По узлам">
                    <NodeBars rows={nodeRows} currency={primaryCurrency} />
                  </Panel>
                </div>

                <div style={rightColumnStyle}>
                  <Panel title="Структура расходов">
                    <CategoryDonut rows={categoryBreakdown} total={seasonTotalInPrimaryCurrency} currency={primaryCurrency} />
                  </Panel>
                  <Panel
                    title="Куплено, не установлено"
                    action={
                      <button
                        type="button"
                        onClick={openBoughtPartsPage}
                        style={chevronButtonStyle}
                        aria-label="Открыть подбор с фильтром Куплено"
                        title="Открыть подбор с фильтром Куплено"
                      >
                        ›
                      </button>
                    }
                  >
                    <UninstalledList
                      expenses={uninstalledExpenses.slice(0, 3)}
                      onOpenAll={openBoughtPartsPage}
                      onOpenExpense={openInstallFromExpense}
                    />
                  </Panel>
                  <Panel title="Быстрые выводы">
                    <Insights
                      biggestMonth={monthlySeries.reduce((best, row) => row.amount > best.amount ? row : best, monthlySeries[0] ?? { key: "", label: "—", amount: 0 })}
                      topNode={topNode}
                      latestExpense={latestExpense}
                      currencies={currencyOptions}
                    />
                  </Panel>
                </div>
              </section>

              <Panel
                title="Все расходы"
                action={
                  <div style={tableActionsStyle}>
                    <input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Поиск" style={searchInputStyle} />
                    <button type="button" onClick={openFiltersFromTable} style={tableButtonStyle}>Фильтры</button>
                  </div>
                }
              >
                <ExpenseTable
                  expenses={filteredExpenses}
                  hasFilters={hasFilters}
                  onDelete={deleteExpense}
                  onMarkInstalled={markExpenseInstalled}
                  onOpenServiceEvent={(expense) => router.push(`/vehicles/${expense.vehicleId}/service-log?serviceEventId=${encodeURIComponent(expense.serviceEventId!)}`)}
                />
              </Panel>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <label style={fieldLabelStyle}>
      {props.label}
      {props.children}
    </label>
  );
}

function StateCard(props: { children: ReactNode; isError?: boolean }) {
  return (
    <div style={{ ...panelStyle, color: props.isError ? c.error : c.textSecondary }}>
      {props.children}
    </div>
  );
}

function Panel(props: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <h2 style={panelTitleStyle}>{props.title}</h2>
        {props.action}
      </div>
      {props.children != null ? <div style={{ marginTop: 12 }}>{props.children}</div> : null}
    </section>
  );
}

function MetricCard(props: { label: string; value: string; hint: string; icon: string; tone: "blue" | "green" | "violet" | "amber" | "orange" | "red" }) {
  const tone = metricTones[props.tone];
  return (
    <article style={metricCardStyle}>
      <div style={{ ...metricIconStyle, background: tone.background, color: tone.color }}>{props.icon}</div>
      <div>
        <p style={metricLabelStyle}>{props.label}</p>
        <p style={metricValueStyle}>{props.value}</p>
        <p style={metricHintStyle}>{props.hint}</p>
      </div>
    </article>
  );
}

function MonthlyChart(props: { rows: { key: string; label: string; amount: number }[]; currency: string }) {
  const max = Math.max(...props.rows.map((row) => row.amount), 1);
  const points = props.rows.map((row, index) => {
    const x = 22 + index * 52;
    const y = 150 - (row.amount / max) * 118;
    return `${x},${y}`;
  }).join(" ");
  return (
    <div style={chartWrapStyle}>
      <svg viewBox="0 0 620 190" style={{ width: "100%", height: 190, display: "block" }}>
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1="18" x2="604" y1={32 + line * 39} y2={32 + line * 39} stroke="rgba(148,163,184,0.14)" strokeDasharray="3 4" />
        ))}
        {props.rows.map((row, index) => {
          const height = (row.amount / max) * 118;
          const x = 14 + index * 52;
          return (
            <g key={row.key}>
              <rect x={x} y={150 - height} width="18" height={height} rx="5" fill="rgba(37, 99, 235, 0.45)" />
              <text x={x + 9} y="174" textAnchor="middle" fill={c.textMuted} fontSize="10">{row.label}</text>
            </g>
          );
        })}
        <polyline points={points} fill="none" stroke={c.primaryAction} strokeWidth="2.5" />
        {props.rows.map((row, index) => {
          const x = 22 + index * 52;
          const y = 150 - (row.amount / max) * 118;
          return <circle key={row.key} cx={x} cy={y} r="4" fill={c.primaryAction} stroke={c.card} strokeWidth="2" />;
        })}
      </svg>
      <div style={chartFooterStyle}>
        <span>Пиковое значение: {formatCurrencyAmount(max, props.currency)}</span>
      </div>
    </div>
  );
}

function CategoryDonut(props: { rows: { category: ExpenseCategory; label: string; amount: number; percent: number; color: string }[]; total: number; currency: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const segments = props.rows.map((row, index) => {
    const previousPercent = props.rows
      .slice(0, index)
      .reduce((sum, previous) => sum + previous.percent, 0);
    return {
      ...row,
      dash: (row.percent / 100) * circumference,
      offset: -((previousPercent / 100) * circumference),
    };
  });
  return (
    <div style={donutGridStyle}>
      <div style={donutWrapStyle}>
        <svg viewBox="0 0 120 120" style={{ width: 150, height: 150, transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="18" />
          {segments.map((row) => (
              <circle
                key={row.category}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={row.color}
                strokeWidth="18"
                strokeDasharray={`${row.dash} ${circumference - row.dash}`}
                strokeDashoffset={row.offset}
              />
          ))}
        </svg>
        <div style={donutCenterStyle}>
          <strong>{formatCurrencyAmount(props.total, props.currency)}</strong>
          <span>Всего</span>
        </div>
      </div>
      <div style={legendStyle}>
        {props.rows.length === 0 ? <p style={emptyTextStyle}>Нет данных за сезон.</p> : null}
        {props.rows.map((row) => (
          <div key={row.category} style={legendRowStyle}>
            <span style={{ ...legendDotStyle, background: row.color }} />
            <span style={{ flex: 1 }}>{row.label}</span>
            <strong>{formatCurrencyAmount(row.amount, props.currency)}</strong>
            <span style={mutedCellStyle}>{row.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NodeBars(props: { rows: { key: string; label: string; amount: number; totalsLabel: string; percent: number }[]; currency: string }) {
  if (props.rows.length === 0) {
    return <p style={emptyTextStyle}>Нет расходов по узлам за выбранный период.</p>;
  }
  return (
    <div style={nodeBarsStyle}>
      {props.rows.map((row) => (
        <div key={row.key} style={nodeBarRowStyle}>
          <span style={nodeBarLabelStyle}>{row.label}</span>
          <div style={nodeBarTrackStyle}><div style={{ ...nodeBarFillStyle, width: `${row.percent}%` }} /></div>
          <strong style={nodeBarAmountStyle}>{row.totalsLabel || formatCurrencyAmount(row.amount, props.currency)}</strong>
        </div>
      ))}
    </div>
  );
}

function UninstalledList(props: {
  expenses: ExpenseItem[];
  onOpenAll: () => void;
  onOpenExpense: (expense: ExpenseItem) => void;
}) {
  if (props.expenses.length === 0) {
    return <p style={emptyTextStyle}>Нет купленных деталей в ожидании установки.</p>;
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {props.expenses.map((expense) => (
        <button
          key={expense.id}
          type="button"
          onClick={() => props.onOpenExpense(expense)}
          style={uninstalledRowButtonStyle}
          title="Установить позицию через страницу подбора"
        >
          <div style={partIconStyle}>▣</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={partTitleStyle}>{expense.title}</div>
            <div style={partMetaStyle}>{expense.node?.name ?? "Без узла"}</div>
          </div>
          <strong style={partAmountStyle}>{formatCurrencyAmount(expense.amount, expense.currency)}</strong>
          <span style={warningBadgeStyle}>Не установлено</span>
        </button>
      ))}
      <button type="button" onClick={props.onOpenAll} style={linkButtonStyle}>Показать все ›</button>
    </div>
  );
}

function Insights(props: {
  biggestMonth: { key: string; label: string; amount: number };
  topNode: { label: string; amount: number } | null;
  latestExpense: ExpenseItem | null;
  currencies: string[];
}) {
  return (
    <div style={insightsStyle}>
      <InsightRow icon="▦" label="Самый дорогой месяц" value={props.biggestMonth.amount > 0 ? getFullMonthLabel(props.biggestMonth.key) : "—"} />
      <InsightRow icon="◔" label="Больше всего затрат" value={props.topNode?.label ?? "—"} />
      <InsightRow icon="◷" label="Последний расход" value={props.latestExpense ? new Date(props.latestExpense.expenseDate).toLocaleDateString("ru-RU") : "—"} />
      <InsightRow icon="¤" label="Валюты" value={props.currencies.length > 0 ? `${props.currencies.join(", ")} отдельно` : "—"} />
    </div>
  );
}

function InsightRow(props: { icon: string; label: string; value: string }) {
  return (
    <div style={insightRowStyle}>
      <span style={insightIconStyle}>{props.icon}</span>
      <span style={{ color: c.textSecondary }}>{props.label}</span>
      <strong style={{ marginLeft: "auto", textAlign: "right" }}>{props.value}</strong>
    </div>
  );
}

function ExpenseTable(props: {
  expenses: ExpenseItem[];
  hasFilters: boolean;
  onDelete: (expenseId: string) => void;
  onMarkInstalled: (expenseId: string) => void;
  onOpenServiceEvent: (expense: ExpenseItem) => void;
}) {
  if (props.expenses.length === 0) {
    return (
      <p style={emptyTextStyle}>
        {props.hasFilters ? "По выбранным фильтрам расходов нет." : "Пока нет расходов. Добавьте первый расход на обслуживание, запчасти или ремонт."}
      </p>
    );
  }
  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Дата</th>
            <th style={thStyle}>Узел</th>
            <th style={thStyle}>Событие</th>
            <th style={thStyle}>Категория</th>
            <th style={thStyle}>Сумма</th>
            <th style={thStyle}>Статус</th>
            <th style={thStyle}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {props.expenses.map((expense) => (
            <tr key={expense.id} style={trStyle}>
              <td style={tdStyle}>{new Date(expense.expenseDate).toLocaleDateString("ru-RU")}</td>
              <td style={tdStyle}>{expense.node?.name ?? "Без узла"}</td>
              <td style={tdStyle}>{expense.title}</td>
              <td style={tdStyle}><span style={{ ...categoryDotStyle, background: categoryColors[expense.category] }} />{expenseCategoryLabelsRu[expense.category]}</td>
              <td style={{ ...tdStyle, fontWeight: 800 }}>{formatCurrencyAmount(expense.amount, expense.currency)}</td>
              <td style={tdStyle}><span style={statusBadgeStyle}>{getInstallationStatusLabel(expense)}</span></td>
              <td style={tdStyle}>
                <div style={rowActionsStyle}>
                  {expense.installationStatus === "NOT_INSTALLED" && expense.serviceEventId == null ? (
                    <button type="button" onClick={() => props.onMarkInstalled(expense.id)} style={rowActionButtonStyle}>
                      Установлено
                    </button>
                  ) : null}
                  {expense.serviceEventId ? (
                    <button type="button" onClick={() => props.onOpenServiceEvent(expense)} style={rowActionButtonStyle}>
                      Событие
                    </button>
                  ) : null}
                  <button type="button" onClick={() => props.onDelete(expense.id)} style={deleteButtonStyle}>
                    Удалить
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={tableFooterStyle}>Показано 1–{props.expenses.length} из {props.expenses.length}</div>
    </div>
  );
}

const pageShellStyle: CSSProperties = {
  width: "100%",
  flex: 1,
  minHeight: "100vh",
  background: "radial-gradient(circle at top right, rgba(37,99,235,0.12), transparent 30%), #080d12",
  color: c.textPrimary,
};

const contentStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: "12px 24px 24px",
  maxWidth: 1600,
  width: "100%",
  minWidth: 0,
  justifySelf: "center",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const titleStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 30,
  lineHeight: 1.1,
  fontWeight: 850,
};

const subtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: c.textSecondary,
  fontSize: 13,
};

const backButtonStyle: CSSProperties = {
  border: 0,
  background: "transparent",
  color: c.textMuted,
  padding: 0,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const scopePillStyle: CSSProperties = {
  display: "inline-flex",
  margin: "10px 0 0",
  border: `1px solid ${c.border}`,
  borderRadius: 999,
  padding: "6px 10px",
  background: "rgba(37,99,235,0.10)",
  color: c.textSecondary,
  fontSize: 12,
};

const headerControlsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: 8,
};

const controlStyle: CSSProperties = {
  border: `1px solid ${c.borderStrong}`,
  borderRadius: 10,
  background: "rgba(13,18,26,0.82)",
  color: c.textPrimary,
  colorScheme: "dark",
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 700,
};

const primaryButtonStyle: CSSProperties = {
  border: 0,
  borderRadius: 10,
  background: c.primaryAction,
  color: c.onPrimaryAction,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const panelStyle: CSSProperties = {
  border: `1px solid ${c.border}`,
  borderRadius: 12,
  background: "linear-gradient(180deg, rgba(20,27,36,0.96), rgba(13,18,26,0.96))",
  boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
  padding: 14,
};

const panelHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const panelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 850,
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 10,
};

const metricCardStyle: CSSProperties = {
  ...panelStyle,
  minHeight: 96,
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const metricTones = {
  blue: { background: "rgba(37,99,235,0.20)", color: "#60a5fa" },
  green: { background: "rgba(34,197,94,0.18)", color: "#86efac" },
  violet: { background: "rgba(139,92,246,0.20)", color: "#c4b5fd" },
  amber: { background: "rgba(245,158,11,0.20)", color: "#fbbf24" },
  orange: { background: "rgba(234,88,12,0.20)", color: "#fb923c" },
  red: { background: "rgba(239,68,68,0.20)", color: "#f87171" },
};

const metricIconStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
};

const metricLabelStyle: CSSProperties = {
  margin: 0,
  color: c.textMeta,
  fontSize: 11,
  fontWeight: 800,
};

const metricValueStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 22,
  lineHeight: 1.08,
  fontWeight: 900,
};

const metricHintStyle: CSSProperties = {
  margin: "3px 0 0",
  color: c.textMuted,
  fontSize: 11,
};

const dashboardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 1fr)",
  gap: 10,
};

const leftColumnStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const rightColumnStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const chartWrapStyle: CSSProperties = {
  minHeight: 218,
};

const chartFooterStyle: CSSProperties = {
  color: c.textMuted,
  fontSize: 12,
};

const miniSelectStyle: CSSProperties = {
  ...controlStyle,
  padding: "6px 9px",
  fontSize: 12,
};

const donutGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "170px minmax(0, 1fr)",
  alignItems: "center",
  gap: 14,
};

const donutWrapStyle: CSSProperties = {
  position: "relative",
  width: 160,
  height: 160,
  display: "grid",
  placeItems: "center",
};

const donutCenterStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 2,
  fontSize: 11,
  color: c.textMuted,
  textAlign: "center",
};

const legendStyle: CSSProperties = {
  display: "grid",
  gap: 9,
  fontSize: 13,
};

const legendRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: c.textSecondary,
};

const legendDotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 999,
};

const mutedCellStyle: CSSProperties = {
  minWidth: 38,
  textAlign: "right",
  color: c.textMuted,
};

const nodeBarsStyle: CSSProperties = {
  display: "grid",
  gap: 11,
};

const nodeBarRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "150px minmax(0, 1fr) 130px",
  alignItems: "center",
  gap: 12,
};

const nodeBarLabelStyle: CSSProperties = {
  color: c.textSecondary,
  fontSize: 13,
};

const nodeBarTrackStyle: CSSProperties = {
  height: 7,
  borderRadius: 999,
  background: "rgba(148,163,184,0.14)",
  overflow: "hidden",
};

const nodeBarFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: c.primaryAction,
};

const nodeBarAmountStyle: CSSProperties = {
  color: c.textSecondary,
  fontSize: 13,
  textAlign: "right",
};

const uninstalledRowButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  border: `1px solid ${c.border}`,
  borderRadius: 10,
  padding: 8,
  background: "rgba(255,255,255,0.025)",
  color: c.textPrimary,
  textAlign: "left",
  cursor: "pointer",
  width: "100%",
};

const partIconStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  background: "rgba(37,99,235,0.12)",
  color: c.primaryAction,
};

const partTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const partMetaStyle: CSSProperties = {
  marginTop: 2,
  color: c.textMuted,
  fontSize: 11,
};

const partAmountStyle: CSSProperties = {
  fontSize: 12,
};

const warningBadgeStyle: CSSProperties = {
  borderRadius: 999,
  background: "rgba(245,158,11,0.16)",
  color: "#fbbf24",
  padding: "4px 7px",
  fontSize: 11,
  fontWeight: 800,
};

const linkButtonStyle: CSSProperties = {
  border: 0,
  background: "transparent",
  color: c.primaryAction,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const insightsStyle: CSSProperties = {
  display: "grid",
  border: `1px solid ${c.border}`,
  borderRadius: 10,
  overflow: "hidden",
};

const insightRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  borderBottom: `1px solid ${c.border}`,
  padding: "10px 12px",
  fontSize: 13,
};

const insightIconStyle: CSSProperties = {
  color: c.textMuted,
  width: 22,
};

const tableActionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const searchInputStyle: CSSProperties = {
  ...controlStyle,
  width: 180,
  padding: "8px 10px",
};

const tableButtonStyle: CSSProperties = {
  ...controlStyle,
  cursor: "pointer",
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: CSSProperties = {
  color: c.textMuted,
  fontSize: 12,
  textAlign: "left",
  fontWeight: 800,
  padding: "8px 10px",
  borderBottom: `1px solid ${c.border}`,
};

const tdStyle: CSSProperties = {
  padding: "10px",
  borderBottom: `1px solid ${c.border}`,
  color: c.textSecondary,
  verticalAlign: "middle",
};

const trStyle: CSSProperties = {
  background: "rgba(255,255,255,0.01)",
};

const categoryDotStyle: CSSProperties = {
  display: "inline-block",
  width: 7,
  height: 7,
  borderRadius: 999,
  marginRight: 7,
};

const statusBadgeStyle: CSSProperties = {
  borderRadius: 999,
  background: "rgba(34,197,94,0.14)",
  color: "#86efac",
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 800,
};

const rowActionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const rowActionButtonStyle: CSSProperties = {
  border: `1px solid ${c.border}`,
  borderRadius: 8,
  background: c.cardSubtle,
  color: c.textPrimary,
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};

const deleteButtonStyle: CSSProperties = {
  ...rowActionButtonStyle,
  color: c.error,
};

const tableFooterStyle: CSSProperties = {
  paddingTop: 10,
  color: c.textMuted,
  fontSize: 12,
};

const emptyTextStyle: CSSProperties = {
  margin: 0,
  color: c.textSecondary,
  fontSize: 13,
};

const fieldLabelStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  color: c.textMeta,
  fontSize: 12,
  fontWeight: 800,
};

const fieldStyle: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: `1px solid ${c.borderStrong}`,
  backgroundColor: c.cardSubtle,
  color: c.textPrimary,
  padding: "10px 12px",
  fontSize: 13,
  colorScheme: "dark",
};

const filtersGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
};

const filtersInlineRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "center",
  gap: 8,
  overflowX: "auto",
  paddingBottom: 2,
};

const compactFilterControlStyle: CSSProperties = {
  minWidth: 150,
  padding: "8px 10px",
  fontSize: 12,
};

const filtersCollapsedHintStyle: CSSProperties = {
  margin: 0,
  color: c.textSecondary,
  fontSize: 13,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

const filtersCollapsedRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  minHeight: 28,
};

const filtersPanelHeaderRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const filtersHeaderCompactTextStyle: CSSProperties = {
  color: c.textSecondary,
  fontSize: 12,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

const filtersHeaderCompactButtonStyle: CSSProperties = {
  border: `1px solid ${c.borderStrong}`,
  backgroundColor: c.cardSubtle,
  color: c.textSecondary,
  borderRadius: 8,
  padding: "4px 8px",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.1,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const ghostButtonStyle: CSSProperties = {
  marginTop: 12,
  border: 0,
  background: "transparent",
  color: c.textMuted,
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const chevronButtonStyle: CSSProperties = {
  border: 0,
  background: "transparent",
  color: c.textMuted,
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
  padding: "0 4px",
};
