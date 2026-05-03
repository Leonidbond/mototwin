"use client";

/* eslint-disable react-hooks/set-state-in-effect -- SKU search + uninstalled-expense loaders reset local UI state from async catalog APIs (same pattern as the journal page modal). */

import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  createEmptyBundleItemFormValues,
  flattenNodeTreeToSelectOptions,
  formatExpenseAmountRu,
  SERVICE_ACTION_TYPE_OPTIONS,
  validateAddServiceEventFormValues,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type {
  AddServiceEventFormValues,
  BundleItemFormValues,
  ExpenseItem,
  NodeTreeItem,
  PartSkuViewModel,
  ServiceActionType,
} from "@mototwin/types";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

function getAnchorNodeId(form: AddServiceEventFormValues): string {
  return form.items[0]?.nodeId ?? "";
}
function getAnchorPartName(form: AddServiceEventFormValues): string {
  return form.items[0]?.partName ?? "";
}
function getAnchorSku(form: AddServiceEventFormValues): string {
  return form.items[0]?.sku ?? "";
}
function patchAnchorItem(
  form: AddServiceEventFormValues,
  patch: Partial<BundleItemFormValues>
): AddServiceEventFormValues {
  const items =
    form.items.length > 0
      ? [...form.items]
      : [
          {
            key: "single",
            nodeId: "",
            actionType: "SERVICE" as const,
            partName: "",
            sku: "",
            quantity: "",
            partCost: "",
            laborCost: "",
            comment: "",
          },
        ];
  items[0] = { ...items[0], ...patch };
  return { ...form, items };
}

function patchItemAt(
  form: AddServiceEventFormValues,
  index: number,
  patch: Partial<BundleItemFormValues>
): AddServiceEventFormValues {
  const items = [...form.items];
  if (!items[index]) {
    return form;
  }
  items[index] = { ...items[index], ...patch };
  return { ...form, items };
}

function removeItemAt(form: AddServiceEventFormValues, index: number): AddServiceEventFormValues {
  if (form.items.length <= 1) {
    return form;
  }
  return { ...form, items: form.items.filter((_, i) => i !== index) };
}

function appendEmptyItem(form: AddServiceEventFormValues): AddServiceEventFormValues {
  const next = createEmptyBundleItemFormValues({
    actionType: form.commonActionType,
  });
  return { ...form, items: [...form.items, next] };
}

function cloneAddServiceEventForm(src: AddServiceEventFormValues): AddServiceEventFormValues {
  return {
    ...src,
    items: src.items.map((it) => ({ ...it })),
    installedExpenseItemIds: [...src.installedExpenseItemIds],
  };
}

const SERVICE_EVENT_MODAL_FIELD_BASE: CSSProperties = {
  marginTop: 4,
  width: "100%",
  borderRadius: "0.75rem",
  border: `1px solid ${productSemanticColors.borderStrong}`,
  backgroundColor: productSemanticColors.cardSubtle,
  color: productSemanticColors.textPrimary,
  padding: "12px 16px",
  fontSize: "0.875rem",
  outline: "none",
};

const SERVICE_EVENT_MODAL_LABEL_STYLE: CSSProperties = {
  color: productSemanticColors.textMeta,
};

function normalizePartNumber(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function pickSkuPartNumberOrFallback(sku: PartSkuViewModel, fallback: string): string {
  const first = sku.partNumbers[0]?.number?.trim() ?? "";
  return first || fallback;
}

export type BasicServiceEventModalProps = {
  open: boolean;
  onClose: () => void;
  /** Bump when `initialForm` should be re-applied (open create / edit / repeat / prefill). */
  resetKey: number;
  initialForm: AddServiceEventFormValues;
  vehicleId: string;
  nodeTree: NodeTreeItem[];
  vehicleOdometer: number | null;
  vehicleEngineHours: number | null;
  todayDateYmd: string;
  editingServiceEventId: string | null;
  submitError: string;
  onClearSubmitError: () => void;
  isSubmitting: boolean;
  onSubmit: (form: AddServiceEventFormValues) => Promise<void>;
  /** Optional `max` on date input (e.g. today). */
  eventDateMaxYmd?: string;
  /** Optional `max` on odometer field. */
  odometerInputMax?: number | null;
  /** Outer overlay container (positioning / backdrop). */
  overlayClassName?: string;
  overlayStyle?: CSSProperties;
};

type BasicServiceEventModalInnerProps = Omit<
  BasicServiceEventModalProps,
  "open" | "resetKey" | "overlayClassName" | "overlayStyle"
>;

function BasicServiceEventModalInner({
  onClose,
  initialForm,
  vehicleId,
  nodeTree,
  vehicleOdometer,
  vehicleEngineHours,
  todayDateYmd,
  editingServiceEventId,
  submitError,
  onClearSubmitError,
  isSubmitting,
  onSubmit,
  eventDateMaxYmd,
  odometerInputMax,
}: BasicServiceEventModalInnerProps) {
  const [form, setForm] = useState<AddServiceEventFormValues>(() => cloneAddServiceEventForm(initialForm));
  const [localValidationError, setLocalValidationError] = useState("");

  const [serviceEventSkuLookup, setServiceEventSkuLookup] = useState("");
  const [serviceEventSkuResults, setServiceEventSkuResults] = useState<PartSkuViewModel[]>([]);
  const [serviceEventSkuLoading, setServiceEventSkuLoading] = useState(false);
  const [serviceEventSkuError, setServiceEventSkuError] = useState("");
  const serviceEventSkuSearchGen = useRef(0);
  const [uninstalledExpenses, setUninstalledExpenses] = useState<ExpenseItem[]>([]);
  const [uninstalledExpensesLoading, setUninstalledExpensesLoading] = useState(false);
  const [uninstalledExpensesError, setUninstalledExpensesError] = useState("");
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const updateForm = useCallback(
    (updater: (prev: AddServiceEventFormValues) => AddServiceEventFormValues) => {
      setLocalValidationError("");
      onClearSubmitError();
      setForm(updater);
    },
    [onClearSubmitError]
  );

  const leafNodeOptions = useMemo(
    () => flattenNodeTreeToSelectOptions(nodeTree).filter((option) => !option.hasChildren),
    [nodeTree]
  );
  const leafNodeIdsSet = useMemo(
    () => new Set(leafNodeOptions.map((option) => option.id)),
    [leafNodeOptions]
  );

  const serviceEventCostTotalPreview = useMemo(() => {
    const partsRaw = form.partsCost.trim().replace(",", ".");
    const laborRaw = form.laborCost.trim().replace(",", ".");
    if (partsRaw === "" && laborRaw === "") {
      return null;
    }
    const p = partsRaw === "" ? 0 : Number.parseFloat(partsRaw);
    const l = laborRaw === "" ? 0 : Number.parseFloat(laborRaw);
    if (Number.isNaN(p) || Number.isNaN(l)) {
      return null;
    }
    const cur = form.currency.trim().toUpperCase() || "RUB";
    return `${formatExpenseAmountRu(p + l)} ${cur}`;
  }, [form.partsCost, form.laborCost, form.currency]);

  const orderedUninstalledExpenses = useMemo(() => {
    const selectedIds = new Set(form.items.map((item) => item.nodeId.trim()).filter(Boolean));
    return [...uninstalledExpenses].sort((left, right) => {
      const leftMatches =
        selectedIds.size > 0 && left.nodeId && selectedIds.has(left.nodeId) ? 0 : 1;
      const rightMatches =
        selectedIds.size > 0 && right.nodeId && selectedIds.has(right.nodeId) ? 0 : 1;
      if (leftMatches !== rightMatches) {
        return leftMatches - rightMatches;
      }
      return (
        new Date(right.purchasedAt ?? right.expenseDate).getTime() -
        new Date(left.purchasedAt ?? left.expenseDate).getTime()
      );
    });
  }, [form, uninstalledExpenses]);

  const toggleInstalledExpenseSelection = (expense: ExpenseItem) => {
    updateForm((prev) => {
      const selected = new Set(prev.installedExpenseItemIds);
      const isSelecting = !selected.has(expense.id);
      if (isSelecting) {
        selected.add(expense.id);
      } else {
        selected.delete(expense.id);
      }

      if (!isSelecting) {
        return { ...prev, installedExpenseItemIds: Array.from(selected) };
      }

      const expenseTitle = expense.partName?.trim() || expense.title.trim();
      const commentLine = `Установлена ранее купленная деталь: ${expenseTitle}`;
      const titleSuggestion = `Установка: ${expenseTitle}`;
      const nextComment = prev.comment.trim()
        ? prev.comment.includes(commentLine)
          ? prev.comment
          : `${prev.comment.trim()}\n${commentLine}`
        : commentLine;

      const anchorNodeId = getAnchorNodeId(prev).trim() || expense.nodeId || "";
      const anchorPartName =
        getAnchorPartName(prev).trim() || expense.partName?.trim() || expense.title.trim();
      const anchorSku = getAnchorSku(prev).trim() || expense.partSku?.trim() || "";

      return patchAnchorItem(
        {
          ...prev,
          installedExpenseItemIds: Array.from(selected),
          eventDate: prev.eventDate.trim() || new Date().toISOString().slice(0, 10),
          title: prev.title.trim() || titleSuggestion,
          odometer:
            prev.odometer.trim() || (vehicleOdometer != null ? String(vehicleOdometer) : ""),
          engineHours:
            prev.engineHours.trim() ||
            (vehicleEngineHours != null ? String(vehicleEngineHours) : ""),
          comment: nextComment,
        },
        { nodeId: anchorNodeId, partName: anchorPartName, sku: anchorSku }
      );
    });
  };

  useEffect(() => {
    if (!commentTextareaRef.current) {
      return;
    }
    const textarea = commentTextareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 64)}px`;
  }, [form.comment]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setServiceEventSkuLookup(getAnchorSku(form).trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form]);

  useEffect(() => {
    const query = serviceEventSkuLookup;
    if (query.length < 2) {
      setServiceEventSkuResults([]);
      setServiceEventSkuError("");
      setServiceEventSkuLoading(false);
      return;
    }
    const gen = serviceEventSkuSearchGen.current + 1;
    serviceEventSkuSearchGen.current = gen;
    setServiceEventSkuLoading(true);
    setServiceEventSkuError("");
    void api
      .getPartSkus({
        search: query,
        nodeId: getAnchorNodeId(form).trim() || undefined,
      })
      .then((res) => {
        if (serviceEventSkuSearchGen.current !== gen) {
          return;
        }
        const list = res.skus ?? [];
        const normalizedQuery = normalizePartNumber(query);
        const exact = list.find((sku) =>
          sku.partNumbers.some((partNumber) => normalizePartNumber(partNumber.number) === normalizedQuery)
        );
        const ordered = exact
          ? [exact, ...list.filter((candidate) => candidate.id !== exact.id)]
          : list;
        setServiceEventSkuResults(ordered.slice(0, 6));
      })
      .catch(() => {
        if (serviceEventSkuSearchGen.current !== gen) {
          return;
        }
        setServiceEventSkuResults([]);
        setServiceEventSkuError("Не удалось выполнить поиск по каталогу.");
      })
      .finally(() => {
        if (serviceEventSkuSearchGen.current !== gen) {
          return;
        }
        setServiceEventSkuLoading(false);
      });
  }, [form, serviceEventSkuLookup]);

  useEffect(() => {
    if (!vehicleId) {
      setUninstalledExpenses([]);
      return;
    }
    let cancelled = false;
    setUninstalledExpensesLoading(true);
    setUninstalledExpensesError("");
    void api
      .getUninstalledExpenses({ vehicleId })
      .then((res) => {
        if (!cancelled) {
          setUninstalledExpenses(res.expenses ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUninstalledExpenses([]);
          setUninstalledExpensesError("Не удалось загрузить купленные детали.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setUninstalledExpensesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const applyServiceEventSkuSuggestion = (sku: PartSkuViewModel) => {
    updateForm((prev) =>
      patchAnchorItem(prev, {
        sku: pickSkuPartNumberOrFallback(sku, getAnchorSku(prev).trim()),
        partName: sku.canonicalName?.trim() || getAnchorPartName(prev),
      })
    );
  };

  const save = async () => {
    const validation = validateAddServiceEventFormValues(form, {
      todayDateYmd,
      currentVehicleOdometer: vehicleOdometer,
      leafNodeIds: leafNodeIdsSet,
    });
    if (validation.errors.length > 0) {
      setLocalValidationError(validation.errors[0]);
      return;
    }
    setLocalValidationError("");
    await onSubmit(form);
  };

  const combinedError = localValidationError || submitError;

  return (
      <div
        className="w-full max-w-4xl rounded-3xl border border-gray-200 bg-white shadow-xl"
        style={{
          backgroundColor: productSemanticColors.card,
          borderColor: productSemanticColors.borderStrong,
          color: productSemanticColors.textPrimary,
        }}
      >
        <div
          className="flex items-center justify-between border-b border-gray-200 px-6 py-4"
          style={{ borderBottomColor: productSemanticColors.borderStrong }}
        >
          <h2
            className="text-xl font-semibold tracking-tight text-gray-950"
            style={{ color: productSemanticColors.textPrimary }}
          >
            {editingServiceEventId ? "Редактировать сервисное событие" : "Добавить сервисное событие"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
            style={{
              backgroundColor: productSemanticColors.cardSubtle,
              borderColor: productSemanticColors.borderStrong,
              color: productSemanticColors.textPrimary,
            }}
          >
            Закрыть
          </button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            <div
              className="rounded-2xl border border-gray-200 p-4"
              style={{
                backgroundColor: productSemanticColors.cardSubtle,
                borderColor: productSemanticColors.borderStrong,
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: productSemanticColors.textMeta }}>
                Режим ввода
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    form.mode === "BASIC" ? "" : "opacity-50"
                  }`}
                  style={
                    form.mode === "BASIC"
                      ? {
                          borderColor: productSemanticColors.primaryAction,
                          backgroundColor: productSemanticColors.primaryAction,
                          color: productSemanticColors.onPrimaryAction,
                        }
                      : {
                          borderColor: productSemanticColors.border,
                          backgroundColor: productSemanticColors.cardMuted,
                          color: productSemanticColors.textMuted,
                        }
                  }
                >
                  Быстро
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    form.mode === "ADVANCED" ? "" : "cursor-not-allowed opacity-55"
                  }`}
                  style={
                    form.mode === "ADVANCED"
                      ? {
                          borderColor: productSemanticColors.indigoSoftBorder,
                          backgroundColor: productSemanticColors.serviceBadgeBg,
                          color: productSemanticColors.serviceBadgeText,
                        }
                      : {
                          borderColor: productSemanticColors.border,
                          color: productSemanticColors.textMuted,
                        }
                  }
                  title={
                    form.mode === "ADVANCED"
                      ? "Событие в подробном режиме"
                      : "Режим «Подробно» для новых событий появится в следующей версии"
                  }
                >
                  {form.mode === "ADVANCED" ? "Подробно" : "Подробно · скоро"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: productSemanticColors.textSecondary }}>
                {form.mode === "BASIC"
                  ? "В режиме «Быстро» суммы по деталям и по работе относятся ко всем выбранным узлам; тип работы один для всех."
                  : "Событие сохранено в режиме «Подробно»: у строк могут быть разные типы работ и детализация. Расширенный редактор формы — в следующей версии."}
              </p>
            </div>

            <div
              className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4"
              style={{
                backgroundColor: productSemanticColors.cardMuted,
                borderColor: productSemanticColors.border,
              }}
            >
              <h3 className="text-sm font-semibold text-gray-950" style={{ color: productSemanticColors.textPrimary }}>
                Узлы и работы
              </h3>
              <p className="mt-1 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                Выберите один или несколько конечных узлов. Для каждого узла будет одна строка в пакете обслуживания.
              </p>
              {form.mode === "BASIC" ? (
                <label className="mt-3 block text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                  Тип работы для всех узлов
                  <select
                    value={form.commonActionType}
                    onChange={(e) => {
                      const next = e.target.value as ServiceActionType;
                      updateForm((prev) => ({
                        ...prev,
                        commonActionType: next,
                        items: prev.items.map((it) => ({ ...it, actionType: next })),
                      }));
                    }}
                    style={{
                      ...SERVICE_EVENT_MODAL_FIELD_BASE,
                      colorScheme: "dark",
                    }}
                    className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                  >
                    {SERVICE_ACTION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="mt-4 space-y-3">
                {form.items.map((row, rowIndex) => (
                  <div
                    key={row.key}
                    className="flex flex-wrap items-end gap-2 rounded-xl border p-3"
                    style={{ borderColor: productSemanticColors.border, backgroundColor: productSemanticColors.card }}
                  >
                    <label className="min-w-[200px] flex-1 text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                      {`Узел ${rowIndex + 1}`}
                      <select
                        value={row.nodeId}
                        onChange={(e) =>
                          updateForm((prev) => patchItemAt(prev, rowIndex, { nodeId: e.target.value }))
                        }
                        style={{
                          ...SERVICE_EVENT_MODAL_FIELD_BASE,
                          colorScheme: "dark",
                        }}
                        className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                      >
                        <option value="">Выберите узел</option>
                        {leafNodeOptions
                          .filter(
                            (option) =>
                              option.id === row.nodeId.trim() ||
                              !form.items.some((it, i) => i !== rowIndex && it.nodeId.trim() === option.id)
                          )
                          .map((option) => (
                            <option key={option.id} value={option.id}>
                              {`${"— ".repeat(Math.max(0, option.level - 1))}${option.name}`}
                            </option>
                          ))}
                      </select>
                    </label>
                    {form.mode === "ADVANCED" ? (
                      <label className="min-w-[160px] text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                        Тип работы
                        <select
                          value={row.actionType}
                          onChange={(e) =>
                            updateForm((prev) =>
                              patchItemAt(prev, rowIndex, {
                                actionType: e.target.value as ServiceActionType,
                              })
                            )
                          }
                          style={{
                            ...SERVICE_EVENT_MODAL_FIELD_BASE,
                            colorScheme: "dark",
                          }}
                          className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                        >
                          {SERVICE_ACTION_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {form.items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => updateForm((prev) => removeItemAt(prev, rowIndex))}
                        className="mb-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition hover:opacity-90"
                        style={{
                          borderColor: productSemanticColors.borderStrong,
                          color: productSemanticColors.error,
                          backgroundColor: productSemanticColors.cardSubtle,
                        }}
                      >
                        Удалить
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              {form.mode === "BASIC" &&
              leafNodeOptions.filter((o) => !form.items.some((it) => it.nodeId.trim() === o.id)).length > 0 ? (
                <button
                  type="button"
                  onClick={() => updateForm((prev) => appendEmptyItem(prev))}
                  className="mt-3 inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold transition hover:opacity-90"
                  style={{
                    borderColor: productSemanticColors.primaryAction,
                    color: productSemanticColors.primaryAction,
                    backgroundColor: productSemanticColors.card,
                  }}
                >
                  + Добавить узел
                </button>
              ) : null}
            </div>

            <div
              className="rounded-2xl border border-gray-200 bg-white p-4"
              style={{
                backgroundColor: productSemanticColors.cardMuted,
                borderColor: productSemanticColors.border,
              }}
            >
              <h3 className="text-sm font-semibold text-gray-950" style={{ color: productSemanticColors.textPrimary }}>
                Данные события
              </h3>
              <div className="mt-3 grid gap-4.5 sm:grid-cols-2">
                <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                  Дата события
                  <input
                    type="date"
                    value={form.eventDate}
                    max={eventDateMaxYmd}
                    onChange={(e) => updateForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                    style={{ ...SERVICE_EVENT_MODAL_FIELD_BASE, colorScheme: "dark" }}
                    className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                  />
                </label>
                <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                  Название события
                  <input
                    value={form.title}
                    onChange={(e) => updateForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Например: ТО 10 000 км, замена масла"
                    style={SERVICE_EVENT_MODAL_FIELD_BASE}
                    className="[&::placeholder]:text-[#AAB4C0] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                  />
                </label>
                <p className="sm:col-span-2 -mt-2 text-[11px] leading-snug" style={{ color: productSemanticColors.textMuted }}>
                  Краткий заголовок для журнала (раньше поле «тип сервиса»).
                </p>
                <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                  Пробег, км
                  <input
                    value={form.odometer}
                    onChange={(e) => updateForm((prev) => ({ ...prev, odometer: e.target.value }))}
                    inputMode="numeric"
                    max={odometerInputMax ?? undefined}
                    style={SERVICE_EVENT_MODAL_FIELD_BASE}
                    className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                  />
                </label>
                <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                  Моточасы
                  <input
                    value={form.engineHours}
                    onChange={(e) => updateForm((prev) => ({ ...prev, engineHours: e.target.value }))}
                    inputMode="numeric"
                    style={SERVICE_EVENT_MODAL_FIELD_BASE}
                    className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                  />
                </label>
                <div className="sm:col-span-2 mt-1 border-t pt-3" style={{ borderTopColor: productSemanticColors.border }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: productSemanticColors.textMeta }}>
                    Стоимость
                  </p>
                </div>
                <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                  Запчасти
                  <input
                    value={form.partsCost}
                    onChange={(e) => updateForm((prev) => ({ ...prev, partsCost: e.target.value }))}
                    inputMode="decimal"
                    placeholder="0"
                    style={SERVICE_EVENT_MODAL_FIELD_BASE}
                    className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                  />
                </label>
                <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                  Работа
                  <input
                    value={form.laborCost}
                    onChange={(e) => updateForm((prev) => ({ ...prev, laborCost: e.target.value }))}
                    inputMode="decimal"
                    placeholder="0"
                    style={SERVICE_EVENT_MODAL_FIELD_BASE}
                    className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                  />
                </label>
                <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                  Валюта
                  <input
                    value={form.currency}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        currency: e.target.value.toUpperCase(),
                      }))
                    }
                    style={SERVICE_EVENT_MODAL_FIELD_BASE}
                    className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                  />
                </label>
                {serviceEventCostTotalPreview ? (
                  <div
                    className="flex items-center rounded-xl border px-3 py-2 sm:col-span-2"
                    style={{
                      borderColor: productSemanticColors.indigoSoftBorder,
                      backgroundColor: productSemanticColors.serviceBadgeBg,
                    }}
                  >
                    <span className="text-xs font-semibold" style={{ color: productSemanticColors.serviceBadgeText }}>
                      Итого: {serviceEventCostTotalPreview}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <p className="sm:col-span-2 text-xs font-semibold" style={{ color: productSemanticColors.textMeta }}>
                  Запчасть (опционально, для справки в журнале)
                </p>
                <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                  Артикул (SKU)
                  <input
                    value={getAnchorSku(form)}
                    onChange={(e) => updateForm((prev) => patchAnchorItem(prev, { sku: e.target.value }))}
                    maxLength={200}
                    placeholder="Опционально"
                    autoComplete="off"
                    style={SERVICE_EVENT_MODAL_FIELD_BASE}
                    className="[&::placeholder]:text-[#AAB4C0] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                  />
                </label>
                <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                  Наименование запчасти
                  <input
                    value={getAnchorPartName(form)}
                    onChange={(e) => updateForm((prev) => patchAnchorItem(prev, { partName: e.target.value }))}
                    maxLength={500}
                    placeholder="Опционально"
                    style={SERVICE_EVENT_MODAL_FIELD_BASE}
                    className="[&::placeholder]:text-[#AAB4C0] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                  />
                </label>
              </div>

              {getAnchorSku(form).trim().length >= 2 ? (
                <div
                  className="mt-2 rounded-xl border px-3 py-2"
                  style={{
                    borderColor: productSemanticColors.borderStrong,
                    backgroundColor: productSemanticColors.cardSubtle,
                  }}
                >
                  <p className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
                    Поиск в каталоге по артикулу
                  </p>
                  {serviceEventSkuLoading ? (
                    <p className="mt-1 text-xs" style={{ color: productSemanticColors.textMuted }}>
                      Ищем совпадения...
                    </p>
                  ) : null}
                  {!serviceEventSkuLoading && serviceEventSkuError ? (
                    <p className="mt-1 text-xs" style={{ color: productSemanticColors.error }}>
                      {serviceEventSkuError}
                    </p>
                  ) : null}
                  {!serviceEventSkuLoading && !serviceEventSkuError && serviceEventSkuResults.length === 0 ? (
                    <p className="mt-1 text-xs" style={{ color: productSemanticColors.textMuted }}>
                      Ничего не найдено.
                    </p>
                  ) : null}
                  {!serviceEventSkuLoading && serviceEventSkuResults.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {serviceEventSkuResults.map((sku) => {
                        const partNumber = pickSkuPartNumberOrFallback(sku, "");
                        return (
                          <button
                            key={sku.id}
                            type="button"
                            onClick={() => applyServiceEventSkuSuggestion(sku)}
                            className="w-full rounded-lg border px-2.5 py-2 text-left text-xs transition hover:opacity-90"
                            style={{
                              borderColor: productSemanticColors.borderStrong,
                              backgroundColor: productSemanticColors.cardMuted,
                              color: productSemanticColors.textPrimary,
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{partNumber || "Без артикула"}</div>
                            <div style={{ color: productSemanticColors.textSecondary }}>
                              {sku.brandName} · {sku.canonicalName}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div
                className="mt-4 rounded-2xl border p-4"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                }}
              >
                <h3 className="text-sm font-semibold" style={{ color: productSemanticColors.textPrimary }}>
                  Купленные, но не установленные детали
                </h3>
                {uninstalledExpensesLoading ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                    Загружаю купленные детали...
                  </p>
                ) : null}
                {uninstalledExpensesError ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.error }}>
                    {uninstalledExpensesError}
                  </p>
                ) : null}
                {!uninstalledExpensesLoading && !uninstalledExpensesError && orderedUninstalledExpenses.length === 0 ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                    Нет купленных деталей без установки.
                  </p>
                ) : null}
                {orderedUninstalledExpenses.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {orderedUninstalledExpenses.map((expense) => {
                      const isSelected = form.installedExpenseItemIds.includes(expense.id);
                      const isSameNode =
                        Boolean(expense.nodeId) && form.items.some((it) => it.nodeId.trim() === expense.nodeId);
                      return (
                        <label
                          key={expense.id}
                          className="flex gap-3 rounded-xl border px-3 py-2 text-sm"
                          style={{
                            backgroundColor: productSemanticColors.cardMuted,
                            borderColor: isSelected
                              ? productSemanticColors.primaryAction
                              : productSemanticColors.border,
                            color: productSemanticColors.textPrimary,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleInstalledExpenseSelection(expense)}
                            className="mt-1"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">
                              {expense.title}
                              {isSameNode ? (
                                <span className="ml-2 text-[11px]" style={{ color: productSemanticColors.textMeta }}>
                                  этот узел
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-1 block text-xs" style={{ color: productSemanticColors.textSecondary }}>
                              {formatExpenseAmountRu(expense.amount)} {expense.currency}
                              {" · "}
                              {new Date(expense.purchasedAt ?? expense.expenseDate).toLocaleDateString("ru-RU")}
                              {expense.node?.name ? ` · ${expense.node.name}` : ""}
                              {expense.vendor ? ` · ${expense.vendor}` : ""}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <label className="mt-4 block text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                Комментарий
                <textarea
                  ref={commentTextareaRef}
                  value={form.comment}
                  onChange={(e) => updateForm((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Опционально"
                  style={{ ...SERVICE_EVENT_MODAL_FIELD_BASE, minHeight: "7rem" }}
                  className="[&::placeholder]:text-[#AAB4C0] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 resize-y"
                />
              </label>

              <label className="mt-4 block text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                Установленные запчасти (JSON)
                <textarea
                  value={form.installedPartsJson}
                  onChange={(e) => updateForm((prev) => ({ ...prev, installedPartsJson: e.target.value }))}
                  style={{
                    ...SERVICE_EVENT_MODAL_FIELD_BASE,
                    minHeight: "7rem",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "0.75rem",
                  }}
                  className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 resize-y"
                />
              </label>
            </div>

            {combinedError ? (
              <p className="text-sm" style={{ color: productSemanticColors.error }}>
                {combinedError}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-5" style={{ borderTopColor: productSemanticColors.border }}>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                  color: productSemanticColors.textPrimary,
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-gray-950 px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor: productSemanticColors.primaryAction,
                  color: productSemanticColors.onPrimaryAction,
                }}
              >
                {isSubmitting ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}

export function BasicServiceEventModal({
  open,
  resetKey,
  overlayClassName = "fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 py-6 sm:items-center",
  overlayStyle,
  ...innerProps
}: BasicServiceEventModalProps) {
  if (!open) {
    return null;
  }
  return (
    <div className={overlayClassName} style={overlayStyle}>
      <BasicServiceEventModalInner key={resetKey} {...innerProps} />
    </div>
  );
}
