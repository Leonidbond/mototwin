/** Matches Prisma `PartWishlistItemStatus`. */
export type PartWishlistItemStatus = "NEEDED" | "ORDERED" | "BOUGHT" | "INSTALLED";

/** Default ISO 4217 code for new wishlist lines (aligned with service event forms). */
export const PART_WISHLIST_DEFAULT_CURRENCY = "RUB";

/** API / Prisma row shape for a wishlist item (JSON dates as ISO strings). */
export type PartWishlistItem = {
  id: string;
  vehicleId: string;
  nodeId: string | null;
  title: string;
  quantity: number;
  status: PartWishlistItemStatus;
  comment: string | null;
  costAmount: number | null;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
  node: { id: string; name: string } | null;
};

export type PartWishlistItemViewModel = PartWishlistItem & {
  statusLabelRu: string;
  /** Preformatted “amount currency” for list UI when {@link PartWishlistItem.costAmount} is set. */
  costLabelRu?: string;
};

/** Form fields as edited in UI (web / Expo). */
export type PartWishlistFormValues = {
  title: string;
  quantity: string;
  status: PartWishlistItemStatus;
  nodeId: string;
  comment: string;
  costAmount: string;
  currency: string;
};

export type CreatePartWishlistItemInput = {
  title: string;
  quantity?: number;
  nodeId?: string | null;
  comment?: string | null;
  status?: PartWishlistItemStatus;
  costAmount?: number | null;
  currency?: string | null;
};

export type UpdatePartWishlistItemInput = {
  title?: string;
  quantity?: number;
  nodeId?: string | null;
  comment?: string | null;
  status?: PartWishlistItemStatus;
  costAmount?: number | null;
  currency?: string | null;
};

export type PartWishlistStatusGroupViewModel = {
  status: PartWishlistItemStatus;
  sectionTitleRu: string;
  items: PartWishlistItemViewModel[];
};
