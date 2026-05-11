import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { createApiClient, createMotoTwinEndpoints } from "@mototwin/api-client";
import {
  ADD_SERVICE_EVENT_COMMENT_MAX_LENGTH,
  ADD_SERVICE_EVENT_SERVICE_NOTE_MAX_LENGTH,
  addServiceEventFormValuesFromUserTemplateJson,
  applyExpenseInstallToAddFormRow,
  buildAddServiceEventCostBreakdownLines,
  createEmptyBundleItemFormValues,
  DEFAULT_ADD_SERVICE_EVENT_CURRENCY,
  filterLeafOptionsUnderTopNodeAncestors,
  flattenNodeTreeToSelectOptions,
  getOrderedTopNodeIdsPresentInNodeTree,
  nodeAncestorPathLabelRu,
  formatExpenseAmountRu,
  partSkuListPriceToBundlePartCostInput,
  getServiceActionTypeLabelRu,
  mergeServiceBundleTemplateIntoAddFormValues,
  mergeWishlistItemIntoAddFormValues,
  normalizeVehicleStatePayload,
  parseExpenseAmountInputToNumberOrNull,
  removeWishlistItemFromAddFormValues,
  revertExpenseInstallFormPatch,
  SERVICE_ACTION_TYPE_OPTIONS,
  stripAddServiceEventFormValuesForUserTemplate,
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
  ServicePerformedBy,
  TopServiceNodeItem,
  UserServiceEventFormTemplateWire,
} from "@mototwin/types";
import { MobileNodePickerModal } from "./mobile-node-picker-modal";

/** Палитра панели узлов — как `SERVICE_EVENT_PARTS_UI` на web (`service-event-form/styles.ts`). */
const SE = {
  surface: "#0d141c",
  surfaceElevated: "#101720",
  surfaceControl: "#0b1118",
  border: "#1f2937",
  borderSubtle: "#253140",
  orange: "#ff6b00",
  text: "#f3f4f6",
  textMuted: "#9ca3af",
} as const;

const BUNDLE_INDEX_ICONS: (keyof typeof MaterialIcons.glyphMap)[] = [
  "opacity",
  "view-headline",
  "inventory-2",
  "offline-bolt",
];
import {
  ServiceEventCard,
  ServiceEventModeSegment,
  ServiceEventPreviewSheet,
  SummaryFooter,
  ToggleRow,
} from "./service-event-mobile/ServiceEventMobileShell";

function cloneForm(src: AddServiceEventFormValues): AddServiceEventFormValues {
  return {
    ...src,
    items: src.items.map((it) => ({ ...it })),
    installedExpenseItemIds: [...src.installedExpenseItemIds],
  };
}

function performedByLabelRu(value: ServicePerformedBy): string {
  if (value === "SELF") return "Сам";
  if (value === "SERVICE") return "Сервис";
  return "Другое";
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

function appendNodeItems(form: AddServiceEventFormValues, nodeIds: string[]): AddServiceEventFormValues {
  const existing = new Set(form.items.map((it) => it.nodeId.trim()).filter(Boolean));
  const unique = nodeIds.map((id) => id.trim()).filter((id) => id && !existing.has(id));
  if (unique.length === 0) return form;
  let items = [...form.items];
  for (const nodeId of unique) {
    const emptyIndex = items.findIndex((it) => !it.nodeId.trim());
    if (emptyIndex >= 0) {
      items[emptyIndex] = { ...items[emptyIndex], nodeId };
    } else {
      items = [
        ...items,
        createEmptyBundleItemFormValues({
          nodeId,
          actionType: form.mode === "BASIC" ? form.commonActionType : "REPLACE",
        }),
      ];
    }
    existing.add(nodeId);
  }
  return { ...form, items };
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

const CURRENCY_OPTIONS = ["RUB", "USD", "EUR"] as const;

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

function parseIntegerInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeDateInputYmd(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (!match) return trimmed;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
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
  /** Подсказка под режимом формы (например отложенная установка из wishlist). */
  contextHint?: string;
  /** Блок «Что будет после сохранения» как на web `PostSaveExplainer`. По умолчанию включён. */
  showPostSaveExplainer?: boolean;
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
  contextHint,
  showPostSaveExplainer = true,
}: BasicServiceEventBundleFormProps) {
  const [form, setForm] = useState(() => cloneForm(initialForm));
  const [localError, setLocalError] = useState("");
  const [skuSearchRowIndex, setSkuSearchRowIndex] = useState(0);

  const [nodePicker, setNodePicker] = useState<{ rowIndex: number } | null>(null);
  const [multiNodePickerOpen, setMultiNodePickerOpen] = useState(false);
  const [actionPickerOpen, setActionPickerOpen] = useState(false);
  const [actionRowPicker, setActionRowPicker] = useState<number | null>(null);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [customCurrencyDraft, setCustomCurrencyDraft] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    eventDate?: string;
    odometer?: string;
    engineHours?: string;
    currency?: string;
  }>({});

  const [skuLookup, setSkuLookup] = useState("");
  const [skuResults, setSkuResults] = useState<PartSkuViewModel[]>([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuError, setSkuError] = useState("");
  const skuGen = useRef(0);

  const [bundleTemplates, setBundleTemplates] = useState<ServiceBundleTemplateWire[]>([]);
  const [topServiceNodes, setTopServiceNodes] = useState<TopServiceNodeItem[]>([]);
  const [bundleTemplatesErr, setBundleTemplatesErr] = useState("");
  const [userTemplates, setUserTemplates] = useState<UserServiceEventFormTemplateWire[]>([]);
  const [userTemplatesErr, setUserTemplatesErr] = useState("");
  const [saveUserTemplateOpen, setSaveUserTemplateOpen] = useState(false);
  const [saveUserTemplateName, setSaveUserTemplateName] = useState("");
  const [saveUserTemplateBusy, setSaveUserTemplateBusy] = useState(false);
  const [saveUserTemplateErr, setSaveUserTemplateErr] = useState("");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateInspect, setTemplateInspect] = useState<ServiceBundleTemplateWire | null>(null);
  const [installableModalOpen, setInstallableModalOpen] = useState(false);
  const [installableEntries, setInstallableEntries] = useState<InstallableForServiceEventEntry[]>([]);
  const [installableLoading, setInstallableLoading] = useState(false);
  const [installableError, setInstallableError] = useState("");
  const [installableFilter, setInstallableFilter] = useState<InstallableFilter>("all");
  const [selectedInstallableKeys, setSelectedInstallableKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [currentVehicleOdometer, setCurrentVehicleOdometer] = useState(vehicleOdometer);
  const [currentVehicleEngineHours, setCurrentVehicleEngineHours] = useState(vehicleEngineHours);
  const [pendingVehicleState, setPendingVehicleState] = useState<{
    reasons: string[];
    odometer: number;
    engineHours: number | null;
  } | null>(null);
  const [vehicleStateSaving, setVehicleStateSaving] = useState(false);
  const [vehicleStateError, setVehicleStateError] = useState("");

  const leafOptions = useMemo(
    () => flattenNodeTreeToSelectOptions(nodeTree).filter((o) => !o.hasChildren),
    [nodeTree]
  );
  const leafPickerRows = useMemo(
    () =>
      leafOptions.map((o) => ({
        id: o.id,
        name: o.name,
        level: o.level,
        pathLabel: nodeAncestorPathLabelRu(nodeTree, o.id),
      })),
    [leafOptions, nodeTree]
  );
  const topNodeIds = useMemo(
    () => getOrderedTopNodeIdsPresentInNodeTree(nodeTree, topServiceNodes),
    [nodeTree, topServiceNodes]
  );
  const topLeafPickerRows = useMemo(
    () => filterLeafOptionsUnderTopNodeAncestors(nodeTree, leafPickerRows, topNodeIds),
    [leafPickerRows, nodeTree, topNodeIds]
  );
  const leafIds = useMemo(() => new Set(leafOptions.map((o) => o.id)), [leafOptions]);

  const selectedUnitsCount = useMemo(
    () => form.items.filter((it) => it.nodeId.trim()).length,
    [form.items]
  );
  const hasFreeNodesForBundle = useMemo(
    () => leafOptions.some((o) => !form.items.some((it) => it.nodeId.trim() === o.id)),
    [leafOptions, form.items]
  );

  useEffect(() => {
    setCurrentVehicleOdometer(vehicleOdometer);
  }, [vehicleOdometer]);

  useEffect(() => {
    setCurrentVehicleEngineHours(vehicleEngineHours);
  }, [vehicleEngineHours]);

  const effectiveSkuRowIndex =
    form.mode === "BASIC" ? 0 : Math.min(Math.max(0, skuSearchRowIndex), Math.max(0, form.items.length - 1));

  useEffect(() => {
    setSkuSearchRowIndex((idx) => Math.min(Math.max(0, idx), Math.max(0, form.items.length - 1)));
  }, [form.items.length]);

  const costBreakdownLines = useMemo(() => buildAddServiceEventCostBreakdownLines(form), [form]);

  const costCurrencySuffix = useMemo(() => {
    const cur = form.currency.trim().toUpperCase() || "RUB";
    if (cur === "RUB") return "₽";
    if (cur === "USD") return "$";
    if (cur === "EUR") return "€";
    return cur;
  }, [form.currency]);

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
      setFieldErrors({});
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
    let cancelled = false;
    setUserTemplatesErr("");
    const client = createApiClient({ baseUrl: apiBaseUrl });
    const endpoints = createMotoTwinEndpoints(client);
    void endpoints
      .getUserServiceEventFormTemplates()
      .then((res) => {
        if (!cancelled) setUserTemplates(res.templates ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setUserTemplates([]);
          setUserTemplatesErr("Не удалось загрузить ваши шаблоны.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    const client = createApiClient({ baseUrl: apiBaseUrl });
    const endpoints = createMotoTwinEndpoints(client);
    void endpoints
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

  const maybePromptVehicleStateFromEventMetrics = useCallback(() => {
    const nextOdometer = parseIntegerInput(form.odometer);
    const nextEngineHours = parseIntegerInput(form.engineHours);
    const reasons: string[] = [];
    if (
      nextOdometer != null &&
      currentVehicleOdometer != null &&
      nextOdometer > currentVehicleOdometer
    ) {
      reasons.push(`пробег ${currentVehicleOdometer} → ${nextOdometer} км`);
    }
    if (
      nextEngineHours != null &&
      currentVehicleEngineHours != null &&
      nextEngineHours > currentVehicleEngineHours
    ) {
      reasons.push(`моточасы ${currentVehicleEngineHours} → ${nextEngineHours} ч`);
    }
    if (reasons.length === 0) {
      return false;
    }
    const odometerForUpdate =
      nextOdometer ?? (currentVehicleOdometer != null ? currentVehicleOdometer : null);
    if (odometerForUpdate == null) {
      setFieldErrors((prev) => ({
        ...prev,
        odometer: "Укажите пробег, чтобы обновить состояние мотоцикла.",
      }));
      return true;
    }
    setVehicleStateError("");
    setPendingVehicleState({
      reasons,
      odometer: odometerForUpdate,
      engineHours:
        nextEngineHours != null
          ? nextEngineHours
          : currentVehicleEngineHours != null
            ? currentVehicleEngineHours
            : null,
    });
    return true;
  }, [currentVehicleEngineHours, currentVehicleOdometer, form.engineHours, form.odometer]);

  const normalizeEventDateOnBlur = useCallback(() => {
    const normalized = normalizeDateInputYmd(form.eventDate);
    if (normalized !== form.eventDate) {
      setForm((prev) => ({ ...prev, eventDate: normalized }));
    }
    if (normalized && normalized > todayDateYmd) {
      setFieldErrors((prev) => ({
        ...prev,
        eventDate: `Дата не может быть позже ${todayDateYmd}.`,
      }));
      return false;
    }
    setFieldErrors((prev) => ({ ...prev, eventDate: undefined }));
    return true;
  }, [form.eventDate, todayDateYmd]);

  const runUiGuardsBeforeSubmit = useCallback(() => {
    const dateOk = normalizeEventDateOnBlur();
    const needsVehicleStateConfirmation = maybePromptVehicleStateFromEventMetrics();
    if (needsVehicleStateConfirmation) {
      setFieldErrors((prev) => ({
        ...prev,
        odometer: "Подтвердите обновление текущего пробега/моточасов перед сохранением.",
        engineHours: "Подтвердите обновление текущего пробега/моточасов перед сохранением.",
      }));
    }
    return dateOk && !needsVehicleStateConfirmation;
  }, [maybePromptVehicleStateFromEventMetrics, normalizeEventDateOnBlur]);

  const cancelPendingVehicleStateUpdate = useCallback(() => {
    setPendingVehicleState(null);
    setVehicleStateError("");
    updateForm((prev) => ({
      ...prev,
      odometer: currentVehicleOdometer != null ? String(currentVehicleOdometer) : prev.odometer,
      engineHours:
        currentVehicleEngineHours != null ? String(currentVehicleEngineHours) : "",
    }));
  }, [currentVehicleEngineHours, currentVehicleOdometer, updateForm]);

  const confirmVehicleStateUpdate = useCallback(async () => {
    if (!pendingVehicleState) {
      return;
    }
    try {
      setVehicleStateSaving(true);
      setVehicleStateError("");
      const client = createApiClient({ baseUrl: apiBaseUrl });
      const endpoints = createMotoTwinEndpoints(client);
      const res = await endpoints.updateVehicleState(
        vehicleId,
        normalizeVehicleStatePayload({
          odometer: String(pendingVehicleState.odometer),
          engineHours:
            pendingVehicleState.engineHours != null
              ? String(pendingVehicleState.engineHours)
              : "",
        })
      );
      setCurrentVehicleOdometer(res.vehicle.odometer);
      setCurrentVehicleEngineHours(res.vehicle.engineHours ?? null);
      setPendingVehicleState(null);
      setFieldErrors((prev) => ({ ...prev, odometer: undefined, engineHours: undefined }));
    } catch (error) {
      console.error(error);
      setVehicleStateError(
        error instanceof Error ? error.message : "Не удалось обновить состояние мотоцикла."
      );
    } finally {
      setVehicleStateSaving(false);
    }
  }, [apiBaseUrl, pendingVehicleState, vehicleId]);

  const save = async () => {
    if (!runUiGuardsBeforeSubmit()) {
      return;
    }
    const validation = validateAddServiceEventFormValuesMobile(form, {
      todayDateYmd,
      currentVehicleOdometer,
      leafNodeIds: leafIds,
    });
    if (validation.errors.length > 0) {
      setLocalError(validation.errors[0]);
      return;
    }
    setLocalError("");
    await onSubmit(form);
  };

  const applyUserFormTemplate = useCallback(
    (tpl: UserServiceEventFormTemplateWire) => {
      const next = addServiceEventFormValuesFromUserTemplateJson(tpl.form);
      if (!next) {
        setLocalError("Не удалось применить шаблон.");
        return;
      }
      updateForm(() => next);
      setTemplateModalOpen(false);
    },
    [updateForm]
  );

  const combinedError = localError || submitError;

  const nodePickerOptions =
    nodePicker != null
      ? leafPickerRows.filter(
          (o) =>
            o.id === form.items[nodePicker.rowIndex]?.nodeId.trim() ||
            !form.items.some((it, i) => i !== nodePicker.rowIndex && it.nodeId.trim() === o.id)
        )
      : [];
  const nodePickerTopOptions =
    nodePicker != null
      ? topLeafPickerRows.filter(
          (o) =>
            o.id === form.items[nodePicker.rowIndex]?.nodeId.trim() ||
            !form.items.some((it, i) => i !== nodePicker.rowIndex && it.nodeId.trim() === o.id)
        )
      : [];
  const freeNodePickerRows = leafPickerRows.filter(
    (o) => !form.items.some((it) => it.nodeId.trim() === o.id)
  );
  const freeTopNodePickerRows = topLeafPickerRows.filter(
    (o) => !form.items.some((it) => it.nodeId.trim() === o.id)
  );

  return (
    <View>
      <ServiceEventModeSegment
        mode={form.mode}
        onChange={(nextMode) => {
          setSkuSearchRowIndex(0);
          updateForm((prev) =>
            nextMode === "BASIC" ? switchFormToBasic(prev) : switchFormToAdvanced(prev)
          );
        }}
      />

      {contextHint ? (
        <View style={styles.contextHintBox}>
          <Text style={styles.contextHintText}>{contextHint}</Text>
        </View>
      ) : null}

      <ServiceEventCard title="1. Основная информация">
      {!isEditMode ? (
        <View style={{ marginBottom: 8, gap: 8 }}>
          {bundleTemplatesErr ? <Text style={styles.err}>{bundleTemplatesErr}</Text> : null}
          {userTemplatesErr ? <Text style={styles.err}>{userTemplatesErr}</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pressable
              onPress={() => {
                setSaveUserTemplateErr("");
                setSaveUserTemplateName(form.title.trim());
                setSaveUserTemplateOpen(true);
              }}
              style={({ pressed }) => [styles.templatePickBtn, pressed && styles.pressed]}
            >
              <Text style={styles.templatePickBtnTxt}>Сохранить шаблон</Text>
            </Pressable>
            <Pressable
              onPress={() => setTemplateModalOpen(true)}
              style={({ pressed }) => [styles.templatePickBtn, pressed && styles.pressed]}
            >
              <Text style={styles.templatePickBtnTxt}>Шаблон комплекса…</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Field label="Название события">
        <TextInput
          value={form.title}
          onChangeText={(t) => updateForm((p) => ({ ...p, title: t }))}
          style={styles.input}
          placeholder="Например: ТО 10 000 км"
        />
      </Field>
      <View style={styles.row3}>
        <View style={{ flex: 1 }}>
          <Field label="Дата">
            <TextInput
              value={form.eventDate}
              onChangeText={(t) => updateForm((p) => ({ ...p, eventDate: t }))}
              onBlur={normalizeEventDateOnBlur}
              style={[styles.input, styles.compactInput]}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              placeholder="2026-05-03"
            />
          </Field>
          {fieldErrors.eventDate ? <Text style={styles.fieldError}>{fieldErrors.eventDate}</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Пробег">
            <TextInput
              value={form.odometer}
              onChangeText={(t) => updateForm((p) => ({ ...p, odometer: t }))}
              onBlur={maybePromptVehicleStateFromEventMetrics}
              style={[styles.input, styles.compactInput]}
              keyboardType="number-pad"
            />
          </Field>
          {fieldErrors.odometer ? <Text style={styles.fieldError}>{fieldErrors.odometer}</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Моточасы">
            <TextInput
              value={form.engineHours}
              onChangeText={(t) => updateForm((p) => ({ ...p, engineHours: t }))}
              onBlur={maybePromptVehicleStateFromEventMetrics}
              style={[styles.input, styles.compactInput]}
              keyboardType="number-pad"
              placeholder="—"
            />
          </Field>
          {fieldErrors.engineHours ? <Text style={styles.fieldError}>{fieldErrors.engineHours}</Text> : null}
        </View>
      </View>

      <Text style={styles.label}>Исполнитель</Text>
      <View style={styles.performerRow}>
        {(["SELF", "SERVICE", "OTHER"] as const).map((v) => {
          const active = form.performedBy === v;
          return (
            <Pressable
              key={v}
              onPress={() => updateForm((p) => ({ ...p, performedBy: v }))}
              style={({ pressed }) => [
                styles.performerChip,
                active && styles.performerChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.performerChipText, active && styles.performerChipTextActive]}>
                {performedByLabelRu(v)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {form.performedBy === "SERVICE" ? (
        <Field label="Сервис (необязательно)">
          <TextInput
            value={form.serviceProviderNote}
            onChangeText={(t) => updateForm((p) => ({ ...p, serviceProviderNote: t }))}
            style={styles.input}
            multiline
            maxLength={ADD_SERVICE_EVENT_SERVICE_NOTE_MAX_LENGTH}
            placeholder="Например: MotoService"
          />
        </Field>
      ) : null}
      <Field label="Комментарий">
        <TextInput
          value={form.comment}
          onChangeText={(t) => updateForm((p) => ({ ...p, comment: t }))}
          style={[styles.input, styles.multiline]}
          multiline
          maxLength={ADD_SERVICE_EVENT_COMMENT_MAX_LENGTH}
          placeholder="Любые заметки об этом обслуживании…"
        />
        <Text style={styles.charCounter}>
          {form.comment.length}/{ADD_SERVICE_EVENT_COMMENT_MAX_LENGTH}
        </Text>
      </Field>
      </ServiceEventCard>

      <ServiceEventCard
        title="2. Узлы и работы"
        subtitle={`Выбрано узлов: ${selectedUnitsCount}`}
        right={
          <View style={styles.bundleHeaderActions}>
            {form.mode === "ADVANCED" && !isEditMode ? (
              <Pressable
                onPress={() => setInstallableModalOpen(true)}
                style={({ pressed }) => [styles.bundleInstallableBtn, pressed && styles.pressed]}
              >
                <MaterialIcons name="add" size={16} color={SE.text} />
                <Text style={styles.bundleInstallableBtnText}>Готово к установке</Text>
                {installableEntries.length > 0 ? (
                  <View style={styles.bundleCountBadge}>
                    <Text style={styles.bundleCountBadgeText}>{installableEntries.length}</Text>
                  </View>
                ) : null}
              </Pressable>
            ) : null}
            {hasFreeNodesForBundle ? (
              <Pressable
                onPress={() => setMultiNodePickerOpen(true)}
                style={({ pressed }) => [styles.bundleAddNodeBtn, pressed && styles.pressed]}
              >
                <MaterialIcons name="add" size={16} color={SE.orange} />
                <Text style={styles.bundleAddNodeBtnText}>Добавить узел</Text>
              </Pressable>
            ) : null}
          </View>
        }
      >
        <View style={styles.bundlePanel}>
          {form.mode === "BASIC" ? (
            <View style={styles.bundleCommonActionRow}>
              <Text style={styles.bundleFieldLabel}>Тип работы</Text>
              <Pressable
                onPress={() => setActionPickerOpen(true)}
                style={({ pressed }) => [styles.bundleSelectLike, pressed && styles.pressed]}
              >
                <Text style={styles.bundleSelectLikeText} numberOfLines={1}>
                  {SERVICE_ACTION_TYPE_OPTIONS.find((o) => o.value === form.commonActionType)?.label ??
                    form.commonActionType}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {form.mode === "BASIC" ? (
            <View style={styles.bundleFastBanner}>
              <View style={styles.bundleFastBannerIcon}>
                <MaterialIcons name="bolt" size={18} color={SE.orange} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.bundleFastBannerTitle}>Быстрый режим</Text>
                <Text style={styles.bundleFastBannerSub}>
                  Выбраны узлы и указана общая стоимость. Статусы узлов будут обновлены.
                </Text>
              </View>
            </View>
          ) : null}

          {form.items.map((row, rowIndex) => {
            const nodeIdTrim = row.nodeId.trim();
            const nodeOpt = leafOptions.find((o) => o.id === nodeIdTrim);
            const nodeTitle = nodeOpt?.name ?? `Узел ${rowIndex + 1}`;
            const crumb = nodeIdTrim ? nodeAncestorPathLabelRu(nodeTree, row.nodeId) : "";
            const hasNode = Boolean(nodeIdTrim);
            const canRemoveRow = form.items.length > 1;
            const rowActionLabelBasic = getServiceActionTypeLabelRu(form.commonActionType);
            const indexIcon = BUNDLE_INDEX_ICONS[rowIndex % BUNDLE_INDEX_ICONS.length] ?? "circle";

            return (
              <View key={row.key}>
                <View
                  style={[
                    styles.bundleNodeRow,
                    {
                      borderBottomColor: hasNode ? SE.borderSubtle : SE.orange,
                    },
                  ]}
                >
                  <View style={styles.bundleIndexBadge}>
                    <MaterialIcons name={indexIcon} size={18} color={SE.orange} />
                  </View>
                  <Pressable
                    onPress={() => {
                      if (!hasNode) setNodePicker({ rowIndex });
                    }}
                    disabled={hasNode}
                    style={({ pressed }) => [
                      styles.bundleNodeMainPress,
                      !hasNode && pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.bundleNodeTextCol}>
                      <Text
                        style={[styles.bundleNodeTitle, !hasNode && styles.bundleNodeTitleEmpty]}
                        numberOfLines={1}
                      >
                        {hasNode ? nodeTitle : "Выберите узел"}
                      </Text>
                      <Text style={styles.bundleNodeCrumb} numberOfLines={1}>
                        {!hasNode ? "Узел не выбран" : crumb || ""}
                      </Text>
                    </View>
                  </Pressable>
                  {form.mode === "BASIC" ? (
                    <Text style={styles.bundleRowActionLabel} numberOfLines={2}>
                      {rowActionLabelBasic}
                    </Text>
                  ) : (
                    <Pressable
                      onPress={() => setActionRowPicker(rowIndex)}
                      style={({ pressed }) => [styles.bundleRowActionPick, pressed && styles.pressed]}
                    >
                      <Text style={styles.bundleRowActionPickText} numberOfLines={1}>
                        {SERVICE_ACTION_TYPE_OPTIONS.find((o) => o.value === row.actionType)?.label ??
                          row.actionType}
                      </Text>
                    </Pressable>
                  )}
                  <View style={styles.bundleRowTail}>
                    {hasNode ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Очистить узел"
                        onPress={() => updateForm((prev) => clearNodeOrRemoveRowAt(prev, rowIndex))}
                        style={({ pressed }) => [styles.bundleClearBtn, pressed && styles.pressed]}
                      >
                        <MaterialIcons name="close" size={16} color={SE.textMuted} />
                      </Pressable>
                    ) : (
                      <View style={styles.bundleClearBtnPlaceholder} />
                    )}
                    {canRemoveRow ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Удалить строку"
                        onPress={() => updateForm((prev) => removeItemAt(prev, rowIndex))}
                        style={({ pressed }) => [styles.bundleDeleteRowBtn, pressed && styles.pressed]}
                      >
                        <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
                      </Pressable>
                    ) : null}
                  </View>
                </View>

          {form.mode === "ADVANCED" ? (
            <View
              style={{
                marginTop: 0,
                paddingTop: 12,
                paddingBottom: 4,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: SE.borderSubtle,
              }}
            >
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
              {rowIndex === effectiveSkuRowIndex && row.sku.trim().length >= 2 ? (
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
                          updateForm((prev) => {
                            const idx = Math.min(
                              Math.max(0, rowIndex),
                              Math.max(0, prev.items.length - 1)
                            );
                            const r = prev.items[idx];
                            const partCostFromSku = partSkuListPriceToBundlePartCostInput(sku);
                            return patchItemAt(prev, idx, {
                              sku: pn || r?.sku?.trim() || "",
                              partName: sku.canonicalName?.trim() || r?.partName?.trim() || "",
                              ...(partCostFromSku ? { partCost: partCostFromSku } : {}),
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
                  <Field label={`Детали, ${costCurrencySuffix}`}>
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
                  <Field label={`Работа, ${costCurrencySuffix}`}>
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
              </View>
            );
          })}

          {costBreakdownLines.parts || costBreakdownLines.labor || costBreakdownLines.total ? (
        <View style={styles.unitsTotalsBarInBundle}>
          <Text style={styles.unitsTotalsTitle}>Итого по узлам</Text>
          <View style={styles.unitsTotalsRow}>
            {costBreakdownLines.parts ? (
              <Text style={styles.unitsTotalsLine}>
                Детали: <Text style={styles.unitsTotalsEm}>{costBreakdownLines.parts}</Text>
              </Text>
            ) : null}
            {costBreakdownLines.labor ? (
              <Text style={styles.unitsTotalsLine}>
                Работа: <Text style={styles.unitsTotalsEm}>{costBreakdownLines.labor}</Text>
              </Text>
            ) : null}
            {costBreakdownLines.total ? (
              <Text style={styles.unitsTotalsTotal}>Всего: {costBreakdownLines.total}</Text>
            ) : null}
          </View>
        </View>
      ) : null}
        </View>
      </ServiceEventCard>

      <ServiceEventCard title="3. Стоимость">
      {form.mode === "ADVANCED" ? (
        <Text style={styles.hintMuted}>
          Итог — сумма по строкам узлов плюс поля «Запчасти» и «Работа» ниже (можно только строки, только блок или
          оба).
        </Text>
      ) : null}
      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Field label={`Детали, ${costCurrencySuffix}`}>
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
          <Field label={`Работа, ${costCurrencySuffix}`}>
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
        <Pressable
          onPress={() => {
            setCustomCurrencyDraft((form.currency.trim() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY).toUpperCase());
            setCurrencyPickerOpen(true);
          }}
          style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}
        >
          <Text style={styles.inputLikeText}>
            {(form.currency.trim() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY).toUpperCase()}
          </Text>
        </Pressable>
        {fieldErrors.currency ? <Text style={styles.fieldError}>{fieldErrors.currency}</Text> : null}
      </Field>
      {costTotalPreview ? (
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>Итого: {costTotalPreview}</Text>
        </View>
      ) : null}
      </ServiceEventCard>

      <ServiceEventCard title="4. Дополнительно">
      <ToggleRow
        icon="photo-camera"
        title="Прикрепить фото / чек"
        subtitle="Добавить фотографии или чек обслуживания"
        active={form.attachReceiptRequested}
        onToggle={() =>
          updateForm((prev) => ({
            ...prev,
            attachReceiptRequested: !prev.attachReceiptRequested,
          }))
        }
      />
      <ToggleRow
        icon="attach-file"
        title="Прикрепить файл"
        subtitle="Добавить документ к событию"
        active={form.attachFileRequested}
        onToggle={() =>
          updateForm((prev) => ({
            ...prev,
            attachFileRequested: !prev.attachFileRequested,
          }))
        }
      />
      <ToggleRow
        icon="notifications-none"
        title="Напомнить о следующем обслуживании"
        subtitle="Создать напоминание по регламенту"
        active={form.nextReminderEnabled}
        onToggle={() =>
          updateForm((prev) => ({
            ...prev,
            nextReminderEnabled: !prev.nextReminderEnabled,
          }))
        }
      />
      {form.nextReminderEnabled ? (
        <View style={{ marginTop: 10 }}>
          <Field label="Дата следующего ТО (YYYY-MM-DD)">
            <TextInput
              value={form.nextReminderDate}
              onChangeText={(t) => updateForm((p) => ({ ...p, nextReminderDate: t }))}
              style={styles.input}
              placeholder="2026-10-03"
            />
          </Field>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Пробег">
                <TextInput
                  value={form.nextReminderOdometer}
                  onChangeText={(t) => updateForm((p) => ({ ...p, nextReminderOdometer: t }))}
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="10000"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Моточасы">
                <TextInput
                  value={form.nextReminderEngineHours}
                  onChangeText={(t) =>
                    updateForm((p) => ({ ...p, nextReminderEngineHours: t }))
                  }
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="—"
                />
              </Field>
            </View>
          </View>
          <Text style={styles.reminderHint}>
            Будет создано напоминание по выбранной дате, пробегу или моточасам.
          </Text>
        </View>
      ) : null}
      </ServiceEventCard>

      {combinedError ? <Text style={styles.err}>{combinedError}</Text> : null}

      {showPostSaveExplainer ? (
        <View style={styles.postSaveSection}>
          <Text style={styles.postSaveTitle}>Что будет после сохранения</Text>
          <View style={styles.postSaveGrid}>
            <View style={styles.postSaveCard}>
              <Text style={styles.postSaveCardTitle}>Обновим состояние выбранных узлов</Text>
              <Text style={styles.postSaveCardSub}>
                Статусы узлов будут пересчитаны по пробегу и регламенту.
              </Text>
            </View>
            <View style={styles.postSaveCard}>
              <Text style={styles.postSaveCardTitle}>Пересчитаем регламенты и напоминания</Text>
              <Text style={styles.postSaveCardSub}>
                Сроки следующего обслуживания будут обновлены для выбранных узлов.
              </Text>
            </View>
            <View style={styles.postSaveCard}>
              <Text style={styles.postSaveCardTitle}>Добавим событие в журнал обслуживания</Text>
              <Text style={styles.postSaveCardSub}>
                Событие появится в истории с деталями и стоимостью.
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <SummaryFooter
        partsLine={costBreakdownLines.parts}
        laborLine={costBreakdownLines.labor}
        totalLine={costBreakdownLines.total}
        isSubmitting={isSubmitting}
        isEditMode={isEditMode}
        onPreview={() => setPreviewOpen(true)}
        onSave={() => void save()}
      />

      <ServiceEventPreviewSheet
        visible={previewOpen}
        form={form}
        totalLine={costBreakdownLines.total}
        onClose={() => setPreviewOpen(false)}
      />

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
              {userTemplates.length > 0 ? (
                <Text style={[styles.modalRowText, { marginBottom: 6, opacity: 0.85 }]}>
                  Мои шаблоны
                </Text>
              ) : null}
              {userTemplates.map((tpl) => (
                <View key={tpl.id} style={styles.modalRow}>
                  <Pressable
                    onPress={() => applyUserFormTemplate(tpl)}
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <Text style={styles.modalRowText}>{tpl.title}</Text>
                  </Pressable>
                </View>
              ))}
              {bundleTemplates.length > 0 ? (
                <Text style={[styles.modalRowText, { marginTop: userTemplates.length ? 12 : 0, marginBottom: 6, opacity: 0.85 }]}>
                  Стандартные
                </Text>
              ) : null}
              {bundleTemplates.map((tpl) => (
                <View key={tpl.id} style={styles.modalRow}>
                  <Pressable
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
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <Text style={styles.modalRowText}>{tpl.title}</Text>
                    {tpl.description ? (
                      <Text style={[styles.muted, { marginTop: 4 }]}>{tpl.description}</Text>
                    ) : null}
                  </Pressable>
                  <Pressable onPress={() => setTemplateInspect(tpl)} style={styles.templateComposeLink}>
                    <Text style={styles.templateComposeLinkTxt}>Состав</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Pressable onPress={() => setTemplateModalOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseTxt}>Закрыть</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={templateInspect != null}
        transparent
        animationType="fade"
        onRequestClose={() => setTemplateInspect(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTemplateInspect(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Состав шаблона</Text>
            {templateInspect ? (
              <>
                <Text style={[styles.modalRowText, { marginBottom: 8 }]}>{templateInspect.title}</Text>
                <ScrollView style={{ maxHeight: 360 }}>
                  {[...templateInspect.items]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((it) => {
                      const nodeLabel =
                        it.node?.name?.trim() ||
                        [it.node?.code, it.nodeId].filter(Boolean).join(" · ") ||
                        it.nodeId;
                      return (
                        <View key={it.id} style={styles.templateInspectItem}>
                          <Text style={styles.templateInspectItemTitle}>{nodeLabel}</Text>
                          <Text style={styles.muted}>
                            {getServiceActionTypeLabelRu(it.defaultActionType)}
                            {it.isRequired ? " · обязательный узел" : ""}
                          </Text>
                        </View>
                      );
                    })}
                </ScrollView>
              </>
            ) : null}
            <Pressable onPress={() => setTemplateInspect(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseTxt}>Закрыть</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={saveUserTemplateOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !saveUserTemplateBusy && setSaveUserTemplateOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => !saveUserTemplateBusy && setSaveUserTemplateOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Сохранить как шаблон</Text>
            <Text style={[styles.muted, { marginBottom: 8 }]}>
              В название будет добавлен режим: быстрый или подробный.
            </Text>
            <Text style={styles.label}>Название (необязательно)</Text>
            <TextInput
              value={saveUserTemplateName}
              onChangeText={setSaveUserTemplateName}
              style={styles.input}
              maxLength={200}
              editable={!saveUserTemplateBusy}
              placeholder="Например: сезонное ТО"
            />
            {saveUserTemplateErr ? <Text style={styles.err}>{saveUserTemplateErr}</Text> : null}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={() => !saveUserTemplateBusy && setSaveUserTemplateOpen(false)}
                style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
              >
                <Text style={styles.modalCloseTxt}>Отмена</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (saveUserTemplateBusy) return;
                  setSaveUserTemplateBusy(true);
                  setSaveUserTemplateErr("");
                  const client = createApiClient({ baseUrl: apiBaseUrl });
                  const endpoints = createMotoTwinEndpoints(client);
                  const snapshot = stripAddServiceEventFormValuesForUserTemplate(form);
                  void endpoints
                    .createUserServiceEventFormTemplate({
                      baseTitle: saveUserTemplateName.trim() || null,
                      formSnapshot: snapshot,
                    })
                    .then((res) => {
                      const tpl = res.template;
                      setUserTemplates((prev) => [tpl, ...prev.filter((t) => t.id !== tpl.id)]);
                      setSaveUserTemplateOpen(false);
                    })
                    .catch((err: unknown) => {
                      setSaveUserTemplateErr(
                        err instanceof Error && err.message.trim()
                          ? err.message.trim()
                          : "Не удалось сохранить шаблон."
                      );
                    })
                    .finally(() => {
                      setSaveUserTemplateBusy(false);
                    });
                }}
                style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
              >
                <Text style={[styles.modalCloseTxt, { color: SE.orange, fontWeight: "700" }]}>
                  {saveUserTemplateBusy ? "Сохраняем…" : "Сохранить"}
                </Text>
              </Pressable>
            </View>
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

      <MobileNodePickerModal
        visible={nodePicker != null}
        options={nodePickerOptions}
        topOptions={nodePickerTopOptions}
        selectedId={nodePicker != null ? form.items[nodePicker.rowIndex]?.nodeId : null}
        onClose={() => setNodePicker(null)}
        onSelect={(nodeId) => {
          if (nodePicker == null) return;
          const idx = nodePicker.rowIndex;
          updateForm((prev) => patchItemAt(prev, idx, { nodeId }));
          setNodePicker(null);
        }}
      />

      <MobileNodePickerModal
        visible={multiNodePickerOpen}
        title="Добавить узлы"
        options={freeNodePickerRows}
        topOptions={freeTopNodePickerRows}
        selectedIds={[]}
        onClose={() => setMultiNodePickerOpen(false)}
        onSelect={() => undefined}
        onConfirmSelection={(nodeIds) => {
          updateForm((prev) => appendNodeItems(prev, nodeIds));
          setMultiNodePickerOpen(false);
        }}
      />

      <Modal
        visible={currencyPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyPickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCurrencyPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Валюта</Text>
            {CURRENCY_OPTIONS.map((currency) => (
              <Pressable
                key={currency}
                onPress={() => {
                  updateForm((prev) => ({ ...prev, currency }));
                  setCustomCurrencyDraft(currency);
                  setCurrencyPickerOpen(false);
                }}
                style={({ pressed }) => [styles.modalRow, pressed && styles.pressed]}
              >
                <Text style={styles.modalRowText}>{currency}</Text>
              </Pressable>
            ))}
            <View style={styles.customCurrencyBox}>
              <Text style={styles.label}>Другая валюта</Text>
              <TextInput
                value={customCurrencyDraft}
                onChangeText={(text) => {
                  setCustomCurrencyDraft(text.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8));
                  setFieldErrors((prev) => ({ ...prev, currency: undefined }));
                }}
                style={styles.input}
                autoCapitalize="characters"
                placeholder="KZT"
                maxLength={8}
              />
              <Pressable
                onPress={() => {
                  const next = customCurrencyDraft.trim().toUpperCase();
                  if (!/^[A-Z]{3,8}$/.test(next)) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      currency: "Введите код валюты латиницей, например KZT.",
                    }));
                    return;
                  }
                  updateForm((prev) => ({ ...prev, currency: next }));
                  setCurrencyPickerOpen(false);
                }}
                style={({ pressed }) => [styles.modalClose, styles.customCurrencyApply, pressed && styles.pressed]}
              >
                <Text style={styles.modalCloseTxt}>Выбрать другую</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setCurrencyPickerOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseTxt}>Закрыть</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={pendingVehicleState != null}
        transparent
        animationType="fade"
        onRequestClose={vehicleStateSaving ? undefined : cancelPendingVehicleStateUpdate}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={vehicleStateSaving ? undefined : cancelPendingVehicleStateUpdate}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Обновить текущие показатели?</Text>
            <Text style={[styles.muted, { marginBottom: 10, lineHeight: 18 }]}>
              В событии указаны значения выше текущих:{" "}
              {pendingVehicleState?.reasons.join(", ") || "новые показатели"}.
            </Text>
            {vehicleStateError ? <Text style={styles.err}>{vehicleStateError}</Text> : null}
            <View style={styles.confirmActionsRow}>
              <Pressable
                onPress={cancelPendingVehicleStateUpdate}
                disabled={vehicleStateSaving}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>Не обновлять</Text>
              </Pressable>
              <Pressable
                onPress={() => void confirmVehicleStateUpdate()}
                disabled={vehicleStateSaving}
                style={[styles.primaryAction, vehicleStateSaving && { opacity: 0.55 }]}
              >
                <Text style={styles.primaryActionText}>
                  {vehicleStateSaving ? "Обновляем..." : "Обновить"}
                </Text>
              </Pressable>
            </View>
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
  fieldError: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 13,
    color: c.error,
  },
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
  compactInput: {
    paddingHorizontal: 8,
    fontSize: 12,
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
  row3: { flexDirection: "row", gap: 8 },
  itemHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  nodeActionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  nodePickShell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
  },
  nodePickInput: {
    flex: 1,
    justifyContent: "center",
  },
  actionMiniButton: {
    width: 112,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 8,
    backgroundColor: c.cardSubtle,
  },
  actionMiniText: {
    color: c.primaryAction,
    fontSize: 12,
    fontWeight: "800",
  },
  removeIconButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
  },
  removeIconText: {
    color: c.textMuted,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "800",
  },
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
  selectedCount: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textMuted,
  },
  nodesHeaderRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  headerActionButton: {
    borderWidth: 1,
    borderColor: c.primaryAction,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: c.cardSubtle,
  },
  headerActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: c.primaryAction,
  },
  bundlePanel: {
    marginHorizontal: -4,
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SE.border,
    backgroundColor: SE.surface,
  },
  bundleHeaderActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  bundleInstallableBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: SE.surfaceElevated,
  },
  bundleInstallableBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: SE.text,
  },
  bundleCountBadge: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SE.orange,
  },
  bundleCountBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: c.onPrimaryAction,
  },
  bundleAddNodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SE.orange,
    backgroundColor: "transparent",
  },
  bundleAddNodeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: SE.orange,
  },
  bundleCommonActionRow: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  bundleFieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: SE.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  bundleSelectLike: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SE.border,
    backgroundColor: SE.surfaceControl,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bundleSelectLikeText: {
    fontSize: 14,
    color: SE.text,
    fontWeight: "600",
  },
  bundleFastBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: SE.surfaceElevated,
  },
  bundleFastBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SE.surface,
  },
  bundleFastBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: SE.text,
  },
  bundleFastBannerSub: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: SE.textMuted,
  },
  bundleNodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bundleIndexBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SE.surfaceElevated,
  },
  bundleNodeMainPress: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
  },
  bundleNodeTextCol: {
    minWidth: 0,
  },
  bundleNodeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: SE.text,
  },
  bundleNodeTitleEmpty: {
    color: SE.orange,
  },
  bundleNodeCrumb: {
    marginTop: 2,
    fontSize: 11,
    color: SE.textMuted,
  },
  bundleRowActionLabel: {
    width: 100,
    flexShrink: 0,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "600",
    color: SE.textMuted,
  },
  bundleRowActionPick: {
    maxWidth: 118,
    flexShrink: 0,
    minHeight: 36,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SE.border,
    backgroundColor: SE.surfaceControl,
    alignItems: "center",
    justifyContent: "center",
  },
  bundleRowActionPickText: {
    fontSize: 11,
    fontWeight: "700",
    color: SE.orange,
  },
  bundleRowTail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bundleClearBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SE.border,
    backgroundColor: SE.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  bundleClearBtnPlaceholder: {
    width: 32,
    height: 32,
  },
  bundleDeleteRowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SE.border,
    backgroundColor: SE.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  unitsTotalsBarInBundle: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: SE.borderSubtle,
    backgroundColor: SE.surfaceElevated,
    borderRadius: 12,
    padding: 10,
  },
  unitsTotalsBar: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.cardSubtle,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  unitsTotalsTitle: { fontSize: 12, fontWeight: "800", color: c.textMeta },
  unitsTotalsRow: { marginTop: 6, gap: 6 },
  unitsTotalsLine: { fontSize: 12, color: c.textSecondary },
  unitsTotalsEm: { fontWeight: "700", color: c.textPrimary },
  unitsTotalsTotal: { fontSize: 12, fontWeight: "800", color: c.primaryAction, marginTop: 4 },
  performerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  performerChip: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: c.cardMuted,
  },
  performerChipActive: {
    borderColor: c.primaryAction,
    backgroundColor: c.primaryAction,
  },
  performerChipText: { fontSize: 12, fontWeight: "700", color: c.textSecondary },
  performerChipTextActive: { color: c.onPrimaryAction },
  charCounter: { fontSize: 11, color: c.textMuted, marginTop: 4, textAlign: "right" },
  templateComposeLink: { marginTop: 8, alignSelf: "flex-start" },
  templateComposeLinkTxt: { fontSize: 12, fontWeight: "800", color: c.primaryAction },
  ghostActionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  ghostActionBtn: {
    flexGrow: 1,
    minWidth: "28%",
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: c.card,
    opacity: 0.72,
  },
  ghostActionTitle: { fontSize: 12, fontWeight: "700", color: c.textSecondary },
  ghostActionMeta: { marginTop: 4, fontSize: 10, fontWeight: "800", color: c.textMeta, textTransform: "uppercase" },
  reminderSoonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: c.cardSubtle,
  },
  reminderHint: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: c.textMuted,
  },
  templateInspectItem: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: c.cardMuted,
  },
  templateInspectItemTitle: { fontSize: 14, fontWeight: "700", color: c.textPrimary },
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
    justifyContent: "flex-end",
    padding: 16,
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
  customCurrencyBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: c.cardMuted,
  },
  customCurrencyApply: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  confirmActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    backgroundColor: c.cardMuted,
  },
  secondaryActionText: {
    color: c.textSecondary,
    fontWeight: "800",
  },
  primaryAction: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: c.primaryAction,
  },
  primaryActionText: {
    color: c.onPrimaryAction,
    fontWeight: "800",
  },
  contextHintBox: {
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.cardMuted,
  },
  contextHintText: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  postSaveSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  postSaveTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
    marginBottom: 10,
  },
  postSaveGrid: {
    gap: 10,
  },
  postSaveCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: c.cardMuted,
  },
  postSaveCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textPrimary,
    lineHeight: 16,
  },
  postSaveCardSub: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
    color: c.textSecondary,
  },
});
