import type {
  PartSkuViewModel,
  PartWishlistItem,
  PickerDraftCart,
  PickerDraftItem,
  PickerDraftItemKit,
  PickerDraftItemSku,
  PickerDraftTotals,
  PickerSubmitDecision,
  PickerSubmitPreview,
  ServiceKitViewModel,
} from "@mototwin/types";
import { isActiveWishlistItem } from "./part-wishlist";

let draftIdCounter = 0;
function generateDraftId(prefix: "sku" | "kit"): string {
  draftIdCounter += 1;
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${draftIdCounter.toString(36)}`;
}

export function createEmptyDraftCart(vehicleId: string): PickerDraftCart {
  return { vehicleId, items: [] };
}

export type AddSkuToDraftInput = {
  sku: PartSkuViewModel;
  nodeId: string | null;
  source: PickerDraftItemSku["source"];
};

/**
 * Добавляет SKU в draft cart как новую запись (всегда отдельный draftId).
 * Дубликаты по sku.id допускаются — пользователь может явно убрать или оставить.
 */
export function addSkuToDraft(
  draft: PickerDraftCart,
  input: AddSkuToDraftInput
): PickerDraftCart {
  const item: PickerDraftItemSku = {
    kind: "sku",
    draftId: generateDraftId("sku"),
    sku: input.sku,
    quantity: 1,
    nodeId: input.nodeId,
    source: input.source,
  };
  return { ...draft, items: [...draft.items, item] };
}

export type AddKitToDraftInput = {
  kit: ServiceKitViewModel;
  contextNodeId: string | null;
};

/**
 * Добавляет кит в draft cart. Если такой кит уже в draft (по `kit.code`) — не дублирует.
 */
export function addKitToDraft(
  draft: PickerDraftCart,
  input: AddKitToDraftInput
): PickerDraftCart {
  const alreadyAdded = draft.items.some(
    (item) => item.kind === "kit" && item.kit.code === input.kit.code
  );
  if (alreadyAdded) {
    return draft;
  }
  const item: PickerDraftItemKit = {
    kind: "kit",
    draftId: generateDraftId("kit"),
    kit: input.kit,
    contextNodeId: input.contextNodeId,
  };
  return { ...draft, items: [...draft.items, item] };
}

export function removeFromDraft(draft: PickerDraftCart, draftId: string): PickerDraftCart {
  return { ...draft, items: draft.items.filter((item) => item.draftId !== draftId) };
}

export function clearDraft(draft: PickerDraftCart): PickerDraftCart {
  return { ...draft, items: [] };
}

export function isDraftEmpty(draft: PickerDraftCart): boolean {
  return draft.items.length === 0;
}

export function isKitInDraft(draft: PickerDraftCart, kitCode: string): boolean {
  return draft.items.some((item) => item.kind === "kit" && item.kit.code === kitCode);
}

function getSkuLineAmount(item: PickerDraftItemSku): number {
  const price = item.sku.priceAmount;
  if (price == null || !Number.isFinite(price)) {
    return 0;
  }
  return price * Math.max(item.quantity, 1);
}

function getKitLineAmount(item: PickerDraftItemKit): number {
  let total = 0;
  for (const kitItem of item.kit.items) {
    if (kitItem.matchedPriceAmount != null && Number.isFinite(kitItem.matchedPriceAmount)) {
      total += kitItem.matchedPriceAmount * Math.max(kitItem.quantity, 1);
    }
  }
  return total;
}

function getItemCurrency(item: PickerDraftItem): string | null {
  if (item.kind === "sku") {
    return item.sku.currency?.trim() || null;
  }
  for (const kitItem of item.kit.items) {
    const c = kitItem.matchedCurrency?.trim();
    if (c) return c;
  }
  return null;
}

function getItemPositionsCount(item: PickerDraftItem): number {
  if (item.kind === "sku") {
    return 1;
  }
  return item.kit.items.filter((kitItem) => kitItem.matchedSkuId != null).length || item.kit.items.length;
}

/** Возвращает суммы по draft cart. Если валюты разнородные — `currency = null` и `totalAmount = 0`. */
export function getDraftTotals(draft: PickerDraftCart): PickerDraftTotals {
  const positionsCount = draft.items.reduce(
    (acc, item) => acc + getItemPositionsCount(item),
    0
  );
  const currencies = new Set<string>();
  for (const item of draft.items) {
    const c = getItemCurrency(item);
    if (c) currencies.add(c);
  }
  if (currencies.size > 1) {
    return { positionsCount, totalAmount: 0, currency: null };
  }
  const currency = currencies.size === 1 ? [...currencies][0] ?? null : null;
  let totalAmount = 0;
  for (const item of draft.items) {
    totalAmount += item.kind === "sku" ? getSkuLineAmount(item) : getKitLineAmount(item);
  }
  return {
    positionsCount,
    totalAmount,
    currency,
  };
}

function buildSkuLabel(item: PickerDraftItemSku): string {
  const brand = item.sku.brandName?.trim();
  const name = item.sku.canonicalName?.trim();
  if (brand && name) return `${brand} ${name}`;
  return name || brand || "Деталь без названия";
}

function buildKitLabel(item: PickerDraftItemKit): string {
  return item.kit.title || `Комплект ${item.kit.code}`;
}

type ActiveWishlistItemLike = Pick<PartWishlistItem, "status" | "nodeId" | "sku" | "title" | "vehicleId">;

function isSkuDuplicate(
  item: PickerDraftItemSku,
  activeItems: ActiveWishlistItemLike[]
): boolean {
  const targetNodeId = item.nodeId ?? item.sku.primaryNodeId;
  if (!targetNodeId) return false;
  return activeItems
    .filter(isActiveWishlistItem)
    .some((existing) => existing.nodeId === targetNodeId && existing.sku?.id === item.sku.id);
}

export type BuildPickerSubmitPreviewInput = {
  draft: PickerDraftCart;
  /** Активные позиции wishlist для дедупликации. */
  activeWishlistItems: ActiveWishlistItemLike[];
};

/** Строит preview сабмита: что будет добавлено / уже есть / невозможно добавить. */
export function buildPickerSubmitPreview(
  input: BuildPickerSubmitPreviewInput
): PickerSubmitPreview {
  const decisions: PickerSubmitDecision[] = [];
  let willAddCount = 0;
  let duplicateCount = 0;
  let blockedCount = 0;
  let estimatedTotal = 0;
  const currencies = new Set<string>();

  for (const item of input.draft.items) {
    if (item.kind === "sku") {
      const label = buildSkuLabel(item);
      const targetNodeId = item.nodeId ?? item.sku.primaryNodeId;
      if (!targetNodeId) {
        decisions.push({
          kind: "blocked",
          draftId: item.draftId,
          label,
          reason: "Не выбран узел для позиции",
        });
        blockedCount += 1;
        continue;
      }
      if (isSkuDuplicate(item, input.activeWishlistItems)) {
        decisions.push({
          kind: "duplicate",
          draftId: item.draftId,
          label,
          reason: "Уже есть в активном списке",
        });
        duplicateCount += 1;
        continue;
      }
      decisions.push({ kind: "willAdd", draftId: item.draftId, label });
      willAddCount += 1;
      estimatedTotal += getSkuLineAmount(item);
      const c = item.sku.currency?.trim();
      if (c) currencies.add(c);
    } else {
      const label = buildKitLabel(item);
      decisions.push({ kind: "willAdd", draftId: item.draftId, label });
      willAddCount += 1;
      estimatedTotal += getKitLineAmount(item);
      const c = getItemCurrency(item);
      if (c) currencies.add(c);
    }
  }

  const estimatedCurrency = currencies.size === 1 ? [...currencies][0] ?? null : null;
  return {
    decisions,
    willAddCount,
    duplicateCount,
    blockedCount,
    estimatedTotal: estimatedCurrency ? estimatedTotal : null,
    estimatedCurrency,
  };
}
