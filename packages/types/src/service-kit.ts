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
  matchedSkuTitle: string | null;
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

export type AddServiceKitToWishlistSkippedItem = {
  itemKey: string;
  title: string;
  reason: string;
};

export type AddServiceKitToWishlistResult = {
  kitCode: string;
  createdItems: PartWishlistItem[];
  skippedItems: AddServiceKitToWishlistSkippedItem[];
  warnings: string[];
};
