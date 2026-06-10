import type { Router } from "expo-router";
import type { PartWishlistItem } from "@mototwin/types";
import { setPendingWishlistServiceEvent } from "../../src/pending-wishlist-service-event";
import { logServiceEventFormDiag } from "../../src/service-event-form-diag";

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

export function resolveWishlistItemNodeId(
  item: Pick<PartWishlistItem, "nodeId" | "node">
): string {
  return (item.nodeId ?? item.node?.id ?? "").trim();
}

export function enrichWishlistItemForServiceEventHandoff(
  item: PartWishlistItem
): PartWishlistItem {
  const nodeId = resolveWishlistItemNodeId(item);
  return nodeId ? { ...item, nodeId } : item;
}

export type ServiceEventNewFromWishlistRouteParams = {
  source: "wishlist";
  wishlistItemId: string;
  nodeId: string;
  pendingInstall?: "1";
  wlTitle?: string;
  wlQty?: string;
  wlComment?: string;
  wlCost?: string;
  wlCurrency?: string;
};

/** Route params for wishlist prefill (+ query fallback when in-memory handoff is lost). */
export function buildServiceEventNewFromWishlistParams(
  item: PartWishlistItem,
  options?: { pendingInstall?: boolean }
): ServiceEventNewFromWishlistRouteParams | null {
  const enriched = enrichWishlistItemForServiceEventHandoff(item);
  const nodeId = resolveWishlistItemNodeId(enriched);
  if (!nodeId) {
    return null;
  }
  const params: ServiceEventNewFromWishlistRouteParams = {
    source: "wishlist",
    wishlistItemId: enriched.id,
    nodeId,
  };
  if (options?.pendingInstall) {
    params.pendingInstall = "1";
  }
  const title = enriched.title?.trim();
  if (title) {
    params.wlTitle = title;
  }
  if (enriched.quantity != null && Number.isFinite(enriched.quantity)) {
    params.wlQty = String(enriched.quantity);
  }
  if (enriched.comment?.trim()) {
    params.wlComment = enriched.comment.trim();
  }
  if (
    enriched.costAmount != null &&
    Number.isFinite(enriched.costAmount) &&
    enriched.costAmount > 0
  ) {
    params.wlCost = String(enriched.costAmount);
    if (enriched.currency?.trim()) {
      params.wlCurrency = enriched.currency.trim();
    }
  }
  return params;
}

function appendWishlistPrefillQuery(
  q: URLSearchParams,
  params: ServiceEventNewFromWishlistRouteParams
): void {
  q.set("source", params.source);
  q.set("wishlistItemId", params.wishlistItemId);
  q.set("nodeId", params.nodeId);
  if (params.pendingInstall) {
    q.set("pendingInstall", params.pendingInstall);
  }
  if (params.wlTitle) {
    q.set("wlTitle", params.wlTitle);
  }
  if (params.wlQty) {
    q.set("wlQty", params.wlQty);
  }
  if (params.wlComment) {
    q.set("wlComment", params.wlComment);
  }
  if (params.wlCost) {
    q.set("wlCost", params.wlCost);
  }
  if (params.wlCurrency) {
    q.set("wlCurrency", params.wlCurrency);
  }
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
  const q = new URLSearchParams();
  appendWishlistPrefillQuery(q, params);
  return `/vehicles/${vehicleId}/service-events/new?${q.toString()}`;
}

function handoffWishlistItemToServiceEventForm(
  vehicleId: string,
  item: PartWishlistItem,
  options?: { pendingInstall?: boolean }
): string {
  const enriched = enrichWishlistItemForServiceEventHandoff(item);
  const nodeId = resolveWishlistItemNodeId(enriched);
  setPendingWishlistServiceEvent({
    vehicleId,
    item: enriched,
    pendingInstall: Boolean(options?.pendingInstall),
  });
  const href = buildServiceEventNewFromWishlistHref(vehicleId, enriched, options);
  logServiceEventFormDiag("wishlist handoff set", {
    vehicleId,
    itemId: item.id,
    nodeId: nodeId || null,
    pendingInstall: Boolean(options?.pendingInstall),
    href,
  });
  return href;
}

/** In-app navigation: in-memory handoff + short href (Android-safe). */
export function pushServiceEventNewFromWishlist(
  router: Pick<Router, "push">,
  vehicleId: string,
  item: PartWishlistItem,
  options?: { pendingInstall?: boolean }
): void {
  router.push(handoffWishlistItemToServiceEventForm(vehicleId, item, options));
}

export function replaceServiceEventNewFromWishlist(
  router: Pick<Router, "replace">,
  vehicleId: string,
  item: PartWishlistItem,
  options?: { pendingInstall?: boolean }
): void {
  router.replace(handoffWishlistItemToServiceEventForm(vehicleId, item, options));
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
