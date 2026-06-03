import type { YandexMapPlace } from "./types";

export function orgLabelFromGeosuggestAddress(address: string): string {
  const head = address.split(" · ")[0]?.trim() || address;
  return head.split(",")[0]?.trim() || head;
}

export function withOrgLabel(place: YandexMapPlace): YandexMapPlace {
  return { ...place, label: place.label ?? orgLabelFromGeosuggestAddress(place.address) };
}

/** Исключаем остановки/метро — geosuggest иногда возвращает их вместо org при клике по карте. */
export function isSelectableOrganizationPlace(place: YandexMapPlace): boolean {
  const text = place.address.toLowerCase();
  if (/остановка|метро|подземный переход|остановочный пункт|перрон|платформа/i.test(text)) {
    return false;
  }
  return true;
}

export function filterOrganizationPlaces(places: YandexMapPlace[]): YandexMapPlace[] {
  return places.filter(isSelectableOrganizationPlace);
}

export function normalizeApiPlace(raw: YandexMapPlace): YandexMapPlace {
  return {
    address: raw.address,
    lat: raw.lat,
    lng: raw.lng,
    label: raw.label,
    providerPlaceId: raw.providerPlaceId ?? null,
  };
}
