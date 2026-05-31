"use client";

import { Map, Placemark, YMaps } from "@iminside/react-yandex-maps";
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
  /** Must be above parent overlays (e.g. ServicePlacePicker uses z-[90]). */
  overlayZIndex?: number;
};

type AnyGeoObject = {
  geometry?: { getCoordinates?: () => number[] } | null;
  properties?: { get?: (key: string, def?: unknown) => unknown } | null;
  getAddressLine?: () => string;
};

type AnyEvent = { get: (key: string) => unknown };

type AnyMap = {
  setCenter: (coords: [number, number], zoom?: number) => void;
  events: { add: (type: string, cb: (event: AnyEvent) => void) => void };
  balloon: {
    events: { add: (type: string, cb: () => void) => void };
    getPosition: () => number[] | null;
    getData: () => unknown;
    close: () => void;
  };
};
function readGeoProperty(geo: AnyGeoObject, key: string): string {
  try {
    const v = geo.properties?.get?.(key);
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
}

function readBalloonProperty(data: unknown, key: string): string {
  const geo = data as AnyGeoObject;
  const fromGetter = readGeoProperty(geo, key);
  if (fromGetter) return fromGetter;
  const props = (data as { properties?: Record<string, unknown> } | null)?.properties;
  const raw = props?.[key];
  return typeof raw === "string" ? raw.trim() : "";
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

function placeFromBalloonData(raw: unknown): YandexMapPlace | null {
  const direct = placeFromGeoObject(raw);
  if (direct) return direct;
  const wrapped = raw as { geoObject?: unknown; GeoObject?: unknown } | null;
  return placeFromGeoObject(wrapped?.geoObject ?? wrapped?.GeoObject ?? null);
}

function labelFromBalloonProperties(data: unknown): string | undefined {
  const name = readBalloonProperty(data, "name");
  const desc = readBalloonProperty(data, "description");
  const balloonBody = readBalloonProperty(data, "balloonContentBody");
  if (name && desc) return `${name}, ${desc}`;
  if (name) return name;
  if (desc) return desc;
  if (balloonBody) return balloonBody;
  return undefined;
}

export function YandexMapPlacePickerModal({
  open,
  onClose,
  initialPlace,
  onConfirm,
  title = "Место установки",
  overlayZIndex = 100,
}: YandexMapPlacePickerModalProps) {
  const apiKey = getYandexMapsApiKey();
  const mapRef = useRef<AnyMap | null>(null);
  const boundMapInstancesRef = useRef(new WeakSet<AnyMap>());
  const fallbackQueryInFlightRef = useRef<string | null>(null);

  const [draft, setDraft] = useState<YandexMapPlace | null>(initialPlace ?? null);
  const [pendingPlace, setPendingPlace] = useState<YandexMapPlace | null>(null);
  const [fallbackPlaces, setFallbackPlaces] = useState<YandexMapPlace[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [mapSearchQuery, setMapSearchQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(initialPlace ?? null);
    setPendingPlace(null);
    setFallbackPlaces([]);
    setLoadError("");
    setMapSearchQuery("");
    fallbackQueryInFlightRef.current = null;
  }, [open, initialPlace]);

  const setPendingFromCoords = useCallback((place: YandexMapPlace) => {
    setPendingPlace(place);
    mapRef.current?.setCenter([place.lat, place.lng], 16);
  }, []);

  const applyPlace = useCallback((place: YandexMapPlace) => {
    setDraft(place);
    setPendingPlace(null);
    setFallbackPlaces([]);
    setLoadError("");
    mapRef.current?.setCenter([place.lat, place.lng], 16);
  }, []);

  const runFallbackSearch = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;
    if (fallbackQueryInFlightRef.current === query) return;
    fallbackQueryInFlightRef.current = query;
    setFallbackLoading(true);
    try {
      const { places, warning } = await searchPlacesViaApi(query);
      setFallbackPlaces(places);
      if (warning) {
        setLoadError(warning);
      } else if (places.length === 0) {
        setLoadError(
          "Ничего не найдено. Добавьте город к запросу (например: «мотосервис, Москва») или выберите точку на карте."
        );
      } else {
        setLoadError("");
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

      const map = instance as AnyMap;
      if (boundMapInstancesRef.current.has(map)) return;
      boundMapInstancesRef.current.add(map);

      const handlePoiPick = (lat: number, lng: number, data: unknown) => {
        const placeFromData = placeFromBalloonData(data);
        const label = labelFromBalloonProperties(data);
        if (placeFromData) {
          setPendingFromCoords(placeFromData);
          return;
        }
        if (label) {
          setPendingFromCoords({ address: label, lat, lng });
          return;
        }
        selectFromBalloon(lat, lng, label);
      };

      map.balloon.events.add("open", () => {
        const pos = map.balloon.getPosition();
        if (!pos || pos.length < 2) return;
        const lat = Number(pos[0]);
        const lng = Number(pos[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const data = map.balloon.getData();
        handlePoiPick(lat, lng, data);
        map.balloon.close();
      });

      map.events.add("click", (event: AnyEvent) => {
        const target = event.get("target");
        const coords = event.get("coords") as number[] | null;
        const placeFromTarget = placeFromGeoObject(target);

        if (placeFromTarget) {
          setPendingFromCoords(placeFromTarget);
          return;
        }

        if (!coords || coords.length < 2) return;
        const lat = Number(coords[0]);
        const lng = Number(coords[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const label = labelFromBalloonProperties(target);
        handlePoiPick(lat, lng, label ? target : null);
      });
    },
    [selectFromBalloon, setPendingFromCoords]
  );

  const submitMapSearch = useCallback(() => {
    void runFallbackSearch(mapSearchQuery);
  }, [mapSearchQuery, runFallbackSearch]);

  if (!open) return null;

  const center: [number, number] = initialPlace ? [initialPlace.lat, initialPlace.lng] : DEFAULT_CENTER;
  const zoom = initialPlace ? 16 : 10;

  return (
    <PickerOverlayShell title={title} onClose={onClose} overlayZIndex={overlayZIndex}>
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-5 pt-4">
        {apiKey ? (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium" style={{ color: productSemanticColors.textSecondary }}>
                Поиск организации или адреса
              </label>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={mapSearchQuery}
                  onChange={(e) => setMapSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitMapSearch();
                    }
                  }}
                  placeholder="Например: мотосервис, Москва"
                  className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
                  style={{
                    borderColor: productSemanticColors.border,
                    backgroundColor: productSemanticColors.cardSubtle,
                    color: productSemanticColors.textPrimary,
                  }}
                />
                <button
                  type="button"
                  disabled={fallbackLoading || !mapSearchQuery.trim()}
                  onClick={submitMapSearch}
                  className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    backgroundColor: productSemanticColors.primaryAction,
                    color: productSemanticColors.onPrimaryAction,
                  }}
                >
                  {fallbackLoading ? "…" : "Найти"}
                </button>
              </div>
              <p className="m-0 text-[11px] leading-snug" style={{ color: productSemanticColors.textMuted }}>
                Для поиска сервисов укажите город. Можно также кликнуть организацию на карте.
              </p>
            </div>

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
                >
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

            {fallbackLoading ? (
              <p className="text-[11px]" style={{ color: productSemanticColors.textMuted }}>
                Поиск…
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
  overlayZIndex,
  children,
}: {
  title: string;
  onClose: () => void;
  overlayZIndex: number;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto px-3 py-6 sm:items-center"
      style={{ zIndex: overlayZIndex }}
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
