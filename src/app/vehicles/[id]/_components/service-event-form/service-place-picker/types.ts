"use client";

import type { ServicePlaceSearchMode, ServicePlaceSearchResultItem, ServicePlaceSnapshot } from "@mototwin/types";

export type ServicePlaceDraft = ServicePlaceSearchResultItem & {
  id?: string | null;
};

export type ServicePlacePickerState = {
  query: string;
  mode: ServicePlaceSearchMode;
  loading: boolean;
  error: string;
  warning: string;
  results: ServicePlaceSearchResultItem[];
  selected: ServicePlaceDraft | null;
  manualTitle: string;
  manualAddress: string;
};

export function toSnapshot(place: ServicePlaceDraft): ServicePlaceSnapshot {
  return {
    id: place.id ?? null,
    provider: place.provider,
    providerPlaceId: place.providerPlaceId ?? null,
    type: place.type,
    title: place.title,
    address: place.address,
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
    category: place.category ?? null,
    contact: place.contact ?? null,
    metadata: place.metadata ?? null,
  };
}
