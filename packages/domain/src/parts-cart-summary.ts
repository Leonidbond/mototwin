import type { PartWishlistItemStatus, PartWishlistItemViewModel } from "@mototwin/types";

export type CartSummaryMetric = { count: number; amount: number };

export type PartsCartSummary = {
  all: CartSummaryMetric;
  needed: CartSummaryMetric;
  ordered: CartSummaryMetric;
  bought: CartSummaryMetric;
  installed: CartSummaryMetric;
};

function sumCostAmount(items: PartWishlistItemViewModel[]): number {
  return items.reduce((acc, it) => acc + (it.costAmount ?? 0), 0);
}

function byStatus(items: PartWishlistItemViewModel[], status: PartWishlistItemStatus) {
  return items.filter((i) => i.status === status);
}

/** Сводка для карточек корзины (web + Expo): «Все» + по статусам. */
export function buildPartsCartSummary(items: PartWishlistItemViewModel[]): PartsCartSummary {
  const needed = byStatus(items, "NEEDED");
  const ordered = byStatus(items, "ORDERED");
  const bought = byStatus(items, "BOUGHT");
  const installed = byStatus(items, "INSTALLED");
  return {
    all: { count: items.length, amount: sumCostAmount(items) },
    needed: { count: needed.length, amount: sumCostAmount(needed) },
    ordered: { count: ordered.length, amount: sumCostAmount(ordered) },
    bought: { count: bought.length, amount: sumCostAmount(bought) },
    installed: { count: installed.length, amount: sumCostAmount(installed) },
  };
}
