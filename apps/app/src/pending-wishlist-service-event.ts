import type { PartWishlistItem } from "@mototwin/types";

export type PendingWishlistServiceEvent = {
  vehicleId: string;
  item: PartWishlistItem;
  pendingInstall: boolean;
};

let pending: PendingWishlistServiceEvent | null = null;

export function setPendingWishlistServiceEvent(entry: PendingWishlistServiceEvent): void {
  pending = {
    vehicleId: entry.vehicleId.trim(),
    item: entry.item,
    pendingInstall: entry.pendingInstall,
  };
}

export function peekPendingWishlistServiceEvent(vehicleId: string): PendingWishlistServiceEvent | null {
  const id = vehicleId.trim();
  if (!id || !pending || pending.vehicleId !== id) {
    return null;
  }
  return pending;
}

/** Returns and clears the in-memory wishlist handoff for this vehicle (survives Android param loss). */
export function consumePendingWishlistServiceEvent(vehicleId: string): PendingWishlistServiceEvent | null {
  const entry = peekPendingWishlistServiceEvent(vehicleId);
  if (entry) {
    pending = null;
  }
  return entry;
}

export function clearPendingWishlistServiceEvent(vehicleId: string): void {
  if (peekPendingWishlistServiceEvent(vehicleId)) {
    pending = null;
  }
}
