import { NextResponse } from "next/server";
import {
  formatCoordsFallback,
  getYandexGeocoderApiKey,
  yandexGeocodeByUri,
  yandexGeocodeForward,
  yandexGeocodeForwardAll,
  yandexGeocodeReverse,
} from "@/lib/yandex-geocoder";
import {
  geosuggestErrorMessage,
  getYandexGeosuggestApiKey,
  YandexGeosuggestError,
  yandexGeosuggestOrganizations,
} from "@/lib/yandex-geosuggest";
import {
  getCurrentUserContext,
  toCurrentUserContextErrorResponse,
} from "@/app/api/_shared/current-user-context";
import { rateLimit, rateLimit429 } from "@/lib/http/rate-limit";
import { parseSearchParamText } from "@/lib/http/input-validation";

const GEOCODE_QUERY_MAX = 256;

export async function GET(request: Request) {
  if (!getYandexGeocoderApiKey()) {
    return NextResponse.json(
      { error: "Не задан YANDEX_GEOCODER_API_KEY в .env" },
      { status: 503 }
    );
  }

  let userId: string;
  try {
    // MT-SEC-074: was unauthenticated → arbitrary callers could exhaust the
    // paid Yandex Geocoder budget. Require auth + per-user rate limit.
    const userCtx = await getCurrentUserContext();
    userId = userCtx.userId;
  } catch (error) {
    const ctxErr = toCurrentUserContextErrorResponse(error);
    if (ctxErr) return ctxErr;
    throw error;
  }

  const decision = rateLimit({
    bucket: "geocode",
    request,
    limit: 60,
    windowMs: 60_000,
    extraKey: userId,
  });
  if (!decision.allowed) {
    return rateLimit429(decision);
  }

  const { searchParams } = new URL(request.url);
  // MT-SEC-072: cap query length (Yandex limit + DoS protection).
  const query = parseSearchParamText(searchParams.get("query"), { max: GEOCODE_QUERY_MAX });
  const uri = parseSearchParamText(searchParams.get("uri"), { max: 2048 });
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");

  try {
    if (uri) {
      const place = await yandexGeocodeByUri(uri);
      if (!place) {
        return NextResponse.json({ error: "Объект не найден по uri" }, { status: 404 });
      }
      return NextResponse.json({ place });
    }

    if (query) {
      const list = searchParams.get("list") === "1";
      if (list) {
        const preferBiz = searchParams.get("biz") === "1";
        let places: Awaited<ReturnType<typeof yandexGeocodeForwardAll>> = [];
        let source: "geosuggest" | "geocoder" | "none" = "none";
        let geosuggestStatus: number | null = null;
        let warning: string | undefined;

        if (preferBiz && getYandexGeosuggestApiKey()) {
          try {
            const pageReferer =
              request.headers.get("referer")?.trim() ||
              (() => {
                const origin = request.headers.get("origin")?.trim();
                return origin ? `${origin}/` : "";
              })() ||
              undefined;
            places = await yandexGeosuggestOrganizations(query, { referer: pageReferer });
            if (places.length > 0) source = "geosuggest";
          } catch (suggestError) {
            const status =
              suggestError instanceof YandexGeosuggestError
                ? suggestError.status
                : null;
            if (status != null) {
              geosuggestStatus = status;
              warning = geosuggestErrorMessage(status);
            }
            console.error("Yandex geosuggest failed:", suggestError);
          }
        }

        const geosuggestRejected = preferBiz && geosuggestStatus != null;
        if (places.length === 0 && !geosuggestRejected) {
          places = await yandexGeocodeForwardAll(query);
          if (places.length > 0) {
            source = "geocoder";
            if (preferBiz && getYandexGeosuggestApiKey() && !warning) {
              warning =
                "Поиск организаций недоступен — показаны адреса из геокодера. Подключите ключ «Геосаджест» в кабинете Яндекса.";
            }
          }
        }

        return NextResponse.json({
          places,
          meta: { source, geosuggestStatus },
          warning,
        });
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
