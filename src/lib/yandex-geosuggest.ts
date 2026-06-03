import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import type { YandexGeocodedPlace } from "@/lib/yandex-geocoder";
import { yandexGeocodeForward, yandexGeocodeReverse } from "@/lib/yandex-geocoder";

const SUGGEST_BASE = "https://suggest-maps.yandex.ru/v1/suggest";
const SUGGEST_TIMEOUT_MS = 6_000;

type GeosuggestJson = {
  results?: Array<{
    title?: { text?: string };
    subtitle?: { text?: string };
    uri?: string;
  }>;
  message?: string;
};

export class YandexGeosuggestError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message?.trim() || `Geosuggest: HTTP ${status}`);
    this.name = "YandexGeosuggestError";
    this.status = status;
  }
}

export function geosuggestErrorMessage(status: number): string {
  if (status === 403) {
    return (
      "Ключ YANDEX_GEOSUGGEST_API_KEY не принят Яндексом (403). " +
      "В кабинете developer.tech.yandex.ru создайте отдельный ключ продукта «Геосаджест», не копируйте ключ карты или геокодера."
    );
  }
  if (status === 401) {
    return "Ключ Геосаджест не прошёл авторизацию (401). Проверьте значение YANDEX_GEOSUGGEST_API_KEY в .env.";
  }
  return `Геосаджест недоступен (HTTP ${status}). Проверьте ключ и лимиты в кабинете Яндекса.`;
}

/** Адрес из subtitle Geosuggest: «категория · город, улица». */
export function geocodeQueryFromSuggestResult(title?: string, subtitle?: string): string {
  const sub = subtitle?.trim() ?? "";
  if (sub.includes(" · ")) {
    const addressPart = sub.split(" · ").pop()?.trim();
    if (addressPart) return addressPart;
  }
  const name = title?.trim();
  if (name && sub) return `${name}, ${sub}`;
  return sub || name || "";
}

function suggestBiasLonLat(query: string): [number, number] | undefined {
  const q = query.toLowerCase();
  if (q.includes("москва") || q.includes("moscow")) return [37.617644, 55.755819];
  if (q.includes("петербург") || q.includes("спб") || q.includes("saint-petersburg")) {
    return [30.31413, 59.93863];
  }
  return undefined;
}

export function getYandexGeosuggestApiKey(): string | null {
  const serverKey = process.env.YANDEX_GEOSUGGEST_API_KEY?.trim();
  if (serverKey) return serverKey;
  const publicKey = process.env.NEXT_PUBLIC_YANDEX_SUGGEST_API_KEY?.trim();
  return publicKey ? publicKey : null;
}

/**
 * Поиск организаций через Geosuggest API (types=biz).
 * Требует отдельный ключ «Геосаджест» в кабинете Яндекса.
 */
export async function yandexGeosuggestOrganizations(
  query: string,
  options?: { results?: number; centerLonLat?: [number, number]; referer?: string }
): Promise<YandexGeocodedPlace[]> {
  const apiKey = getYandexGeosuggestApiKey();
  if (!apiKey) return [];

  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    apikey: apiKey,
    text: q,
    types: "biz",
    lang: "ru",
    results: String(options?.results ?? 10),
    print_address: "1",
    attrs: "uri",
  });
  const bias = options?.centerLonLat ?? suggestBiasLonLat(q);
  if (bias) {
    const [lon, lat] = bias;
    params.set("ll", `${lon},${lat}`);
  }

  const url = `${SUGGEST_BASE}?${params.toString()}`;
  const referer =
    options?.referer?.trim() ||
    process.env.YANDEX_GEOSUGGEST_REFERER?.trim() ||
    "";
  const headers: HeadersInit = referer ? { Referer: referer } : {};
  const res = await fetchWithTimeout(url, { cache: "no-store", timeoutMs: SUGGEST_TIMEOUT_MS, headers });
  const rawBody = await res.text();

  if (!res.ok) {
    let message = res.statusText;
    if (rawBody.trim()) {
      try {
        const errJson = JSON.parse(rawBody) as GeosuggestJson;
        if (errJson.message) message = errJson.message;
      } catch {
        /* ignore non-JSON error body */
      }
    }
    throw new YandexGeosuggestError(res.status, message);
  }

  const data = (rawBody.trim() ? JSON.parse(rawBody) : {}) as GeosuggestJson;
  return resolveGeosuggestItems(data.results ?? []);
}

async function resolveGeosuggestItems(
  items: NonNullable<GeosuggestJson["results"]>
): Promise<YandexGeocodedPlace[]> {
  const places: YandexGeocodedPlace[] = [];
  for (const item of items) {
    const title = item.title?.text?.trim();
    const subtitle = item.subtitle?.text?.trim();
    const address =
      title && subtitle ? `${title}, ${subtitle}` : title || subtitle;
    if (!address) continue;

    // Не используем ymapsbm1://org?oid=… в HTTP-геокодере: «org» матчится на Орг (Франция).
    const geoQuery = geocodeQueryFromSuggestResult(title, item.subtitle?.text);
    if (geoQuery) {
      const resolved = await yandexGeocodeForward(geoQuery);
      if (resolved) {
        const uri = item.uri?.trim();
        places.push({
          address,
          lat: resolved.lat,
          lng: resolved.lng,
          label: title || undefined,
          providerPlaceId: uri || null,
        });
      }
    }
  }
  return places;
}

function geosuggestAddressFromReverse(reverseAddress: string): string {
  const parts = reverseAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return reverseAddress.trim();

  let trimmed = [...parts];
  while (trimmed.length > 0 && /^(россия|russia)$/i.test(trimmed[trimmed.length - 1]!)) {
    trimmed.pop();
  }
  // Geosuggest types=biz не возвращает orgs, если в query есть город.
  if (trimmed.length >= 3) {
    return trimmed.slice(0, 2).join(", ");
  }
  return trimmed.join(", ");
}

/** Организации в здании по координатам клика: reverse geocode → geosuggest по адресу. */
export async function yandexGeosuggestOrganizationsAtClick(
  lat: number,
  lng: number,
  options?: { referer?: string }
): Promise<YandexGeocodedPlace[]> {
  const centerLonLat: [number, number] = [lng, lat];
  const reversed = await yandexGeocodeReverse(lat, lng);
  const addressQuery = reversed?.address?.trim();
  if (!addressQuery) return [];

  const suggestOpts = { centerLonLat, referer: options?.referer };
  const buildingQuery = geosuggestAddressFromReverse(addressQuery);
  let places = await yandexGeosuggestOrganizations(buildingQuery, suggestOpts);
  let maxDistanceM = 150;

  if (places.length === 0 && buildingQuery !== addressQuery) {
    places = await yandexGeosuggestOrganizations(addressQuery, suggestOpts);
  }

  if (places.length === 0) {
    const streetOnly = buildingQuery.split(",")[0]?.trim();
    if (streetOnly && streetOnly !== buildingQuery) {
      places = await yandexGeosuggestOrganizations(streetOnly, suggestOpts);
      maxDistanceM = 250;
    }
  }
  return places
    .map((place) => ({
      place,
      distance: distanceMeters(place.lat, place.lng, lat, lng),
    }))
    .filter(({ distance }) => distance <= maxDistanceM)
    .sort((a, b) => a.distance - b.distance)
    .map(({ place }) => place);
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** @deprecated используйте yandexGeosuggestOrganizationsAtClick */
export async function yandexGeosuggestOrganizationsNearPoint(
  centerLonLat: [number, number],
  _queryHint: string,
  options?: { referer?: string }
): Promise<YandexGeocodedPlace[]> {
  const [lng, lat] = centerLonLat;
  return yandexGeosuggestOrganizationsAtClick(lat, lng, options);
}
