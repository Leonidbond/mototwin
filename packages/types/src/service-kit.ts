import type { PartRecommendationType } from "./part-recommendation";
import type { PartWishlistItem } from "./part-wishlist";

export type ServiceKitItemDefinition = {
  key: string;
  title: string;
  nodeCode: string;
  partType: string;
  quantity: number;
  role: string;
  required: boolean;
  preferredSkuId?: string | null;
};

export type ServiceKitDefinition = {
  id: string;
  code: string;
  title: string;
  description: string;
  targetNodeCodes: string[];
  items: ServiceKitItemDefinition[];
};

export type ServiceKitItemViewModel = {
  key: string;
  title: string;
  nodeCode: string;
  partType: string;
  quantity: number;
  role: string;
  required: boolean;
  matchedSkuId: string | null;
  /** Каталожные номера подобранного SKU (для UI; не путать с matchedSkuId). */
  matchedPartNumbers: string[];
  matchedSkuTitle: string | null;
  matchedPriceAmount: number | null;
  matchedCurrency: string | null;
  recommendationType: PartRecommendationType | null;
  warning: string | null;
};

export type ServiceKitViewModel = {
  id: string;
  code: string;
  title: string;
  description: string;
  targetNodeCodes: string[];
  items: ServiceKitItemViewModel[];
};

export type AddServiceKitToWishlistPayload = {
  kitCode: string;
  contextNodeId?: string | null;
};

export type ServiceKitSkippedReason =
  | "DUPLICATE_ACTIVE_ITEM"
  | "MISSING_NODE"
  | "NON_LEAF_NODE"
  | "NO_MATCHED_SKU";

export type AddServiceKitToWishlistSkippedItem = {
  itemKey: string;
  title: string;
  reason: ServiceKitSkippedReason;
  message: string;
};

export type AddServiceKitToWishlistResult = {
  kitCode: string;
  createdItems: PartWishlistItem[];
  skippedItems: AddServiceKitToWishlistSkippedItem[];
  warnings: string[];
};

export type ServiceKitPreviewItemStatus =
  | "WILL_ADD"
  | "DUPLICATE_ACTIVE_ITEM"
  | "MISSING_NODE"
  | "NON_LEAF_NODE"
  | "NO_MATCHED_SKU";

export type ServiceKitPreviewItemViewModel = {
  itemKey: string;
  title: string;
  nodeCode: string;
  nodeName: string | null;
  matchedSkuId: string | null;
  matchedSkuTitle: string | null;
  costAmount: number | null;
  currency: string | null;
  status: ServiceKitPreviewItemStatus;
};

export type ServiceKitPreviewViewModel = {
  kitCode: string;
  canAddAny: boolean;
  addableCount: number;
  duplicateCount: number;
  invalidCount: number;
  items: ServiceKitPreviewItemViewModel[];
};
