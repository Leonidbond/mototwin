/** Публичный ключ JS API Яндекс.Карт (клиент). */
export function getYandexMapsApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim();
  return key ? key : null;
}

export function isYandexMapsConfigured(): boolean {
  return getYandexMapsApiKey() != null;
}
