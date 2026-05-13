/** Normalize brand string for dedupe keys (uppercase, collapse spaces). */
export function normalizePartMasterBrand(brandName: string): string {
  return brandName.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Normalize SKU/article for dedupe (alphanumeric upper, strip spaces). */
export function normalizePartMasterSku(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

export type PartMasterIdentityInput = {
  brandName: string;
  /** Primary display SKU — first part number, seedKey, or fallback. */
  skuLabel: string;
};

export function resolvePartMasterSkuLabel(input: {
  seedKey: string | null;
  canonicalName: string;
  firstPartNumber: string | null;
}): string {
  const fromSeed = input.seedKey?.trim();
  if (fromSeed) return fromSeed;
  const pn = input.firstPartNumber?.trim();
  if (pn) return pn;
  return input.canonicalName.trim() || "UNKNOWN";
}

export function buildPartMasterIdentity(input: PartMasterIdentityInput): {
  brandNormalized: string;
  normalizedSku: string;
  skuLabel: string;
} {
  const brandNormalized = normalizePartMasterBrand(input.brandName);
  const skuLabel = input.skuLabel.trim() || "UNKNOWN";
  const normalizedSku = normalizePartMasterSku(skuLabel);
  return { brandNormalized, normalizedSku, skuLabel };
}
