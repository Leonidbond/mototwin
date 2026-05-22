const GEOCODE_BASE = "https://geocode-maps.yandex.ru/v1";

export type YandexGeocodedPlace = {
  address: string;
  lat: number;
  lng: number;
};

type YandexGeocodeJson = {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{
        GeoObject?: {
          name?: string;
          description?: string;
          metaDataProperty?: {
            GeocoderMetaData?: {
              text?: string;
              Address?: { formatted?: string };
            };
          };
          Point?: { pos?: string };
        };
      }>;
    };
  };
  message?: string;
  statusCode?: number;
};

export function getYandexGeocoderApiKey(): string | null {
  const key = process.env.YANDEX_GEOCODER_API_KEY?.trim();
  return key ? key : null;
}

function parsePos(pos: string): { lat: number; lng: number } | null {
  const parts = pos.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const lng = Number(parts[0]);
  const lat = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function pickFirstGeoObject(data: YandexGeocodeJson) {
  return data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject ?? null;
}

function geoObjectToPlace(geo: NonNullable<ReturnType<typeof pickFirstGeoObject>>): YandexGeocodedPlace | null {
  const meta = geo.metaDataProperty?.GeocoderMetaData;
  const name = geo.name?.trim();
  const description = geo.description?.trim();
  const addressLine = meta?.text?.trim() || meta?.Address?.formatted?.trim();
  const address =
    (name && description ? `${name}, ${description}` : null) ||
    name ||
    description ||
    addressLine;
  const pos = geo.Point?.pos;
  if (!address || !pos) return null;
  const coords = parsePos(pos);
  if (!coords) return null;
  return { address, lat: coords.lat, lng: coords.lng };
}

async function fetchGeocode(params: URLSearchParams): Promise<YandexGeocodedPlace | null> {
  const apiKey = getYandexGeocoderApiKey();
  if (!apiKey) return null;

  params.set("apikey", apiKey);
  params.set("lang", "ru_RU");
  params.set("format", "json");
  params.set("results", params.get("results") ?? "10");

  const url = `${GEOCODE_BASE}/?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as YandexGeocodeJson;

  if (!res.ok) {
    const msg = data.message ?? res.statusText;
    throw new Error(msg || `Геокодер: HTTP ${res.status}`);
  }

  const geo = pickFirstGeoObject(data);
  return geo ? geoObjectToPlace(geo) : null;
}

export async function yandexGeocodeForward(query: string): Promise<YandexGeocodedPlace | null> {
  const places = await yandexGeocodeForwardAll(query);
  return places[0] ?? null;
}

export async function yandexGeocodeForwardAll(query: string): Promise<YandexGeocodedPlace[]> {
  const q = query.trim();
  if (!q) return [];

  const apiKey = getYandexGeocoderApiKey();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    apikey: apiKey,
    geocode: q,
    lang: "ru_RU",
    format: "json",
    results: "10",
  });
  const url = `${GEOCODE_BASE}/?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as YandexGeocodeJson;

  if (!res.ok) {
    const msg = data.message ?? res.statusText;
    throw new Error(msg || `Геокодер: HTTP ${res.status}`);
  }

  const members = data.response?.GeoObjectCollection?.featureMember ?? [];
  const places: YandexGeocodedPlace[] = [];
  for (const member of members) {
    const geo = member.GeoObject;
    if (!geo) continue;
    const place = geoObjectToPlace(geo);
    if (place) places.push(place);
  }
  return places;
}

export async function yandexGeocodeReverse(lat: number, lng: number): Promise<YandexGeocodedPlace | null> {
  const params = new URLSearchParams({
    geocode: `${lat},${lng}`,
    sco: "latlong",
  });
  return fetchGeocode(params);
}

export function formatCoordsFallback(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
