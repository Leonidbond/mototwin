import type { PartWishlistItemStatus, PartWishlistItemViewModel } from "@mototwin/types";

export type CartSummaryMetric = { count: number; amount: number };

export type PartsCartSummary = {
  needed: CartSummaryMetric;
  ordered: CartSummaryMetric;
  /** Только BOUGHT, как на референсе корзины. */
  bought: CartSummaryMetric;
  installed: CartSummaryMetric;
  /** Только BOUGHT — «куплено, не установлено» в терминах домена. */
  boughtNotInstalled: CartSummaryMetric;
};

function sumCostAmount(items: PartWishlistItemViewModel[]): number {
  return items.reduce((acc, it) => acc + (it.costAmount ?? 0), 0);
}

function byStatus(items: PartWishlistItemViewModel[], status: PartWishlistItemStatus) {
  return items.filter((i) => i.status === status);
}

/** Сводка для пяти карточек корзины (см. спеку §4.3; пятая карта = только BOUGHT). */
export function buildPartsCartSummary(items: PartWishlistItemViewModel[]): PartsCartSummary {
  const needed = byStatus(items, "NEEDED");
  const ordered = byStatus(items, "ORDERED");
  const bought = byStatus(items, "BOUGHT");
  const installed = byStatus(items, "INSTALLED");
  return {
    needed: { count: needed.length, amount: sumCostAmount(needed) },
    ordered: { count: ordered.length, amount: sumCostAmount(ordered) },
    bought: { count: bought.length, amount: sumCostAmount(bought) },
    installed: { count: installed.length, amount: sumCostAmount(installed) },
    boughtNotInstalled: { count: bought.length, amount: sumCostAmount(bought) },
  };
}
