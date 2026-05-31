/** Поля места установки / адреса сервиса в сервисном событии. */
export type ServiceInstallLocationFields = {
  installLocationAddress?: string | null;
  installLocationLat?: number | null;
  installLocationLng?: number | null;
  servicePlace?: {
    title?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  servicePlaceSnapshot?: {
    title?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};

function resolvePlaceAddress(fields: ServiceInstallLocationFields | null | undefined): string | null {
  const snapshotAddress = fields?.servicePlaceSnapshot?.address?.trim();
  if (snapshotAddress) return snapshotAddress;
  const relationAddress = fields?.servicePlace?.address?.trim();
  if (relationAddress) return relationAddress;
  const relationTitle = fields?.servicePlace?.title?.trim();
  if (relationTitle) return relationTitle;
  const legacy = fields?.installLocationAddress?.trim();
  return legacy || null;
}

function resolvePlaceCoords(
  fields: ServiceInstallLocationFields | null | undefined
): { lat: number; lng: number } | null {
  const snapshotLat = fields?.servicePlaceSnapshot?.latitude;
  const snapshotLng = fields?.servicePlaceSnapshot?.longitude;
  if (snapshotLat != null && snapshotLng != null && Number.isFinite(snapshotLat) && Number.isFinite(snapshotLng)) {
    return { lat: snapshotLat, lng: snapshotLng };
  }
  const relationLat = fields?.servicePlace?.latitude;
  const relationLng = fields?.servicePlace?.longitude;
  if (relationLat != null && relationLng != null && Number.isFinite(relationLat) && Number.isFinite(relationLng)) {
    return { lat: relationLat, lng: relationLng };
  }
  const legacyLat = fields?.installLocationLat;
  const legacyLng = fields?.installLocationLng;
  if (legacyLat != null && legacyLng != null && Number.isFinite(legacyLat) && Number.isFinite(legacyLng)) {
    return { lat: legacyLat, lng: legacyLng };
  }
  return null;
}

export function getServiceInstallLocationAddress(
  fields: ServiceInstallLocationFields | null | undefined
): string | null {
  return resolvePlaceAddress(fields);
}

export function canOpenServiceInstallLocationOnMap(
  fields: ServiceInstallLocationFields | null | undefined
): boolean {
  const address = resolvePlaceAddress(fields);
  const coords = resolvePlaceCoords(fields);
  return Boolean(address || coords);
}

/** Ссылка для открытия адреса или координат в Яндекс.Картах (внешнее приложение / браузер). */
export function buildYandexMapsUrlForInstallLocation(
  fields: ServiceInstallLocationFields | null | undefined
): string | null {
  const coords = resolvePlaceCoords(fields);
  if (coords) {
    const ll = `${coords.lng},${coords.lat}`;
    const params = new URLSearchParams({ ll, z: "16", pt: `${coords.lng},${coords.lat}` });
    return `https://yandex.ru/maps/?${params.toString()}`;
  }

  const address = resolvePlaceAddress(fields);
  if (address) {
    return `https://yandex.ru/maps/?${new URLSearchParams({ text: address }).toString()}`;
  }

  return null;
}
