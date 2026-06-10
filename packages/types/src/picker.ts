import type { PartRecommendationViewModel } from "./part-recommendation";
import type { PartSkuViewModel } from "./part-catalog";
import type { ServiceKitViewModel } from "./service-kit";

/** Метка крупных карточек на picker page. */
export type PickerMerchandiseLabel = "BEST_FIT" | "BEST_VALUE" | "FOR_YOUR_RIDE";

/** Тег бейджа на строке кита (статичный лукап). */
export type ServiceKitMerchandiseTag = "POPULAR" | "BEST_VALUE" | "RECOMMENDED";

export type PickerDraftItemSku = {
  kind: "sku";
  /** Локальный id в драфте (uuid-подобный), не равен sku.id, чтобы можно было добавлять одинаковые SKU. */
  draftId: string;
  sku: PartSkuViewModel;
  /** Кол-во в драфте (по умолчанию 1, инкрементируется по `+`). */
  quantity: number;
  /** Узел из контекста picker, который будет передан в wishlist. Может отличаться от sku.primaryNodeId. */
  nodeId: string | null;
  /** Источник: ручной поиск, рекомендация или search-row — для аналитики/UI. */
  source: "recommendation" | "search";
};

export type PickerDraftItemKit = {
  kind: "kit";
  draftId: string;
  kit: ServiceKitViewModel;
  /** Контекстный узел, передаваемый в `addServiceKitToWishlist`. */
  contextNodeId: string | null;
};

export type PickerDraftItem = PickerDraftItemSku | PickerDraftItemKit;

export type PickerDraftCart = {
  vehicleId: string;
  items: PickerDraftItem[];
};

export type PickerDraftTotals = {
  positionsCount: number;
  totalAmount: number;
  /** Если все items в одной валюте — она; иначе `null` (тогда total недоступен). */
  currency: string | null;
};

/** Раскладка по 3 крупным карточкам Recommendations section. */
export type PickerMerchandiseRecommendations = {
  bestFit: PartRecommendationViewModel | null;
  bestValue: PartRecommendationViewModel | null;
  forYourRide: PartRecommendationViewModel | null;
  /** Остальные рекомендации (для "Показать ещё рекомендации"). */
  alternatives: PartRecommendationViewModel[];
};

export type PickerSubmitDecision =
  | {
      kind: "willAdd";
      draftId: string;
      label: string;
      /** SKU — количество в корзине; комплект — сумма quantity по строкам состава. */
      draftLineKind: "sku" | "kit";
      /** Сколько штук уйдёт в wishlist по этой строке драфта (SKU: quantity; комплект: сумма quantity по строкам состава). */
      pieceCount: number;
    }
  | { kind: "duplicate"; draftId: string; label: string; reason: string }
  | { kind: "blocked"; draftId: string; label: string; reason: string }
  | {
      /** В списке уже есть эта позиция (тот же узел + SKU) — пользователь выбирает, как обновить количество. */
      kind: "quantityUpgrade";
      draftId: string;
      label: string;
      existingWishlistItemId: string;
      nodeId: string;
      draftRequestedQty: number;
      existingQty: number;
      /** max(0, draft − existing) — сколько не хватает до «ровно draft» (подпись второго режима). */
      addQty: number;
      /** max(0, existing − draft) — «запас» в списке над подбором (для подписей; сервер при setQty не уменьшает). */
      reduceByQty: number;
    };

export type PickerSubmitPreview = {
  decisions: PickerSubmitDecision[];
  willAddCount: number;
  /** Сумма штук по всем строкам, которые реально добавятся (`willAdd`). */
  willAddTotalPieces: number;
  /** Строки SKU, где позиция уже в списке (тот же узел + SKU) — нужен выбор, как обновить количество. */
  quantityUpgradeCount: number;
  /** Сумма штук из подбора по строкам `quantityUpgrade` (кол-во в черновике по каждой такой строке). */
  quantityUpgradeExtraPieces: number;
  duplicateCount: number;
  blockedCount: number;
  estimatedTotal: number | null;
  estimatedCurrency: string | null;
};

/**
 * Разрешение количества при сабмите подбора (см. `quantityUpgrade` в превью).
 * - `addAllFromDraft` — прибавить к строке всё количество из черновика подбора (`existingQty + draftRequestedQty`).
 * - `setQtyToDraft` — довести количество в строке **до** `draftRequestedQty` шт., но **не уменьшать**: если в списке уже ≥ подбора, строка не меняется (ничего не добавляется).
 */
export type PickerQuantitySubmitResolution = {
  draftId: string;
  existingWishlistItemId: string;
  nodeId: string;
  mode: "addAllFromDraft" | "setQtyToDraft";
  draftRequestedQty: number;
  existingQty: number;
};

export type PickerSubmitResult = {
  createdSkuIds: string[];
  createdKitCodes: string[];
  skipped: Array<{ kind: "sku" | "kit"; reason: string; label: string }>;
  warnings: string[];
  /** Wishlist-item ids созданные за этот сабмит — для подсветки на cart-странице. */
  createdWishlistItemIds: string[];
  /** Строки, у которых обновили только количество (без нового POST). */
  updatedWishlistItemIds: string[];
  /**
   * Сколько раз режим `setQtyToDraft` завершился без PATCH: в списке уже было не меньше, чем в подборе.
   */
  noOpQuantityUpdates?: number;
};
