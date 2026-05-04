"use client";

/* eslint-disable react-hooks/set-state-in-effect -- SKU search + installable picker loaders reset local UI state from async catalog APIs (same pattern as the journal page modal). */

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
  validateAddServiceEventFormValues,
} from "@mototwin/domain";
import { productSemanticColors } from "@mototwin/design-tokens";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type {
  AddServiceEventFormValues,
  BundleItemFormValues,
  InstallableForServiceEventEntry,
  NodeTreeItem,
  PartSkuViewModel,
  PartWishlistItem,
  PartWishlistItemStatus,
  ServiceActionType,
  ServiceBundleTemplateWire,
} from "@mototwin/types";

const api = createMotoTwinEndpoints(createApiClient({ baseUrl: "" }));

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

/**
 * Строка для чистого расхода из «Готово к установке»: не затирать первую строку,
 * если узел расхода ещё не совпал ни с одной — берём пустую по узлу или добавляем строку.
 */
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
 * Builds a synthetic {@link PartWishlistItem} from a unified picker entry so we
 * can reuse {@link mergeWishlistItemIntoAddFormValues}. The endpoint contract
 * intentionally omits SKU / comment metadata, so the bundle row gets only the
 * fields exposed by the entry; the partSku is patched onto the row separately.
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
  /** Row index whose SKU field drives catalog search (ADVANCED); BASIC uses 0. */
  const [skuSearchRowIndex, setSkuSearchRowIndex] = useState(0);

  const [serviceEventSkuLookup, setServiceEventSkuLookup] = useState("");
  const [serviceEventSkuResults, setServiceEventSkuResults] = useState<PartSkuViewModel[]>([]);
  const [serviceEventSkuLoading, setServiceEventSkuLoading] = useState(false);
  const [serviceEventSkuError, setServiceEventSkuError] = useState("");
  const serviceEventSkuSearchGen = useRef(0);
  const [bundleTemplates, setBundleTemplates] = useState<ServiceBundleTemplateWire[]>([]);
  const [bundleTemplatesLoadError, setBundleTemplatesLoadError] = useState("");
  const [selectedBundleTemplateId, setSelectedBundleTemplateId] = useState("");
  const [installableEntries, setInstallableEntries] = useState<InstallableForServiceEventEntry[]>([]);
  const [installableLoading, setInstallableLoading] = useState(false);
  const [installableError, setInstallableError] = useState("");
  const [installableFilter, setInstallableFilter] = useState<InstallableFilter>("all");
  const [selectedInstallableKeys, setSelectedInstallableKeys] = useState<Set<string>>(
    () => new Set()
  );
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

  const effectiveSkuRowIndex =
    form.mode === "BASIC" ? 0 : Math.min(Math.max(0, skuSearchRowIndex), Math.max(0, form.items.length - 1));

  useEffect(() => {
    setSkuSearchRowIndex((idx) => Math.min(Math.max(0, idx), Math.max(0, form.items.length - 1)));
  }, [form.items.length]);

  const serviceEventCostTotalPreview = useMemo(() => {
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
      if (!hadCostInput) {
        return null;
      }
      return `${formatExpenseAmountRu(sum)} ${cur}`;
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
    return `${formatExpenseAmountRu(p + l)} ${cur}`;
  }, [form.mode, form.items, form.partsCost, form.laborCost, form.currency]);

  const filteredInstallableEntries = useMemo(() => {
    const used = new Set(form.items.map((it) => it.nodeId.trim()).filter(Boolean));
    return installableEntries
      .filter((entry) => entryMatchesInstallableFilter(entry, installableFilter))
      .sort((left, right) => {
        const leftMatches =
          left.nodeId && used.has(left.nodeId) ? 0 : 1;
        const rightMatches =
          right.nodeId && used.has(right.nodeId) ? 0 : 1;
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
      if (entryMatchesInstallableFilter(entry, "paid")) {
        paid += 1;
      }
      if (entryMatchesInstallableFilter(entry, "wishlist")) {
        wishlist += 1;
      }
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
      if (!synth) {
        return currentForm;
      }
      let next = mergeWishlistItemIntoAddFormValues(currentForm, synth, leafIds, {
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
      if (willBeSelected) {
        next.add(entry.key);
      } else {
        next.delete(entry.key);
      }
      return next;
    });

    updateForm((prev) => {
      let next = prev;

      if (entry.wishlistItemId) {
        if (willBeSelected) {
          next = mergeInstallableWishlistEntry(next, entry, leafNodeIdsSet);
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
        if (willBeSelected) {
          selectedExp.add(entry.expenseItemId);
        } else {
          selectedExp.delete(entry.expenseItemId);
        }
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

        // For pure-expense entries (no wishlist link) we mirror legacy behaviour:
        // populate anchor row, defaults, and append a comment line. For
        // `wishlist+expense` entries the wishlist merge already created a
        // proper bundle row, so we skip this step to avoid clobbering it.
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
            eventDate: next.eventDate.trim() || new Date().toISOString().slice(0, 10),
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
    if (!commentTextareaRef.current) {
      return;
    }
    const textarea = commentTextareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 64)}px`;
  }, [form.comment]);

  useEffect(() => {
    const rowSku = (form.items[effectiveSkuRowIndex]?.sku ?? "").trim();
    const timer = window.setTimeout(() => {
      setServiceEventSkuLookup(rowSku);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.items, effectiveSkuRowIndex]);

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
  }, [form, effectiveSkuRowIndex, serviceEventSkuLookup]);

  useEffect(() => {
    let cancelled = false;
    setBundleTemplatesLoadError("");
    void api
      .getServiceBundleTemplates()
      .then((res) => {
        if (!cancelled) {
          setBundleTemplates(res.templates ?? []);
        }
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
    if (!vehicleId || form.mode !== "ADVANCED") {
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
        if (!cancelled) {
          setInstallableEntries(res.items ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInstallableEntries([]);
          setInstallableError("Не удалось загрузить список «Готово к установке».");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInstallableLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleId, form.mode]);

  const applyServiceEventSkuSuggestion = (sku: PartSkuViewModel) => {
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
                <button
                  type="button"
                  onClick={() => {
                    setSkuSearchRowIndex(0);
                    updateForm((prev) => (prev.mode === "BASIC" ? prev : switchFormToBasic(prev)));
                  }}
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:opacity-95 ${
                    form.mode === "BASIC" ? "" : "opacity-80"
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
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSkuSearchRowIndex(0);
                    updateForm((prev) => (prev.mode === "ADVANCED" ? prev : switchFormToAdvanced(prev)));
                  }}
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:opacity-95 ${
                    form.mode === "ADVANCED" ? "" : "opacity-90"
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
                          backgroundColor: productSemanticColors.cardMuted,
                          color: productSemanticColors.textSecondary,
                        }
                  }
                  title="Отдельные детали, SKU и суммы по каждому узлу"
                >
                  Подробно
                </button>
              </div>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: productSemanticColors.textSecondary }}>
                {form.mode === "BASIC"
                  ? "В режиме «Быстро» суммы по деталям и по работе относятся ко всем выбранным узлам; тип работы один для всех."
                  : "В режиме «Подробно» у каждой строки свой тип работы, запчасть, SKU и суммы. Итог по деньгам можно ввести по строкам или сверху, если по строкам пусто."}
              </p>
            </div>

            {!editingServiceEventId ? (
              <div
                className="rounded-2xl border border-gray-200 p-4"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: productSemanticColors.textMeta }}>
                  Шаблон
                </p>
                <p className="mt-1 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                  Подставить набор узлов и название (режим «Быстро»). Можно изменить вручную после выбора.
                </p>
                {bundleTemplatesLoadError ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.error }}>
                    {bundleTemplatesLoadError}
                  </p>
                ) : null}
                <label className="mt-2 block text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                  Готовый набор
                  <select
                    value={selectedBundleTemplateId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedBundleTemplateId(id);
                      if (!id) {
                        return;
                      }
                      const tpl = bundleTemplates.find((t) => t.id === id);
                      if (!tpl) {
                        return;
                      }
                      updateForm((prev) => {
                        const { form: merged, skippedItems } = mergeServiceBundleTemplateIntoAddFormValues(
                          prev,
                          tpl,
                          leafNodeIdsSet
                        );
                        if (skippedItems.length > 0) {
                          queueMicrotask(() =>
                            setLocalValidationError(
                              `Не все узлы шаблона доступны для этого ТС: ${skippedItems.map((s) => s.label).join(", ")}`
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
                    }}
                    style={{
                      ...SERVICE_EVENT_MODAL_FIELD_BASE,
                      colorScheme: "dark",
                    }}
                    className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                  >
                    <option value="">— выберите шаблон —</option>
                    {bundleTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {!editingServiceEventId && form.mode === "ADVANCED" ? (
              <div
                className="rounded-2xl border border-gray-200 p-4"
                style={{
                  backgroundColor: productSemanticColors.cardSubtle,
                  borderColor: productSemanticColors.borderStrong,
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: productSemanticColors.textMeta }}
                >
                  Готово к установке
                </p>
                <p className="mt-1 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                  Отметьте позиции, которые установили в этом событии. Сюда сведены активный список покупок и
                  купленные, но ещё не установленные детали — без дублей.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["all", "paid", "wishlist"] as const).map((value) => {
                    const isActive = installableFilter === value;
                    const label =
                      value === "all"
                        ? `Все · ${installableCounts.all}`
                        : value === "paid"
                          ? `Куплено · ${installableCounts.paid}`
                          : `В списке покупок · ${installableCounts.wishlist}`;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setInstallableFilter(value)}
                        className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-95"
                        style={
                          isActive
                            ? {
                                borderColor: productSemanticColors.primaryAction,
                                backgroundColor: productSemanticColors.primaryAction,
                                color: productSemanticColors.onPrimaryAction,
                              }
                            : {
                                borderColor: productSemanticColors.border,
                                backgroundColor: productSemanticColors.cardMuted,
                                color: productSemanticColors.textSecondary,
                              }
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {installableError ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.error }}>
                    {installableError}
                  </p>
                ) : null}
                {installableLoading ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                    Загрузка…
                  </p>
                ) : filteredInstallableEntries.length === 0 ? (
                  <p className="mt-2 text-xs" style={{ color: productSemanticColors.textSecondary }}>
                    {installableEntries.length === 0
                      ? "Нет активных позиций — список покупок пуст и нет купленных деталей без установки."
                      : "Нет позиций под этот фильтр."}
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {filteredInstallableEntries.map((entry) => {
                      const nid = entry.nodeId?.trim() ?? "";
                      const onLeaf = Boolean(nid && leafNodeIdsSet.has(nid));
                      const isSelected = selectedInstallableKeys.has(entry.key);
                      const usedNode =
                        !isSelected && Boolean(nid) && form.items.some((it) => it.nodeId.trim() === nid);
                      const disabled = !isSelected && (!onLeaf || usedNode);
                      const badge = getInstallableEntryBadgeRu(entry);
                      const metaParts: string[] = [];
                      if (entry.amount != null && entry.currency) {
                        metaParts.push(`${formatExpenseAmountRu(entry.amount)} ${entry.currency}`);
                      }
                      const dateIso = entry.purchasedAt ?? entry.expenseDate;
                      if (dateIso) {
                        metaParts.push(new Date(dateIso).toLocaleDateString("ru-RU"));
                      }
                      if (entry.nodeName) {
                        metaParts.push(entry.nodeName);
                      } else if (!nid) {
                        metaParts.push("Без узла");
                      }
                      if (entry.vendor?.trim()) {
                        metaParts.push(entry.vendor.trim());
                      }
                      if (entry.partSku?.trim()) {
                        metaParts.push(`Арт. ${entry.partSku.trim()}`);
                      }
                      return (
                        <label
                          key={entry.key}
                          className="flex gap-3 rounded-xl border px-3 py-2 text-sm"
                          style={{
                            backgroundColor: productSemanticColors.cardMuted,
                            borderColor: isSelected
                              ? productSemanticColors.primaryAction
                              : productSemanticColors.border,
                            color: productSemanticColors.textPrimary,
                            opacity: disabled ? 0.55 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={isSelected}
                            disabled={disabled}
                            onChange={() => toggleInstallableEntry(entry)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{entry.title}</span>
                              <span
                                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                style={{
                                  borderColor: productSemanticColors.borderStrong,
                                  backgroundColor: productSemanticColors.card,
                                  color: productSemanticColors.textSecondary,
                                }}
                              >
                                {badge}
                              </span>
                            </span>
                            {metaParts.length > 0 ? (
                              <span
                                className="mt-1 block text-xs"
                                style={{ color: productSemanticColors.textSecondary }}
                              >
                                {metaParts.join(" · ")}
                              </span>
                            ) : null}
                            {!isSelected && (!onLeaf || usedNode) ? (
                              <span
                                className="mt-1 block text-[11px]"
                                style={{ color: productSemanticColors.textMeta }}
                              >
                                {!nid
                                  ? "Нет узла — установка через это событие недоступна."
                                  : !onLeaf
                                    ? "Узел не конечный для этого ТС."
                                    : "Этот узел уже добавлен в событие."}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

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
                    className="space-y-2 rounded-xl border p-3"
                    style={{ borderColor: productSemanticColors.border, backgroundColor: productSemanticColors.card }}
                  >
                    <div className="flex flex-wrap items-end gap-2">
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
                    {form.mode === "ADVANCED" ? (
                      <div
                        className="space-y-2 border-t pt-2"
                        style={{ borderTopColor: productSemanticColors.border }}
                      >
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                            Наименование запчасти
                            <input
                              value={row.partName}
                              onChange={(e) =>
                                updateForm((prev) =>
                                  patchItemAt(prev, rowIndex, { partName: e.target.value })
                                )
                              }
                              maxLength={500}
                              placeholder="Опционально"
                              style={SERVICE_EVENT_MODAL_FIELD_BASE}
                              className="[&::placeholder]:text-[#AAB4C0] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                            />
                          </label>
                          <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                            Артикул (SKU)
                            <input
                              value={row.sku}
                              onFocus={() => setSkuSearchRowIndex(rowIndex)}
                              onChange={(e) =>
                                updateForm((prev) =>
                                  patchItemAt(prev, rowIndex, { sku: e.target.value })
                                )
                              }
                              maxLength={200}
                              placeholder="Опционально"
                              autoComplete="off"
                              style={SERVICE_EVENT_MODAL_FIELD_BASE}
                              className="[&::placeholder]:text-[#AAB4C0] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                            />
                          </label>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                            Кол-во
                            <input
                              value={row.quantity}
                              onChange={(e) =>
                                updateForm((prev) =>
                                  patchItemAt(prev, rowIndex, { quantity: e.target.value })
                                )
                              }
                              inputMode="numeric"
                              placeholder="1"
                              style={SERVICE_EVENT_MODAL_FIELD_BASE}
                              className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                            />
                          </label>
                          <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                            Запчасти, ₽
                            <input
                              value={row.partCost}
                              onChange={(e) =>
                                updateForm((prev) =>
                                  patchItemAt(prev, rowIndex, { partCost: e.target.value })
                                )
                              }
                              inputMode="decimal"
                              placeholder="0"
                              style={SERVICE_EVENT_MODAL_FIELD_BASE}
                              className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                            />
                          </label>
                          <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                            Работа, ₽
                            <input
                              value={row.laborCost}
                              onChange={(e) =>
                                updateForm((prev) =>
                                  patchItemAt(prev, rowIndex, { laborCost: e.target.value })
                                )
                              }
                              inputMode="decimal"
                              placeholder="0"
                              style={SERVICE_EVENT_MODAL_FIELD_BASE}
                              className="focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                            />
                          </label>
                        </div>
                        <label className="block text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                          Комментарий к строке
                          <input
                            value={row.comment}
                            onChange={(e) =>
                              updateForm((prev) =>
                                patchItemAt(prev, rowIndex, { comment: e.target.value })
                              )
                            }
                            placeholder="Опционально"
                            style={SERVICE_EVENT_MODAL_FIELD_BASE}
                            className="[&::placeholder]:text-[#AAB4C0] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {form.mode === "ADVANCED" &&
              (form.items[effectiveSkuRowIndex]?.sku ?? "").trim().length >= 2 ? (
                <div
                  className="mt-3 rounded-xl border px-3 py-2"
                  style={{
                    borderColor: productSemanticColors.borderStrong,
                    backgroundColor: productSemanticColors.cardSubtle,
                  }}
                >
                  <p className="text-xs" style={{ color: productSemanticColors.textSecondary }}>
                    Поиск в каталоге по артикулу (строка {effectiveSkuRowIndex + 1})
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

              {(form.mode === "BASIC" || form.mode === "ADVANCED") &&
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
                  {form.mode === "ADVANCED" ? (
                    <p className="mt-1 text-[11px] leading-snug" style={{ color: productSemanticColors.textMuted }}>
                      Итог по запчастям и работе — сумма по всем строкам узлов плюс суммы в полях «Запчасти» и «Работа»
                      ниже (можно задать только строки, только блок ниже или оба).
                    </p>
                  ) : null}
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

              {form.mode === "BASIC" ? (
                <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <p className="sm:col-span-2 text-xs font-semibold" style={{ color: productSemanticColors.textMeta }}>
                  Запчасть (опционально, для справки в журнале)
                </p>
                <label className="text-xs font-medium" style={SERVICE_EVENT_MODAL_LABEL_STYLE}>
                  Артикул (SKU)
                  <input
                    value={getAnchorSku(form)}
                    onFocus={() => setSkuSearchRowIndex(0)}
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
                </>
              ) : null}

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
