/** Выбранная точка на карте (Яндекс.Карты). */
export type YandexMapPlace = {
  address: string;
  lat: number;
  lng: number;
};

export type YandexMapsApiStatus = "idle" | "loading" | "ready" | "error";
