"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
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
  ExpenseAnalyticsRow,
  ExpenseAmountByCurrency,
  ExpenseCategory,
  ExpenseInstallStatus,
  ExpenseItem,
  GarageVehicleItem,
  NodeTreeItem,
} from "@mototwin/types";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

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

function getInstallationStatusLabel(expense: ExpenseItem): string {
  if (expense.installStatus === "NOT_APPLICABLE") {
    return expenseInstallStatusLabelsRu.NOT_APPLICABLE;
  }
  return expense.installationStatus === "NOT_INSTALLED"
    ? "Куплено, не установлено"
    : "Установлено";
}

function collectNodeAndDescendantIds(nodes: NodeTreeItem[], targetNodeId: string): Set<string> {
  const collect = (node: NodeTreeItem): Set<string> => {
    const ids = new Set([node.id]);
    for (const child of node.children) {
      for (const id of collect(child)) {
        ids.add(id);
      }
    }
    return ids;
  };

  for (const node of nodes) {
    if (node.id === targetNodeId) {
      return collect(node);
    }
    const childIds = collectNodeAndDescendantIds(node.children, targetNodeId);
    if (childIds.size > 0) {
      return childIds;
    }
  }

  return new Set();
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
  const [selectedYear, setSelectedYear] = useState(selectedYearDefault);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof api.getExpenses>>["analytics"] | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [nodeScopeIds, setNodeScopeIds] = useState<Set<string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
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
    category: "",
    installStatus: "",
    installationStatus: "",
    currency: "",
    nodeId: nodeIdFromQuery,
    monthKey: "",
    source: "",
  });

  const yearOptions = useMemo(() => {
    const set = new Set([selectedYearDefault, selectedYear, ...years]);
    return Array.from(set).filter(Number.isFinite).sort((a, b) => b - a);
  }, [selectedYear, selectedYearDefault, years]);

  const currencyOptions = useMemo(
    () => Array.from(new Set(expenses.map((expense) => expense.currency).filter(Boolean))).sort((a, b) => a.localeCompare(b, "en")),
    [expenses]
  );

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

  const monthOptions = useMemo(
    () =>
      analytics?.byMonth.map((row) => ({ key: row.key, label: row.label })) ?? [],
    [analytics]
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
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
        return true;
      }),
    [expenses, filters, nodeScopeIds]
  );

  const visibleAnalytics = useMemo(
    () => (analytics ? buildExpenseAnalyticsFromItems(filteredExpenses, selectedYear) : null),
    [analytics, filteredExpenses, selectedYear]
  );
  const topNodeLabel = useMemo(() => {
    const topNode = visibleAnalytics?.byNode.find((row) => row.key !== "without-node");
    if (!topNode) {
      return "—";
    }
    return `${topNode.label} · ${formatTotals(topNode.totalsByCurrency)}`;
  }, [visibleAnalytics]);
  const hasFilters = Object.values(filters).some(Boolean);

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
      setAnalytics(expensesResult.analytics);
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

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8" style={{ background: c.canvas, color: c.textPrimary }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-3xl border p-5 shadow-sm" style={{ borderColor: c.border, background: c.card }}>
          {props.backHref ? (
            <button type="button" onClick={navigateBack} className="text-sm font-semibold" style={{ color: c.textMuted }}>
              ← Назад
            </button>
          ) : (
            <button type="button" onClick={navigateBack} className="text-sm font-semibold" style={{ color: c.textMuted }}>
              ← Назад
            </button>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: c.textMeta }}>
                Контроль расходов
              </p>
              <h1 className="mt-1 text-3xl font-bold">{props.title}</h1>
              <p className="mt-2 max-w-3xl text-sm" style={{ color: c.textSecondary }}>
                {props.subtitle}
              </p>
            </div>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="rounded-2xl border px-4 py-3 text-sm font-bold"
              style={{ borderColor: c.borderStrong, background: c.cardSubtle, color: c.textPrimary, colorScheme: "dark" }}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  Сезон {year}
                </option>
              ))}
            </select>
          </div>
        </header>

        {error ? <Section title="Ошибка"><p style={{ color: c.error }}>{error}</p></Section> : null}

        {isLoading || !analytics || !visibleAnalytics ? (
          <Section title="Загрузка"><p style={{ color: c.textSecondary }}>Загружаю расходы...</p></Section>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard label="Всего по фильтрам" value={formatTotals(visibleAnalytics.totalsByCurrency)} />
              <MetricCard label={`Сезон ${visibleAnalytics.selectedYear}`} value={formatTotals(visibleAnalytics.selectedYearTotalsByCurrency)} />
              <MetricCard label="Операций в сезоне" value={String(visibleAnalytics.selectedYearExpenseCount)} />
              <MetricCard label="Самый дорогой узел" value={topNodeLabel} />
              <MetricCard
                label="Куплено, но не установлено"
                value={`${visibleAnalytics.boughtNotInstalledCount} · ${formatTotals(visibleAnalytics.boughtNotInstalledTotalsByCurrency)}`}
              />
              <MetricCard label="Средний расход в месяц" value={formatAverageMonthly(visibleAnalytics.selectedYearTotalsByCurrency)} />
            </section>

            <Section title="Фильтры">
              <div className="grid gap-3 md:grid-cols-7">
                <Field label="Категория">
                  <select value={filters.category} onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))} style={fieldStyle}>
                    <option value="">Все</option>
                    {categoryOptions.map((category) => <option key={category} value={category}>{expenseCategoryLabelsRu[category]}</option>)}
                  </select>
                </Field>
                <Field label="Статус">
                  <select value={filters.installStatus} onChange={(e) => setFilters((prev) => ({ ...prev, installStatus: e.target.value }))} style={fieldStyle}>
                    <option value="">Все</option>
                    {installStatusOptions.map((status) => <option key={status} value={status}>{expenseInstallStatusLabelsRu[status]}</option>)}
                  </select>
                </Field>
                <Field label="Installation">
                  <select value={filters.installationStatus} onChange={(e) => setFilters((prev) => ({ ...prev, installationStatus: e.target.value }))} style={fieldStyle}>
                    <option value="">Все</option>
                    <option value="NOT_INSTALLED">Куплено, не установлено</option>
                    <option value="INSTALLED">Установлено</option>
                    <option value="NOT_APPLICABLE">Не требует установки</option>
                  </select>
                </Field>
                <Field label="Месяц">
                  <select value={filters.monthKey} onChange={(e) => setFilters((prev) => ({ ...prev, monthKey: e.target.value }))} style={fieldStyle}>
                    <option value="">Все</option>
                    {monthOptions.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}
                  </select>
                </Field>
                <Field label="Узел">
                  <select value={filters.nodeId} onChange={(e) => setFilters((prev) => ({ ...prev, nodeId: e.target.value }))} style={fieldStyle}>
                    <option value="">Все</option>
                    {nodeOptions.map(([nodeId, nodeName]) => <option key={nodeId} value={nodeId}>{nodeName}</option>)}
                  </select>
                </Field>
                <Field label="Валюта">
                  <select value={filters.currency} onChange={(e) => setFilters((prev) => ({ ...prev, currency: e.target.value }))} style={fieldStyle}>
                    <option value="">Все</option>
                    {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </Field>
                <Field label="Источник">
                  <select value={filters.source} onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))} style={fieldStyle}>
                    <option value="">Все</option>
                    <option value="service">ServiceEvent</option>
                    <option value="wishlist">Список покупок</option>
                    <option value="manual">Ручной расход</option>
                  </select>
                </Field>
              </div>
              <button type="button" onClick={() => setFilters({ category: "", installStatus: "", installationStatus: "", currency: "", nodeId: "", monthKey: "", source: "" })} className="mt-4 text-sm font-semibold" style={{ color: c.textMuted }}>
                Сбросить фильтры
              </button>
            </Section>

            <Section title="Добавить технический расход">
              <div className="grid gap-3 md:grid-cols-4">
                {!effectiveVehicleId ? (
                  <Field label="Мотоцикл">
                    <select value={form.vehicleId} onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))} style={fieldStyle}>
                      <option value="">Выберите</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.nickname || `${vehicle.brand.name} ${vehicle.model.name}`}
                        </option>
                      ))}
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
              <button type="button" onClick={createExpense} disabled={isSaving} className="mt-4 rounded-2xl px-4 py-3 text-sm font-bold disabled:opacity-60" style={{ background: c.primaryAction, color: c.onPrimaryAction }}>
                {isSaving ? "Сохраняю..." : "Добавить расход"}
              </button>
            </Section>

            <ExpenseRowsSection title="По годам" rows={visibleAnalytics.byYear} />
            <ExpenseRowsSection title="По месяцам" rows={visibleAnalytics.byMonth} />
            <ExpenseRowsSection title="По категориям" rows={visibleAnalytics.byCategory} />
            <ExpenseRowsSection title="По узлам" rows={visibleAnalytics.byNode} />

            <Section title="Все расходы">
              <div className="grid gap-2">
                {expenses.length === 0 ? (
                  <p style={{ color: c.textSecondary }}>
                    Пока нет расходов. Добавьте первый расход на обслуживание, запчасти или ремонт.
                  </p>
                ) : filteredExpenses.length === 0 ? (
                  <p style={{ color: c.textSecondary }}>
                    {hasFilters ? "По выбранным фильтрам расходов нет." : "Пока нет расходов. Добавьте первый расход на обслуживание, запчасти или ремонт."}
                  </p>
                ) : (
                  filteredExpenses.map((expense) => (
                    <article key={expense.id} className="rounded-2xl border p-4" style={{ borderColor: c.border, background: c.cardMuted }}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-bold">{expense.title}</div>
                          <div className="mt-1 text-xs" style={{ color: c.textMeta }}>
                            {new Date(expense.expenseDate).toLocaleDateString("ru-RU")} · {expenseCategoryLabelsRu[expense.category]} · {getInstallationStatusLabel(expense)}
                            {expense.node?.name ? ` · ${expense.node.name}` : ""}
                            {expense.vehicle ? ` · ${expense.vehicle.nickname || `${expense.vehicle.brandName} ${expense.vehicle.modelName}`}` : ""}
                            {expense.serviceEventId ? " · связано с ServiceEvent" : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold" style={{ color: c.primaryAction }}>{formatExpenseAmountRu(expense.amount)} {expense.currency}</div>
                          {expense.installationStatus === "NOT_INSTALLED" && expense.serviceEventId == null ? (
                            <button type="button" onClick={() => void markExpenseInstalled(expense.id)} className="mt-2 block text-xs font-semibold" style={{ color: c.textPrimary }}>
                              Отметить как установленное
                            </button>
                          ) : null}
                          {expense.serviceEventId ? (
                            <button
                              type="button"
                              onClick={() => router.push(`/vehicles/${expense.vehicleId}/service-log?serviceEventId=${encodeURIComponent(expense.serviceEventId!)}`)}
                              className="mt-2 block text-xs font-semibold"
                              style={{ color: c.textPrimary }}
                            >
                              Открыть сервисное событие
                            </button>
                          ) : null}
                          <button type="button" onClick={() => void deleteExpense(expense.id)} className="mt-2 text-xs font-semibold" style={{ color: c.error }}>
                            Удалить
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </Section>
          </>
        )}
      </div>
    </main>
  );
}

const fieldStyle = {
  marginTop: 4,
  width: "100%",
  borderRadius: "0.75rem",
  border: `1px solid ${c.borderStrong}`,
  backgroundColor: c.cardSubtle,
  color: c.textPrimary,
  padding: "10px 12px",
  fontSize: "0.875rem",
  colorScheme: "dark",
} as const;

function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="text-sm font-semibold" style={{ color: c.textMeta }}>
      {props.label}
      {props.children}
    </label>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border p-5 shadow-sm" style={{ borderColor: c.border, background: c.card }}>
      <h2 className="text-xl font-bold">{props.title}</h2>
      <div className="mt-4">{props.children}</div>
    </section>
  );
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border p-5 shadow-sm" style={{ borderColor: c.border, background: c.card }}>
      <p className="text-sm font-semibold" style={{ color: c.textMeta }}>{props.label}</p>
      <p className="mt-2 text-2xl font-bold">{props.value}</p>
    </div>
  );
}

function ExpenseRowsSection(props: { title: string; rows: ExpenseAnalyticsRow[] }) {
  return (
    <Section title={props.title}>
      <div className="grid gap-2">
        {props.rows.length === 0 ? (
          <p style={{ color: c.textSecondary }}>Нет данных за выбранный сезон.</p>
        ) : (
          props.rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 rounded-2xl border p-4" style={{ borderColor: c.border, background: c.cardMuted }}>
              <span className="font-semibold">{row.label}</span>
              <span className="text-sm font-bold" style={{ color: c.primaryAction }}>{formatTotals(row.totalsByCurrency)}</span>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}
