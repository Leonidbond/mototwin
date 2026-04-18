/** Matches Prisma `PartWishlistItemStatus`. */
export type PartWishlistItemStatus = "NEEDED" | "ORDERED" | "BOUGHT" | "INSTALLED";

/** API / Prisma row shape for a wishlist item (JSON dates as ISO strings). */
export type PartWishlistItem = {
  id: string;
  vehicleId: string;
  nodeId: string | null;
  title: string;
  quantity: number;
  status: PartWishlistItemStatus;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  node: { id: string; name: string } | null;
};

export type PartWishlistItemViewModel = PartWishlistItem & {
  statusLabelRu: string;
};

/** Form fields as edited in UI (web / Expo). */
export type PartWishlistFormValues = {
  title: string;
  quantity: string;
  status: PartWishlistItemStatus;
  nodeId: string;
  comment: string;
};

export type CreatePartWishlistItemInput = {
  title: string;
  quantity?: number;
  nodeId?: string | null;
  comment?: string | null;
  status?: PartWishlistItemStatus;
};

export type UpdatePartWishlistItemInput = {
  title?: string;
  quantity?: number;
  nodeId?: string | null;
  comment?: string | null;
  status?: PartWishlistItemStatus;
};

export type PartWishlistStatusGroupViewModel = {
  status: PartWishlistItemStatus;
  sectionTitleRu: string;
  items: PartWishlistItemViewModel[];
};
