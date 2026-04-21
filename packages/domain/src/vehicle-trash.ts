import type {
  GarageVehicleItem,
  TrashedVehicleViewModel,
  VehicleTrashInfo,
  VehicleTrashRetentionDays,
} from "@mototwin/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateTrashExpiresAt(
  trashedAt: Date,
  retentionDays: VehicleTrashRetentionDays
): Date {
  return new Date(trashedAt.getTime() + retentionDays * DAY_MS);
}

export function getTrashDaysRemaining(trashExpiresAt: Date, now = new Date()): number | null {
  const diffMs = trashExpiresAt.getTime() - now.getTime();
  if (diffMs < 0) {
    return null;
  }
  return Math.ceil(diffMs / DAY_MS);
}

export function formatTrashRetentionLabel(days: VehicleTrashRetentionDays): string {
  return `${days} дней`;
}

export function isVehicleTrashed(vehicle: {
  trashedAt?: string | Date | null;
  trashExpiresAt?: string | Date | null;
}): boolean {
  return Boolean(vehicle.trashedAt && vehicle.trashExpiresAt);
}

export function buildTrashedVehicleViewModel(
  vehicle: GarageVehicleItem & VehicleTrashInfo,
  now = new Date()
): TrashedVehicleViewModel {
  const title = vehicle.nickname?.trim() || `${vehicle.brand.name} ${vehicle.model.name}`;
  const year = vehicle.modelVariant?.year ?? "—";
  const variant = vehicle.modelVariant?.versionName ?? "Модификация не указана";
  const trashedAtDate = new Date(vehicle.trashedAt);
  const expiresAtDate = new Date(vehicle.trashExpiresAt);
  const daysRemaining = getTrashDaysRemaining(expiresAtDate, now);
  return {
    id: vehicle.id,
    title,
    subtitle: `${vehicle.brand.name} · ${vehicle.model.name} · ${year} · ${variant}`,
    trashedAtLabel: trashedAtDate.toLocaleDateString("ru-RU"),
    expiresAtLabel: expiresAtDate.toLocaleDateString("ru-RU"),
    daysRemaining,
    isExpired: daysRemaining == null,
  };
}
