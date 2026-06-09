import type { Router } from "expo-router";
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

export type ServiceEventNewFromWishlistRouteParams = {
  source: "wishlist";
  wishlistItemId: string;
  nodeId?: string;
  pendingInstall?: "1";
};

/** Minimal route params for wishlist prefill (data loaded from API on the form screen). */
export function buildServiceEventNewFromWishlistParams(
  item: PartWishlistItem,
  options?: { pendingInstall?: boolean }
): ServiceEventNewFromWishlistRouteParams | null {
  const nodeId = item.nodeId?.trim();
  if (!nodeId) {
    return null;
  }
  const params: ServiceEventNewFromWishlistRouteParams = {
    source: "wishlist",
    wishlistItemId: item.id,
    nodeId,
  };
  if (options?.pendingInstall) {
    params.pendingInstall = "1";
  }
  return params;
}

/** Opens Add Service Event with wishlist-driven prefill (read in `service-events/new`). */
export function buildServiceEventNewFromWishlistHref(
  vehicleId: string,
  item: PartWishlistItem,
  options?: { pendingInstall?: boolean }
): string {
  const params = buildServiceEventNewFromWishlistParams(item, options);
  if (!params) {
    return `/vehicles/${vehicleId}/service-events/new`;
  }
  const q = new URLSearchParams({
    source: params.source,
    wishlistItemId: params.wishlistItemId,
    nodeId: params.nodeId!,
  });
  if (params.pendingInstall) {
    q.set("pendingInstall", params.pendingInstall);
  }
  return `/vehicles/${vehicleId}/service-events/new?${q.toString()}`;
}

/** Prefer this over string hrefs in-app: avoids long Cyrillic query strings on Android. */
export function pushServiceEventNewFromWishlist(
  router: Pick<Router, "push">,
  vehicleId: string,
  item: PartWishlistItem,
  options?: { pendingInstall?: boolean }
): void {
  const params = buildServiceEventNewFromWishlistParams(item, options);
  if (!params) {
    router.push(`/vehicles/${vehicleId}/service-events/new`);
    return;
  }
  router.push({
    pathname: `/vehicles/${vehicleId}/service-events/new`,
    params,
  });
}

export function replaceServiceEventNewFromWishlist(
  router: Pick<Router, "replace">,
  vehicleId: string,
  item: PartWishlistItem,
  options?: { pendingInstall?: boolean }
): void {
  const params = buildServiceEventNewFromWishlistParams(item, options);
  if (!params) {
    router.replace(`/vehicles/${vehicleId}/service-events/new`);
    return;
  }
  router.replace({
    pathname: `/vehicles/${vehicleId}/service-events/new`,
    params,
  });
}

export function buildVehicleWishlistCommunityHref(
  vehicleId: string,
  options?: { nodeId?: string; partMasterId?: string }
): string {
  const q = new URLSearchParams();
  if (options?.nodeId?.trim()) {
    q.set("nodeId", options.nodeId.trim());
  }
  if (options?.partMasterId?.trim()) {
    q.set("partMasterId", options.partMasterId.trim());
  }
  const qs = q.toString();
  return `/vehicles/${vehicleId}/wishlist/community${qs ? `?${qs}` : ""}`;
}

export function buildVehicleWishlistFitmentReportHref(
  vehicleId: string,
  params: { nodeId: string; partMasterId: string }
): string {
  const q = new URLSearchParams({
    nodeId: params.nodeId.trim(),
    partMasterId: params.partMasterId.trim(),
  });
  return `/vehicles/${vehicleId}/wishlist/fitment-report?${q.toString()}`;
}
