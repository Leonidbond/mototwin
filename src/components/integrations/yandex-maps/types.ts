/** Выбранная точка на карте (Яндекс.Карты). */
export type YandexMapPlace = {
  address: string;
  lat: number;
  lng: number;
  label?: string;
  providerPlaceId?: string | null;
};

export type YandexMapsApiStatus = "idle" | "loading" | "ready" | "error";
