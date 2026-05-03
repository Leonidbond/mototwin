/* eslint-disable react-hooks/set-state-in-effect -- SKU + uninstalled loaders (same pattern as web BasicServiceEventModal). */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  createEmptyBundleItemFormValues,
  flattenNodeTreeToSelectOptions,
  formatExpenseAmountRu,
  SERVICE_ACTION_TYPE_OPTIONS,
  validateAddServiceEventFormValuesMobile,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type {
  AddServiceEventFormValues,
  BundleItemFormValues,
  ExpenseItem,
  NodeTreeItem,
  PartSkuViewModel,
} from "@mototwin/types";

type FlatOption = ReturnType<typeof flattenNodeTreeToSelectOptions>[number];

function cloneForm(src: AddServiceEventFormValues): AddServiceEventFormValues {
  return {
    ...src,
    items: src.items.map((it) => ({ ...it })),
    installedExpenseItemIds: [...src.installedExpenseItemIds],
  };
}

function getAnchorSku(form: AddServiceEventFormValues): string {
  return form.items[0]?.sku ?? "";
}
function getAnchorPartName(form: AddServiceEventFormValues): string {
  return form.items[0]?.partName ?? "";
}
function getAnchorNodeId(form: AddServiceEventFormValues): string {
  return form.items[0]?.nodeId ?? "";
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
  if (!items[index]) return form;
  items[index] = { ...items[index], ...patch };
  return { ...form, items };
}

function removeItemAt(form: AddServiceEventFormValues, index: number): AddServiceEventFormValues {
  if (form.items.length <= 1) return form;
  return { ...form, items: form.items.filter((_, i) => i !== index) };
}

function appendEmptyItem(form: AddServiceEventFormValues): AddServiceEventFormValues {
  const next = createEmptyBundleItemFormValues({ actionType: form.commonActionType });
  return { ...form, items: [...form.items, next] };
}

function normalizePartNumber(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function pickSkuPartNumberOrFallback(sku: PartSkuViewModel, fallback: string): string {
  const first = sku.partNumbers[0]?.number?.trim() ?? "";
  return first || fallback;
}

function optionLabel(option: FlatOption): string {
  return `${"— ".repeat(Math.max(0, option.level - 1))}${option.name}`;
}

export type BasicServiceEventBundleFormProps = {
  vehicleId: string;
  apiBaseUrl: string;
  nodeTree: NodeTreeItem[];
  vehicleOdometer: number | null;
  vehicleEngineHours: number | null;
  todayDateYmd: string;
  initialForm: AddServiceEventFormValues;
  isSubmitting: boolean;
  submitError: string;
  onClearSubmitError: () => void;
  onSubmit: (form: AddServiceEventFormValues) => Promise<void>;
  isEditMode: boolean;
};

export function BasicServiceEventBundleForm({
  vehicleId,
  apiBaseUrl,
  nodeTree,
  vehicleOdometer,
  vehicleEngineHours,
  todayDateYmd,
  initialForm,
  isSubmitting,
  submitError,
  onClearSubmitError,
  onSubmit,
  isEditMode,
}: BasicServiceEventBundleFormProps) {
  const [form, setForm] = useState(() => cloneForm(initialForm));
  const [localError, setLocalError] = useState("");

  const [nodePicker, setNodePicker] = useState<{ rowIndex: number } | null>(null);
  const [actionPickerOpen, setActionPickerOpen] = useState(false);
  const [actionRowPicker, setActionRowPicker] = useState<number | null>(null);

  const [skuLookup, setSkuLookup] = useState("");
  const [skuResults, setSkuResults] = useState<PartSkuViewModel[]>([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuError, setSkuError] = useState("");
  const skuGen = useRef(0);

  const [uninstalled, setUninstalled] = useState<ExpenseItem[]>([]);
  const [uninstalledLoading, setUninstalledLoading] = useState(false);
  const [uninstalledError, setUninstalledError] = useState("");

  const leafOptions = useMemo(
    () => flattenNodeTreeToSelectOptions(nodeTree).filter((o) => !o.hasChildren),
    [nodeTree]
  );
  const leafIds = useMemo(() => new Set(leafOptions.map((o) => o.id)), [leafOptions]);

  const costTotalPreview = useMemo(() => {
    const partsRaw = form.partsCost.trim().replace(",", ".");
    const laborRaw = form.laborCost.trim().replace(",", ".");
    if (partsRaw === "" && laborRaw === "") return null;
    const p = partsRaw === "" ? 0 : Number.parseFloat(partsRaw);
    const l = laborRaw === "" ? 0 : Number.parseFloat(laborRaw);
    if (Number.isNaN(p) || Number.isNaN(l)) return null;
    const cur = form.currency.trim().toUpperCase() || "RUB";
    return `${formatExpenseAmountRu(p + l)} ${cur}`;
  }, [form.partsCost, form.laborCost, form.currency]);

  const orderedUninstalled = useMemo(() => {
    const selectedIds = new Set(form.items.map((it) => it.nodeId.trim()).filter(Boolean));
    return [...uninstalled].sort((left, right) => {
      const lm = selectedIds.size > 0 && left.nodeId && selectedIds.has(left.nodeId) ? 0 : 1;
      const rm = selectedIds.size > 0 && right.nodeId && selectedIds.has(right.nodeId) ? 0 : 1;
      if (lm !== rm) return lm - rm;
      return (
        new Date(right.purchasedAt ?? right.expenseDate).getTime() -
        new Date(left.purchasedAt ?? left.expenseDate).getTime()
      );
    });
  }, [form.items, uninstalled]);

  const updateForm = useCallback(
    (fn: (p: AddServiceEventFormValues) => AddServiceEventFormValues) => {
      setLocalError("");
      onClearSubmitError();
      setForm(fn);
    },
    [onClearSubmitError]
  );

  useEffect(() => {
    if (!vehicleId) {
      setUninstalled([]);
      return;
    }
    let cancelled = false;
    setUninstalledLoading(true);
    setUninstalledError("");
    const client = createApiClient({ baseUrl: apiBaseUrl });
    const endpoints = createMotoTwinEndpoints(client);
    void endpoints
      .getUninstalledExpenses({ vehicleId })
      .then((res) => {
        if (!cancelled) setUninstalled(res.expenses ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setUninstalled([]);
          setUninstalledError("Не удалось загрузить купленные детали.");
        }
      })
      .finally(() => {
        if (!cancelled) setUninstalledLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, vehicleId]);

  useEffect(() => {
    const t = setTimeout(() => setSkuLookup(getAnchorSku(form).trim()), 300);
    return () => clearTimeout(t);
  }, [form]);

  useEffect(() => {
    const query = skuLookup;
    if (query.length < 2) {
      setSkuResults([]);
      setSkuError("");
      setSkuLoading(false);
      return;
    }
    const gen = skuGen.current + 1;
    skuGen.current = gen;
    setSkuLoading(true);
    setSkuError("");
    const client = createApiClient({ baseUrl: apiBaseUrl });
    const endpoints = createMotoTwinEndpoints(client);
    void endpoints
      .getPartSkus({
        search: query,
        nodeId: getAnchorNodeId(form).trim() || undefined,
      })
      .then((res) => {
        if (skuGen.current !== gen) return;
        const list = res.skus ?? [];
        const nq = normalizePartNumber(query);
        const exact = list.find((sku) =>
          sku.partNumbers.some((pn) => normalizePartNumber(pn.number) === nq)
        );
        const ordered = exact
          ? [exact, ...list.filter((c) => c.id !== exact.id)]
          : list;
        setSkuResults(ordered.slice(0, 6));
      })
      .catch(() => {
        if (skuGen.current !== gen) return;
        setSkuResults([]);
        setSkuError("Не удалось выполнить поиск по каталогу.");
      })
      .finally(() => {
        if (skuGen.current !== gen) return;
        setSkuLoading(false);
      });
  }, [apiBaseUrl, form, skuLookup]);

  const toggleInstalledExpense = (expense: ExpenseItem) => {
    updateForm((prev) => {
      const selected = new Set(prev.installedExpenseItemIds);
      const isSelecting = !selected.has(expense.id);
      if (isSelecting) selected.add(expense.id);
      else selected.delete(expense.id);

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
          eventDate: prev.eventDate.trim() || todayDateYmd,
          title: prev.title.trim() || titleSuggestion,
          odometer: prev.odometer.trim() || (vehicleOdometer != null ? String(vehicleOdometer) : ""),
          engineHours:
            prev.engineHours.trim() ||
            (vehicleEngineHours != null ? String(vehicleEngineHours) : ""),
          comment: nextComment,
        },
        { nodeId: anchorNodeId, partName: anchorPartName, sku: anchorSku }
      );
    });
  };

  const save = async () => {
    const validation = validateAddServiceEventFormValuesMobile(form, {
      todayDateYmd,
      currentVehicleOdometer: vehicleOdometer,
      leafNodeIds: leafIds,
    });
    if (validation.errors.length > 0) {
      setLocalError(validation.errors[0]);
      return;
    }
    setLocalError("");
    await onSubmit(form);
  };

  const combinedError = localError || submitError;

  const nodePickerOptions =
    nodePicker != null
      ? leafOptions.filter(
          (o) =>
            o.id === form.items[nodePicker.rowIndex]?.nodeId.trim() ||
            !form.items.some((it, i) => i !== nodePicker.rowIndex && it.nodeId.trim() === o.id)
        )
      : [];

  return (
    <View>
      <Text style={styles.sectionTitle}>Режим ввода</Text>
      <View style={styles.modeRow}>
        <View style={[styles.modePill, form.mode === "BASIC" && styles.modePillActive]}>
          <Text style={[styles.modePillText, form.mode === "BASIC" && styles.modePillTextActive]}>
            Быстро
          </Text>
        </View>
        <View style={[styles.modePill, form.mode === "ADVANCED" && styles.modePillActive]}>
          <Text
            style={[styles.modePillText, form.mode === "ADVANCED" && styles.modePillTextActive]}
          >
            {form.mode === "ADVANCED" ? "Подробно" : "Подробно · скоро"}
          </Text>
        </View>
      </View>
      <Text style={styles.hintMuted}>
        {form.mode === "BASIC"
          ? "Суммы по деталям и работе относятся ко всем выбранным узлам; тип работы один для всех."
          : "Событие в режиме «Подробно»: у строк могут быть разные типы работ."}
      </Text>

      <Text style={styles.sectionTitle}>Узлы и работы</Text>
      {form.mode === "BASIC" ? (
        <View style={styles.block}>
          <Text style={styles.label}>Тип работы для всех узлов</Text>
          <Pressable
            onPress={() => setActionPickerOpen(true)}
            style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}
          >
            <Text style={styles.inputLikeText}>
              {SERVICE_ACTION_TYPE_OPTIONS.find((o) => o.value === form.commonActionType)?.label ??
                form.commonActionType}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {form.items.map((row, rowIndex) => (
        <View key={row.key} style={styles.itemCard}>
          <Text style={styles.label}>{`Узел ${rowIndex + 1}`}</Text>
          <Pressable
            onPress={() => setNodePicker({ rowIndex })}
            style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}
          >
            <Text style={styles.inputLikeText}>
              {(() => {
                const id = row.nodeId.trim();
                if (!id) return "Выберите узел";
                const opt = leafOptions.find((o) => o.id === id);
                return opt ? optionLabel(opt) : id;
              })()}
            </Text>
          </Pressable>

          {form.mode === "ADVANCED" ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Тип работы</Text>
              <Pressable
                onPress={() => setActionRowPicker(rowIndex)}
                style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}
              >
                <Text style={styles.inputLikeText}>
                  {SERVICE_ACTION_TYPE_OPTIONS.find((o) => o.value === row.actionType)?.label ??
                    row.actionType}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {form.items.length > 1 ? (
            <Pressable
              onPress={() => updateForm((prev) => removeItemAt(prev, rowIndex))}
              style={styles.removeBtn}
            >
              <Text style={styles.removeBtnText}>Удалить строку</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {form.mode === "BASIC" &&
      leafOptions.filter((o) => !form.items.some((it) => it.nodeId.trim() === o.id)).length > 0 ? (
        <Pressable onPress={() => updateForm((prev) => appendEmptyItem(prev))} style={styles.addNodeBtn}>
          <Text style={styles.addNodeBtnText}>+ Добавить узел</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>Данные события</Text>
      <Field label="Дата (YYYY-MM-DD)">
        <TextInput
          value={form.eventDate}
          onChangeText={(t) => updateForm((p) => ({ ...p, eventDate: t }))}
          style={styles.input}
          autoCapitalize="none"
          placeholder="2026-05-03"
        />
      </Field>
      <Field label="Название события">
        <TextInput
          value={form.title}
          onChangeText={(t) => updateForm((p) => ({ ...p, title: t }))}
          style={styles.input}
          placeholder="Например: ТО 10 000 км"
        />
      </Field>
      <Field label="Пробег, км">
        <TextInput
          value={form.odometer}
          onChangeText={(t) => updateForm((p) => ({ ...p, odometer: t }))}
          style={styles.input}
          keyboardType="number-pad"
        />
      </Field>
      <Field label="Моточасы">
        <TextInput
          value={form.engineHours}
          onChangeText={(t) => updateForm((p) => ({ ...p, engineHours: t }))}
          style={styles.input}
          keyboardType="number-pad"
        />
      </Field>

      <Text style={styles.sectionTitle}>Стоимость</Text>
      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Field label="Запчасти">
            <TextInput
              value={form.partsCost}
              onChangeText={(t) => updateForm((p) => ({ ...p, partsCost: t }))}
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Работа">
            <TextInput
              value={form.laborCost}
              onChangeText={(t) => updateForm((p) => ({ ...p, laborCost: t }))}
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </Field>
        </View>
      </View>
      <Field label="Валюта">
        <TextInput
          value={form.currency}
          onChangeText={(t) => updateForm((p) => ({ ...p, currency: t.toUpperCase() }))}
          style={styles.input}
          autoCapitalize="characters"
        />
      </Field>
      {costTotalPreview ? (
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>Итого: {costTotalPreview}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Запчасть (справочно)</Text>
      <Field label="Артикул (SKU)">
        <TextInput
          value={getAnchorSku(form)}
          onChangeText={(t) => updateForm((p) => patchAnchorItem(p, { sku: t }))}
          style={styles.input}
          autoCapitalize="none"
          maxLength={200}
        />
      </Field>
      {getAnchorSku(form).trim().length >= 2 ? (
        <View style={styles.skuCard}>
          <Text style={styles.skuTitle}>Поиск в каталоге</Text>
          {skuLoading ? <Text style={styles.muted}>Ищем…</Text> : null}
          {skuError ? <Text style={styles.err}>{skuError}</Text> : null}
          {!skuLoading && !skuError && skuResults.length === 0 ? (
            <Text style={styles.muted}>Ничего не найдено.</Text>
          ) : null}
          {skuResults.map((sku) => {
            const pn = pickSkuPartNumberOrFallback(sku, "");
            return (
              <Pressable
                key={sku.id}
                onPress={() =>
                  updateForm((prev) =>
                    patchAnchorItem(prev, {
                      sku: pn || getAnchorSku(prev).trim(),
                      partName: sku.canonicalName?.trim() || getAnchorPartName(prev),
                    })
                  )
                }
                style={({ pressed }) => [styles.skuItem, pressed && styles.pressed]}
              >
                <Text style={styles.skuItemPri}>{pn || "Без артикула"}</Text>
                <Text style={styles.skuItemSec}>
                  {sku.brandName} · {sku.canonicalName}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Field label="Наименование запчасти">
        <TextInput
          value={getAnchorPartName(form)}
          onChangeText={(t) => updateForm((p) => patchAnchorItem(p, { partName: t }))}
          style={styles.input}
          maxLength={500}
        />
      </Field>

      <View style={styles.uninstalledCard}>
        <Text style={styles.uninstalledTitle}>Купленные, но не установленные детали</Text>
        {uninstalledLoading ? <Text style={styles.muted}>Загружаю…</Text> : null}
        {uninstalledError ? <Text style={styles.err}>{uninstalledError}</Text> : null}
        {!uninstalledLoading && !uninstalledError && orderedUninstalled.length === 0 ? (
          <Text style={styles.muted}>Нет позиций без установки.</Text>
        ) : null}
        {orderedUninstalled.map((expense) => {
          const selected = form.installedExpenseItemIds.includes(expense.id);
          const sameNode = Boolean(expense.nodeId) && form.items.some((it) => it.nodeId.trim() === expense.nodeId);
          return (
            <Pressable
              key={expense.id}
              onPress={() => toggleInstalledExpense(expense)}
              style={({ pressed }) => [
                styles.unRow,
                selected && styles.unRowSel,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.unCb}>
                <Text style={styles.unCbTxt}>{selected ? "✓" : ""}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.unName}>
                  {expense.title}
                  {sameNode ? <Text style={styles.tagMuted}> · этот узел</Text> : null}
                </Text>
                <Text style={styles.unMeta}>
                  {formatExpenseAmountRu(expense.amount)} {expense.currency} ·{" "}
                  {new Date(expense.purchasedAt ?? expense.expenseDate).toLocaleDateString("ru-RU")}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Field label="Комментарий">
        <TextInput
          value={form.comment}
          onChangeText={(t) => updateForm((p) => ({ ...p, comment: t }))}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </Field>
      <Field label="Установленные запчасти (JSON)">
        <TextInput
          value={form.installedPartsJson}
          onChangeText={(t) => updateForm((p) => ({ ...p, installedPartsJson: t }))}
          style={[styles.input, styles.multiline, styles.mono]}
          multiline
        />
      </Field>

      {combinedError ? <Text style={styles.err}>{combinedError}</Text> : null}

      <Pressable
        onPress={() => void save()}
        disabled={isSubmitting}
        style={({ pressed }) => [styles.save, isSubmitting && styles.saveDis, pressed && !isSubmitting && styles.pressed]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={c.onPrimaryAction} />
        ) : (
          <Text style={styles.saveTxt}>{isEditMode ? "Сохранить изменения" : "Сохранить событие"}</Text>
        )}
      </Pressable>

      <Modal visible={nodePicker != null} transparent animationType="fade" onRequestClose={() => setNodePicker(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setNodePicker(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Выберите узел</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {nodePickerOptions.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    const idx = nodePicker!.rowIndex;
                    updateForm((prev) => patchItemAt(prev, idx, { nodeId: opt.id }));
                    setNodePicker(null);
                  }}
                  style={({ pressed }) => [styles.modalRow, pressed && styles.pressed]}
                >
                  <Text style={styles.modalRowText}>{optionLabel(opt)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setNodePicker(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseTxt}>Отмена</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={actionPickerOpen} transparent animationType="fade" onRequestClose={() => setActionPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setActionPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Тип работы</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {SERVICE_ACTION_TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    updateForm((prev) => ({
                      ...prev,
                      commonActionType: opt.value,
                      items: prev.items.map((it) => ({ ...it, actionType: opt.value })),
                    }));
                    setActionPickerOpen(false);
                  }}
                  style={({ pressed }) => [styles.modalRow, pressed && styles.pressed]}
                >
                  <Text style={styles.modalRowText}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setActionPickerOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseTxt}>Закрыть</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={actionRowPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionRowPicker(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActionRowPicker(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Тип работы (строка)</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {SERVICE_ACTION_TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={`row-${opt.value}`}
                  onPress={() => {
                    const idx = actionRowPicker!;
                    updateForm((prev) => patchItemAt(prev, idx, { actionType: opt.value }));
                    setActionRowPicker(null);
                  }}
                  style={({ pressed }) => [styles.modalRow, pressed && styles.pressed]}
                >
                  <Text style={styles.modalRowText}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setActionRowPicker(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseTxt}>Закрыть</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: c.textMeta,
    marginTop: 14,
    marginBottom: 8,
  },
  hintMuted: { fontSize: 12, color: c.textSecondary, marginBottom: 8, lineHeight: 17 },
  modeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  modePill: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: c.cardMuted,
  },
  modePillActive: { borderColor: c.primaryAction, backgroundColor: c.primaryAction },
  modePillText: { fontSize: 12, fontWeight: "700", color: c.textMuted },
  modePillTextActive: { color: c.onPrimaryAction },
  block: { marginBottom: 12 },
  label: { fontSize: 12, color: c.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: c.card,
    borderColor: c.borderStrong,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.textPrimary,
  },
  inputLike: {
    backgroundColor: c.card,
    borderColor: c.borderStrong,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputLikeText: { fontSize: 14, color: c.textPrimary, fontWeight: "600" },
  itemCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    backgroundColor: c.card,
  },
  removeBtn: { marginTop: 10, alignSelf: "flex-start" },
  removeBtnText: { color: c.error, fontWeight: "700", fontSize: 13 },
  addNodeBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: c.primaryAction,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  addNodeBtnText: { color: c.primaryAction, fontWeight: "800", fontSize: 13 },
  row2: { flexDirection: "row", gap: 10 },
  totalBadge: {
    borderWidth: 1,
    borderColor: c.indigoSoftBorder,
    backgroundColor: c.serviceBadgeBg,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  totalBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: c.serviceBadgeText,
  },
  skuCard: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardSubtle,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  skuTitle: { fontSize: 12, fontWeight: "700", color: c.textSecondary },
  skuItem: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardMuted,
    borderRadius: 10,
    padding: 10,
  },
  skuItemPri: { fontSize: 13, fontWeight: "800", color: c.textPrimary },
  skuItemSec: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  uninstalledCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: c.card,
    gap: 8,
  },
  uninstalledTitle: { fontSize: 15, fontWeight: "800", color: c.textPrimary },
  unRow: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
    backgroundColor: c.cardMuted,
  },
  unRowSel: { borderColor: c.primaryAction, backgroundColor: c.cardSubtle },
  unCb: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  unCbTxt: { color: c.primaryAction, fontWeight: "900" },
  unName: { fontSize: 13, fontWeight: "800", color: c.textPrimary },
  unMeta: { marginTop: 3, fontSize: 12, color: c.textSecondary },
  tagMuted: { fontSize: 11, color: c.textMeta, fontWeight: "600" },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  mono: { fontFamily: "Menlo", fontSize: 12 },
  err: { color: c.error, fontSize: 13, marginVertical: 8 },
  muted: { fontSize: 12, color: c.textMuted },
  save: {
    marginTop: 12,
    backgroundColor: c.primaryAction,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  saveDis: { opacity: 0.45 },
  saveTxt: { color: c.onPrimaryAction, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.88 },
  modalOverlay: {
    flex: 1,
    backgroundColor: c.overlayModal,
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: c.textPrimary, marginBottom: 10 },
  modalRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  modalRowText: { fontSize: 14, color: c.textPrimary },
  modalClose: { marginTop: 12, alignSelf: "center", padding: 10 },
  modalCloseTxt: { color: c.primaryAction, fontWeight: "800" },
});
