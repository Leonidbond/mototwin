import type {
  AddMotorcycleFormValues,
  AddMotorcyclePayload,
  AddServiceEventFormValues,
  AddServiceEventPayload,
  AddServiceEventValidationContext,
  BundleItemFormValues,
  CreateServiceBundleItemInput,
  EditVehicleProfileFormValues,
  EditVehicleProfilePayload,
  FormValidationResult,
  PartWishlistItem,
  ServiceActionType,
  ServiceBundleItem,
  ServiceBundleTemplateWire,
  ServiceEventItem,
  ServiceEventMode,
  UpdateVehicleStateFormValues,
  UpdateVehicleStatePayload,
  VehicleProfileFormValues,
} from "@mototwin/types";
import {
  formatExpenseAmountRu,
  parseExpenseAmountInputToNumberOrNull,
} from "./expense-summary";
import { buildPartSkuLabel } from "./part-catalog";
import {
  filterActiveWishlistItems,
  WISHLIST_INSTALL_SERVICE_COMMENT_PREFIX_RU,
  WISHLIST_INSTALL_SERVICE_TYPE_RU,
} from "./part-wishlist";

/** Local calendar `YYYY-MM-DD` (same semantics as web `getTodayDateString` in vehicle page). */
export function getTodayDateYmdLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Canonical ISO 4217 code for new service events (web + Expo). */
export const DEFAULT_ADD_SERVICE_EVENT_CURRENCY = "RUB";

// ---------------------------------------------------------------------------
// Service action types — labels + heuristics
// ---------------------------------------------------------------------------

const SERVICE_ACTION_TYPE_LABELS_RU: Record<ServiceActionType, string> = {
  REPLACE: "Замена",
  SERVICE: "Обслуживание",
  INSPECT: "Проверка",
  CLEAN: "Очистка",
  ADJUST: "Регулировка",
};

export const SERVICE_ACTION_TYPE_OPTIONS: ReadonlyArray<{
  value: ServiceActionType;
  label: string;
}> = [
  { value: "REPLACE", label: SERVICE_ACTION_TYPE_LABELS_RU.REPLACE },
  { value: "SERVICE", label: SERVICE_ACTION_TYPE_LABELS_RU.SERVICE },
  { value: "INSPECT", label: SERVICE_ACTION_TYPE_LABELS_RU.INSPECT },
  { value: "CLEAN", label: SERVICE_ACTION_TYPE_LABELS_RU.CLEAN },
  { value: "ADJUST", label: SERVICE_ACTION_TYPE_LABELS_RU.ADJUST },
];

export function getServiceActionTypeLabelRu(action: ServiceActionType): string {
  return SERVICE_ACTION_TYPE_LABELS_RU[action] ?? SERVICE_ACTION_TYPE_LABELS_RU.SERVICE;
}

/** Map a free-form RU `serviceType` (legacy) to a {@link ServiceActionType}. */
export function mapServiceTypeStringToActionType(value: string | null | undefined): ServiceActionType {
  const lc = (value ?? "").trim().toLowerCase();
  if (!lc) {
    return "SERVICE";
  }
  if (lc.includes("замен")) {
    return "REPLACE";
  }
  if (lc.includes("проверк") || lc.includes("диагност")) {
    return "INSPECT";
  }
  if (lc.includes("чистк") || lc.includes("очистк")) {
    return "CLEAN";
  }
  if (lc.includes("регулир") || lc.includes("настройк")) {
    return "ADJUST";
  }
  return "SERVICE";
}

export const SERVICE_EVENT_MODE_LABELS_RU: Record<ServiceEventMode, string> = {
  BASIC: "Быстро",
  ADVANCED: "Подробно",
};

export function getServiceEventModeLabelRu(mode: ServiceEventMode): string {
  return SERVICE_EVENT_MODE_LABELS_RU[mode] ?? SERVICE_EVENT_MODE_LABELS_RU.BASIC;
}

// ---------------------------------------------------------------------------
// Bundle item helpers
// ---------------------------------------------------------------------------

let bundleItemKeyCounter = 0;
function nextBundleItemKey(): string {
  bundleItemKeyCounter += 1;
  return `b${bundleItemKeyCounter}_${Date.now().toString(36)}`;
}

export function createEmptyBundleItemFormValues(
  overrides?: Partial<BundleItemFormValues>
): BundleItemFormValues {
  return {
    key: overrides?.key ?? nextBundleItemKey(),
    nodeId: overrides?.nodeId ?? "",
    actionType: overrides?.actionType ?? "SERVICE",
    partName: overrides?.partName ?? "",
    sku: overrides?.sku ?? "",
    quantity: overrides?.quantity ?? "",
    partCost: overrides?.partCost ?? "",
    laborCost: overrides?.laborCost ?? "",
    comment: overrides?.comment ?? "",
  };
}

export type MergeServiceBundleTemplateResult = {
  form: AddServiceEventFormValues;
  /** Строки шаблона, узел которых не является листом в текущем дереве (или не найден). */
  skippedItems: Array<{ nodeId: string; label: string }>;
};

/**
 * Подставляет в форму создания события строки из шаблона (режим BASIC, один общий action).
 * Узлы не из `leafNodeIds` пропускаются — см. `skippedItems`.
 */
export function mergeServiceBundleTemplateIntoAddFormValues(
  current: AddServiceEventFormValues,
  template: Pick<ServiceBundleTemplateWire, "title" | "items">,
  leafNodeIds: Set<string>
): MergeServiceBundleTemplateResult {
  const ordered = [...template.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const applicable = ordered.filter((row) => leafNodeIds.has(row.nodeId.trim()));
  const skippedItems = ordered
    .filter((row) => !leafNodeIds.has(row.nodeId.trim()))
    .map((row) => ({
      nodeId: row.nodeId,
      label: (row.node?.name ?? row.node?.code ?? row.nodeId).trim(),
    }));

  if (applicable.length === 0) {
    return { form: current, skippedItems };
  }

  const commonActionType = applicable[0]?.defaultActionType ?? "SERVICE";
  const items = applicable.map((row) =>
    createEmptyBundleItemFormValues({
      nodeId: row.nodeId.trim(),
      actionType: commonActionType,
    })
  );

  return {
    form: {
      ...current,
      title: template.title.trim() || current.title,
      mode: "BASIC",
      commonActionType,
      items: items.map((it) => ({ ...it, actionType: commonActionType })),
    },
    skippedItems,
  };
}

function bundleItemFromExisting(item: ServiceBundleItem): BundleItemFormValues {
  return createEmptyBundleItemFormValues({
    nodeId: item.nodeId,
    actionType: item.actionType,
    partName: item.partName ?? "",
    sku: item.sku ?? "",
    quantity: item.quantity != null ? String(item.quantity) : "",
    partCost: item.partCost != null ? formatExpenseAmountRu(item.partCost) : "",
    laborCost: item.laborCost != null ? formatExpenseAmountRu(item.laborCost) : "",
    comment: item.comment ?? "",
  });
}

export function createInitialAddServiceEventFormValues(): AddServiceEventFormValues {
  return {
    title: "",
    mode: "BASIC",
    commonActionType: "SERVICE",
    eventDate: "",
    odometer: "",
    engineHours: "",
    partsCost: "",
    laborCost: "",
    currency: DEFAULT_ADD_SERVICE_EVENT_CURRENCY,
    comment: "",
    installedPartsJson: "",
    installedExpenseItemIds: [],
    items: [createEmptyBundleItemFormValues()],
  };
}

export type VehicleOdometerStateForServiceEvent = {
  odometer: number;
  engineHours: number | null;
};

export type ServiceEventNodeTemplate = {
  serviceType: string;
  comment: string;
  actionType: ServiceActionType;
};

const FALLBACK_NODE_SERVICE_TYPE_RU = "Обслуживание узла";
const FALLBACK_NODE_SERVICE_COMMENT_PREFIX_RU = "Зафиксировано обслуживание узла:";

const NODE_SERVICE_EVENT_TEMPLATES: Record<string, ServiceEventNodeTemplate> = {
  "ENGINE.LUBE.OIL": {
    serviceType: "Замена масла",
    comment: "Заменено моторное масло",
    actionType: "REPLACE",
  },
  "ENGINE.LUBE.FILTER": {
    serviceType: "Замена масляного фильтра",
    comment: "Заменен масляный фильтр",
    actionType: "REPLACE",
  },
  "INTAKE.FILTER": {
    serviceType: "Замена воздушного фильтра",
    comment: "Заменен воздушный фильтр",
    actionType: "REPLACE",
  },
  "ELECTRICS.IGNITION.SPARK": {
    serviceType: "Замена свечи зажигания",
    comment: "Заменена свеча зажигания",
    actionType: "REPLACE",
  },
  "BRAKES.FRONT.PADS": {
    serviceType: "Замена передних тормозных колодок",
    comment: "Заменены передние тормозные колодки",
    actionType: "REPLACE",
  },
  "BRAKES.REAR.PADS": {
    serviceType: "Замена задних тормозных колодок",
    comment: "Заменены задние тормозные колодки",
    actionType: "REPLACE",
  },
  "BRAKES.FLUID": {
    serviceType: "Замена тормозной жидкости",
    comment: "Заменена тормозная жидкость",
    actionType: "REPLACE",
  },
  "DRIVETRAIN.CHAIN": {
    serviceType: "Обслуживание цепи",
    comment: "Проверка, очистка, смазка и натяжение цепи",
    actionType: "SERVICE",
  },
  "DRIVETRAIN.FRONT_SPROCKET": {
    serviceType: "Замена ведущей звезды",
    comment: "Заменена ведущая звезда",
    actionType: "REPLACE",
  },
  "DRIVETRAIN.REAR_SPROCKET": {
    serviceType: "Замена ведомой звезды",
    comment: "Заменена ведомая звезда",
    actionType: "REPLACE",
  },
  "TIRES.FRONT": {
    serviceType: "Замена передней шины",
    comment: "Заменена передняя шина",
    actionType: "REPLACE",
  },
  "TIRES.REAR": {
    serviceType: "Замена задней шины",
    comment: "Заменена задняя шина",
    actionType: "REPLACE",
  },
  "COOLING.LIQUID": {
    serviceType: "Замена охлаждающей жидкости",
    comment: "Заменена охлаждающая жидкость",
    actionType: "REPLACE",
  },
  "SUSPENSION.FRONT.OIL": {
    serviceType: "Замена масла в вилке",
    comment: "Заменено масло в передней вилке",
    actionType: "REPLACE",
  },
  "ELECTRICS.BATTERY": {
    serviceType: "Замена аккумулятора",
    comment: "Заменен аккумулятор",
    actionType: "REPLACE",
  },
};

export function getServiceEventTemplateForNode(nodeCode: string): ServiceEventNodeTemplate | null {
  const normalizedCode = nodeCode.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }
  const template = NODE_SERVICE_EVENT_TEMPLATES[normalizedCode];
  return template ?? null;
}

type CreateInitialAddServiceEventFromNodeArgs = {
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  vehicle: VehicleOdometerStateForServiceEvent;
  currentDateYmd?: string;
};

export function createInitialAddServiceEventFromNode(
  args: CreateInitialAddServiceEventFromNodeArgs
): AddServiceEventFormValues {
  const base = createInitialAddServiceEventFormValues();
  const template = getServiceEventTemplateForNode(args.nodeCode);
  const fallbackNodeName = args.nodeName.trim() || "узел";
  const actionType = template?.actionType ?? "SERVICE";
  return {
    ...base,
    title: template?.serviceType ?? FALLBACK_NODE_SERVICE_TYPE_RU,
    mode: "BASIC",
    commonActionType: actionType,
    eventDate: args.currentDateYmd ?? getTodayDateYmdLocal(),
    odometer: String(args.vehicle.odometer),
    engineHours: args.vehicle.engineHours != null ? String(args.vehicle.engineHours) : "",
    comment:
      template?.comment ?? `${FALLBACK_NODE_SERVICE_COMMENT_PREFIX_RU} ${fallbackNodeName}`,
    items: [
      createEmptyBundleItemFormValues({
        nodeId: args.nodeId.trim(),
        actionType,
      }),
    ],
  };
}

export function buildAddServiceEventCommentFromWishlistItem(item: PartWishlistItem): string {
  const lines = [
    `${WISHLIST_INSTALL_SERVICE_COMMENT_PREFIX_RU} ${item.title}`,
    `Количество: ${item.quantity}`,
  ];
  if (item.sku) {
    lines.push(
      `Каталог: ${buildPartSkuLabel({
        brandName: item.sku.brandName,
        canonicalName: item.sku.canonicalName,
      })}`
    );
    const art = item.sku.primaryPartNumber?.trim();
    if (art) {
      lines.push(`Артикул: ${art}`);
    }
    lines.push(`Тип SKU: ${item.sku.partType}`);
  }
  const w = item.comment?.trim();
  if (w) {
    lines.push(w);
  }
  return lines.join("\n");
}

function stripWishlistInstallCommentFromFormComment(
  comment: string,
  item: PartWishlistItem
): string {
  const block = buildAddServiceEventCommentFromWishlistItem(item).trim();
  if (!comment.trim() || !block) {
    return comment;
  }
  const parts = comment.split(/\n\n+/);
  const filtered = parts.filter((p) => p.trim() !== block);
  if (filtered.length === parts.length) {
    return comment;
  }
  return filtered.join("\n\n").trim();
}

function wishlistInstalledPartsRecordFromItem(item: PartWishlistItem): {
  source: "wishlist";
  wishlistItemId: string;
  title: string;
  quantity: number;
  skuId: string | null;
  skuLabel: string | null;
} {
  return {
    source: "wishlist",
    wishlistItemId: item.id,
    title: item.title,
    quantity: item.quantity,
    skuId: item.skuId ?? null,
    skuLabel: item.sku
      ? buildPartSkuLabel({
          brandName: item.sku.brandName,
          canonicalName: item.sku.canonicalName,
        })
      : null,
  };
}

export function buildWishlistInstalledPartsJsonString(item: PartWishlistItem): string {
  return JSON.stringify(wishlistInstalledPartsRecordFromItem(item));
}

/** JSON for several wishlist lines (array); one item stays the legacy single-object shape. */
export function buildWishlistInstalledPartsJsonFromItems(items: PartWishlistItem[]): string {
  if (items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return buildWishlistInstalledPartsJsonString(items[0]);
  }
  return JSON.stringify(items.map((it) => wishlistInstalledPartsRecordFromItem(it)));
}

type WishlistInstalledPartsFormRecord = ReturnType<typeof wishlistInstalledPartsRecordFromItem>;

function parseWishlistInstalledPartsRecordsFromFormString(raw: string): WishlistInstalledPartsFormRecord[] {
  const t = raw?.trim() ?? "";
  if (!t) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(t);
  } catch {
    return [];
  }
  if (Array.isArray(parsed)) {
    const out: WishlistInstalledPartsFormRecord[] = [];
    for (const el of parsed) {
      if (el && typeof el === "object" && !Array.isArray(el)) {
        const o = el as Record<string, unknown>;
        if (o.source === "wishlist" && typeof o.wishlistItemId === "string" && o.wishlistItemId.trim()) {
          out.push({
            source: "wishlist",
            wishlistItemId: o.wishlistItemId.trim(),
            title: typeof o.title === "string" ? o.title : "",
            quantity: typeof o.quantity === "number" && Number.isFinite(o.quantity) ? o.quantity : 1,
            skuId: typeof o.skuId === "string" ? o.skuId : null,
            skuLabel: typeof o.skuLabel === "string" ? o.skuLabel : null,
          });
        }
      }
    }
    return out;
  }
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    if (o.source === "wishlist" && typeof o.wishlistItemId === "string" && o.wishlistItemId.trim()) {
      return [
        {
          source: "wishlist",
          wishlistItemId: o.wishlistItemId.trim(),
          title: typeof o.title === "string" ? o.title : "",
          quantity: typeof o.quantity === "number" && Number.isFinite(o.quantity) ? o.quantity : 1,
          skuId: typeof o.skuId === "string" ? o.skuId : null,
          skuLabel: typeof o.skuLabel === "string" ? o.skuLabel : null,
        },
      ];
    }
  }
  return [];
}

function serializeWishlistInstalledPartsRecords(
  records: ReadonlyArray<WishlistInstalledPartsFormRecord>
): string {
  if (records.length === 0) {
    return "";
  }
  if (records.length === 1) {
    return JSON.stringify(records[0]);
  }
  return JSON.stringify(records);
}

function isPlaceholderBundleRow(row: BundleItemFormValues): boolean {
  return !row.nodeId.trim() && !row.partName.trim() && !row.sku.trim();
}

/** Удаляет одну строку `items[]` по `nodeId` (для отката пикера «Готово к установке»). */
export function removeBundleRowByNodeId(
  form: AddServiceEventFormValues,
  nodeIdRaw: string | null | undefined
): AddServiceEventFormValues {
  const nid = nodeIdRaw?.trim() ?? "";
  if (!nid) {
    return form;
  }
  const idx = form.items.findIndex((it) => it.nodeId.trim() === nid);
  if (idx < 0) {
    return form;
  }
  if (form.items.length > 1) {
    return { ...form, items: form.items.filter((_, i) => i !== idx) };
  }
  return {
    ...form,
    items: [
      createEmptyBundleItemFormValues({
        actionType: form.mode === "BASIC" ? form.commonActionType : "SERVICE",
      }),
    ],
  };
}

const EXPENSE_INSTALL_COMMENT_PREFIX_RU = "Установлена ранее купленная деталь:";

/**
 * Откат строки bundle + строки комментария + верхнего `partsCost` (BASIC), которые
 * добавили при выборе чистого `ExpenseItem` в пикере «Готово к установке».
 */
export function revertExpenseInstallFormPatch(
  form: AddServiceEventFormValues,
  patch: {
    bundleNodeId: string | null | undefined;
    expenseTitleForComment: string;
    amount: number | null;
    currency: string | null;
  }
): AddServiceEventFormValues {
  const title = patch.expenseTitleForComment.trim();
  const lineToRemove = `${EXPENSE_INSTALL_COMMENT_PREFIX_RU} ${title}`;
  let comment = form.comment;
  if (comment.trim()) {
    const lines = comment.split("\n");
    const filtered = lines.filter((l) => l.trim() !== lineToRemove.trim());
    comment = filtered.join("\n").trim();
  }
  let next: AddServiceEventFormValues = { ...form, comment };
  next = removeBundleRowByNodeId(next, patch.bundleNodeId);
  if (
    next.mode === "BASIC" &&
    patch.amount != null &&
    patch.amount > 0 &&
    patch.currency?.trim()
  ) {
    const formCur = next.currency.trim().toUpperCase() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY;
    if (patch.currency.trim().toUpperCase() === formCur) {
      const base = parseDecimalOrNull(next.partsCost) ?? 0;
      const nv = Math.max(0, base - patch.amount);
      next = { ...next, partsCost: nv > 0 ? formatExpenseAmountRu(nv) : "" };
    }
  }
  return next;
}

/**
 * После выбора чистого расхода в «Готово к установке»: в ADVANCED — цена в строке,
 * в BASIC — сумма в общем `partsCost`, количество в строке при наличии.
 */
export function applyExpenseInstallToAddFormRow(
  form: AddServiceEventFormValues,
  rowIndex: number,
  patch: {
    amount: number | null | undefined;
    currency: string | null | undefined;
    quantity: number | null | undefined;
  }
): AddServiceEventFormValues {
  const items = [...form.items];
  if (!items[rowIndex]) {
    return form;
  }
  const formCur =
    form.currency.trim().toUpperCase() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY;
  const cur = patch.currency?.trim().toUpperCase();
  const q =
    patch.quantity != null &&
    Number.isFinite(patch.quantity) &&
    Number.isInteger(patch.quantity) &&
    patch.quantity >= 1
      ? String(patch.quantity)
      : items[rowIndex].quantity;
  const hasAmount =
    patch.amount != null && Number.isFinite(patch.amount) && (patch.amount as number) > 0;
  const currencyOk = Boolean(cur && cur === formCur);
  if (!hasAmount || !currencyOk) {
    items[rowIndex] = { ...items[rowIndex], quantity: q };
    return { ...form, items };
  }
  const amt = patch.amount as number;
  if (form.mode === "ADVANCED") {
    items[rowIndex] = {
      ...items[rowIndex],
      quantity: q,
      partCost: formatExpenseAmountRu(amt),
    };
    return { ...form, items };
  }
  const base = parseDecimalOrNull(form.partsCost) ?? 0;
  items[rowIndex] = { ...items[rowIndex], quantity: q };
  return {
    ...form,
    partsCost: formatExpenseAmountRu(base + amt),
    items,
  };
}

export type MergeWishlistItemIntoAddFormValuesOptions = {
  /**
   * Если `true`, не добавляем сумму wishlist в `partsCost` (например, когда у
   * этой wishlist-позиции уже есть привязанный `ExpenseItem` — иначе цена
   * учитывается дважды).
   */
  skipPartsCostBump: boolean;
};

/**
 * Добавляет одну активную wishlist-позицию в форму нового события (новая строка bundle,
 * комментарий, запись в `installedPartsJson`). Если узел не лист, дубликат уже
 * есть в форме или wishlist-позиция уже отмечена — возвращает форму без
 * изменений. `skipPartsCostBump=true` пропускает увеличение `partsCost`
 * (используется для пары `wishlist+expense`, где сумма уже учтена расходом).
 */
export function mergeWishlistItemIntoAddFormValues(
  form: AddServiceEventFormValues,
  wishlistItem: PartWishlistItem,
  leafNodeIds: Set<string>,
  opts: MergeWishlistItemIntoAddFormValuesOptions
): AddServiceEventFormValues {
  const [active] = filterActiveWishlistItems([wishlistItem]);
  if (!active) {
    return form;
  }
  const nid = active.nodeId?.trim() ?? "";
  if (!nid || !leafNodeIds.has(nid)) {
    return form;
  }
  const usedNodeIds = new Set(form.items.map((i) => i.nodeId.trim()).filter(Boolean));
  const existingRecords = parseWishlistInstalledPartsRecordsFromFormString(form.installedPartsJson);
  const usedWishlistIds = new Set(existingRecords.map((r) => r.wishlistItemId));
  if (usedNodeIds.has(nid) || usedWishlistIds.has(active.id)) {
    return form;
  }

  const skuPartNumber = active.sku?.primaryPartNumber?.trim() ?? "";
  let row = createEmptyBundleItemFormValues({
    nodeId: nid,
    actionType: "REPLACE",
    partName: active.title.trim(),
    sku: skuPartNumber,
  });
  const formCurrency = form.currency.trim().toUpperCase() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY;
  const itemCur = (active.currency?.trim() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY).toUpperCase();
  const hasCost =
    active.costAmount != null && Number.isFinite(active.costAmount) && active.costAmount > 0;
  const wishlistQtyStr =
    active.quantity != null &&
    Number.isFinite(active.quantity) &&
    Number.isInteger(active.quantity) &&
    active.quantity >= 1
      ? String(active.quantity)
      : "";
  if (form.mode === "ADVANCED") {
    if (hasCost && itemCur === formCurrency) {
      row = {
        ...row,
        partCost: formatExpenseAmountRu(active.costAmount as number),
        ...(wishlistQtyStr ? { quantity: wishlistQtyStr } : {}),
      };
    } else if (wishlistQtyStr) {
      row = { ...row, quantity: wishlistQtyStr };
    }
  } else if (form.mode === "BASIC" && wishlistQtyStr) {
    row = { ...row, quantity: wishlistQtyStr };
  }

  const items =
    form.items.length === 1 && isPlaceholderBundleRow(form.items[0])
      ? [row]
      : [...form.items, row];

  const mergedRecords = [...existingRecords, wishlistInstalledPartsRecordFromItem(active)];
  const installedPartsJson = serializeWishlistInstalledPartsRecords(mergedRecords);

  const shouldBumpPartsCost =
    form.mode === "BASIC" &&
    !opts.skipPartsCostBump &&
    hasCost &&
    itemCur === formCurrency;
  const baseParts = parseDecimalOrNull(form.partsCost) ?? 0;
  const nextPartsCost = shouldBumpPartsCost
    ? formatExpenseAmountRu(baseParts + (active.costAmount as number))
    : form.partsCost;

  const appendedComment = buildAddServiceEventCommentFromWishlistItem(active);
  const nextComment =
    form.comment.trim() === "" ? appendedComment : `${form.comment.trim()}\n\n${appendedComment}`;

  return {
    ...form,
    title: form.title.trim() === "" ? WISHLIST_INSTALL_SERVICE_TYPE_RU : form.title,
    commonActionType: form.mode === "BASIC" ? "REPLACE" : form.commonActionType,
    comment: nextComment,
    installedPartsJson,
    partsCost: nextPartsCost,
    items,
  };
}

export type RemoveWishlistItemFromAddFormValuesOptions = {
  /** Удалить строку bundle по узлу (пикер «Готово к установке»). */
  removeBundleRowForNodeId?: string | null;
  /** Откатить bump `partsCost` в BASIC после merge с ценой из wishlist. */
  revertBumpedPartsCost?: { amount: number; currency: string } | null;
  /** Убрать автодобавленный блок комментария из merge wishlist. */
  stripWishlistCommentForItem?: PartWishlistItem | null;
};

/**
 * Убирает wishlist-позицию из `installedPartsJson` и опционально строку bundle,
 * комментарий и верхний `partsCost` (см. {@link RemoveWishlistItemFromAddFormValuesOptions}).
 */
export function removeWishlistItemFromAddFormValues(
  form: AddServiceEventFormValues,
  wishlistItemId: string,
  opts?: RemoveWishlistItemFromAddFormValuesOptions
): AddServiceEventFormValues {
  const id = wishlistItemId.trim();
  const nid = opts?.removeBundleRowForNodeId?.trim() ?? "";
  const hasExtra =
    Boolean(nid) ||
    Boolean(opts?.revertBumpedPartsCost) ||
    Boolean(opts?.stripWishlistCommentForItem);
  if (!id && !hasExtra) {
    return form;
  }

  let next = form;

  if (opts?.stripWishlistCommentForItem) {
    const nc = stripWishlistInstallCommentFromFormComment(
      next.comment,
      opts.stripWishlistCommentForItem
    );
    if (nc !== next.comment) {
      next = { ...next, comment: nc };
    }
  }

  if (id) {
    const existing = parseWishlistInstalledPartsRecordsFromFormString(next.installedPartsJson);
    const filtered = existing.filter((r) => r.wishlistItemId !== id);
    if (filtered.length !== existing.length) {
      next = {
        ...next,
        installedPartsJson: serializeWishlistInstalledPartsRecords(filtered),
      };
    }
  }

  if (nid) {
    const after = removeBundleRowByNodeId(next, nid);
    if (after !== next) {
      next = after;
    }
  }

  if (opts?.revertBumpedPartsCost && next.mode === "BASIC") {
    const { amount, currency } = opts.revertBumpedPartsCost;
    if (amount > 0 && currency.trim()) {
      const formCur =
        next.currency.trim().toUpperCase() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY;
      if (currency.trim().toUpperCase() === formCur) {
        const base = parseDecimalOrNull(next.partsCost) ?? 0;
        const nv = Math.max(0, base - amount);
        next = { ...next, partsCost: nv > 0 ? formatExpenseAmountRu(nv) : "" };
      }
    }
  }

  if (next === form) {
    return form;
  }
  return next;
}

/**
 * Appends bundle rows + `installedPartsJson` for active wishlist lines (leaf node, no duplicate node in form).
 * Skips lines without a leaf node or already present in JSON / bundle node set.
 * Реализация: по очереди вызывает {@link mergeWishlistItemIntoAddFormValues} с
 * `skipPartsCostBump: false` для каждой позиции (для пикера «Готово к установке»
 * предпочтительнее вызывать {@link mergeWishlistItemIntoAddFormValues} напрямую).
 */
export function mergeActiveWishlistItemsIntoAddFormValues(
  form: AddServiceEventFormValues,
  selectedItems: PartWishlistItem[],
  leafNodeIds: Set<string>
): AddServiceEventFormValues {
  let next = form;
  for (const item of selectedItems) {
    next = mergeWishlistItemIntoAddFormValues(next, item, leafNodeIds, {
      skipPartsCostBump: false,
    });
  }
  return next;
}

/** Prefills {@link AddServiceEventFormValues} after marking a wishlist line as INSTALLED (client opens Add Service Event). */
export function createInitialAddServiceEventFromWishlistItem(
  item: PartWishlistItem,
  vehicle: VehicleOdometerStateForServiceEvent,
  options?: { todayDateYmd?: string }
): AddServiceEventFormValues {
  const base = createInitialAddServiceEventFormValues();
  const eventDate = options?.todayDateYmd ?? getTodayDateYmdLocal();
  const hasCost = item.costAmount != null && Number.isFinite(item.costAmount);
  const partsCost = hasCost ? formatExpenseAmountRu(item.costAmount as number) : "";
  const currency = hasCost
    ? (item.currency?.trim() || DEFAULT_ADD_SERVICE_EVENT_CURRENCY).toUpperCase()
    : base.currency;
  const skuPartNumber = item.sku?.primaryPartNumber?.trim() ?? "";
  return {
    ...base,
    title: WISHLIST_INSTALL_SERVICE_TYPE_RU,
    mode: "BASIC",
    commonActionType: "REPLACE",
    eventDate,
    odometer: String(vehicle.odometer),
    engineHours: vehicle.engineHours != null ? String(vehicle.engineHours) : "",
    partsCost,
    laborCost: "",
    currency,
    comment: buildAddServiceEventCommentFromWishlistItem(item),
    installedPartsJson: buildWishlistInstalledPartsJsonString(item),
    items: [
      createEmptyBundleItemFormValues({
        nodeId: item.nodeId ?? "",
        actionType: "REPLACE",
        partName: item.title.trim(),
        sku: skuPartNumber,
      }),
    ],
  };
}

type CreateInitialEditServiceEventValuesOptions = {
  fallbackCurrency?: string;
};

function toIsoDateInputValue(isoDateLike: string): string {
  const date = new Date(isoDateLike);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }
  return isoDateLike.trim().slice(0, 10);
}

function sumFiniteBundleItemField(
  bundleItems: ReadonlyArray<ServiceBundleItem>,
  key: "partCost" | "laborCost"
): number {
  return bundleItems.reduce((acc, it) => {
    const v = it[key];
    return typeof v === "number" && Number.isFinite(v) ? acc + v : acc;
  }, 0);
}

export function createInitialEditServiceEventValues(
  event: ServiceEventItem,
  options?: CreateInitialEditServiceEventValuesOptions
): AddServiceEventFormValues {
  const base = createInitialAddServiceEventFormValues();
  const items =
    event.items && event.items.length > 0
      ? event.items.map(bundleItemFromExisting)
      : [
          createEmptyBundleItemFormValues({
            nodeId: event.nodeId,
            actionType: mapServiceTypeStringToActionType(event.serviceType),
            partName: event.partName?.trim() ?? "",
            sku: event.partSku?.trim() ?? "",
          }),
        ];
  // Общий action type для BASIC: первый item.
  const commonActionType = items[0]?.actionType ?? "SERVICE";
  const mode = event.mode ?? "BASIC";
  const srcItems: ReadonlyArray<ServiceBundleItem> =
    event.items && event.items.length > 0 ? event.items : [];

  let partsCostString = "";
  let laborCostString = "";

  if (mode === "ADVANCED" && srcItems.length > 0) {
    const itemPartsAgg = sumFiniteBundleItemField(srcItems, "partCost");
    const itemLaborAgg = sumFiniteBundleItemField(srcItems, "laborCost");
    const partsCostNumeric = event.partsCost ?? null;
    const laborCostNumeric = event.laborCost ?? null;
    const partsRemainder =
      partsCostNumeric != null && Number.isFinite(partsCostNumeric)
        ? Math.max(0, partsCostNumeric - itemPartsAgg)
        : 0;
    const laborRemainder =
      laborCostNumeric != null && Number.isFinite(laborCostNumeric)
        ? Math.max(0, laborCostNumeric - itemLaborAgg)
        : 0;
    partsCostString = partsRemainder > 0 ? formatExpenseAmountRu(partsRemainder) : "";
    laborCostString = laborRemainder > 0 ? formatExpenseAmountRu(laborRemainder) : "";
  } else {
    const partsCostNumeric = event.partsCost ?? null;
    const laborCostNumeric = event.laborCost ?? null;
    const totalCostNumeric = event.totalCost ?? event.costAmount ?? null;
    partsCostString =
      partsCostNumeric != null && Number.isFinite(partsCostNumeric)
        ? formatExpenseAmountRu(partsCostNumeric)
        : laborCostNumeric == null && totalCostNumeric != null && Number.isFinite(totalCostNumeric)
          ? formatExpenseAmountRu(totalCostNumeric)
          : "";
    laborCostString =
      laborCostNumeric != null && Number.isFinite(laborCostNumeric)
        ? formatExpenseAmountRu(laborCostNumeric)
        : "";
  }
  return {
    ...base,
    title: event.title?.trim() ?? event.serviceType?.trim() ?? "",
    mode,
    commonActionType,
    eventDate: toIsoDateInputValue(event.eventDate),
    odometer: String(event.odometer),
    engineHours: event.engineHours != null ? String(event.engineHours) : "",
    partsCost: partsCostString,
    laborCost: laborCostString,
    currency:
      event.currency?.trim().toUpperCase() ||
      options?.fallbackCurrency ||
      DEFAULT_ADD_SERVICE_EVENT_CURRENCY,
    comment: event.comment ?? "",
    installedPartsJson:
      event.installedPartsJson == null ? "" : JSON.stringify(event.installedPartsJson, null, 2),
    installedExpenseItemIds: [],
    items,
  };
}

export type CreateInitialRepeatServiceEventValuesOptions = {
  fallbackCurrency?: string;
  /** Локальная дата нового события `YYYY-MM-DD`. По умолчанию — сегодня на клиенте. */
  todayDateYmd?: string;
};

/**
 * Форма **нового** события с тем же узлом, типом работ, суммами, комментарием и полями запчасти, что у исходного;
 * дата — «сегодня» (или `todayDateYmd`); пробег и моточасы — из актуального состояния мотоцикла.
 */
export function createInitialRepeatServiceEventValues(
  event: ServiceEventItem,
  vehicle: VehicleOdometerStateForServiceEvent,
  options?: CreateInitialRepeatServiceEventValuesOptions
): AddServiceEventFormValues {
  if (event.eventKind === "STATE_UPDATE") {
    return createInitialAddServiceEventFormValues();
  }
  const fromSource = createInitialEditServiceEventValues(event, {
    fallbackCurrency: options?.fallbackCurrency,
  });
  const today =
    typeof options?.todayDateYmd === "string" && options.todayDateYmd.trim()
      ? options.todayDateYmd.trim().slice(0, 10)
      : getTodayDateYmdLocal();
  return {
    ...fromSource,
    eventDate: today,
    odometer: String(vehicle.odometer),
    engineHours: vehicle.engineHours != null ? String(vehicle.engineHours) : "",
  };
}

function parseDecimalOrNull(input: string): number | null {
  return parseExpenseAmountInputToNumberOrNull(input);
}

function parsePositiveIntegerOrNull(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function normalizeBundleItemPayload(
  item: BundleItemFormValues,
  mode: ServiceEventMode,
  commonActionType: ServiceActionType
): CreateServiceBundleItemInput {
  const nodeId = item.nodeId.trim();
  if (mode === "BASIC") {
    return {
      nodeId,
      actionType: commonActionType,
      comment: item.comment.trim() ? item.comment.trim() : null,
    };
  }
  const partName = item.partName.trim();
  const sku = item.sku.trim();
  const comment = item.comment.trim();
  return {
    nodeId,
    actionType: item.actionType,
    partName: partName ? partName.slice(0, 500) : null,
    sku: sku ? sku.slice(0, 200) : null,
    quantity: parsePositiveIntegerOrNull(item.quantity),
    partCost: parseDecimalOrNull(item.partCost),
    laborCost: parseDecimalOrNull(item.laborCost),
    comment: comment ? comment : null,
  };
}

export function normalizeAddServiceEventPayload(
  values: AddServiceEventFormValues
): AddServiceEventPayload {
  const eventDateIso = new Date(values.eventDate.trim()).toISOString();

  const trimmedEngine = values.engineHours.trim();
  let engineHours: number | null = null;
  if (trimmedEngine !== "") {
    const parsed = Number(trimmedEngine);
    if (!Number.isNaN(parsed)) {
      engineHours = Math.trunc(parsed);
    }
  }

  const rawParts = values.installedPartsJson?.trim() ?? "";
  let installedPartsJson: unknown | null = null;
  if (rawParts !== "") {
    try {
      installedPartsJson = JSON.parse(rawParts) as unknown;
    } catch {
      installedPartsJson = null;
    }
  }

  const items = values.items.map((item) =>
    normalizeBundleItemPayload(item, values.mode, values.commonActionType)
  );

  // ADVANCED: суммы по строкам + поля «Запчасти»/«Работа» в «Данных события» (дополнение к строкам).
  let partsCost = parseDecimalOrNull(values.partsCost);
  let laborCost = parseDecimalOrNull(values.laborCost);
  if (values.mode === "ADVANCED") {
    const rowParts = items.reduce((acc, it) => acc + (it.partCost ?? 0), 0);
    const rowLabor = items.reduce((acc, it) => acc + (it.laborCost ?? 0), 0);
    const topParts = partsCost ?? 0;
    const topLabor = laborCost ?? 0;
    const combinedParts = rowParts + topParts;
    const combinedLabor = rowLabor + topLabor;
    const anyNumbers =
      items.some((it) => it.partCost != null || it.laborCost != null) ||
      partsCost != null ||
      laborCost != null;
    if (!anyNumbers) {
      partsCost = null;
      laborCost = null;
    } else {
      partsCost = combinedParts === 0 ? null : combinedParts;
      laborCost = combinedLabor === 0 ? null : combinedLabor;
    }
  }

  const totalCost =
    partsCost != null || laborCost != null ? (partsCost ?? 0) + (laborCost ?? 0) : null;

  const trimmedCurrency = values.currency.trim();

  return {
    nodeId: items[0]?.nodeId ?? "",
    title: values.title.trim(),
    mode: values.mode,
    eventDate: eventDateIso,
    odometer: Math.trunc(Number(values.odometer.trim())),
    engineHours,
    partsCost,
    laborCost,
    totalCost,
    currency: totalCost != null && trimmedCurrency ? trimmedCurrency.toUpperCase() : null,
    comment: values.comment.trim() || null,
    installedPartsJson,
    installedExpenseItemIds: values.installedExpenseItemIds,
    items,
  };
}

export function normalizeEditServiceEventPayload(
  values: AddServiceEventFormValues
): AddServiceEventPayload {
  return normalizeAddServiceEventPayload(values);
}

export function validateAddServiceEventFormValues(
  values: AddServiceEventFormValues,
  context: AddServiceEventValidationContext
): FormValidationResult {
  if (!values.items.length) {
    return { errors: ["Добавьте хотя бы один узел."] };
  }
  if (!values.title.trim()) {
    return { errors: ["Укажите название события."] };
  }
  if (!values.eventDate.trim()) {
    return { errors: ["Заполните дату события."] };
  }
  if (Number.isNaN(new Date(values.eventDate.trim()).getTime())) {
    return { errors: ["Введите корректную дату."] };
  }
  if (!values.odometer.trim()) {
    return { errors: ["Укажите пробег."] };
  }

  const parsedOdometer = Number(values.odometer.trim());
  if (!Number.isInteger(parsedOdometer) || parsedOdometer < 0) {
    return { errors: ["Пробег должен быть целым числом не меньше 0."] };
  }

  const datePart = values.eventDate.trim().slice(0, 10);
  if (datePart && datePart > context.todayDateYmd) {
    return { errors: ["Дата события не может быть в будущем."] };
  }

  if (
    context.currentVehicleOdometer !== null &&
    parsedOdometer > context.currentVehicleOdometer
  ) {
    return {
      errors: [
        `Пробег события не может быть больше текущего (${context.currentVehicleOdometer} км).`,
      ],
    };
  }

  const trimmedEngine = values.engineHours.trim();
  if (trimmedEngine !== "") {
    const parsedEngine = Number(trimmedEngine);
    if (!Number.isInteger(parsedEngine) || parsedEngine < 0) {
      return { errors: ["Моточасы должны быть целым числом не меньше 0."] };
    }
  }

  const rawParts = values.installedPartsJson?.trim() ?? "";
  if (rawParts !== "") {
    try {
      JSON.parse(rawParts);
    } catch {
      return {
        errors: ["Поле установленных запчастей должно быть пустым или корректным JSON."],
      };
    }
  }

  for (const cost of [values.partsCost, values.laborCost]) {
    const trimmed = cost.trim();
    if (trimmed === "") {
      continue;
    }
    const parsed = parseDecimalOrNull(trimmed);
    if (parsed == null) {
      return { errors: ["Суммы должны быть неотрицательными числами."] };
    }
  }

  // Проверка items.
  const seenNodeIds = new Set<string>();
  for (let index = 0; index < values.items.length; index += 1) {
    const item = values.items[index];
    const nodeId = item.nodeId.trim();
    if (!nodeId) {
      return { errors: [`Выберите узел для строки №${index + 1}.`] };
    }
    if (seenNodeIds.has(nodeId)) {
      return { errors: ["В одном событии нельзя выбирать один узел дважды."] };
    }
    seenNodeIds.add(nodeId);
    if (context.leafNodeIds && context.leafNodeIds.size > 0 && !context.leafNodeIds.has(nodeId)) {
      return { errors: [`Узел в строке №${index + 1} должен быть последнего уровня.`] };
    }

    if (values.mode === "ADVANCED") {
      const qtyTrimmed = item.quantity.trim();
      if (qtyTrimmed !== "") {
        const qty = Number(qtyTrimmed);
        if (!Number.isInteger(qty) || qty <= 0) {
          return { errors: [`Количество в строке №${index + 1} должно быть положительным целым.`] };
        }
      }
      for (const cost of [item.partCost, item.laborCost]) {
        const trimmed = cost.trim();
        if (trimmed === "") {
          continue;
        }
        const parsed = parseDecimalOrNull(trimmed);
        if (parsed == null) {
          return {
            errors: [`Суммы в строке №${index + 1} должны быть неотрицательными.`],
          };
        }
      }
    }
  }

  return { errors: [] };
}

/**
 * Expo/mobile: same business rules as web when `context` is passed (leaf, date cap, odometer vs vehicle).
 */
export function validateAddServiceEventFormValuesMobile(
  values: AddServiceEventFormValues,
  context: AddServiceEventValidationContext
): FormValidationResult {
  return validateAddServiceEventFormValues(values, context);
}

export function createInitialVehicleStateFormValues(
  currentOdometer: number,
  currentEngineHours: number | null
): UpdateVehicleStateFormValues {
  return {
    odometer: String(currentOdometer),
    engineHours: currentEngineHours !== null ? String(currentEngineHours) : "",
  };
}

export function normalizeVehicleStatePayload(
  values: UpdateVehicleStateFormValues
): UpdateVehicleStatePayload {
  const parsedOdometer = Number(values.odometer.trim());
  const trimmedEngine = values.engineHours.trim();
  let engineHours: number | null = null;
  if (trimmedEngine !== "") {
    engineHours = Number(trimmedEngine);
  }
  return {
    odometer: Math.trunc(parsedOdometer),
    engineHours: engineHours !== null ? Math.trunc(engineHours) : null,
  };
}

export function validateVehicleStateFormValues(
  values: UpdateVehicleStateFormValues,
  mode: "web" | "mobile" = "web"
): FormValidationResult {
  const errors: string[] = [];

  if (!values.odometer.trim()) {
    errors.push(mode === "web" ? "Укажите пробег." : "Пробег обязателен и должен быть >= 0.");
    return { errors };
  }

  const parsedOdometer =
    mode === "mobile" ? Number.parseInt(values.odometer, 10) : Number(values.odometer.trim());

  if (mode === "web") {
    if (!Number.isInteger(parsedOdometer) || parsedOdometer < 0) {
      errors.push("Пробег должен быть целым числом не меньше 0.");
    }
  } else if (Number.isNaN(parsedOdometer) || parsedOdometer < 0) {
    errors.push("Пробег обязателен и должен быть >= 0.");
  }

  const trimmedEngine = values.engineHours.trim();
  if (trimmedEngine !== "") {
    const parsed =
      mode === "mobile" ? Number.parseInt(trimmedEngine, 10) : Number(trimmedEngine);
    if (mode === "web") {
      if (!Number.isInteger(parsed) || parsed < 0) {
        errors.push("Моточасы должны быть целым числом не меньше 0.");
      }
    } else if (Number.isNaN(parsed) || parsed < 0) {
      errors.push("Моточасы должны быть пустыми или >= 0.");
    }
  }

  return { errors };
}

export function createInitialEditVehicleProfileFormValues(
  defaults?: Partial<EditVehicleProfileFormValues>
): EditVehicleProfileFormValues {
  return {
    nickname: "",
    vin: "",
    usageType: "MIXED",
    ridingStyle: "ACTIVE",
    loadType: "SOLO",
    usageIntensity: "MEDIUM",
    ...defaults,
  };
}

export function buildInitialVehicleProfileFormValues(
  defaults?: Partial<VehicleProfileFormValues>
): VehicleProfileFormValues {
  return createInitialEditVehicleProfileFormValues(defaults);
}

export function normalizeEditVehicleProfilePayload(
  values: EditVehicleProfileFormValues
): EditVehicleProfilePayload {
  return {
    nickname: values.nickname.trim() || null,
    vin: values.vin.trim() || null,
    rideProfile: {
      usageType: values.usageType,
      ridingStyle: values.ridingStyle,
      loadType: values.loadType,
      usageIntensity: values.usageIntensity,
    },
  };
}

export function normalizeVehicleProfileFormValues(
  values: VehicleProfileFormValues
): EditVehicleProfilePayload {
  const nickname = values.nickname.trim().slice(0, 80) || null;
  const vinRaw = values.vin.trim().toUpperCase();
  const vin = vinRaw ? vinRaw.slice(0, 32) : null;
  return {
    nickname,
    vin,
    rideProfile: {
      usageType: values.usageType,
      ridingStyle: values.ridingStyle,
      loadType: values.loadType,
      usageIntensity: values.usageIntensity,
    },
  };
}

export function validateEditVehicleProfileFormValues(
  values: EditVehicleProfileFormValues
): FormValidationResult {
  const errors: string[] = [];
  if (values.nickname.trim().length > 80) {
    errors.push("Название в гараже должно быть не длиннее 80 символов.");
  }
  if (values.vin.trim().length > 32) {
    errors.push("VIN должен быть не длиннее 32 символов.");
  }
  return { errors };
}

export function validateVehicleProfileFormValues(
  values: VehicleProfileFormValues
): FormValidationResult {
  return validateEditVehicleProfileFormValues(values);
}

export function createInitialAddMotorcycleFormValues(
  overrides?: Partial<AddMotorcycleFormValues>
): AddMotorcycleFormValues {
  return {
    brandId: "",
    modelId: "",
    modelVariantId: "",
    nickname: "",
    vin: "",
    odometer: "",
    engineHours: "",
    usageType: "MIXED",
    ridingStyle: "ACTIVE",
    loadType: "SOLO",
    usageIntensity: "MEDIUM",
    ...overrides,
  };
}

export function normalizeAddMotorcyclePayload(
  values: AddMotorcycleFormValues
): AddMotorcyclePayload {
  const odometer = Math.trunc(Number(values.odometer.trim()));
  const trimmedEngine = values.engineHours.trim();
  let engineHours: number | null = null;
  if (trimmedEngine !== "") {
    engineHours = Math.trunc(Number(trimmedEngine));
  }

  return {
    brandId: values.brandId.trim(),
    modelId: values.modelId.trim(),
    modelVariantId: values.modelVariantId.trim(),
    nickname: values.nickname.trim() || null,
    vin: values.vin.trim() || null,
    odometer,
    engineHours,
    rideProfile: {
      usageType: values.usageType,
      ridingStyle: values.ridingStyle,
      loadType: values.loadType,
      usageIntensity: values.usageIntensity,
    },
  };
}

export type AddMotorcycleFieldErrors = Partial<
  Record<"brandId" | "modelId" | "modelVariantId" | "odometer" | "engineHours", string>
>;

export function validateAddMotorcycleFormValues(
  values: AddMotorcycleFormValues,
  style: "web" | "mobile" = "web"
): FormValidationResult & { fieldErrors?: AddMotorcycleFieldErrors } {
  const errors: string[] = [];
  const fieldErrors: AddMotorcycleFieldErrors = {};

  const missingTree =
    !values.brandId.trim() || !values.modelId.trim() || !values.modelVariantId.trim();

  if (missingTree) {
    if (style === "web") {
      errors.push("Выберите бренд, модель и модификацию.");
    } else {
      if (!values.brandId.trim()) {
        fieldErrors.brandId = "Выберите марку.";
      }
      if (!values.modelId.trim()) {
        fieldErrors.modelId = "Выберите модель.";
      }
      if (!values.modelVariantId.trim()) {
        fieldErrors.modelVariantId = "Выберите модификацию.";
      }
      errors.push("Проверьте обязательные поля формы.");
    }
  }

  if (!values.odometer.trim()) {
    const msg =
      style === "web" ? "Укажите пробег." : "Пробег обязателен и должен быть целым числом >= 0.";
    errors.push(msg);
    fieldErrors.odometer = style === "mobile" ? msg : fieldErrors.odometer;
  } else {
    const odometerNumber = Number(values.odometer.trim());
    if (
      !Number.isFinite(odometerNumber) ||
      !Number.isInteger(odometerNumber) ||
      odometerNumber < 0
    ) {
      const msg =
        style === "web" ? "Укажите пробег." : "Пробег обязателен и должен быть целым числом >= 0.";
      errors.push(msg);
      if (style === "mobile") {
        fieldErrors.odometer = msg;
      }
    }
  }

  if (style === "mobile") {
    const trimmedEngine = values.engineHours.trim();
    if (trimmedEngine !== "") {
      const parsed = Number(trimmedEngine);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        const msg = "Моточасы должны быть целым числом >= 0.";
        errors.push(msg);
        fieldErrors.engineHours = msg;
      }
    }
  }

  const uniqueErrors = [...new Set(errors.filter(Boolean))];
  const hasFields = Object.values(fieldErrors).some(Boolean);

  return {
    errors: uniqueErrors,
    ...(hasFields ? { fieldErrors } : {}),
  };
}
