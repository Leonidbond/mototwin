/** Query params for `GET /api/parts/skus` (client-side; server reads URLSearchParams). */
export type PartSkuSearchFilters = {
  nodeId?: string;
  search?: string;
  /** When `true`, only `isActive === true`. Default: active only. Pass `false` to include inactive. */
  activeOnly?: boolean;
};

export type PartSkuNodeSummary = {
  id: string;
  code: string;
  name: string;
};

/** Catalog part number row (API / JSON). */
export type PartNumber = {
  id: string;
  skuId: string;
  number: string;
  normalizedNumber: string;
  numberType: string;
  brandName: string | null;
  createdAt: string;
};

export type PartSkuNodeLink = {
  id: string;
  skuId: string;
  nodeId: string;
  relationType: string;
  confidence: number;
  createdAt: string;
  node: PartSkuNodeSummary;
};

export type PartFitment = {
  id: string;
  skuId: string;
  brandId: string | null;
  modelId: string | null;
  modelVariantId: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  market: string | null;
  engineCode: string | null;
  vinFrom: string | null;
  vinTo: string | null;
  fitmentType: string | null;
  confidence: number;
  note: string | null;
  createdAt: string;
};

export type PartOffer = {
  id: string;
  skuId: string | null;
  sourceName: string;
  externalOfferId: string | null;
  title: string;
  url: string | null;
  priceAmount: number | null;
  currency: string | null;
  availability: string | null;
  sellerName: string | null;
  rawBrand: string | null;
  rawArticle: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Canonical catalog SKU (flat row without relations). */
export type PartSku = {
  id: string;
  seedKey: string | null;
  primaryNodeId: string | null;
  brandName: string;
  canonicalName: string;
  partType: string;
  description: string | null;
  category: string | null;
  priceAmount: number | null;
  currency: string | null;
  sourceUrl: string | null;
  isOem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PartSkuViewModel = PartSku & {
  primaryNode: PartSkuNodeSummary | null;
  partNumbers: PartNumber[];
  nodeLinks: PartSkuNodeLink[];
  fitments: PartFitment[];
  offers: PartOffer[];
};

/** Compact SKU block on wishlist API responses. */
export type WishlistItemSkuInfo = {
  id: string;
  canonicalName: string;
  brandName: string;
  partType: string;
  priceAmount: number | null;
  currency: string | null;
  /** Первый артикул из каталога (если есть), для списка wishlist. */
  primaryPartNumber?: string | null;
};
