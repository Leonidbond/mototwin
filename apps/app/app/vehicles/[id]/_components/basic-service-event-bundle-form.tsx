/* eslint-disable react-hooks/set-state-in-effect -- SKU + installable loaders (same pattern as web BasicServiceEventModal). */

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
  applyExpenseInstallToAddFormRow,
  createEmptyBundleItemFormValues,
  DEFAULT_ADD_SERVICE_EVENT_CURRENCY,
  flattenNodeTreeToSelectOptions,
  formatExpenseAmountRu,
  mergeServiceBundleTemplateIntoAddFormValues,
  mergeWishlistItemIntoAddFormValues,
  parseExpenseAmountInputToNumberOrNull,
  removeWishlistItemFromAddFormValues,
  revertExpenseInstallFormPatch,
  SERVICE_ACTION_TYPE_OPTIONS,
  validateAddServiceEventFormValuesMobile,
} from "@mototwin/domain";
import { productSemanticColors as c } from "@mototwin/design-tokens";
import type {
  AddServiceEventFormValues,
  BundleItemFormValues,
  InstallableForServiceEventEntry,
  NodeTreeItem,
  PartSkuViewModel,
  PartWishlistItem,
  PartWishlistItemStatus,
  ServiceBundleTemplateWire,
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
  const next = createEmptyBundleItemFormValues({
    actionType: form.mode === "BASIC" ? form.commonActionType : "SERVICE",
  });
  return { ...form, items: [...form.items, next] };
}

function switchFormToAdvanced(prev: AddServiceEventFormValues): AddServiceEventFormValues {
  return {
    ...prev,
    mode: "ADVANCED",
    items: prev.items.map((it) => ({
      ...it,
      actionType: it.actionType ?? prev.commonActionType,
    })),
  };
}

function switchFormToBasic(prev: AddServiceEventFormValues): AddServiceEventFormValues {
  const ct = prev.items[0]?.actionType ?? prev.commonActionType;
  return {
    ...prev,
    mode: "BASIC",
    commonActionType: ct,
    items: prev.items.map((it) => ({ ...it, actionType: ct })),
  };
}

function resolveInstallableExpenseTargetRow(
  form: AddServiceEventFormValues,
  entryNodeId: string | null | undefined
): { form: AddServiceEventFormValues; rowIndex: number } {
  const nid = entryNodeId?.trim() ?? "";
  if (nid) {
    const idx = form.items.findIndex((it) => it.nodeId.trim() === nid);
    if (idx >= 0) {
      return { form, rowIndex: idx };
    }
  }
  const emptyIdx = form.items.findIndex((it) => !it.nodeId.trim());
  if (emptyIdx >= 0) {
    return { form, rowIndex: emptyIdx };
  }
  const appended = appendEmptyItem(form);
  return { form: appended, rowIndex: appended.items.length - 1 };
}

/**
 * Builds a synthetic {@link PartWishlistItem} from a unified picker entry so
 * we can reuse {@link mergeWishlistItemIntoAddFormValues}. Same shape as the
 * web modal helper.
 */
function entryToSyntheticWishlistItem(
  entry: InstallableForServiceEventEntry,
  vehicleId: string
): PartWishlistItem | null {
  if (!entry.wishlistItemId || !entry.wishlistStatus) {
    return null;
  }
  const nowIso = new Date().toISOString();
  return {
    id: entry.wishlistItemId,
    vehicleId,
    nodeId: entry.nodeId,
    skuId: null,
    title: entry.title,
    quantity: entry.quantity ?? 1,
    status: entry.wishlistStatus,
    comment: null,
    costAmount: entry.amount,
    currency: entry.currency,
    createdAt: nowIso,
    updatedAt: nowIso,
    node: entry.nodeId ? { id: entry.nodeId, name: entry.nodeName ?? "" } : null,
    sku: null,
  };
}

const INSTALLABLE_BADGE_BY_STATUS_RU: Record<PartWishlistItemStatus, string> = {
  NEEDED: "Нужно купить",
  ORDERED: "Заказано",
  BOUGHT: "Куплено",
  INSTALLED: "Установлено",
};

function getInstallableEntryBadgeRu(entry: InstallableForServiceEventEntry): string {
  if (entry.source === "wishlist+expense") {
    return "Куплено · из списка покупок";
  }
  if (entry.source === "expense") {
    return "Куплено";
  }
  return entry.wishlistStatus ? INSTALLABLE_BADGE_BY_STATUS_RU[entry.wishlistStatus] : "В списке";
}

type InstallableFilter = "all" | "paid" | "wishlist";

function entryMatchesInstallableFilter(
  entry: InstallableForServiceEventEntry,
  filter: InstallableFilter
): boolean {
  if (filter === "all") {
    return true;
  }
  const isPaid =
    entry.source === "expense" ||
    entry.source === "wishlist+expense" ||
    entry.wishlistStatus === "BOUGHT";
  if (filter === "paid") {
    return isPaid;
  }
  return entry.source === "wishlist" && !isPaid;
}

function buildInstallableEntryMetaLine(entry: InstallableForServiceEventEntry): string {
  const parts: string[] = [];
  if (entry.amount != null && entry.currency) {
    parts.push(`${formatExpenseAmountRu(entry.amount)} ${entry.currency}`);
  }
  const dateIso = entry.purchasedAt ?? entry.expenseDate;
  if (dateIso) {
    parts.push(new Date(dateIso).toLocaleDateString("ru-RU"));
  }
  if (entry.nodeName?.trim()) {
    parts.push(entry.nodeName.trim());
  } else if (!entry.nodeId) {
    parts.push("Без узла");
  }
  if (entry.vendor?.trim()) {
    parts.push(entry.vendor.trim());
  }
  if (entry.partSku?.trim()) {
    parts.push(`Арт. ${entry.partSku.trim()}`);
  }
  return parts.join(" · ");
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
  const [skuSearchRowIndex, setSkuSearchRowIndex] = useState(0);

  const [nodePicker, setNodePicker] = useState<{ rowIndex: number } | null>(null);
  const [actionPickerOpen, setActionPickerOpen] = useState(false);
  const [actionRowPicker, setActionRowPicker] = useState<number | null>(null);

  const [skuLookup, setSkuLookup] = useState("");
  const [skuResults, setSkuResults] = useState<PartSkuViewModel[]>([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuError, setSkuError] = useState("");
  const skuGen = useRef(0);

  const [bundleTemplates, setBundleTemplates] = useState<ServiceBundleTemplateWire[]>([]);
  const [bundleTemplatesErr, setBundleTemplatesErr] = useState("");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [installableModalOpen, setInstallableModalOpen] = useState(false);
  const [installableEntries, setInstallableEntries] = useState<InstallableForServiceEventEntry[]>([]);
  const [installableLoading, setInstallableLoading] = useState(false);
  const [installableError, setInstallableError] = useState("");
  const [installableFilter, setInstallableFilter] = useState<InstallableFilter>("all");
  const [selectedInstallableKeys, setSelectedInstallableKeys] = useState<Set<string>>(
    () => new Set()
  );

  const leafOptions = useMemo(
    () => flattenNodeTreeToSelectOptions(nodeTree).filter((o) => !o.hasChildren),
    [nodeTree]
  );
  const leafIds = useMemo(() => new Set(leafOptions.map((o) => o.id)), [leafOptions]);

  const effectiveSkuRowIndex =
    form.mode === "BASIC" ? 0 : Math.min(Math.max(0, skuSearchRowIndex), Math.max(0, form.items.length - 1));

  useEffect(() => {
    setSkuSearchRowIndex((idx) => Math.min(Math.max(0, idx), Math.max(0, form.items.length - 1)));
  }, [form.items.length]);

  const costTotalPreview = useMemo(() => {
    const cur = form.currency.trim().toUpperCase() || "RUB";
    if (form.mode === "ADVANCED") {
      let rowP = 0;
      let rowL = 0;
      for (const it of form.items) {
        const pr = it.partCost.trim();
        const lr = it.laborCost.trim();
        if (pr !== "") {
          const v = parseExpenseAmountInputToNumberOrNull(pr);
          if (v != null) {
            rowP += v;
          }
        }
        if (lr !== "") {
          const v = parseExpenseAmountInputToNumberOrNull(lr);
          if (v != null) {
            rowL += v;
          }
        }
      }
      const topP = parseExpenseAmountInputToNumberOrNull(form.partsCost.trim());
      const topL = parseExpenseAmountInputToNumberOrNull(form.laborCost.trim());
      const tp = topP ?? 0;
      const tl = topL ?? 0;
      const sum = rowP + rowL + tp + tl;
      const hadCostInput =
        form.items.some((it) => it.partCost.trim() !== "" || it.laborCost.trim() !== "") ||
        form.partsCost.trim() !== "" ||
        form.laborCost.trim() !== "";
      if (!hadCostInput) return null;
      return `${formatExpenseAmountRu(sum)} ${cur}`;
    }
    const partsRaw = form.partsCost.trim();
    const laborRaw = form.laborCost.trim();
    if (partsRaw === "" && laborRaw === "") return null;
    const p = partsRaw === "" ? 0 : parseExpenseAmountInputToNumberOrNull(partsRaw);
    const l = laborRaw === "" ? 0 : parseExpenseAmountInputToNumberOrNull(laborRaw);
    if (p == null || l == null) return null;
    return `${formatExpenseAmountRu(p + l)} ${cur}`;
  }, [form.mode, form.items, form.partsCost, form.laborCost, form.currency]);

  const filteredInstallableEntries = useMemo(() => {
    const used = new Set(form.items.map((it) => it.nodeId.trim()).filter(Boolean));
    return installableEntries
      .filter((entry) => entryMatchesInstallableFilter(entry, installableFilter))
      .sort((left, right) => {
        const lm = left.nodeId && used.has(left.nodeId) ? 0 : 1;
        const rm = right.nodeId && used.has(right.nodeId) ? 0 : 1;
        if (lm !== rm) return lm - rm;
        return 0;
      });
  }, [form.items, installableEntries, installableFilter]);

  const installableCounts = useMemo(() => {
    let paid = 0;
    let wishlist = 0;
    for (const entry of installableEntries) {
      if (entryMatchesInstallableFilter(entry, "paid")) paid += 1;
      if (entryMatchesInstallableFilter(entry, "wishlist")) wishlist += 1;
    }
    return { all: installableEntries.length, paid, wishlist };
  }, [installableEntries]);

  const updateForm = useCallback(
    (fn: (p: AddServiceEventFormValues) => AddServiceEventFormValues) => {
      setLocalError("");
      onClearSubmitError();
      setForm(fn);
    },
    [onClearSubmitError]
  );

  useEffect(() => {
    let cancelled = false;
    setBundleTemplatesErr("");
    const client = createApiClient({ baseUrl: apiBaseUrl });
    const endpoints = createMotoTwinEndpoints(client);
    void endpoints
      .getServiceBundleTemplates()
      .then((res) => {
        if (!cancelled) setBundleTemplates(res.templates ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setBundleTemplates([]);
          setBundleTemplatesErr("Не удалось загрузить шаблоны.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!vehicleId || form.mode !== "ADVANCED") {
      setInstallableEntries([]);
      setInstallableLoading(false);
      setInstallableError("");
      return;
    }
    let cancelled = false;
    setInstallableLoading(true);
    setInstallableError("");
    const client = createApiClient({ baseUrl: apiBaseUrl });
    const endpoints = createMotoTwinEndpoints(client);
    void endpoints
      .getInstallableForServiceEvent(vehicleId)
      .then((res) => {
        if (!cancelled) setInstallableEntries(res.items ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setInstallableEntries([]);
          setInstallableError("Не удалось загрузить список «Готово к установке».");
        }
      })
      .finally(() => {
        if (!cancelled) setInstallableLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, vehicleId, form.mode]);

  useEffect(() => {
    if (form.mode === "BASIC") {
      setInstallableModalOpen(false);
    }
  }, [form.mode]);

  const mergeInstallableWishlistEntry = useCallback(
    (
      currentForm: AddServiceEventFormValues,
      entry: InstallableForServiceEventEntry,
      leafIdsSet: Set<string>
    ): AddServiceEventFormValues => {
      const synth = entryToSyntheticWishlistItem(entry, vehicleId);
      if (!synth) {
        return currentForm;
      }
      let next = mergeWishlistItemIntoAddFormValues(currentForm, synth, leafIdsSet, {
        skipPartsCostBump: Boolean(entry.expenseItemId),
      });
      if (next === currentForm) {
        return next;
      }
      const partSkuTrimmed = entry.partSku?.trim() ?? "";
      if (partSkuTrimmed && entry.nodeId) {
        const idx = next.items.findIndex((it) => it.nodeId.trim() === entry.nodeId);
        if (idx >= 0 && !next.items[idx].sku.trim()) {
          next = patchItemAt(next, idx, { sku: partSkuTrimmed });
        }
      }
      return next;
    },
    [vehicleId]
  );

  const toggleInstallableEntry = (entry: InstallableForServiceEventEntry) => {
    const wasSelected = selectedInstallableKeys.has(entry.key);
    const willBeSelected = !wasSelected;
    setSelectedInstallableKeys((prev) => {
      const next = new Set(prev);
      if (willBeSelected) next.add(entry.key);
      else next.delete(entry.key);
      return next;
    });

    updateForm((prev) => {
      let next = prev;

      if (entry.wishlistItemId) {
        if (willBeSelected) {
          next = mergeInstallableWishlistEntry(next, entry, leafIds);
        } else {
          const stripItem = entryToSyntheticWishlistItem(entry, vehicleId);
          const formCur =
            prev.currency.trim().toUpperCase() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY;
          const entCur = entry.currency?.trim().toUpperCase();
          const revertBump =
            prev.mode === "BASIC" &&
            !entry.expenseItemId &&
            entry.amount != null &&
            Number.isFinite(entry.amount) &&
            entry.amount > 0 &&
            entCur &&
            entCur === formCur
              ? { amount: entry.amount, currency: entry.currency ?? DEFAULT_ADD_SERVICE_EVENT_CURRENCY }
              : null;
          next = removeWishlistItemFromAddFormValues(next, entry.wishlistItemId, {
            removeBundleRowForNodeId: entry.nodeId,
            revertBumpedPartsCost: revertBump,
            stripWishlistCommentForItem: stripItem ?? undefined,
          });
        }
      }

      if (entry.expenseItemId) {
        const selectedExp = new Set(next.installedExpenseItemIds);
        if (willBeSelected) selectedExp.add(entry.expenseItemId);
        else selectedExp.delete(entry.expenseItemId);
        next = { ...next, installedExpenseItemIds: Array.from(selectedExp) };

        if (!willBeSelected && !entry.wishlistItemId) {
          const expenseTitle = entry.partName?.trim() || entry.title.trim();
          next = revertExpenseInstallFormPatch(next, {
            bundleNodeId: entry.nodeId,
            expenseTitleForComment: expenseTitle,
            amount: entry.amount ?? null,
            currency: entry.currency ?? null,
          });
        }

        if (willBeSelected && !entry.wishlistItemId) {
          const expenseTitle = entry.partName?.trim() || entry.title.trim();
          const commentLine = `Установлена ранее купленная деталь: ${expenseTitle}`;
          const titleSuggestion = `Установка: ${expenseTitle}`;
          const nextComment = next.comment.trim()
            ? next.comment.includes(commentLine)
              ? next.comment
              : `${next.comment.trim()}\n${commentLine}`
            : commentLine;
          const { form: nextWithRow, rowIndex: rowIdx } = resolveInstallableExpenseTargetRow(
            next,
            entry.nodeId
          );
          next = nextWithRow;
          const row = next.items[rowIdx] ?? next.items[0];
          const nodeId = row?.nodeId.trim() || entry.nodeId || "";
          const partName =
            row?.partName.trim() || entry.partName?.trim() || entry.title.trim();
          const sku = row?.sku.trim() || entry.partSku?.trim() || "";
          next = {
            ...next,
            eventDate: next.eventDate.trim() || todayDateYmd,
            title: next.title.trim() || titleSuggestion,
            odometer:
              next.odometer.trim() || (vehicleOdometer != null ? String(vehicleOdometer) : ""),
            engineHours:
              next.engineHours.trim() ||
              (vehicleEngineHours != null ? String(vehicleEngineHours) : ""),
            comment: nextComment,
          };
          next = patchItemAt(next, rowIdx, { nodeId, partName, sku });
          next = applyExpenseInstallToAddFormRow(next, rowIdx, {
            amount: entry.amount ?? null,
            currency: entry.currency ?? null,
            quantity: entry.quantity ?? null,
          });
        }
      }

      return next;
    });
  };

  useEffect(() => {
    const rowSku = (form.items[effectiveSkuRowIndex]?.sku ?? "").trim();
    const t = setTimeout(() => setSkuLookup(rowSku), 300);
    return () => clearTimeout(t);
  }, [form.items, effectiveSkuRowIndex]);

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
        nodeId: (form.items[effectiveSkuRowIndex]?.nodeId ?? "").trim() || undefined,
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
  }, [apiBaseUrl, form, effectiveSkuRowIndex, skuLookup]);

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
        <Pressable
          onPress={() => {
            setSkuSearchRowIndex(0);
            updateForm((prev) => (prev.mode === "BASIC" ? prev : switchFormToBasic(prev)));
          }}
          style={({ pressed }) => [
            styles.modePill,
            form.mode === "BASIC" && styles.modePillActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.modePillText, form.mode === "BASIC" && styles.modePillTextActive]}>Быстро</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setSkuSearchRowIndex(0);
            updateForm((prev) => (prev.mode === "ADVANCED" ? prev : switchFormToAdvanced(prev)));
          }}
          style={({ pressed }) => [
            styles.modePill,
            form.mode === "ADVANCED" && styles.modePillAdvActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.modePillText, form.mode === "ADVANCED" && styles.modePillTextAdvActive]}>
            Подробно
          </Text>
        </Pressable>
      </View>
      <Text style={styles.hintMuted}>
        {form.mode === "BASIC"
          ? "Суммы по деталям и работе относятся ко всем выбранным узлам; тип работы один для всех."
          : "У каждой строки свой тип работы, запчасть, SKU и суммы. Итог — по строкам или сверху, если в строках пусто."}
      </Text>

      {!isEditMode ? (
        <View style={{ marginBottom: 8, gap: 8 }}>
          {bundleTemplatesErr ? <Text style={styles.err}>{bundleTemplatesErr}</Text> : null}
          <Pressable
            onPress={() => setTemplateModalOpen(true)}
            style={({ pressed }) => [styles.templatePickBtn, pressed && styles.pressed]}
          >
            <Text style={styles.templatePickBtnTxt}>Шаблон комплекса…</Text>
          </Pressable>
          {form.mode === "ADVANCED" ? (
            <Pressable
              onPress={() => setInstallableModalOpen(true)}
              style={({ pressed }) => [styles.templatePickBtn, pressed && styles.pressed]}
            >
              <Text style={styles.templatePickBtnTxt}>Готово к установке…</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

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

          {form.mode === "ADVANCED" ? (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }}>
              <Field label="Наименование запчасти">
                <TextInput
                  value={row.partName}
                  onChangeText={(t) => updateForm((p) => patchItemAt(p, rowIndex, { partName: t }))}
                  style={styles.input}
                  maxLength={500}
                  placeholder="Опционально"
                />
              </Field>
              <Field label="Артикул (SKU)">
                <TextInput
                  value={row.sku}
                  onFocus={() => setSkuSearchRowIndex(rowIndex)}
                  onChangeText={(t) => updateForm((p) => patchItemAt(p, rowIndex, { sku: t }))}
                  style={styles.input}
                  maxLength={200}
                  autoCapitalize="none"
                  placeholder="Опционально"
                />
              </Field>
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="Кол-во">
                    <TextInput
                      value={row.quantity}
                      onChangeText={(t) => updateForm((p) => patchItemAt(p, rowIndex, { quantity: t }))}
                      style={styles.input}
                      keyboardType="number-pad"
                      placeholder="1"
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Запчасти, ₽">
                    <TextInput
                      value={row.partCost}
                      onChangeText={(t) => updateForm((p) => patchItemAt(p, rowIndex, { partCost: t }))}
                      style={styles.input}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Работа, ₽">
                    <TextInput
                      value={row.laborCost}
                      onChangeText={(t) => updateForm((p) => patchItemAt(p, rowIndex, { laborCost: t }))}
                      style={styles.input}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                  </Field>
                </View>
              </View>
              <Field label="Комментарий к строке">
                <TextInput
                  value={row.comment}
                  onChangeText={(t) => updateForm((p) => patchItemAt(p, rowIndex, { comment: t }))}
                  style={styles.input}
                  placeholder="Опционально"
                />
              </Field>
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

      {form.mode === "ADVANCED" &&
      (form.items[effectiveSkuRowIndex]?.sku ?? "").trim().length >= 2 ? (
        <View style={styles.skuCard}>
          <Text style={styles.skuTitle}>Поиск в каталоге (строка {effectiveSkuRowIndex + 1})</Text>
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
                  updateForm((prev) => {
                    const idx =
                      prev.mode === "BASIC"
                        ? 0
                        : Math.min(Math.max(0, skuSearchRowIndex), Math.max(0, prev.items.length - 1));
                    const r = prev.items[idx];
                    return patchItemAt(prev, idx, {
                      sku: pn || r?.sku?.trim() || "",
                      partName: sku.canonicalName?.trim() || r?.partName?.trim() || "",
                    });
                  })
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

      {(form.mode === "BASIC" || form.mode === "ADVANCED") &&
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
      {form.mode === "ADVANCED" ? (
        <Text style={styles.hintMuted}>
          Итог — сумма по строкам узлов плюс поля «Запчасти» и «Работа» ниже (можно только строки, только блок или
          оба).
        </Text>
      ) : null}
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

      {form.mode === "BASIC" ? (
        <>
          <Text style={styles.sectionTitle}>Запчасть (справочно)</Text>
          <Field label="Артикул (SKU)">
            <TextInput
              value={getAnchorSku(form)}
              onFocus={() => setSkuSearchRowIndex(0)}
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
        </>
      ) : null}

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

      <Modal
        visible={templateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTemplateModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTemplateModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Шаблон комплекса</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {bundleTemplates.map((tpl) => (
                <Pressable
                  key={tpl.id}
                  onPress={() => {
                    updateForm((prev) => {
                      const { form: merged, skippedItems } = mergeServiceBundleTemplateIntoAddFormValues(
                        prev,
                        tpl,
                        leafIds
                      );
                      if (skippedItems.length > 0) {
                        queueMicrotask(() =>
                          setLocalError(
                            `Не все узлы шаблона доступны: ${skippedItems.map((s) => s.label).join(", ")}`
                          )
                        );
                      } else {
                        queueMicrotask(() => {
                          setLocalError("");
                          onClearSubmitError();
                        });
                      }
                      return merged;
                    });
                    setTemplateModalOpen(false);
                  }}
                  style={({ pressed }) => [styles.modalRow, pressed && styles.pressed]}
                >
                  <Text style={styles.modalRowText}>{tpl.title}</Text>
                  {tpl.description ? (
                    <Text style={[styles.muted, { marginTop: 4 }]}>{tpl.description}</Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setTemplateModalOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseTxt}>Закрыть</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={installableModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInstallableModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setInstallableModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Готово к установке</Text>
            <Text style={[styles.muted, { marginBottom: 8 }]}>
              Активный список покупок и купленные, но ещё не установленные детали — без дублей.
            </Text>
            <View style={styles.filterChipsRow}>
              {(["all", "paid", "wishlist"] as const).map((value) => {
                const isActive = installableFilter === value;
                const label =
                  value === "all"
                    ? `Все · ${installableCounts.all}`
                    : value === "paid"
                      ? `Куплено · ${installableCounts.paid}`
                      : `В списке покупок · ${installableCounts.wishlist}`;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setInstallableFilter(value)}
                    style={({ pressed }) => [
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive && styles.filterChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {installableError ? <Text style={styles.err}>{installableError}</Text> : null}
            {installableLoading ? (
              <Text style={styles.muted}>Загружаю…</Text>
            ) : filteredInstallableEntries.length === 0 ? (
              <Text style={styles.muted}>
                {installableEntries.length === 0
                  ? "Нет активных позиций — список покупок пуст и нет купленных деталей без установки."
                  : "Нет позиций под этот фильтр."}
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                {filteredInstallableEntries.map((entry) => {
                  const nid = entry.nodeId?.trim() ?? "";
                  const onLeaf = Boolean(nid && leafIds.has(nid));
                  const isSelected = selectedInstallableKeys.has(entry.key);
                  const usedNode =
                    !isSelected && Boolean(nid) && form.items.some((it) => it.nodeId.trim() === nid);
                  const disabled = !isSelected && (!onLeaf || usedNode);
                  const meta = buildInstallableEntryMetaLine(entry);
                  const reason = !nid
                    ? "Нет узла — установка через это событие недоступна."
                    : !onLeaf
                      ? "Узел не конечный для этого ТС."
                      : usedNode
                        ? "Этот узел уже добавлен в событие."
                        : null;
                  return (
                    <Pressable
                      key={entry.key}
                      disabled={disabled}
                      onPress={() => toggleInstallableEntry(entry)}
                      style={({ pressed }) => [
                        styles.installableRow,
                        isSelected && styles.installableRowSelected,
                        pressed && !disabled && styles.pressed,
                        disabled && { opacity: 0.45 },
                      ]}
                    >
                      <View style={styles.installableCb}>
                        <Text style={styles.installableCbTxt}>{isSelected ? "✓" : ""}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.installableHeaderRow}>
                          <Text style={styles.installableTitle} numberOfLines={2}>
                            {entry.title}
                          </Text>
                          <View style={styles.installableBadge}>
                            <Text style={styles.installableBadgeText}>
                              {getInstallableEntryBadgeRu(entry)}
                            </Text>
                          </View>
                        </View>
                        {meta ? <Text style={styles.installableMeta}>{meta}</Text> : null}
                        {reason ? <Text style={styles.installableReason}>{reason}</Text> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <Pressable onPress={() => setInstallableModalOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseTxt}>Готово</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
  modePillAdvActive: {
    borderColor: c.indigoSoftBorder,
    backgroundColor: c.serviceBadgeBg,
  },
  modePillText: { fontSize: 12, fontWeight: "700", color: c.textMuted },
  modePillTextActive: { color: c.onPrimaryAction },
  modePillTextAdvActive: { color: c.serviceBadgeText },
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
  templatePickBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: c.cardSubtle,
  },
  templatePickBtnTxt: { color: c.textPrimary, fontWeight: "700", fontSize: 13 },
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
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: c.cardMuted,
  },
  filterChipActive: {
    borderColor: c.primaryAction,
    backgroundColor: c.primaryAction,
  },
  filterChipText: { fontSize: 12, fontWeight: "700", color: c.textSecondary },
  filterChipTextActive: { color: c.onPrimaryAction },
  installableRow: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
    backgroundColor: c.cardMuted,
    marginBottom: 8,
  },
  installableRowSelected: {
    borderColor: c.primaryAction,
    backgroundColor: c.cardSubtle,
  },
  installableCb: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  installableCbTxt: { color: c.primaryAction, fontWeight: "900" },
  installableHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  installableTitle: { flex: 1, fontSize: 13, fontWeight: "800", color: c.textPrimary },
  installableBadge: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.card,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  installableBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: c.textSecondary,
    textTransform: "uppercase",
  },
  installableMeta: { marginTop: 3, fontSize: 12, color: c.textSecondary },
  installableReason: { marginTop: 3, fontSize: 11, color: c.textMeta },
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
