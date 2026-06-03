"use client";

import { useCallback, useRef, useState } from "react";
import { searchPlacesNearViaApi, searchPlacesViaApi } from "./geocode-client";
import { filterOrganizationPlaces, normalizeApiPlace, withOrgLabel } from "./map-place-utils";
import type { YandexMapPlace } from "./types";

export type UseMapPlaceCandidatesResult = {
  candidates: YandexMapPlace[];
  loading: boolean;
  hint: string;
  error: string;
  loadNearCoords: (lat: number, lng: number) => Promise<LoadNearCoordsOutcome>;
  loadByQuery: (query: string, centerLonLat?: [number, number]) => Promise<YandexMapPlace[]>;
  clearCandidates: () => void;
  setCandidates: (places: YandexMapPlace[]) => void;
  setError: (message: string) => void;
};

export type LoadNearCoordsOutcome =
  | { kind: "none" }
  | { kind: "single"; place: YandexMapPlace }
  | { kind: "multiple"; places: YandexMapPlace[] };

export function useMapPlaceCandidates(): UseMapPlaceCandidatesResult {
  const requestIdRef = useRef(0);
  const [candidates, setCandidates] = useState<YandexMapPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");

  const clearCandidates = useCallback(() => {
    setCandidates([]);
    setHint("");
    setError("");
  }, []);

  const loadNearCoords = useCallback(async (lat: number, lng: number): Promise<LoadNearCoordsOutcome> => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    setHint("");
    try {
      const { places: rawPlaces, warning } = await searchPlacesNearViaApi(lat, lng);
      if (requestId !== requestIdRef.current) return { kind: "none" };

      const places = filterOrganizationPlaces(rawPlaces.map(normalizeApiPlace)).map(withOrgLabel);

      if (warning) setError(warning);

      if (places.length === 0) {
        setCandidates([]);
        setHint("Организации не найдены — укажите название в поиске выше");
        return { kind: "none" };
      }

      if (places.length === 1) {
        setCandidates(places);
        setHint("");
        return { kind: "single", place: places[0] };
      }

      setCandidates(places);
      setHint("Выберите нужную организацию из списка или синей метки на карте");
      return { kind: "multiple", places };
    } catch (err) {
      if (requestId !== requestIdRef.current) return { kind: "none" };
      setCandidates([]);
      setError(err instanceof Error ? err.message : "Не удалось найти организации рядом");
      return { kind: "none" };
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  const loadByQuery = useCallback(async (query: string, centerLonLat?: [number, number]) => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    setHint("");
    try {
      const { places: rawPlaces, warning } = await searchPlacesViaApi(trimmed, { centerLonLat });
      if (requestId !== requestIdRef.current) return [];

      const places = filterOrganizationPlaces(rawPlaces.map(normalizeApiPlace)).map(withOrgLabel);
      setCandidates(places);

      if (warning) {
        setError(warning);
      } else if (places.length === 0) {
        setError(
          "Ничего не найдено. Добавьте город к запросу (например: «мотосервис, Москва») или кликните точку на карте."
        );
      } else {
        setError("");
      }
      return places;
    } catch (err) {
      if (requestId !== requestIdRef.current) return [];
      setCandidates([]);
      setError(err instanceof Error ? err.message : "Ошибка поиска");
      return [];
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  return {
    candidates,
    loading,
    hint,
    error,
    loadNearCoords,
    loadByQuery,
    clearCandidates,
    setCandidates,
    setError,
  };
}
