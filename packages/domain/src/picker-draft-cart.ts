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

/**
 * Изменяет количество для позиции SKU в черновой корзине подбора (минимум 1).
 */
export function updateSkuDraftItemQuantity(
  draft: PickerDraftCart,
  draftId: string,
  nextQuantity: number
): PickerDraftCart {
  const q = Number.isFinite(nextQuantity) ? Math.trunc(nextQuantity) : 1;
  const clamped = q < 1 ? 1 : q > 9999 ? 9999 : q;
  return {
    ...draft,
    items: draft.items.map((item) => {
      if (item.kind !== "sku" || item.draftId !== draftId) {
        return item;
      }
      return { ...item, quantity: clamped };
    }),
  };
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

function pieceCountForDraftSku(item: PickerDraftItemSku): number {
  const q = item.quantity;
  return typeof q === "number" && Number.isFinite(q) && Number.isInteger(q) && q >= 1 ? q : 1;
}

function pieceCountForDraftKit(item: PickerDraftItemKit): number {
  if (item.kit.items.length === 0) {
    return 1;
  }
  let sum = 0;
  for (const ki of item.kit.items) {
    const q = ki.quantity;
    sum +=
      typeof q === "number" && Number.isFinite(q) && Number.isInteger(q) && q >= 1
        ? q
        : 1;
  }
  return sum > 0 ? sum : 1;
}

type ActiveWishlistItemLike = Pick<
  PartWishlistItem,
  "id" | "status" | "nodeId" | "sku" | "title" | "vehicleId" | "quantity"
>;

function findActiveSkuWishlistMatch(
  item: PickerDraftItemSku,
  activeItems: ActiveWishlistItemLike[]
): ActiveWishlistItemLike | null {
  const targetNodeId = item.nodeId ?? item.sku.primaryNodeId;
  if (!targetNodeId) return null;
  const found = activeItems
    .filter(isActiveWishlistItem)
    .find((existing) => existing.nodeId === targetNodeId && existing.sku?.id === item.sku.id);
  return found ?? null;
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
  let willAddTotalPieces = 0;
  let quantityUpgradeCount = 0;
  let quantityUpgradeExtraPieces = 0;
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
      const matched = findActiveSkuWishlistMatch(item, input.activeWishlistItems);
      if (matched) {
        const draftQty = pieceCountForDraftSku(item);
        const existingQty = Math.max(1, Math.trunc(Number(matched.quantity) || 1));
        const addQty = Math.max(0, draftQty - existingQty);
        const reduceByQty = Math.max(0, existingQty - draftQty);
        if (!matched.id) {
          decisions.push({
            kind: "blocked",
            draftId: item.draftId,
            label,
            reason: "Не удалось сопоставить строку списка (нет id).",
          });
          blockedCount += 1;
          continue;
        }
        decisions.push({
          kind: "quantityUpgrade",
          draftId: item.draftId,
          label,
          existingWishlistItemId: matched.id,
          nodeId: targetNodeId,
          draftRequestedQty: draftQty,
          existingQty,
          addQty,
          reduceByQty,
        });
        quantityUpgradeCount += 1;
        quantityUpgradeExtraPieces += draftQty;
        const price = item.sku.priceAmount;
        if (price != null && Number.isFinite(price)) {
          estimatedTotal += price * draftQty;
        }
        const c = item.sku.currency?.trim();
        if (c) currencies.add(c);
        continue;
      }
      const pieces = pieceCountForDraftSku(item);
      decisions.push({ kind: "willAdd", draftId: item.draftId, label, pieceCount: pieces });
      willAddCount += 1;
      willAddTotalPieces += pieces;
      estimatedTotal += getSkuLineAmount(item);
      const c = item.sku.currency?.trim();
      if (c) currencies.add(c);
    } else {
      const label = buildKitLabel(item);
      const pieces = pieceCountForDraftKit(item);
      decisions.push({ kind: "willAdd", draftId: item.draftId, label, pieceCount: pieces });
      willAddCount += 1;
      willAddTotalPieces += pieces;
      estimatedTotal += getKitLineAmount(item);
      const c = getItemCurrency(item);
      if (c) currencies.add(c);
    }
  }

  const estimatedCurrency = currencies.size === 1 ? [...currencies][0] ?? null : null;
  return {
    decisions,
    willAddCount,
    willAddTotalPieces,
    quantityUpgradeCount,
    quantityUpgradeExtraPieces,
    duplicateCount,
    blockedCount,
    estimatedTotal: estimatedCurrency ? estimatedTotal : null,
    estimatedCurrency,
  };
}

/** Все строки `quantityUpgrade` в превью имеют выбранный режим в `map`. */
export function arePickerQuantityResolutionsComplete(
  preview: PickerSubmitPreview,
  resolutionByDraftId: Record<string, "addAllFromDraft" | "setQtyToDraft" | undefined>
): boolean {
  for (const d of preview.decisions) {
    if (d.kind !== "quantityUpgrade") continue;
    if (!resolutionByDraftId[d.draftId]) return false;
  }
  return true;
}

/**
 * Суммарное изменение количества в wishlist после сабмита (новые строки + дельты по совпадениям).
 * `null`, если есть `quantityUpgrade`, но не для всех выбран режим.
 */
export function computePickerSubmitWishlistPieceDelta(
  preview: PickerSubmitPreview,
  resolutionByDraftId: Record<string, "addAllFromDraft" | "setQtyToDraft" | undefined>
): number | null {
  let delta = preview.willAddTotalPieces;
  if (preview.quantityUpgradeCount === 0) {
    return delta;
  }
  for (const d of preview.decisions) {
    if (d.kind !== "quantityUpgrade") continue;
    const mode = resolutionByDraftId[d.draftId];
    if (!mode) return null;
    if (mode === "addAllFromDraft") {
      delta += d.draftRequestedQty;
    } else {
      delta += Math.max(0, d.draftRequestedQty - d.existingQty);
    }
  }
  return delta;
}

/**
 * Оценка суммы по каталогу с учётом выбранных режимов для `quantityUpgrade`.
 * `null`, если режимы не выбраны полностью или валюты разнородные.
 */
export function computePickerSubmitPriceEstimate(
  draft: PickerDraftCart,
  preview: PickerSubmitPreview,
  resolutionByDraftId: Record<string, "addAllFromDraft" | "setQtyToDraft" | undefined>
): { amount: number; currency: string | null } | null {
  if (preview.quantityUpgradeCount > 0 && !arePickerQuantityResolutionsComplete(preview, resolutionByDraftId)) {
    return null;
  }
  let total = 0;
  const currencies = new Set<string>();
  for (const item of draft.items) {
    const dec = preview.decisions.find((x) => x.draftId === item.draftId);
    if (!dec) continue;
    if (item.kind === "sku") {
      if (dec.kind === "willAdd") {
        total += getSkuLineAmount(item);
        const c = item.sku.currency?.trim();
        if (c) currencies.add(c);
      } else if (dec.kind === "quantityUpgrade") {
        const mode = resolutionByDraftId[item.draftId]!;
        const price = item.sku.priceAmount;
        if (price != null && Number.isFinite(price)) {
          if (mode === "addAllFromDraft") {
            total += price * dec.draftRequestedQty;
          } else {
            total += price * Math.max(0, dec.draftRequestedQty - dec.existingQty);
          }
        }
        const c = item.sku.currency?.trim();
        if (c) currencies.add(c);
      }
    } else if (item.kind === "kit" && dec.kind === "willAdd") {
      total += getKitLineAmount(item);
      const c = getItemCurrency(item);
      if (c) currencies.add(c);
    }
  }
  if (currencies.size > 1) {
    return null;
  }
  const currency = currencies.size === 1 ? [...currencies][0] ?? null : null;
  return { amount: total, currency };
}
