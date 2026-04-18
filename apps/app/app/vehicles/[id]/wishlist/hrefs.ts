import type { PartWishlistItem } from "@mototwin/types";

/** Deep link / router href for creating a wishlist item, optionally with a node preset. */
export function buildVehicleWishlistNewHref(vehicleId: string, nodeId?: string): string {
  const q = nodeId?.trim()
    ? `?nodeId=${encodeURIComponent(nodeId.trim())}`
    : "";
  return `/vehicles/${vehicleId}/wishlist/new${q}`;
}

/** Opens Add Service Event with wishlist-driven prefill (query params read in `service-events/new`). */
export function buildServiceEventNewFromWishlistHref(
  vehicleId: string,
  item: PartWishlistItem
): string {
  const nodeId = item.nodeId?.trim();
  if (!nodeId) {
    return `/vehicles/${vehicleId}/service-events/new`;
  }
  const q = new URLSearchParams({
    source: "wishlist",
    nodeId,
    wlTitle: item.title,
    wlQty: String(item.quantity),
    wlId: item.id,
  });
  if (item.comment?.trim()) {
    q.set("wlComment", item.comment.trim());
  }
  if (item.costAmount != null && Number.isFinite(item.costAmount)) {
    q.set("wlCost", String(item.costAmount));
    q.set(
      "wlCurrency",
      (item.currency?.trim() ? item.currency.trim() : "RUB").toUpperCase()
    );
  }
  return `/vehicles/${vehicleId}/service-events/new?${q.toString()}`;
}
