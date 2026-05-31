import { getYandexSuggestApiKey } from "./config";
import type { YandexMapPlace } from "./types";

type SuggestJson = {
  results?: Array<{
    title?: { text?: string };
    subtitle?: { text?: string };
    uri?: string;
  }>;
};

/** Поиск организаций из браузера (Referer = URL страницы, как требует Яндекс). */
export async function searchOrganizationsViaSuggestClient(
  query: string
): Promise<{ places: YandexMapPlace[]; error?: string }> {
  const apiKey = getYandexSuggestApiKey();
  if (!apiKey) return { places: [] };

  const q = query.trim();
  if (!q) return { places: [] };

  const params = new URLSearchParams({
    apikey: apiKey,
    text: q,
    types: "biz",
    lang: "ru",
    results: "10",
    print_address: "1",
    attrs: "uri",
  });

  let res: Response;
  try {
    res = await fetch(`https://suggest-maps.yandex.ru/v1/suggest?${params.toString()}`, {
      cache: "no-store",
    });
  } catch {
    return { places: [], error: "Не удалось связаться с Геосаджестом" };
  }

  if (!res.ok) {
    return {
      places: [],
      error:
        res.status === 403
          ? "Геосаджест отклонил ключ (403). В кабинете Яндекса для этого ключа укажите Referrer: localhost и ваш dev-хост, или снимите ограничение; подождите до 15 мин после создания ключа."
          : `Геосаджест: HTTP ${res.status}`,
    };
  }

  const data = (await res.json()) as SuggestJson;
  const places: YandexMapPlace[] = [];

  for (const item of data.results ?? []) {
    const title = item.title?.text?.trim();
    const subtitle = item.subtitle?.text?.trim();
    const address =
      title && subtitle ? `${title}, ${subtitle}` : title || subtitle;
    if (!item.uri || !address) continue;

    try {
      const geoRes = await fetch(`/api/geocode?${new URLSearchParams({ uri: item.uri })}`, {
        cache: "no-store",
      });
      const geoData = (await geoRes.json()) as { place?: YandexMapPlace; error?: string };
      if (!geoRes.ok || !geoData.place) continue;
      places.push({ address: address || geoData.place.address, lat: geoData.place.lat, lng: geoData.place.lng });
    } catch {
      continue;
    }
  }

  return { places };
}
