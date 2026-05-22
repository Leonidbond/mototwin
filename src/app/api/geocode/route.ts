import { NextResponse } from "next/server";
import {
  formatCoordsFallback,
  getYandexGeocoderApiKey,
  yandexGeocodeForward,
  yandexGeocodeForwardAll,
  yandexGeocodeReverse,
} from "@/lib/yandex-geocoder";

export async function GET(request: Request) {
  if (!getYandexGeocoderApiKey()) {
    return NextResponse.json(
      { error: "Не задан YANDEX_GEOCODER_API_KEY в .env" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");

  try {
    if (query) {
      const list = searchParams.get("list") === "1";
      if (list) {
        const places = await yandexGeocodeForwardAll(query);
        return NextResponse.json({ places });
      }
      const place = await yandexGeocodeForward(query);
      if (!place) {
        return NextResponse.json({ error: "Адрес не найден" }, { status: 404 });
      }
      return NextResponse.json({ place });
    }

    if (latRaw != null && lngRaw != null) {
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return NextResponse.json({ error: "Некорректные координаты" }, { status: 400 });
      }

      try {
        const place = await yandexGeocodeReverse(lat, lng);
        if (!place) {
          return NextResponse.json({
            place: { address: formatCoordsFallback(lat, lng), lat, lng },
          });
        }
        return NextResponse.json({ place });
      } catch (reverseError) {
        console.error("Yandex reverse geocode failed:", reverseError);
        return NextResponse.json({
          place: { address: formatCoordsFallback(lat, lng), lat, lng },
          warning:
            reverseError instanceof Error
              ? reverseError.message
              : "Геокодер недоступен — возвращены координаты",
        });
      }
    }

    return NextResponse.json(
      { error: "Укажите query или lat и lng" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Yandex geocode failed:", error);
    const message = error instanceof Error ? error.message : "Ошибка геокодера";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
