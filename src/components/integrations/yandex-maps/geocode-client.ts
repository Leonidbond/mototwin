import type { YandexMapPlace } from "./types";

type GeocodeApiResponse = {
  place?: YandexMapPlace;
  error?: string;
  warning?: string;
};

export type GeocodeResult = {
  place: YandexMapPlace;
  warning?: string;
};

async function fetchGeocode(path: string): Promise<GeocodeResult> {
  const res = await fetch(path, { cache: "no-store" });
  const data = (await res.json()) as GeocodeApiResponse;
  if (!res.ok || !data.place) {
    throw new Error(data.error ?? "Не удалось выполнить геокодирование");
  }
  return { place: data.place, warning: data.warning };
}

export function geocodeAddressQuery(query: string): Promise<GeocodeResult> {
  const params = new URLSearchParams({ query });
  return fetchGeocode(`/api/geocode?${params.toString()}`);
}

export function geocodeCoordinates(lat: number, lng: number): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  return fetchGeocode(`/api/geocode?${params.toString()}`);
}

export type PlaceSearchResult = {
  places: YandexMapPlace[];
  warning?: string;
  source?: string;
};

export async function searchPlacesViaApi(query: string): Promise<PlaceSearchResult> {
  const params = new URLSearchParams({ query, list: "1", biz: "1" });
  const res = await fetch(`/api/geocode?${params.toString()}`, { cache: "no-store" });
  const data = (await res.json()) as {
    places?: YandexMapPlace[];
    error?: string;
    warning?: string;
    meta?: { source?: string; geosuggestStatus?: number | null };
  };
  if (!res.ok) {
    throw new Error(data.error ?? "Не удалось выполнить поиск");
  }
  return {
    places: data.places ?? [],
    warning: data.warning,
    source: data.meta?.source,
  };
}
