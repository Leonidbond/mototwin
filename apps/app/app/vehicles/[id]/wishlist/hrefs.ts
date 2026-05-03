import type { PartWishlistItem } from "@mototwin/types";

/** Deep link / router href for the parts picker (create flow), optionally with a node / catalog hints. */
export function buildVehicleWishlistNewHref(
  vehicleId: string,
  nodeId?: string,
  options?: { skuId?: string; kitCode?: string; focusKits?: boolean }
): string {
  const q = new URLSearchParams();
  if (nodeId?.trim()) {
    q.set("nodeId", nodeId.trim());
  }
  if (options?.skuId?.trim()) {
    q.set("skuId", options.skuId.trim());
  }
  if (options?.kitCode?.trim()) {
    q.set("kitCode", options.kitCode.trim());
  }
  if (options?.focusKits) {
    q.set("focus", "kits");
  }
  const qs = q.toString();
  return `/vehicles/${vehicleId}/wishlist/picker${qs ? `?${qs}` : ""}`;
}

export function buildVehicleWishlistItemHighlightHref(
  vehicleId: string,
  itemId: string,
  options?: { partsStatus?: PartWishlistItem["status"] }
): string {
  const q = new URLSearchParams({ wishlistItemId: itemId });
  if (options?.partsStatus) {
    q.set("partsStatus", options.partsStatus);
  }
  return `/vehicles/${vehicleId}/wishlist?${q.toString()}`;
}

export function buildVehicleServiceLogEventHref(vehicleId: string, eventId: string): string {
  return `/vehicles/${vehicleId}/service-log?serviceEventId=${encodeURIComponent(eventId)}`;
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
