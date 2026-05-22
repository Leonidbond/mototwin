"use client";

import { Map, Placemark, SearchControl, YMaps } from "@iminside/react-yandex-maps";
import { productSemanticColors } from "@mototwin/design-tokens";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getYandexMapsApiKey } from "./config";
import { geocodeCoordinates, searchPlacesViaApi } from "./geocode-client";
import type { YandexMapPlace } from "./types";

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423];

export type YandexMapPlacePickerModalProps = {
  open: boolean;
  onClose: () => void;
  initialPlace?: YandexMapPlace | null;
  onConfirm: (place: YandexMapPlace) => void;
  title?: string;
};

type AnyGeoObject = {
  geometry?: { getCoordinates?: () => number[] } | null;
  properties?: { get?: (key: string, def?: unknown) => unknown } | null;
  getAddressLine?: () => string;
};

type AnyEvent = { get: (key: string) => unknown };

type AnyMap = {
  setCenter: (coords: [number, number], zoom?: number) => void;
  balloon: {
    events: { add: (type: string, cb: () => void) => void };
    getPosition: () => number[] | null;
    getData: () => unknown;
    close: () => void;
  };
};
type AnySearchControl = {
  events: { add: (type: string, cb: (event: AnyEvent) => void) => void };
  getResult: (index: number) => Promise<unknown>;
  getResultsCount: () => number;
  getRequestString: () => string;
};

function readGeoProperty(geo: AnyGeoObject, key: string): string {
  try {
    const v = geo.properties?.get?.(key);
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
}

function placeFromGeoObject(raw: unknown): YandexMapPlace | null {
  const geo = raw as AnyGeoObject;
  const coords = geo.geometry?.getCoordinates?.();
  if (!coords || coords.length < 2) return null;
  const lat = Number(coords[0]);
  const lng = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const name = readGeoProperty(geo, "name");
  const description = readGeoProperty(geo, "description");
  const addressLine = geo.getAddressLine?.()?.trim() ?? "";
  const address =
    (name && description ? `${name}, ${description}` : name || description || addressLine) ||
    `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  return { address, lat, lng };
}

export function YandexMapPlacePickerModal({
  open,
  onClose,
  initialPlace,
  onConfirm,
  title = "Место установки",
}: YandexMapPlacePickerModalProps) {
  const apiKey = getYandexMapsApiKey();
  const mapRef = useRef<AnyMap | null>(null);
  const searchRef = useRef<AnySearchControl | null>(null);
  const searchEventsBoundRef = useRef(false);
  const balloonBoundRef = useRef(false);
  const fallbackQueryInFlightRef = useRef<string | null>(null);

  const [draft, setDraft] = useState<YandexMapPlace | null>(initialPlace ?? null);
  const [pendingPlace, setPendingPlace] = useState<YandexMapPlace | null>(null);
  const [fallbackPlaces, setFallbackPlaces] = useState<YandexMapPlace[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(initialPlace ?? null);
    setPendingPlace(null);
    setFallbackPlaces([]);
    setLoadError("");
    balloonBoundRef.current = false;
    searchEventsBoundRef.current = false;
    fallbackQueryInFlightRef.current = null;
  }, [open, initialPlace]);

  const applyPlace = useCallback((place: YandexMapPlace) => {
    setDraft(place);
    setPendingPlace(null);
    setFallbackPlaces([]);
    setLoadError("");
    mapRef.current?.setCenter([place.lat, place.lng], 16);
  }, []);

  const applyCoords = useCallback(
    async (lat: number, lng: number, labelHint?: string) => {
      setLoadError("");
      try {
        const { place } = await geocodeCoordinates(lat, lng);
        const address =
          labelHint && !place.address.toLowerCase().includes(labelHint.toLowerCase())
            ? `${labelHint}, ${place.address}`
            : place.address;
        applyPlace({ ...place, address });
      } catch {
        const address = labelHint ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        applyPlace({ address, lat, lng });
      }
    },
    [applyPlace]
  );

  const runFallbackSearch = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;
    if (fallbackQueryInFlightRef.current === query) return;
    fallbackQueryInFlightRef.current = query;
    setFallbackLoading(true);
    try {
      const places = await searchPlacesViaApi(query);
      setFallbackPlaces(places);
      if (places.length === 0) {
        setLoadError("Поиск не дал результатов. Уточните название сервиса или адрес.");
      }
    } catch (err) {
      setFallbackPlaces([]);
      setLoadError(err instanceof Error ? err.message : "Ошибка поиска");
    } finally {
      fallbackQueryInFlightRef.current = null;
      setFallbackLoading(false);
    }
  }, []);

  const selectFromBalloon = useCallback((lat: number, lng: number, labelHint?: string) => {
    void (async () => {
      setLoadError("");
      try {
        const { place } = await geocodeCoordinates(lat, lng);
        const address =
          labelHint && !place.address.toLowerCase().includes(labelHint.toLowerCase())
            ? `${labelHint}, ${place.address}`
            : place.address;
        const next = { ...place, address };
        setPendingPlace(next);
        mapRef.current?.setCenter([next.lat, next.lng], 16);
      } catch {
        const fallback: YandexMapPlace = { address: labelHint ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng };
        setPendingPlace(fallback);
        mapRef.current?.setCenter([fallback.lat, fallback.lng], 16);
      }
    })();
  }, []);

  const handleMapInstance = useCallback(
    (instance: unknown) => {
      mapRef.current = (instance as AnyMap) ?? null;
      if (!instance) return;
      if (balloonBoundRef.current) return;
      balloonBoundRef.current = true;

      const map = instance as AnyMap;
      map.balloon.events.add("open", () => {
        const pos = map.balloon.getPosition();
        if (!pos || pos.length < 2) return;
        const lat = Number(pos[0]);
        const lng = Number(pos[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const data = map.balloon.getData() as { properties?: { get?: (k: string) => unknown } } | null;
        const name = data?.properties?.get?.("name");
        const desc = data?.properties?.get?.("description");
        const label =
          typeof name === "string" && typeof desc === "string" && name && desc
            ? `${name.trim()}, ${desc.trim()}`
            : typeof name === "string" && name
              ? name.trim()
              : typeof desc === "string" && desc
                ? desc.trim()
                : undefined;

        map.balloon.close();
        selectFromBalloon(lat, lng, label);
      });
    },
    [selectFromBalloon]
  );

  const handleSearchInstance = useCallback(
    (instance: unknown) => {
      searchRef.current = (instance as AnySearchControl) ?? null;
      const search = searchRef.current;
      if (!search) return;
      if (searchEventsBoundRef.current) return;
      searchEventsBoundRef.current = true;

      search.events.add("resultselect", (event: AnyEvent) => {
        const index = Number(event.get("index"));
        if (!Number.isFinite(index)) return;
        void search
          .getResult(index)
          .then((geo) => {
            const place = placeFromGeoObject(geo);
            if (!place) return;
            applyPlace(place);
          })
          .catch(() => setLoadError("Не удалось получить данные выбранного места."));
      });

      search.events.add("error", () => {
        const query = search.getRequestString?.() ?? "";
        setLoadError("");
        void runFallbackSearch(query);
      });

      search.events.add("load", () => {
        if (search.getResultsCount() > 0) {
          setFallbackPlaces([]);
          return;
        }
        void runFallbackSearch(search.getRequestString?.() ?? "");
      });
    },
    [applyPlace, runFallbackSearch]
  );

  const handleMapClick = useCallback(
    (event: AnyEvent) => {
      const target = event.get("target");
      const placeFromTarget = placeFromGeoObject(target);
      if (placeFromTarget) {
        setPendingPlace(placeFromTarget);
        mapRef.current?.setCenter([placeFromTarget.lat, placeFromTarget.lng], 16);
        return;
      }

      const coords = event.get("coords") as number[] | null;
      if (!coords || coords.length < 2) return;
      void applyCoords(Number(coords[0]), Number(coords[1]));
    },
    [applyCoords]
  );

  if (!open) return null;

  const center: [number, number] = initialPlace ? [initialPlace.lat, initialPlace.lng] : DEFAULT_CENTER;
  const zoom = initialPlace ? 16 : 10;

  return (
    <PickerOverlayShell title={title} onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-5 pt-4">
        {apiKey ? (
          <>
            {fallbackPlaces.length > 0 ? (
              <div
                className="max-h-40 overflow-auto rounded-xl border"
                style={{ borderColor: productSemanticColors.border, backgroundColor: productSemanticColors.cardSubtle }}
              >
                {fallbackPlaces.map((place, i) => (
                  <button
                    key={`${place.lat}:${place.lng}:${i}`}
                    type="button"
                    onClick={() => applyPlace(place)}
                    className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0"
                    style={{ borderBottomColor: productSemanticColors.border, color: productSemanticColors.textPrimary }}
                  >
                    {place.address}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-xl border" style={{ borderColor: productSemanticColors.border }}>
              <YMaps query={{ apikey: apiKey, lang: "ru_RU" }}>
                <Map
                  instanceRef={handleMapInstance as (value: unknown) => void}
                  defaultState={{ center, zoom }}
                  width="100%"
                  height="360px"
                  options={{ suppressMapOpenBlock: true }}
                  onClick={handleMapClick}
                >
                  <SearchControl
                    instanceRef={handleSearchInstance as (value: unknown) => void}
                    options={{ provider: "yandex#search", size: "large", float: "left", noSelect: true }}
                  />
                  {draft ? (
                    <Placemark
                      geometry={[draft.lat, draft.lng]}
                      properties={{ balloonContent: draft.address, hintContent: draft.address }}
                    />
                  ) : null}
                  {pendingPlace ? (
                    <Placemark
                      geometry={[pendingPlace.lat, pendingPlace.lng]}
                      properties={{ balloonContent: pendingPlace.address, hintContent: pendingPlace.address }}
                    />
                  ) : null}
                </Map>
              </YMaps>
            </div>

            {pendingPlace ? (
              <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: productSemanticColors.border }}>
                <p className="m-0 text-xs leading-snug" style={{ color: productSemanticColors.textSecondary }}>
                  Найдена организация: {pendingPlace.address}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => applyPlace(pendingPlace)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                    style={{
                      backgroundColor: productSemanticColors.primaryAction,
                      color: productSemanticColors.onPrimaryAction,
                    }}
                  >
                    Выбрать эту организацию
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingPlace(null)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                    style={{ borderColor: productSemanticColors.border, color: productSemanticColors.textSecondary }}
                  >
                    Отменить
                  </button>
                </div>
              </div>
            ) : null}

            <p className="text-[11px] leading-snug" style={{ color: productSemanticColors.textMuted }}>
              Поиск через встроенную строку Яндекс.Карт. При ошибке автоматически покажется резервный список.
            </p>
            {fallbackLoading ? (
              <p className="text-[11px]" style={{ color: productSemanticColors.textMuted }}>
                Резервный поиск...
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-xs" style={{ color: productSemanticColors.error }}>
            Не задан <code>NEXT_PUBLIC_YANDEX_MAPS_API_KEY</code> в .env — карта недоступна.
          </p>
        )}

        {loadError ? (
          <p className="text-xs" style={{ color: productSemanticColors.error }}>
            {loadError}
          </p>
        ) : null}

        {draft ? (
          <p className="text-xs leading-snug" style={{ color: productSemanticColors.textSecondary }}>
            <span style={{ color: productSemanticColors.textMuted }}>Выбрано: </span>
            {draft.address}
          </p>
        ) : (
          <p className="text-xs" style={{ color: productSemanticColors.textMuted }}>
            Место не выбрано
          </p>
        )}

        <PickerFooter onClose={onClose} onConfirm={() => draft && onConfirm(draft)} confirmDisabled={!draft} />
      </div>
    </PickerOverlayShell>
  );
}

function PickerOverlayShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-3 py-6 sm:items-center"
      style={{ backgroundColor: productSemanticColors.overlayModal }}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(720px,92vh)] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: productSemanticColors.card,
          borderColor: productSemanticColors.border,
          color: productSemanticColors.textPrimary,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderBottomColor: productSemanticColors.border }}
        >
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg leading-none transition hover:opacity-90"
            style={{
              borderColor: productSemanticColors.border,
              backgroundColor: productSemanticColors.cardSubtle,
              color: productSemanticColors.textSecondary,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PickerFooter({
  onClose,
  onConfirm,
  confirmDisabled,
}: {
  onClose: () => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
}) {
  return (
    <div className="mt-1 flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:opacity-90"
        style={{ borderColor: productSemanticColors.border, color: productSemanticColors.textSecondary }}
      >
        Отмена
      </button>
      <button
        type="button"
        disabled={confirmDisabled}
        onClick={onConfirm}
        className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          backgroundColor: productSemanticColors.primaryAction,
          color: productSemanticColors.onPrimaryAction,
        }}
      >
        Выбрать
      </button>
    </div>
  );
}
