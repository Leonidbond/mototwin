import type { ServicePlaceSearchResultItem } from "@mototwin/types";

/** Geosuggest API allows at most 10 hints per request; matches Yandex docs. */
export const SERVICE_PLACE_SEARCH_MAX_RESULTS = 10;
import { yandexGeocodeForwardAll } from "@/lib/yandex-geocoder";
import {
  geosuggestErrorMessage,
  getYandexGeosuggestApiKey,
  YandexGeosuggestError,
  yandexGeosuggestOrganizations,
} from "@/lib/yandex-geosuggest";

export type SearchServicePlacesParams = {
  query: string;
  mode: "AUTO" | "ADDRESS" | "ORGANIZATION";
  referer?: string | null;
  centerLonLat?: [number, number];
};

export type SearchServicePlacesResult = {
  places: ServicePlaceSearchResultItem[];
  source: "geosuggest" | "geocoder" | "manual";
  warning?: string;
};

function dedupePlaces(items: ServicePlaceSearchResultItem[]): ServicePlaceSearchResultItem[] {
  const seen = new Set<string>();
  const result: ServicePlaceSearchResultItem[] = [];
  for (const place of items) {
    const key = `${place.title}|${place.address}|${place.latitude ?? ""}|${place.longitude ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(place);
  }
  return result;
}

export async function searchServicePlaces(params: SearchServicePlacesParams): Promise<SearchServicePlacesResult> {
  const query = params.query.trim();
  if (!query) {
    return { places: [], source: "manual" };
  }

  let warning: string | undefined;
  let places: ServicePlaceSearchResultItem[] = [];
  let source: SearchServicePlacesResult["source"] = "manual";

  const useOrganizations = params.mode === "ORGANIZATION" || params.mode === "AUTO";
  if (useOrganizations && getYandexGeosuggestApiKey()) {
    try {
      const suggested = await yandexGeosuggestOrganizations(query, {
        centerLonLat: params.centerLonLat,
        referer: params.referer ?? undefined,
      });
      places = suggested.map((item) => ({
        provider: "YANDEX",
        providerPlaceId: item.providerPlaceId ?? null,
        type: "ORGANIZATION" as const,
        title: item.label?.trim() || item.address,
        address: item.address,
        latitude: item.lat,
        longitude: item.lng,
        category: null,
        contact: null,
        metadata: null,
      }));
      if (places.length > 0) {
        source = "geosuggest";
      }
    } catch (error) {
      if (error instanceof YandexGeosuggestError) {
        warning = geosuggestErrorMessage(error.status);
      }
    }
  }

  if (places.length === 0 && params.mode !== "ORGANIZATION") {
    const geocoded = await yandexGeocodeForwardAll(query);
    places = geocoded.map((item) => ({
      provider: "YANDEX",
      providerPlaceId: null,
      type: "ADDRESS",
      title: item.address,
      address: item.address,
      latitude: item.lat,
      longitude: item.lng,
      category: null,
      contact: null,
      metadata: null,
    }));
    if (places.length > 0) {
      source = "geocoder";
    }
  }

  return {
    places: dedupePlaces(places).slice(0, SERVICE_PLACE_SEARCH_MAX_RESULTS),
    source,
    warning,
  };
}
