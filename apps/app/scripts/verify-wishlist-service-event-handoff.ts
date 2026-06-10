/**
 * Quick sanity check for wishlist → service event in-memory handoff.
 * Run: npx tsx apps/app/scripts/verify-wishlist-service-event-handoff.ts
 */
import {
  clearPendingWishlistServiceEvent,
  peekPendingWishlistServiceEvent,
  setPendingWishlistServiceEvent,
} from "../src/pending-wishlist-service-event";
import type { PartWishlistItem } from "@mototwin/types";

const vehicleId = "veh-test-1";
const item: PartWishlistItem = {
  id: "wl-42",
  vehicleId,
  nodeId: "node-oil-filter",
  skuId: null,
  title: "Масляный фильтр",
  quantity: 1,
  status: "BOUGHT",
  comment: null,
  costAmount: 890,
  currency: "RUB",
  createdAt: "",
  updatedAt: "",
  node: { id: "node-oil-filter", name: "Масляный фильтр" },
  sku: null,
};

setPendingWishlistServiceEvent({ vehicleId, item, pendingInstall: true });
const peek1 = peekPendingWishlistServiceEvent(vehicleId);
if (!peek1 || peek1.item.id !== "wl-42") {
  throw new Error("peek after set failed");
}

clearPendingWishlistServiceEvent(vehicleId);
const peek2 = peekPendingWishlistServiceEvent(vehicleId);
if (peek2 != null) {
  throw new Error("clear did not remove handoff");
}

// Wrong vehicle must not read handoff
setPendingWishlistServiceEvent({ vehicleId, item, pendingInstall: true });
if (peekPendingWishlistServiceEvent("other-vehicle") != null) {
  throw new Error("handoff leaked across vehicles");
}

console.log("OK: wishlist service-event handoff module");
