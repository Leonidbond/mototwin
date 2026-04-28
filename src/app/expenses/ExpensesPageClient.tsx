"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  expenseCategoryLabelsRu,
  expenseInstallStatusLabelsRu,
  formatExpenseAmountRu,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type {
  ExpenseAnalyticsRow,
  ExpenseAmountByCurrency,
  ExpenseCategory,
  ExpenseInstallStatus,
  ExpenseItem,
  GarageVehicleItem,
} from "@mototwin/types";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

const categoryOptions: ExpenseCategory[] = [
  "SERVICE",
  "PARTS",
  "REPAIR",
  "DIAGNOSTICS",
  "LABOR",
  "OTHER_TECHNICAL",
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

export function ExpensesPageClient(props: {
  vehicleId?: string;
  title: string;
  subtitle: string;
  backHref?: string;
}) {
  const router = useRouter();
  const selectedYearDefault = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(selectedYearDefault);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof api.getExpenses>>["analytics"] | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [vehicles, setVehicles] = useState<GarageVehicleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    vehicleId: props.vehicleId ?? "",
    title: "",
    amount: "",
    currency: "RUB",
    category: "PARTS" as ExpenseCategory,
    installStatus: "BOUGHT_NOT_INSTALLED" as ExpenseInstallStatus,
    expenseDate: todayYmd(),
    comment: "",
  });

  const yearOptions = useMemo(() => {
    const set = new Set([selectedYearDefault, selectedYear, ...years]);
    return Array.from(set).filter(Number.isFinite).sort((a, b) => b - a);
  }, [selectedYear, selectedYearDefault, years]);

  async function load(year = selectedYear) {
    try {
      setIsLoading(true);
      setError("");
      const [expensesResult, vehiclesResult] = await Promise.all([
        api.getExpenses({ year, vehicleId: props.vehicleId }),
        props.vehicleId ? Promise.resolve(null) : api.getGarageVehicles(),
      ]);
      setExpenses(expensesResult.expenses);
      setAnalytics(expensesResult.analytics);
      setYears(expensesResult.years);
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
  }, [props.vehicleId, selectedYear]);

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

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8" style={{ background: c.canvas, color: c.textPrimary }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-3xl border p-5 shadow-sm" style={{ borderColor: c.border, background: c.card }}>
          {props.backHref ? (
            <button type="button" onClick={() => router.push(props.backHref!)} className="text-sm font-semibold" style={{ color: c.textMuted }}>
              ← Назад
            </button>
          ) : null}
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

        {isLoading || !analytics ? (
          <Section title="Загрузка"><p style={{ color: c.textSecondary }}>Загружаю расходы...</p></Section>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-4">
              <MetricCard label="Всего" value={formatTotals(analytics.totalsByCurrency)} />
              <MetricCard label={`Сезон ${analytics.selectedYear}`} value={formatTotals(analytics.selectedYearTotalsByCurrency)} />
              <MetricCard label="Операций в сезоне" value={String(analytics.selectedYearExpenseCount)} />
              <MetricCard
                label="Куплено, но не установлено"
                value={`${analytics.boughtNotInstalledCount} · ${formatTotals(analytics.boughtNotInstalledTotalsByCurrency)}`}
              />
            </section>

            <Section title="Добавить технический расход">
              <div className="grid gap-3 md:grid-cols-4">
                {!props.vehicleId ? (
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

            <ExpenseRowsSection title="По годам" rows={analytics.byYear} />
            <ExpenseRowsSection title="По месяцам" rows={analytics.byMonth} />
            <ExpenseRowsSection title="По категориям" rows={analytics.byCategory} />
            <ExpenseRowsSection title="По узлам" rows={analytics.byNode} />

            <Section title="Все расходы">
              <div className="grid gap-2">
                {expenses.length === 0 ? (
                  <p style={{ color: c.textSecondary }}>Расходов пока нет.</p>
                ) : (
                  expenses.map((expense) => (
                    <article key={expense.id} className="rounded-2xl border p-4" style={{ borderColor: c.border, background: c.cardMuted }}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-bold">{expense.title}</div>
                          <div className="mt-1 text-xs" style={{ color: c.textMeta }}>
                            {new Date(expense.expenseDate).toLocaleDateString("ru-RU")} · {expenseCategoryLabelsRu[expense.category]} · {expenseInstallStatusLabelsRu[expense.installStatus]}
                            {expense.node?.name ? ` · ${expense.node.name}` : ""}
                            {expense.vehicle ? ` · ${expense.vehicle.nickname || `${expense.vehicle.brandName} ${expense.vehicle.modelName}`}` : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold" style={{ color: c.primaryAction }}>{formatExpenseAmountRu(expense.amount)} {expense.currency}</div>
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
