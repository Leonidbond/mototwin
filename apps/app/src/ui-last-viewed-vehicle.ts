const LAST_VIEWED_VEHICLE_ID_STORAGE_KEY = "mototwin.lastViewedVehicleId";

export function readLastViewedVehicleId(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(LAST_VIEWED_VEHICLE_ID_STORAGE_KEY)?.trim();
    return raw ? raw : null;
  } catch {
    return null;
  }
}

export function writeLastViewedVehicleId(vehicleId: string | null | undefined): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  const normalized = vehicleId?.trim();
  if (!normalized) {
    return;
  }
  try {
    localStorage.setItem(LAST_VIEWED_VEHICLE_ID_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage write failures.
  }
}
