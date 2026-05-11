/**
 * Подмена id мотоцикла в пути `/vehicles/:id/...` (как web `handleSelectVehicle` в сайдбаре).
 * Возвращает null, если pathname не подходит.
 */
export function replaceVehicleIdInPath(pathname: string, newVehicleId: string): string | null {
  const trimmed = pathname.trim().split("?")[0] ?? pathname;
  if (!/^\/vehicles\/[^/]+/.test(trimmed)) {
    return null;
  }
  return trimmed.replace(/^\/vehicles\/[^/]+/, `/vehicles/${encodeURIComponent(newVehicleId)}`);
}
