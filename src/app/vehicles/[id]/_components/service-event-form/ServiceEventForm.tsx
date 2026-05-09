"use client";

import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  applyExpenseInstallToAddFormRow,
  buildAddServiceEventCostBreakdownLines,
  createEmptyBundleItemFormValues,
  DEFAULT_ADD_SERVICE_EVENT_CURRENCY,
  filterLeafOptionsUnderTopNodeAncestors,
  flattenNodeTreeToSelectOptions,
  formatExpenseAmountRu,
  getServiceActionTypeLabelRu,
  getOrderedTopNodeIdsPresentInNodeTree,
  mergeServiceBundleTemplateIntoAddFormValues,
  mergeWishlistItemIntoAddFormValues,
  normalizeVehicleStatePayload,
  parseExpenseAmountInputToNumberOrNull,
  removeWishlistItemFromAddFormValues,
  revertExpenseInstallFormPatch,
  SERVICE_ACTION_TYPE_OPTIONS,
  validateAddServiceEventFormValues,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import partsCartPageStyles from "../../parts/_components/PartsCartPage.module.css";
import type {
  AddServiceEventFormValues,
  BundleItemFormValues,
  InstallableForServiceEventEntry,
  NodeTreeItem,
  PartSkuViewModel,
  PartWishlistItem,
  ServiceActionType,
  ServiceBundleTemplateWire,
  TopServiceNodeItem,
} from "@mototwin/types";

import { ServiceEventModeControl } from "./ServiceEventModeControl";
import { PostSaveExplainer } from "./PostSaveExplainer";
import { BasicInfoCard } from "./cards/BasicInfoCard";
import { CostCard } from "./cards/CostCard";
import { AdditionalCardFast } from "./cards/AdditionalCardFast";
import { PreliminarySummaryCard } from "./cards/PreliminarySummaryCard";
import { BundleHeader } from "./bundle/BundleHeader";
import { BundleNodeRowFast } from "./bundle/BundleNodeRowFast";
import { BundleNodeCardExtended } from "./bundle/BundleNodeCardExtended";
import { BundleTotals } from "./bundle/BundleTotals";
import { ServiceEventModalBodyUnified } from "./body/ServiceEventModalBodyUnified";
import { AddNodeSheet } from "./overlays/AddNodeSheet";
import { TemplateContentsOverlay } from "./overlays/TemplateContentsOverlay";
import {
  InstallablePickerOverlay,
  type InstallableFilter,
} from "./overlays/InstallablePickerOverlay";
import {
  cloneAddServiceEventForm,
  currencySuffix,
  nodeBreadcrumbRu,
  normalizePartNumber,
} from "./utils";
import { SERVICE_EVENT_PARTS_UI } from "./styles";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

type PendingVehicleStateUpdate = {
  reasons: string[];
  odometer: number;
  engineHours: number | null;
};

function normalizeCostLineCurrency(line: string | null | undefined, currency: string): string | null {
  if (!line) return null;
  const code = currency.trim().toUpperCase() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY;
  const suffix = currencySuffix(currency);
  if (suffix === code || !line.endsWith(` ${code}`)) {
    return line;
  }
  return `${line.slice(0, -code.length)}${suffix}`;
}

function bundleItemQuantityMultiplier(item: Pick<BundleItemFormValues, "quantity">): number {
  const trimmed = item.quantity.trim();
  if (!trimmed) return 1;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
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

/** Очистка узла: при нескольких строках убираем слот целиком, при одной — только `nodeId`. */
function clearNodeOrRemoveRowAt(form: AddServiceEventFormValues, index: number): AddServiceEventFormValues {
  if (form.items.length > 1) {
    return removeItemAt(form, index);
  }
  return patchItemAt(form, index, { nodeId: "" });
}

function appendEmptyItem(form: AddServiceEventFormValues): AddServiceEventFormValues {
  const next = createEmptyBundleItemFormValues({
    actionType: form.mode === "BASIC" ? form.commonActionType : "REPLACE",
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

function pickSkuPartNumberOrFallback(sku: PartSkuViewModel, fallback: string): string {
  const first = sku.partNumbers[0]?.number?.trim() ?? "";
  return first || fallback;
}

export type ServiceEventFormProps = {
  /** Bump when `initialForm` should be re-applied (navigate / repeat / prefill). */
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
  onCancel: () => void;
  /** Page title; defaults by edit vs create. */
  title?: string;
  contextHint?: ReactNode;
  /** Optional `max` on date input (e.g. today). */
  eventDateMaxYmd?: string;
  /** Optional `max` on odometer field. */
  odometerInputMax?: number | null;
  /** Reuse the visual shell of «Корзина замен и расходников» without touching that page. */
  pageChrome?: "default" | "partsCart";
  /** Подзаголовок под заголовком в chrome `partsCart`. Для создания по умолчанию пусто. */
  pageSubtitle?: string;
};

type ServiceEventFormInnerProps = Omit<ServiceEventFormProps, "resetKey">;

function ServiceEventFormInner({
  onCancel,
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
  title,
  contextHint,
  pageChrome = "default",
  pageSubtitle,
}: ServiceEventFormInnerProps) {
  const [form, setForm] = useState<AddServiceEventFormValues>(() => cloneAddServiceEventForm(initialForm));
  const [localValidationError, setLocalValidationError] = useState("");
  const [skuSearchRowIndex, setSkuSearchRowIndex] = useState(0);
  const [skuSearchPanelOpen, setSkuSearchPanelOpen] = useState(false);
  const [currentVehicleOdometer, setCurrentVehicleOdometer] = useState<number | null>(vehicleOdometer);
  const [currentVehicleEngineHours, setCurrentVehicleEngineHours] = useState<number | null>(vehicleEngineHours);
  const [vehicleStateSaving, setVehicleStateSaving] = useState(false);
  const [vehicleStateError, setVehicleStateError] = useState("");
  const [vehicleStateSuccess, setVehicleStateSuccess] = useState("");
  const [pendingVehicleStateUpdate, setPendingVehicleStateUpdate] =
    useState<PendingVehicleStateUpdate | null>(null);

  const [serviceEventSkuLookup, setServiceEventSkuLookup] = useState("");
  const [serviceEventSkuResults, setServiceEventSkuResults] = useState<PartSkuViewModel[]>([]);
  const [serviceEventSkuLoading, setServiceEventSkuLoading] = useState(false);
  const [serviceEventSkuError, setServiceEventSkuError] = useState("");
  const serviceEventSkuSearchGen = useRef(0);

  const [bundleTemplates, setBundleTemplates] = useState<ServiceBundleTemplateWire[]>([]);
  const [bundleTemplatesLoadError, setBundleTemplatesLoadError] = useState("");
  const [selectedBundleTemplateId, setSelectedBundleTemplateId] = useState("");
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);

  const [installableEntries, setInstallableEntries] = useState<InstallableForServiceEventEntry[]>([]);
  const [installableLoading, setInstallableLoading] = useState(false);
  const [installableError, setInstallableError] = useState("");
  const [installableFilter, setInstallableFilter] = useState<InstallableFilter>("all");
  const [selectedInstallableKeys, setSelectedInstallableKeys] = useState<Set<string>>(() => new Set());
  const [installablePickerOpen, setInstallablePickerOpen] = useState(false);

  const [templateContentsOpen, setTemplateContentsOpen] = useState(false);
  const [editingUnitRowIndex, setEditingUnitRowIndex] = useState<number | null>(null);
  const [addNodeSheetOpen, setAddNodeSheetOpen] = useState(false);
  const [collapsedBundleKeys, setCollapsedBundleKeys] = useState<Set<string>>(() => new Set());

  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setCurrentVehicleOdometer(vehicleOdometer);
    setCurrentVehicleEngineHours(vehicleEngineHours);
  }, [vehicleEngineHours, vehicleOdometer]);

  const updateForm = useCallback(
    (updater: (prev: AddServiceEventFormValues) => AddServiceEventFormValues) => {
      setLocalValidationError("");
      onClearSubmitError();
      setForm(updater);
    },
    [onClearSubmitError]
  );

  const maybeUpdateVehicleStateFromEventMetrics = useCallback(() => {
    if (vehicleStateSaving) return;

    const eventOdometer = Number(form.odometer.trim());
    const eventEngineHours = form.engineHours.trim() === "" ? null : Number(form.engineHours.trim());
    const odometerIsValid = Number.isInteger(eventOdometer) && eventOdometer >= 0;
    const engineHoursIsValid =
      eventEngineHours === null || (Number.isInteger(eventEngineHours) && eventEngineHours >= 0);
    if (!odometerIsValid || !engineHoursIsValid) return;

    let nextOdometer = currentVehicleOdometer;
    let nextEngineHours = currentVehicleEngineHours;
    const reasons: string[] = [];

    if (currentVehicleOdometer != null && eventOdometer > currentVehicleOdometer) {
      nextOdometer = eventOdometer;
      reasons.push(
        `пробег события ${eventOdometer} км больше текущего пробега ТС ${currentVehicleOdometer} км`
      );
    }
    if (
      eventEngineHours != null &&
      currentVehicleEngineHours != null &&
      eventEngineHours > currentVehicleEngineHours
    ) {
      nextEngineHours = eventEngineHours;
      reasons.push(
        `моточасы события ${eventEngineHours} ч больше текущих моточасов ТС ${currentVehicleEngineHours} ч`
      );
    }

    if (reasons.length === 0) return;
    const odometerForPayload = nextOdometer ?? eventOdometer;
    setVehicleStateError("");
    setVehicleStateSuccess("");
    setPendingVehicleStateUpdate({
      reasons,
      odometer: odometerForPayload,
      engineHours: nextEngineHours,
    });
  }, [
    currentVehicleEngineHours,
    currentVehicleOdometer,
    form.engineHours,
    form.odometer,
    vehicleStateSaving,
  ]);

  const confirmVehicleStateUpdate = useCallback(async () => {
    const pending = pendingVehicleStateUpdate;
    if (!pending) return;

    try {
      setVehicleStateSaving(true);
      setVehicleStateError("");
      setVehicleStateSuccess("");
      const data = await api.updateVehicleState(
        vehicleId,
        normalizeVehicleStatePayload({
          odometer: String(pending.odometer),
          engineHours: pending.engineHours != null ? String(pending.engineHours) : "",
        })
      );
      setCurrentVehicleOdometer(data.vehicle.odometer);
      setCurrentVehicleEngineHours(data.vehicle.engineHours);
      setPendingVehicleStateUpdate(null);
      setVehicleStateSuccess("Текущие показатели обновлены.");
    } catch (error) {
      console.error(error);
      setVehicleStateError(error instanceof Error ? error.message : "Не удалось обновить текущие показатели.");
    } finally {
      setVehicleStateSaving(false);
    }
  }, [pendingVehicleStateUpdate, vehicleId]);

  const cancelPendingVehicleStateUpdate = useCallback(() => {
    if (vehicleStateSaving) return;
    setPendingVehicleStateUpdate(null);
    updateForm((prev) => ({
      ...prev,
      odometer: currentVehicleOdometer != null ? String(currentVehicleOdometer) : prev.odometer,
      engineHours:
        currentVehicleEngineHours != null ? String(currentVehicleEngineHours) : prev.engineHours,
    }));
  }, [currentVehicleEngineHours, currentVehicleOdometer, updateForm, vehicleStateSaving]);

  const onPatch = useCallback(
    (patch: Partial<AddServiceEventFormValues>) => {
      updateForm((prev) => ({ ...prev, ...patch }));
    },
    [updateForm]
  );

  const toggleCollapsedBundleRow = useCallback((rowKey: string) => {
    setCollapsedBundleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  }, []);

  const leafNodeOptions = useMemo(
    () => flattenNodeTreeToSelectOptions(nodeTree).filter((option) => !option.hasChildren),
    [nodeTree]
  );
  const leafNodePickerOptions = useMemo(
    () =>
      leafNodeOptions.map((option) => ({
        id: option.id,
        name: option.name,
        level: option.level,
        pathLabel: nodeBreadcrumbRu(nodeTree, option.id),
      })),
    [leafNodeOptions, nodeTree]
  );
  const orderedTopNodeIdsForPicker = useMemo(
    () => getOrderedTopNodeIdsPresentInNodeTree(nodeTree, topServiceNodes),
    [nodeTree, topServiceNodes]
  );
  const topLeafNodePickerOptions = useMemo(
    () =>
      filterLeafOptionsUnderTopNodeAncestors(
        nodeTree,
        leafNodePickerOptions,
        orderedTopNodeIdsForPicker
      ),
    [leafNodePickerOptions, nodeTree, orderedTopNodeIdsForPicker]
  );
  const leafNodeIdsSet = useMemo(
    () => new Set(leafNodeOptions.map((option) => option.id)),
    [leafNodeOptions]
  );

  const effectiveSkuRowIndex =
    form.mode === "BASIC" ? 0 : Math.min(Math.max(0, skuSearchRowIndex), Math.max(0, form.items.length - 1));

  useEffect(() => {
    setSkuSearchRowIndex((idx) => Math.min(Math.max(0, idx), Math.max(0, form.items.length - 1)));
  }, [form.items.length]);

  const openSkuSearchForRow = useCallback((rowIndex: number) => {
    setSkuSearchRowIndex(rowIndex);
    setSkuSearchPanelOpen(true);
  }, []);

  const preliminaryCostBreakdown = useMemo(
    () => buildAddServiceEventCostBreakdownLines(form),
    [form]
  );

  const stickyCostLines = useMemo(() => {
    const suffix = currencySuffix(form.currency);
    const zero = `${formatExpenseAmountRu(0)} ${suffix}`;
    return {
      parts: normalizeCostLineCurrency(preliminaryCostBreakdown.parts, form.currency) ?? zero,
      labor: normalizeCostLineCurrency(preliminaryCostBreakdown.labor, form.currency) ?? zero,
      total: normalizeCostLineCurrency(preliminaryCostBreakdown.total, form.currency) ?? zero,
    };
  }, [form.currency, preliminaryCostBreakdown]);

  const serviceEventCostTotalPreview = useMemo(() => {
    const suffix = currencySuffix(form.currency);
    if (form.mode === "ADVANCED") {
      let rowP = 0;
      let rowL = 0;
      for (const it of form.items) {
        const pr = it.partCost.trim();
        const lr = it.laborCost.trim();
        if (pr !== "") {
          const v = parseExpenseAmountInputToNumberOrNull(pr);
          if (v != null) rowP += v * bundleItemQuantityMultiplier(it);
        }
        if (lr !== "") {
          const v = parseExpenseAmountInputToNumberOrNull(lr);
          if (v != null) rowL += v;
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
      if (!hadCostInput) {
        return null;
      }
      return `${formatExpenseAmountRu(sum)} ${suffix}`;
    }
    const partsRaw = form.partsCost.trim();
    const laborRaw = form.laborCost.trim();
    if (partsRaw === "" && laborRaw === "") {
      return null;
    }
    const p = partsRaw === "" ? 0 : parseExpenseAmountInputToNumberOrNull(partsRaw);
    const l = laborRaw === "" ? 0 : parseExpenseAmountInputToNumberOrNull(laborRaw);
    if (p == null || l == null) {
      return null;
    }
    return `${formatExpenseAmountRu(p + l)} ${suffix}`;
  }, [form.mode, form.items, form.partsCost, form.laborCost, form.currency]);

  const totalLabel = useMemo(() => {
    if (serviceEventCostTotalPreview) return serviceEventCostTotalPreview;
    return `0 ${currencySuffix(form.currency)}`;
  }, [serviceEventCostTotalPreview, form.currency]);

  const selectedBundleTemplate = useMemo(
    () => bundleTemplates.find((t) => t.id === selectedBundleTemplateId) ?? null,
    [bundleTemplates, selectedBundleTemplateId]
  );

  const filteredInstallableEntries = useMemo(() => {
    const used = new Set(form.items.map((it) => it.nodeId.trim()).filter(Boolean));
    return installableEntries
      .filter((entry) => entryMatchesInstallableFilter(entry, installableFilter))
      .sort((left, right) => {
        const leftMatches = left.nodeId && used.has(left.nodeId) ? 0 : 1;
        const rightMatches = right.nodeId && used.has(right.nodeId) ? 0 : 1;
        if (leftMatches !== rightMatches) {
          return leftMatches - rightMatches;
        }
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

  const mergeInstallableWishlistEntry = useCallback(
    (
      currentForm: AddServiceEventFormValues,
      entry: InstallableForServiceEventEntry,
      leafIds: Set<string>
    ): AddServiceEventFormValues => {
      const synth = entryToSyntheticWishlistItem(entry, vehicleId);
      if (!synth) return currentForm;
      let next = mergeWishlistItemIntoAddFormValues(currentForm, synth, leafIds, {
        skipPartsCostBump: Boolean(entry.expenseItemId),
      });
      if (next === currentForm) return next;
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
          next = mergeInstallableWishlistEntry(next, entry, leafNodeIdsSet);
        } else {
          const stripItem = entryToSyntheticWishlistItem(entry, vehicleId);
          const formCur = prev.currency.trim().toUpperCase() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY;
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
          const partName = row?.partName.trim() || entry.partName?.trim() || entry.title.trim();
          const sku = row?.sku.trim() || entry.partSku?.trim() || "";
          next = {
            ...next,
            eventDate: next.eventDate.trim() || new Date().toISOString().slice(0, 10),
            title: next.title.trim() || titleSuggestion,
            odometer: next.odometer.trim() || (vehicleOdometer != null ? String(vehicleOdometer) : ""),
            engineHours:
              next.engineHours.trim() || (vehicleEngineHours != null ? String(vehicleEngineHours) : ""),
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

  // Auto-resize comment textarea.
  useEffect(() => {
    if (!commentTextareaRef.current) return;
    const ta = commentTextareaRef.current;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(ta.scrollHeight, 64)}px`;
  }, [form.comment]);

  // Debounce SKU lookup.
  useEffect(() => {
    const rowSku = (form.items[effectiveSkuRowIndex]?.sku ?? "").trim();
    const timer = window.setTimeout(() => {
      setServiceEventSkuLookup(rowSku);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.items, effectiveSkuRowIndex]);

  // SKU search.
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
        nodeId: (form.items[effectiveSkuRowIndex]?.nodeId ?? "").trim() || undefined,
      })
      .then((res) => {
        if (serviceEventSkuSearchGen.current !== gen) return;
        const list = res.skus ?? [];
        const normalizedQuery = normalizePartNumber(query);
        const exact = list.find((sku) =>
          sku.partNumbers.some((pn) => normalizePartNumber(pn.number) === normalizedQuery)
        );
        const ordered = exact ? [exact, ...list.filter((c) => c.id !== exact.id)] : list;
        setServiceEventSkuResults(ordered.slice(0, 6));
      })
      .catch(() => {
        if (serviceEventSkuSearchGen.current !== gen) return;
        setServiceEventSkuResults([]);
        setServiceEventSkuError("Не удалось выполнить поиск по каталогу.");
      })
      .finally(() => {
        if (serviceEventSkuSearchGen.current !== gen) return;
        setServiceEventSkuLoading(false);
      });
  }, [form, effectiveSkuRowIndex, serviceEventSkuLookup]);

  // Bundle templates.
  useEffect(() => {
    let cancelled = false;
    setBundleTemplatesLoadError("");
    void api
      .getServiceBundleTemplates()
      .then((res) => {
        if (!cancelled) setBundleTemplates(res.templates ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setBundleTemplates([]);
          setBundleTemplatesLoadError("Не удалось загрузить шаблоны.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .getTopServiceNodes()
      .then((res) => {
        if (!cancelled) setTopServiceNodes(res.nodes ?? []);
      })
      .catch(() => {
        if (!cancelled) setTopServiceNodes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Installable list — prefetch (used when overlay is opened or for badge counts).
  useEffect(() => {
    if (!vehicleId) {
      setInstallableEntries([]);
      setInstallableLoading(false);
      setInstallableError("");
      return;
    }
    let cancelled = false;
    setInstallableLoading(true);
    setInstallableError("");
    void api
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
  }, [vehicleId]);

  const applyServiceEventSkuSuggestion = useCallback(
    (sku: PartSkuViewModel) => {
      updateForm((prev) => {
        const idx =
          prev.mode === "BASIC"
            ? 0
            : Math.min(Math.max(0, skuSearchRowIndex), Math.max(0, prev.items.length - 1));
        const row = prev.items[idx];
        return patchItemAt(prev, idx, {
          sku: pickSkuPartNumberOrFallback(sku, row?.sku?.trim() ?? ""),
          partName: sku.canonicalName?.trim() || row?.partName?.trim() || "",
        });
      });
    },
    [skuSearchRowIndex, updateForm]
  );

  const confirmAddNodesFromSheet = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      const anchoredRow = editingUnitRowIndex;
      updateForm((prev) => {
        let next = prev;
        let anchorUsed = false;

        for (const id of nodeIds) {
          if (
            !anchorUsed &&
            anchoredRow != null &&
            anchoredRow >= 0 &&
            anchoredRow < next.items.length &&
            !next.items[anchoredRow]?.nodeId.trim()
          ) {
            next = patchItemAt(next, anchoredRow, {
              nodeId: id,
              actionType:
                next.mode === "BASIC"
                  ? next.commonActionType
                  : next.items[anchoredRow]?.actionType ?? "SERVICE",
            });
            anchorUsed = true;
            continue;
          }

          const emptyIdx = next.items.findIndex((it) => !it.nodeId.trim());
          if (emptyIdx >= 0) {
            next = patchItemAt(next, emptyIdx, {
              nodeId: id,
              actionType:
                next.mode === "BASIC" ? next.commonActionType : next.items[emptyIdx]?.actionType ?? "SERVICE",
            });
          } else {
            next = appendEmptyItem(next);
            const idx = next.items.length - 1;
            next = patchItemAt(next, idx, {
              nodeId: id,
              actionType: next.mode === "BASIC" ? next.commonActionType : "SERVICE",
            });
          }
        }
        if (next.mode === "BASIC") {
          next = {
            ...next,
            items: next.items.map((it) => ({ ...it, actionType: next.commonActionType })),
          };
        }
        return next;
      });
      setEditingUnitRowIndex(null);
    },
    [editingUnitRowIndex, updateForm]
  );

  const onApplyTemplate = useCallback(
    (templateId: string) => {
      const tpl = bundleTemplates.find((t) => t.id === templateId);
      if (!tpl) return;
      updateForm((prev) => {
        const { form: merged, skippedItems } = mergeServiceBundleTemplateIntoAddFormValues(
          prev,
          tpl,
          leafNodeIdsSet
        );
        if (skippedItems.length > 0) {
          queueMicrotask(() =>
            setLocalValidationError(
              `Не все узлы шаблона доступны для этого ТС: ${skippedItems
                .map((s) => s.label)
                .join(", ")}`
            )
          );
        } else {
          queueMicrotask(() => {
            setLocalValidationError("");
            onClearSubmitError();
          });
        }
        return merged;
      });
    },
    [bundleTemplates, leafNodeIdsSet, onClearSubmitError, updateForm]
  );

  const save = async () => {
    const validation = validateAddServiceEventFormValues(form, {
      todayDateYmd,
      currentVehicleOdometer,
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
  const selectedUnitsCount = form.items.filter((it) => it.nodeId.trim()).length;
  const isBasic = form.mode === "BASIC";
  const isAdvanced = !isBasic;
  const hasFreeNodes =
    leafNodeOptions.filter((o) => !form.items.some((it) => it.nodeId.trim() === o.id)).length > 0;

  // ----- Section numbering per references -----
  const fastSectionNumbers = { basicInfo: 1, cost: 2, bundle: 3 };
  const extendedSectionNumbers = { basicInfo: 1, cost: 2, bundle: 3 };

  const basicInfoCard = (
    <BasicInfoCard
      sectionNumber={isBasic ? fastSectionNumbers.basicInfo : extendedSectionNumbers.basicInfo}
      form={form}
      isEditing={Boolean(editingServiceEventId)}
      bundleTemplates={bundleTemplates}
      bundleTemplatesLoadError={bundleTemplatesLoadError}
      selectedBundleTemplateId={selectedBundleTemplateId}
      onSelectBundleTemplate={setSelectedBundleTemplateId}
      onOpenTemplateContents={() => setTemplateContentsOpen(true)}
      eventDateMaxYmd={eventDateMaxYmd}
      odometerInputMax={currentVehicleOdometer ?? odometerInputMax}
      onPatch={onPatch}
      currentVehicleOdometer={currentVehicleOdometer}
      currentVehicleEngineHours={currentVehicleEngineHours}
      vehicleStateSaving={vehicleStateSaving}
      vehicleStateError={vehicleStateError}
      vehicleStateSuccess={vehicleStateSuccess}
      onOdometerBlur={() => void maybeUpdateVehicleStateFromEventMetrics()}
      onEngineHoursBlur={() => void maybeUpdateVehicleStateFromEventMetrics()}
      onApplyTemplate={onApplyTemplate}
      commentTextareaRef={commentTextareaRef}
    />
  );

  const costCard = (
    <CostCard
      sectionNumber={isBasic ? fastSectionNumbers.cost : extendedSectionNumbers.cost}
      form={form}
      isEditing={Boolean(editingServiceEventId)}
      totalLabel={totalLabel}
      onPatch={onPatch}
    />
  );

  const additionalCard = (
    <AdditionalCardFast
      form={form}
      editingServiceEventId={editingServiceEventId}
      onPatch={onPatch}
    />
  );

  const preliminarySummary = (
    <PreliminarySummaryCard
      partsLine={stickyCostLines.parts}
      laborLine={stickyCostLines.labor}
      totalLine={stickyCostLines.total}
    />
  );

  const installableButtonVisible = !editingServiceEventId;

  const bundleHeader = (
    <BundleHeader
      sectionNumber={isBasic ? fastSectionNumbers.bundle : extendedSectionNumbers.bundle}
      selectedUnitsCount={selectedUnitsCount}
      hasFreeNodes={hasFreeNodes}
      showInstallableButton={!isBasic && installableButtonVisible}
      installableCount={installableEntries.length}
      onAddNode={() => {
        setEditingUnitRowIndex(null);
        setAddNodeSheetOpen(true);
      }}
      onOpenInstallable={() => setInstallablePickerOpen(true)}
    />
  );

  // Fast-mode rows
  const actionTypeSelect = isBasic ? (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <label
        className="shrink-0 text-[11px] font-semibold uppercase tracking-wide sm:min-w-[6.5rem]"
        style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}
        htmlFor="service-event-common-action-type"
      >
        Тип работы
      </label>
      <select
        id="service-event-common-action-type"
        className="min-h-10 w-full flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 sm:max-w-xs"
        style={{
          borderColor: SERVICE_EVENT_PARTS_UI.border,
          backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceControl,
          color: SERVICE_EVENT_PARTS_UI.text,
        }}
        value={form.commonActionType}
        onChange={(e) => {
          const v = e.target.value as ServiceActionType;
          updateForm((prev) => ({
            ...prev,
            commonActionType: v,
            items: prev.items.map((it) => ({ ...it, actionType: v })),
          }));
        }}
      >
        {SERVICE_ACTION_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ) : null;

  const bundleBanner = isBasic ? (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3"
      style={{
        backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
      }}
    >
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{
          color: SERVICE_EVENT_PARTS_UI.orange,
          backgroundColor: SERVICE_EVENT_PARTS_UI.surface,
        }}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="text-[13px] font-semibold"
          style={{ color: SERVICE_EVENT_PARTS_UI.text }}
        >
          Быстрый режим
        </p>
        <p
          className="mt-0.5 text-[11px] leading-snug"
          style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}
        >
          Выбраны узлы и указана общая стоимость. Статусы узлов будут обновлены.
        </p>
      </div>
    </div>
  ) : null;

  const bundleRowsFast = (
    <div className="flex flex-col">
      {form.items.map((row, rowIndex) => {
        const nodeIdTrim = row.nodeId.trim();
        const nodeOpt = leafNodeOptions.find((o) => o.id === nodeIdTrim);
        const nodeTitle = nodeOpt?.name ?? `Узел ${rowIndex + 1}`;
        const crumb = nodeIdTrim ? nodeBreadcrumbRu(nodeTree, row.nodeId) : "";
        const rowActionLabel = getServiceActionTypeLabelRu(form.commonActionType);
        return (
          <BundleNodeRowFast
            key={row.key}
            index={rowIndex}
            nodeTitle={nodeTitle}
            crumb={crumb}
            rowActionLabel={rowActionLabel}
            hasNode={Boolean(nodeIdTrim)}
            canRemove={form.items.length > 1}
            onPickNode={() => {
              setEditingUnitRowIndex(rowIndex);
              setAddNodeSheetOpen(true);
            }}
            onClearNode={() => {
              setEditingUnitRowIndex(null);
              updateForm((prev) => clearNodeOrRemoveRowAt(prev, rowIndex));
            }}
            onRemove={() => {
              setEditingUnitRowIndex(null);
              updateForm((prev) => removeItemAt(prev, rowIndex));
            }}
          />
        );
      })}
    </div>
  );

  // Extended-mode node cards
  const bundleNodeCardsExtended = form.items.map((row, rowIndex) => {
    const nodeIdTrim = row.nodeId.trim();
    const nodeOpt = leafNodeOptions.find((o) => o.id === nodeIdTrim);
    const nodeTitle = nodeOpt?.name ?? `Узел ${rowIndex + 1}`;
    const crumb = nodeIdTrim ? nodeBreadcrumbRu(nodeTree, row.nodeId) : "";
    const partsParsed = parseExpenseAmountInputToNumberOrNull(row.partCost.trim());
    const partsCostFormatted =
      partsParsed != null
        ? `${formatExpenseAmountRu(partsParsed * bundleItemQuantityMultiplier(row))} ${currencySuffix(form.currency)}`
        : "—";

    return (
      <BundleNodeCardExtended
        key={row.key}
        index={rowIndex}
        row={row}
        nodeTitle={nodeTitle}
        crumb={crumb}
        hasNode={Boolean(nodeIdTrim)}
        itemsCount={form.items.length}
        collapsed={collapsedBundleKeys.has(row.key)}
        currency={form.currency}
        partsCostFormatted={partsCostFormatted}
        onPickNode={() => {
          setEditingUnitRowIndex(rowIndex);
          setAddNodeSheetOpen(true);
        }}
        onToggleCollapsed={() => toggleCollapsedBundleRow(row.key)}
        onChangeNodeId={(nodeId) => {
          updateForm((prev) =>
            !nodeId.trim() ? clearNodeOrRemoveRowAt(prev, rowIndex) : patchItemAt(prev, rowIndex, { nodeId })
          );
          if (!nodeId.trim()) {
            setEditingUnitRowIndex(null);
          }
        }}
        onChangeActionType={(actionType) =>
          updateForm((prev) => patchItemAt(prev, rowIndex, { actionType }))
        }
        onPatchRow={(patch) => updateForm((prev) => patchItemAt(prev, rowIndex, patch))}
        onSetSkuRow={() => openSkuSearchForRow(rowIndex)}
        onRemoveRow={() => {
          setEditingUnitRowIndex(null);
          updateForm((prev) => removeItemAt(prev, rowIndex));
        }}
        onClearPart={() =>
          updateForm((prev) =>
            patchItemAt(prev, rowIndex, { partName: "", sku: "", quantity: "", partCost: "" })
          )
        }
      />
    );
  });

  const bundleAddNodeFooter = hasFreeNodes ? (
    <button
      type="button"
      onClick={() => {
        setEditingUnitRowIndex(null);
        setAddNodeSheetOpen(true);
      }}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3 text-sm font-semibold transition hover:opacity-95"
      style={{
        borderColor: productSemanticColors.border,
        color: productSemanticColors.primaryAction,
        backgroundColor: "transparent",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Добавить узел
    </button>
  ) : null;

  const bundleSkuPanel =
    isAdvanced && skuSearchPanelOpen && (form.items[effectiveSkuRowIndex]?.sku ?? "").trim().length >= 2 ? (
      <div
        className="rounded-xl border px-3 py-2"
        style={{
          borderColor: productSemanticColors.border,
          backgroundColor: productSemanticColors.cardSubtle,
        }}
      >
        <p className="text-xs font-semibold" style={{ color: productSemanticColors.textSecondary }}>
          {`Поиск в каталоге по артикулу (узел ${effectiveSkuRowIndex + 1})`}
        </p>
        {serviceEventSkuLoading ? (
          <p className="mt-1 text-xs" style={{ color: productSemanticColors.textMuted }}>
            Ищем совпадения…
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
                    borderColor: productSemanticColors.border,
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
    ) : null;

  const bundleTotalsExtended = (
    <BundleTotals
      partsLine={stickyCostLines.parts}
      laborLine={stickyCostLines.labor}
      totalLine={stickyCostLines.total}
      variant="extended"
    />
  );

  const resolvedTitle =
    title ??
    (editingServiceEventId ? "Редактировать сервисное событие" : "Добавить сервисное событие");
  const resolvedSubtitle =
    pageSubtitle ??
    (editingServiceEventId ? "Измените данные события и сохраните обновлённую запись в журнале." : "");
  const saveButtonLabel = isSubmitting
    ? "Сохранение…"
    : editingServiceEventId
      ? "Сохранить изменения"
      : "Сохранить событие";
  const serviceEventActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-9 min-w-[7rem] items-center justify-center rounded-lg border px-4 text-xs font-bold leading-none transition hover:opacity-90"
        style={{
          borderColor: SERVICE_EVENT_PARTS_UI.border,
          backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
          color: SERVICE_EVENT_PARTS_UI.text,
        }}
      >
        Отменить
      </button>
      <button
        type="button"
        onClick={() => void save()}
        disabled={isSubmitting}
        className="inline-flex h-9 min-w-[10.5rem] items-center justify-center rounded-lg border px-4 text-xs font-bold leading-none transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
        style={{
          borderColor: SERVICE_EVENT_PARTS_UI.orange,
          backgroundColor: SERVICE_EVENT_PARTS_UI.orange,
          color: "#fff",
        }}
      >
        {saveButtonLabel}
      </button>
    </div>
  );
  const serviceEventModeControl = (
    <ServiceEventModeControl
      variant="segmented"
      isBasic={isBasic}
      onSelectBasic={() => {
        setSkuSearchRowIndex(0);
        setSkuSearchPanelOpen(false);
        updateForm((prev) => (prev.mode === "BASIC" ? prev : switchFormToBasic(prev)));
      }}
      onSelectDetailed={() => {
        setSkuSearchRowIndex(0);
        setSkuSearchPanelOpen(false);
        updateForm((prev) => (prev.mode === "ADVANCED" ? prev : switchFormToAdvanced(prev)));
      }}
    />
  );
  const vehicleStateConfirmModal = pendingVehicleStateUpdate ? (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: "rgba(3, 7, 18, 0.72)" }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !vehicleStateSaving) {
          cancelPendingVehicleStateUpdate();
        }
      }}
    >
      <div
        className="rounded-2xl border p-4 shadow-2xl sm:p-5"
        style={{
          width: "min(380px, calc(100vw - 32px))",
          backgroundColor: SERVICE_EVENT_PARTS_UI.surface,
          borderColor: SERVICE_EVENT_PARTS_UI.border,
          color: SERVICE_EVENT_PARTS_UI.text,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Обновить текущие показатели ТС"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight">Обновить текущие показатели?</p>
            <p className="mt-1 text-xs leading-snug" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
              Введённое значение события больше текущего состояния мотоцикла.
            </p>
          </div>
          <button
            type="button"
            onClick={cancelPendingVehicleStateUpdate}
            disabled={vehicleStateSaving}
            aria-label="Закрыть"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: SERVICE_EVENT_PARTS_UI.border,
              backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
              color: SERVICE_EVENT_PARTS_UI.textMuted,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {pendingVehicleStateUpdate.reasons.map((reason) => (
            <p
              key={reason}
              className="rounded-lg border px-3 py-2 text-xs leading-snug"
              style={{
                borderColor: SERVICE_EVENT_PARTS_UI.borderSubtle,
                backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
                color: SERVICE_EVENT_PARTS_UI.textMuted,
              }}
            >
              {reason}
            </p>
          ))}
        </div>

        <div
          className="mt-4 rounded-xl border px-3 py-2 text-xs"
          style={{
            borderColor: SERVICE_EVENT_PARTS_UI.borderSubtle,
            backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceControl,
            color: SERVICE_EVENT_PARTS_UI.text,
          }}
        >
          Новые текущие показатели: {pendingVehicleStateUpdate.odometer} км
          {pendingVehicleStateUpdate.engineHours != null ? ` · ${pendingVehicleStateUpdate.engineHours} ч` : ""}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={cancelPendingVehicleStateUpdate}
            disabled={vehicleStateSaving}
            className="inline-flex h-9 min-w-[7rem] items-center justify-center rounded-lg border px-4 text-xs font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: SERVICE_EVENT_PARTS_UI.border,
              backgroundColor: SERVICE_EVENT_PARTS_UI.surfaceElevated,
              color: SERVICE_EVENT_PARTS_UI.text,
            }}
          >
            Не обновлять
          </button>
          <button
            type="button"
            onClick={() => void confirmVehicleStateUpdate()}
            disabled={vehicleStateSaving}
            className="inline-flex h-9 min-w-[9rem] items-center justify-center rounded-lg border px-4 text-xs font-bold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
            style={{
              borderColor: SERVICE_EVENT_PARTS_UI.orange,
              backgroundColor: SERVICE_EVENT_PARTS_UI.orange,
              color: "#fff",
            }}
          >
            {vehicleStateSaving ? "Обновляем…" : "Обновить"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (pageChrome === "partsCart") {
    return (
      <div
        className={partsCartPageStyles.root}
        style={{
          gridTemplateColumns: "minmax(0, 1fr)",
          maxWidth: 1500,
          width: "100%",
          marginInline: "auto",
          background: SERVICE_EVENT_PARTS_UI.canvas,
        }}
      >
        <main className={`${partsCartPageStyles.mainColumn} ${partsCartPageStyles.mainColumnServiceEvent}`}>
          <header
            className={partsCartPageStyles.headerServiceEvent}
            style={{ gridTemplateColumns: "28px minmax(0, 1fr)", alignItems: "start" }}
          >
            <button
              type="button"
              onClick={onCancel}
              className={partsCartPageStyles.backButton}
              aria-label="Назад"
            >
              ←
            </button>
            <div className={partsCartPageStyles.headerServiceEventText}>
              <h1 className={partsCartPageStyles.title}>{resolvedTitle}</h1>
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <div className="min-w-[220px] flex-1">{serviceEventModeControl}</div>
                <div className="shrink-0">{serviceEventActions}</div>
              </div>
              {resolvedSubtitle.trim() ? (
                <p className={partsCartPageStyles.subtitle}>{resolvedSubtitle}</p>
              ) : null}
            </div>
          </header>

          {contextHint ? (
            <div className={partsCartPageStyles.historyBox}>
              <div className="text-xs" style={{ color: SERVICE_EVENT_PARTS_UI.textMuted }}>
                {contextHint}
              </div>
            </div>
          ) : null}

          <section
            className={`${partsCartPageStyles.listPanel} flex min-h-0 flex-1 flex-col`}
            aria-label="Форма сервисного события"
            style={{
              minHeight: "calc(100vh - 84px)",
              border: 0,
              borderRadius: 0,
              background: "transparent",
            }}
          >
            <div
              className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <ServiceEventModalBodyUnified
                isBasic={isBasic}
                basicInfoCard={basicInfoCard}
                costCard={costCard}
                additionalCard={additionalCard}
                preliminarySummary={preliminarySummary}
                bundleHeader={bundleHeader}
                bundleBanner={bundleBanner}
                actionTypeSelect={actionTypeSelect}
                bundleRowsFast={bundleRowsFast}
                bundleNodeCards={bundleNodeCardsExtended}
                bundleAddNodeFooter={bundleAddNodeFooter}
                bundleSkuPanel={bundleSkuPanel}
                bundleTotalsExtended={bundleTotalsExtended}
              />

              {combinedError ? (
                <p className="mt-2 pb-1 text-sm" style={{ color: productSemanticColors.error }}>
                  {combinedError}
                </p>
              ) : null}
            </div>

            <div
              className="mt-4 shrink-0 border-t px-4 py-2.5 sm:mt-5 sm:px-5 sm:py-3"
              style={{
                borderTopColor: SERVICE_EVENT_PARTS_UI.border,
                backgroundColor: SERVICE_EVENT_PARTS_UI.surface,
              }}
            >
              <PostSaveExplainer />
            </div>
          </section>

          <TemplateContentsOverlay
            open={templateContentsOpen}
            template={selectedBundleTemplate}
            onClose={() => setTemplateContentsOpen(false)}
          />

          <AddNodeSheet
            open={addNodeSheetOpen}
            onClose={() => setAddNodeSheetOpen(false)}
            options={leafNodePickerOptions}
            topOptions={topLeafNodePickerOptions.length > 0 ? topLeafNodePickerOptions : undefined}
            usedNodeIds={new Set(form.items.map((it) => it.nodeId.trim()).filter(Boolean))}
            onConfirm={confirmAddNodesFromSheet}
          />

          <InstallablePickerOverlay
            open={installablePickerOpen}
            onClose={() => setInstallablePickerOpen(false)}
            loading={installableLoading}
            error={installableError}
            entries={filteredInstallableEntries}
            filter={installableFilter}
            setFilter={setInstallableFilter}
            selectedKeys={selectedInstallableKeys}
            isLeafNode={(id) => leafNodeIdsSet.has(id)}
            isNodeUsed={(id) => form.items.some((it) => it.nodeId.trim() === id)}
            counts={installableCounts}
            onToggleEntry={toggleInstallableEntry}
          />
          {vehicleStateConfirmModal}
        </main>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-0 w-full max-w-[1500px] flex-1 flex-col overflow-hidden rounded-3xl border"
      style={{
        backgroundColor: productSemanticColors.card,
        borderColor: productSemanticColors.border,
        color: productSemanticColors.textPrimary,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      }}
    >
      <div
        className="flex shrink-0 flex-col gap-3 border-b px-5 py-3 sm:px-6"
        style={{ borderBottomColor: productSemanticColors.border }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition hover:opacity-90"
            style={{
              borderColor: productSemanticColors.border,
              backgroundColor: productSemanticColors.cardSubtle,
              color: productSemanticColors.textPrimary,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Назад
          </button>
          <div className="min-w-0 flex-1">
            <h1
              className="truncate text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: productSemanticColors.textPrimary }}
            >
              {resolvedTitle}
            </h1>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="min-w-[220px] flex-1">{serviceEventModeControl}</div>
          <div className="shrink-0">{serviceEventActions}</div>
        </div>
        {contextHint ? (
          <div className="text-sm" style={{ color: productSemanticColors.textSecondary }}>
            {contextHint}
          </div>
        ) : null}
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <ServiceEventModalBodyUnified
          isBasic={isBasic}
          basicInfoCard={basicInfoCard}
          costCard={costCard}
          additionalCard={additionalCard}
          preliminarySummary={preliminarySummary}
          bundleHeader={bundleHeader}
          bundleBanner={bundleBanner}
          actionTypeSelect={actionTypeSelect}
          bundleRowsFast={bundleRowsFast}
          bundleNodeCards={bundleNodeCardsExtended}
          bundleAddNodeFooter={bundleAddNodeFooter}
          bundleSkuPanel={bundleSkuPanel}
          bundleTotalsExtended={bundleTotalsExtended}
        />

        {combinedError ? (
          <p className="mt-2 pb-1 text-sm" style={{ color: productSemanticColors.error }}>
            {combinedError}
          </p>
        ) : null}
      </div>

      {/* Post-save explainer — BASIC и ADVANCED */}
      <div
        className="mt-4 shrink-0 border-t px-5 py-2.5 sm:mt-5 sm:px-6 sm:py-3"
        style={{
          borderTopColor: productSemanticColors.border,
          backgroundColor: productSemanticColors.cardSubtle,
        }}
      >
        <PostSaveExplainer />
      </div>
      {/* Overlays */}
      <TemplateContentsOverlay
        open={templateContentsOpen}
        template={selectedBundleTemplate}
        onClose={() => setTemplateContentsOpen(false)}
      />

      <AddNodeSheet
        open={addNodeSheetOpen}
        onClose={() => setAddNodeSheetOpen(false)}
        options={leafNodePickerOptions}
        topOptions={topLeafNodePickerOptions.length > 0 ? topLeafNodePickerOptions : undefined}
        usedNodeIds={new Set(form.items.map((it) => it.nodeId.trim()).filter(Boolean))}
        onConfirm={confirmAddNodesFromSheet}
      />

      <InstallablePickerOverlay
        open={installablePickerOpen}
        onClose={() => setInstallablePickerOpen(false)}
        loading={installableLoading}
        error={installableError}
        entries={filteredInstallableEntries}
        filter={installableFilter}
        setFilter={setInstallableFilter}
        selectedKeys={selectedInstallableKeys}
        isLeafNode={(id) => leafNodeIdsSet.has(id)}
        isNodeUsed={(id) => form.items.some((it) => it.nodeId.trim() === id)}
        counts={installableCounts}
        onToggleEntry={toggleInstallableEntry}
      />
      {vehicleStateConfirmModal}
    </div>
  );
}

export function ServiceEventForm({ resetKey, ...innerProps }: ServiceEventFormProps) {
  return <ServiceEventFormInner key={resetKey} {...innerProps} />;
}
