/** Поля места установки / адреса сервиса в сервисном событии. */
export type ServiceInstallLocationFields = {
  installLocationAddress?: string | null;
  installLocationLat?: number | null;
  installLocationLng?: number | null;
};

export function getServiceInstallLocationAddress(
  fields: ServiceInstallLocationFields | null | undefined
): string | null {
  const address = fields?.installLocationAddress?.trim();
  return address || null;
}

export function canOpenServiceInstallLocationOnMap(
  fields: ServiceInstallLocationFields | null | undefined
): boolean {
  const address = getServiceInstallLocationAddress(fields);
  const lat = fields?.installLocationLat;
  const lng = fields?.installLocationLng;
  return Boolean(
    address ||
      (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng))
  );
}

/** Ссылка для открытия адреса или координат в Яндекс.Картах (внешнее приложение / браузер). */
export function buildYandexMapsUrlForInstallLocation(
  fields: ServiceInstallLocationFields | null | undefined
): string | null {
  const lat = fields?.installLocationLat;
  const lng = fields?.installLocationLng;
  const hasCoords =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  if (hasCoords) {
    const ll = `${lng},${lat}`;
    const params = new URLSearchParams({ ll, z: "16", pt: `${lng},${lat}` });
    return `https://yandex.ru/maps/?${params.toString()}`;
  }

  const address = getServiceInstallLocationAddress(fields);
  if (address) {
    return `https://yandex.ru/maps/?${new URLSearchParams({ text: address }).toString()}`;
  }

  return null;
}
