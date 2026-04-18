import type {
  PartFitment,
  PartNumber,
  PartOffer,
  PartSku,
  PartSkuNodeLink,
  PartSkuNodeSummary,
  PartSkuViewModel,
  WishlistItemSkuInfo,
} from "@mototwin/types";
import { formatExpenseAmountRu } from "./expense-summary";

export function normalizePartNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function getSkuDisplayPrice(sku: {
  priceAmount: number | null;
  currency: string | null;
}): { priceAmount: number | null; currency: string | null } {
  return {
    priceAmount: sku.priceAmount,
    currency: sku.currency?.trim() ? sku.currency.trim().toUpperCase() : null,
  };
}

/**
 * Fills title / node / price from catalog SKU when the client leaves them empty (wishlist POST rules).
 * Cost is copied only when the request does not meaningfully set amount or currency (including explicit `null`).
 */
export function applySkuDefaultsToWishlistDraft(
  input: {
    titleTrimmed: string;
    nodeId: string | null;
    costAmount: number | null | undefined;
    currency: string | null | undefined;
  },
  sku: {
    canonicalName: string;
    primaryNodeId: string | null;
    priceAmount: number | null;
    currency: string | null;
  } | null
): {
  title: string;
  nodeId: string | null;
  costAmount: number | null | undefined;
  currency: string | null | undefined;
} {
  let title = input.titleTrimmed;
  let nodeId = input.nodeId;
  let costAmount = input.costAmount;
  let currency = input.currency;

  const costMeaningfullySet =
    (typeof input.costAmount === "number" && !Number.isNaN(input.costAmount)) ||
    (typeof input.currency === "string" && input.currency.trim().length > 0);

  if (sku) {
    if (!title) {
      title = sku.canonicalName.trim();
    }
    if (!nodeId && sku.primaryNodeId) {
      nodeId = sku.primaryNodeId;
    }
    if (!costMeaningfullySet && sku.priceAmount != null && Number.isFinite(sku.priceAmount)) {
      costAmount = sku.priceAmount;
      currency = sku.currency?.trim() ? sku.currency.trim() : "RUB";
    }
  }

  return { title, nodeId, costAmount, currency };
}

export function buildPartSkuLabel(sku: { brandName: string; canonicalName: string }): string {
  const b = sku.brandName.trim();
  const n = sku.canonicalName.trim();
  if (b && n) {
    return `${b} — ${n}`;
  }
  return n || b || "";
}

type DecimalLike = { toString(): string } | number | string | null | undefined;

function decimalToNumber(value: DecimalLike): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number.parseFloat(value.toString());
  return Number.isFinite(n) ? n : null;
}

export function buildWishlistItemSkuInfo(row: {
  id: string;
  canonicalName: string;
  brandName: string;
  partType: string;
  priceAmount: DecimalLike;
  currency: string | null;
  partNumbers?: { number: string }[];
}): WishlistItemSkuInfo {
  const { priceAmount, currency } = getSkuDisplayPrice({
    priceAmount: decimalToNumber(row.priceAmount),
    currency: row.currency,
  });
  const primaryPartNumber = row.partNumbers?.[0]?.number?.trim() || null;
  return {
    id: row.id,
    canonicalName: row.canonicalName,
    brandName: row.brandName,
    partType: row.partType,
    priceAmount,
    currency,
    primaryPartNumber,
  };
}

/** Дополнительная строка для карточки wishlist / выбранного SKU (артикул, тип, цена). */
export function formatWishlistItemSkuSecondaryLineRu(info: WishlistItemSkuInfo): string {
  const art = info.primaryPartNumber?.trim();
  const typePart = info.partType?.trim() || "";
  const { priceAmount, currency } = getSkuDisplayPrice({
    priceAmount: info.priceAmount,
    currency: info.currency,
  });
  const pricePart =
    priceAmount != null && currency
      ? `${formatExpenseAmountRu(priceAmount)} ${currency}`
      : priceAmount != null
        ? formatExpenseAmountRu(priceAmount)
        : "";
  return [art ? `Арт. ${art}` : "", typePart, pricePart].filter((s) => s.length > 0).join(" · ");
}

/** Строка под названием в результатах поиска SKU (артикулы, тип, цена). */
export function formatPartSkuSearchResultMetaLineRu(sku: PartSkuViewModel): string {
  const nums = sku.partNumbers
    .slice(0, 2)
    .map((p) => p.number.trim())
    .filter(Boolean);
  const numPart = nums.length ? nums.join(", ") : "";
  const typePart = sku.partType?.trim() ? sku.partType : "";
  const { priceAmount, currency } = getSkuDisplayPrice({
    priceAmount: sku.priceAmount,
    currency: sku.currency,
  });
  const pricePart =
    priceAmount != null && currency
      ? `${formatExpenseAmountRu(priceAmount)} ${currency}`
      : priceAmount != null
        ? formatExpenseAmountRu(priceAmount)
        : "";
  return [numPart, typePart, pricePart].filter((s) => s.length > 0).join(" · ");
}

export function getWishlistItemSkuDisplayLines(info: WishlistItemSkuInfo): {
  primaryLine: string;
  secondaryLine: string;
} {
  return {
    primaryLine: buildPartSkuLabel(info),
    secondaryLine: formatWishlistItemSkuSecondaryLineRu(info),
  };
}

export function getPartSkuViewModelDisplayLines(sku: PartSkuViewModel): {
  primaryLine: string;
  secondaryLine: string;
} {
  return {
    primaryLine: buildPartSkuLabel(sku),
    secondaryLine: formatPartSkuSearchResultMetaLineRu(sku),
  };
}

export function buildPartSkuViewModel(row: {
  id: string;
  seedKey: string | null;
  primaryNodeId: string | null;
  brandName: string;
  canonicalName: string;
  partType: string;
  description: string | null;
  category: string | null;
  priceAmount: DecimalLike;
  currency: string | null;
  sourceUrl: string | null;
  isOem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  primaryNode: PartSkuNodeSummary | null;
  partNumbers: Array<{
    id: string;
    skuId: string;
    number: string;
    normalizedNumber: string;
    numberType: string;
    brandName: string | null;
    createdAt: Date;
  }>;
  nodeLinks: Array<{
    id: string;
    skuId: string;
    nodeId: string;
    relationType: string;
    confidence: number;
    createdAt: Date;
    node: PartSkuNodeSummary;
  }>;
  fitments: Array<{
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
    createdAt: Date;
  }>;
  offers: Array<{
    id: string;
    skuId: string | null;
    sourceName: string;
    externalOfferId: string | null;
    title: string;
    url: string | null;
    priceAmount: DecimalLike;
    currency: string | null;
    availability: string | null;
    sellerName: string | null;
    rawBrand: string | null;
    rawArticle: string | null;
    lastSeenAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): PartSkuViewModel {
  const priceAmount = decimalToNumber(row.priceAmount);
  const { currency } = getSkuDisplayPrice({
    priceAmount,
    currency: row.currency,
  });

  const base: PartSku = {
    id: row.id,
    seedKey: row.seedKey,
    primaryNodeId: row.primaryNodeId,
    brandName: row.brandName,
    canonicalName: row.canonicalName,
    partType: row.partType,
    description: row.description,
    category: row.category,
    priceAmount,
    currency,
    sourceUrl: row.sourceUrl,
    isOem: row.isOem,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  const partNumbers: PartNumber[] = row.partNumbers.map((p) => ({
    id: p.id,
    skuId: p.skuId,
    number: p.number,
    normalizedNumber: p.normalizedNumber,
    numberType: p.numberType,
    brandName: p.brandName,
    createdAt: p.createdAt.toISOString(),
  }));

  const nodeLinks: PartSkuNodeLink[] = row.nodeLinks.map((l) => ({
    id: l.id,
    skuId: l.skuId,
    nodeId: l.nodeId,
    relationType: l.relationType,
    confidence: l.confidence,
    createdAt: l.createdAt.toISOString(),
    node: l.node,
  }));

  const fitments: PartFitment[] = row.fitments.map((f) => ({
    id: f.id,
    skuId: f.skuId,
    brandId: f.brandId,
    modelId: f.modelId,
    modelVariantId: f.modelVariantId,
    yearFrom: f.yearFrom,
    yearTo: f.yearTo,
    market: f.market,
    engineCode: f.engineCode,
    vinFrom: f.vinFrom,
    vinTo: f.vinTo,
    fitmentType: f.fitmentType,
    confidence: f.confidence,
    note: f.note,
    createdAt: f.createdAt.toISOString(),
  }));

  const offers: PartOffer[] = row.offers.map((o) => {
    const oPrice = decimalToNumber(o.priceAmount);
    const oCur = getSkuDisplayPrice({ priceAmount: oPrice, currency: o.currency });
    return {
      id: o.id,
      skuId: o.skuId,
      sourceName: o.sourceName,
      externalOfferId: o.externalOfferId,
      title: o.title,
      url: o.url,
      priceAmount: oCur.priceAmount,
      currency: oCur.currency,
      availability: o.availability,
      sellerName: o.sellerName,
      rawBrand: o.rawBrand,
      rawArticle: o.rawArticle,
      lastSeenAt: o.lastSeenAt ? o.lastSeenAt.toISOString() : null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    };
  });

  return {
    ...base,
    primaryNode: row.primaryNode,
    partNumbers,
    nodeLinks,
    fitments,
    offers,
  };
}
