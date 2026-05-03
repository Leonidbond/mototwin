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
  | { kind: "willAdd"; draftId: string; label: string }
  | { kind: "duplicate"; draftId: string; label: string; reason: string }
  | { kind: "blocked"; draftId: string; label: string; reason: string };

export type PickerSubmitPreview = {
  decisions: PickerSubmitDecision[];
  willAddCount: number;
  duplicateCount: number;
  blockedCount: number;
  estimatedTotal: number | null;
  estimatedCurrency: string | null;
};

export type PickerSubmitResult = {
  createdSkuIds: string[];
  createdKitCodes: string[];
  skipped: Array<{ kind: "sku" | "kit"; reason: string; label: string }>;
  warnings: string[];
  /** Wishlist-item ids созданные за этот сабмит — для подсветки на cart-странице. */
  createdWishlistItemIds: string[];
};
