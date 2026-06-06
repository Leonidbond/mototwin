/** Build `/vehicles/:id/state` with seed form values (skip API round-trip when opening from vehicle detail). */
export function buildVehicleStateRoute(
  vehicleId: string,
  seed: { odometer: number; engineHours: number | null }
): string {
  const q = new URLSearchParams({ odometer: String(seed.odometer) });
  if (seed.engineHours != null) {
    q.set("engineHours", String(seed.engineHours));
  }
  return `/vehicles/${vehicleId}/state?${q.toString()}`;
}

export function parseVehicleStateRouteSeed(params: {
  odometer?: string | string[];
  engineHours?: string | string[];
}): { odometer: string; engineHours: string } | null {
  const rawOdometer = Array.isArray(params.odometer) ? params.odometer[0] : params.odometer;
  if (typeof rawOdometer !== "string" || rawOdometer.trim() === "") {
    return null;
  }
  const rawHours = Array.isArray(params.engineHours) ? params.engineHours[0] : params.engineHours;
  return {
    odometer: rawOdometer.trim(),
    engineHours: typeof rawHours === "string" ? rawHours.trim() : "",
  };
}
