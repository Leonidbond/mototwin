import type {
  CreatePartWishlistItemInput,
  FormValidationResult,
  PartSkuViewModel,
  PartWishlistFormValues,
  PartWishlistItem,
  PartWishlistItemStatus,
  PartWishlistItemViewModel,
  PartWishlistStatusGroupViewModel,
  ServiceEventKind,
  UpdatePartWishlistItemInput,
} from "@mototwin/types";
import { PART_WISHLIST_DEFAULT_CURRENCY } from "@mototwin/types";
import { getSkuDisplayPrice } from "./part-catalog";
import { formatExpenseAmountRu } from "./expense-summary";

export const PART_WISHLIST_STATUS_ORDER: PartWishlistItemStatus[] = [
  "NEEDED",
  "ORDERED",
  "BOUGHT",
  "INSTALLED",
];

export const partWishlistStatusLabelsRu: Record<PartWishlistItemStatus, string> = {
  NEEDED: "Нужно купить",
  ORDERED: "Заказано",
  BOUGHT: "Куплено",
  INSTALLED: "Установлено",
};

export function getPartWishlistStatusLabelRu(status: PartWishlistItemStatus): string {
  return partWishlistStatusLabelsRu[status];
}

export function isPartWishlistItemStatus(value: string): value is PartWishlistItemStatus {
  return (
    value === "NEEDED" ||
    value === "ORDERED" ||
    value === "BOUGHT" ||
    value === "INSTALLED"
  );
}

/** Default service type when opening Add Service Event from a wishlist line marked INSTALLED. */
export const WISHLIST_INSTALL_SERVICE_TYPE_RU = "Установка запчасти";

/** First line of {@link buildAddServiceEventCommentFromWishlistItem} — used to recognize wishlist-origin rows in Service Log. */
export const WISHLIST_INSTALL_SERVICE_COMMENT_PREFIX_RU =
  "Установлена позиция из списка покупок:";

/** Heuristic: SERVICE event with install type and wishlist comment prefix (no new `ServiceEvent` kind). */
export function isLikelyWishlistInstallServiceEvent(event: {
  eventKind?: ServiceEventKind;
  serviceType: string;
  comment: string | null;
}): boolean {
  if (event.eventKind === "STATE_UPDATE") {
    return false;
  }
  if (event.serviceType !== WISHLIST_INSTALL_SERVICE_TYPE_RU) {
    return false;
  }
  const c = event.comment?.trim() ?? "";
  return c.startsWith(WISHLIST_INSTALL_SERVICE_COMMENT_PREFIX_RU);
}

/** Shown when status becomes INSTALLED but the line has no node link (no auto-open of Add Service Event). */
export const WISHLIST_INSTALLED_NO_NODE_SERVICE_HINT =
  "Позиция не привязана к узлу, сервисное событие не открыто автоматически";

export function isWishlistTransitionToInstalled(
  previousStatus: PartWishlistItemStatus,
  nextStatus: PartWishlistItemStatus
): boolean {
  return previousStatus !== "INSTALLED" && nextStatus === "INSTALLED";
}

/** Active «shopping list»: everything except completed installs (still stored in DB / API). */
export function isActiveWishlistItem(item: { status: PartWishlistItemStatus }): boolean {
  return item.status !== "INSTALLED";
}

export function filterActiveWishlistItems<T extends { status: PartWishlistItemStatus }>(
  items: T[]
): T[] {
  return items.filter(isActiveWishlistItem);
}

export function createInitialPartWishlistFormValues(
  preset?: Partial<Pick<PartWishlistFormValues, "nodeId" | "status">>
): PartWishlistFormValues {
  return {
    skuId: "",
    title: "",
    quantity: "1",
    status: preset?.status ?? "NEEDED",
    nodeId: preset?.nodeId ?? "",
    comment: "",
    costAmount: "",
    currency: PART_WISHLIST_DEFAULT_CURRENCY,
  };
}

export function partWishlistFormValuesFromItem(item: PartWishlistItem): PartWishlistFormValues {
  return {
    skuId: item.skuId?.trim() ?? "",
    title: item.title,
    quantity: String(item.quantity),
    status: item.status,
    nodeId: item.nodeId ?? "",
    comment: item.comment ?? "",
    costAmount:
      item.costAmount != null && Number.isFinite(item.costAmount)
        ? formatExpenseAmountRu(item.costAmount)
        : "",
    currency: item.currency?.trim() || PART_WISHLIST_DEFAULT_CURRENCY,
  };
}

/** Подставляет поля каталога в форму wishlist (title/cost/node при пустых значениях). */
export function applyPartSkuViewModelToPartWishlistFormValues(
  form: PartWishlistFormValues,
  sku: PartSkuViewModel
): PartWishlistFormValues {
  const title = form.title.trim() ? form.title : sku.canonicalName;
  const costEmpty = !form.costAmount.trim();
  let costAmount = form.costAmount;
  let currency = form.currency;
  const { priceAmount, currency: skuCur } = getSkuDisplayPrice({
    priceAmount: sku.priceAmount,
    currency: sku.currency,
  });
  if (costEmpty && priceAmount != null && Number.isFinite(priceAmount)) {
    costAmount = formatExpenseAmountRu(priceAmount);
    currency = (skuCur?.trim() || PART_WISHLIST_DEFAULT_CURRENCY).toUpperCase();
  }
  const nodeId = form.nodeId.trim() ? form.nodeId : (sku.primaryNodeId ?? "");
  return {
    ...form,
    skuId: sku.id,
    title,
    costAmount,
    currency,
    nodeId,
  };
}

export function clearPartWishlistFormSkuSelection(form: PartWishlistFormValues): PartWishlistFormValues {
  return { ...form, skuId: "" };
}

export function validatePartWishlistFormValues(values: PartWishlistFormValues): FormValidationResult {
  const errors: string[] = [];
  const title = values.title.trim();
  const skuId = values.skuId.trim();
  if (!title && !skuId) {
    errors.push("Укажите название или выберите SKU из каталога.");
  }
  const q = values.quantity.trim();
  if (q) {
    const n = Number(q);
    if (!Number.isInteger(n) || n < 1) {
      errors.push("Количество должно быть целым числом не меньше 1.");
    }
  }
  if (!isPartWishlistItemStatus(values.status)) {
    errors.push("Недопустимый статус.");
  }

  const trimmedCost = values.costAmount.trim();
  if (trimmedCost !== "") {
    const normalizedCost = trimmedCost.replace(/\s/g, "").replace(",", ".");
    const parsedCost = Number.parseFloat(normalizedCost);
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      errors.push("Стоимость должна быть неотрицательным числом.");
    } else if (!values.currency.trim()) {
      errors.push("Укажите валюту, если заполнена стоимость.");
    }
  }

  return { errors };
}

/** Server/API: if there is no cost, currency is cleared; otherwise currency defaults to RUB when empty. */
export function normalizePartWishlistCostMutationArgs(
  costAmount: number | null | undefined,
  currency: string | null | undefined
): { costAmount: number | null; currency: string | null } {
  const cost =
    costAmount == null || Number.isNaN(costAmount) || costAmount === undefined
      ? null
      : costAmount;
  if (cost == null) {
    return { costAmount: null, currency: null };
  }
  const cur =
    typeof currency === "string" && currency.trim()
      ? currency.trim().toUpperCase()
      : PART_WISHLIST_DEFAULT_CURRENCY;
  return { costAmount: cost, currency: cur };
}

function parsedCostAmountFromWishlistForm(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

export function normalizeCreatePartWishlistPayload(
  values: PartWishlistFormValues
): CreatePartWishlistItemInput {
  const title = values.title.trim();
  const skuIdRaw = values.skuId.trim();
  const q = values.quantity.trim();
  const quantity = q ? Number.parseInt(q, 10) : 1;
  const nodeIdRaw = values.nodeId.trim();
  const costParsed = parsedCostAmountFromWishlistForm(values.costAmount);
  const { costAmount, currency } = normalizePartWishlistCostMutationArgs(
    costParsed,
    values.currency.trim() || null
  );
  return {
    title: title || undefined,
    skuId: skuIdRaw ? skuIdRaw : null,
    quantity: Number.isInteger(quantity) && quantity >= 1 ? quantity : 1,
    nodeId: nodeIdRaw ? nodeIdRaw : null,
    comment: values.comment.trim() ? values.comment.trim() : null,
    status: values.status,
    costAmount,
    currency,
  };
}

export function normalizeUpdatePartWishlistPayload(
  values: PartWishlistFormValues
): UpdatePartWishlistItemInput {
  const title = values.title.trim();
  const q = values.quantity.trim();
  const quantity = q ? Number.parseInt(q, 10) : undefined;
  const nodeIdRaw = values.nodeId.trim();
  const costParsed = parsedCostAmountFromWishlistForm(values.costAmount);
  const { costAmount, currency } = normalizePartWishlistCostMutationArgs(
    costParsed,
    values.currency.trim() || null
  );
  const skuIdRaw = values.skuId.trim();
  const out: UpdatePartWishlistItemInput = {
    title,
    skuId: skuIdRaw ? skuIdRaw : null,
    status: values.status,
    comment: values.comment.trim() ? values.comment.trim() : null,
    nodeId: nodeIdRaw ? nodeIdRaw : null,
    costAmount,
    currency,
  };
  if (quantity !== undefined && Number.isInteger(quantity) && quantity >= 1) {
    out.quantity = quantity;
  }
  return out;
}

export function buildPartWishlistItemViewModel(item: PartWishlistItem): PartWishlistItemViewModel {
  const base: PartWishlistItemViewModel = {
    ...item,
    statusLabelRu: getPartWishlistStatusLabelRu(item.status),
  };
  if (item.costAmount != null && Number.isFinite(item.costAmount)) {
    const cur = item.currency?.trim() || PART_WISHLIST_DEFAULT_CURRENCY;
    return {
      ...base,
      costLabelRu: `${formatExpenseAmountRu(item.costAmount)} ${cur.toUpperCase()}`,
    };
  }
  return base;
}

export function groupPartWishlistItemsByStatus(
  items: PartWishlistItemViewModel[]
): PartWishlistStatusGroupViewModel[] {
  const byStatus = new Map<PartWishlistItemStatus, PartWishlistItemViewModel[]>();
  for (const s of PART_WISHLIST_STATUS_ORDER) {
    byStatus.set(s, []);
  }
  for (const item of items) {
    const list = byStatus.get(item.status);
    if (list) {
      list.push(item);
    }
  }
  return PART_WISHLIST_STATUS_ORDER.map((status) => ({
    status,
    sectionTitleRu: partWishlistStatusLabelsRu[status],
    items: byStatus.get(status) ?? [],
  })).filter((g) => g.items.length > 0);
}
