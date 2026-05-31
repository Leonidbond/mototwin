export type ServicePlaceType = "ORGANIZATION" | "ADDRESS" | "CUSTOM";

export type ServicePlaceProvider = "YANDEX" | "CUSTOM";

export type ServicePlaceContact = {
  phone?: string | null;
  url?: string | null;
};

export type ServicePlaceBase = {
  provider: ServicePlaceProvider | string;
  providerPlaceId?: string | null;
  type: ServicePlaceType;
  title: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  contact?: ServicePlaceContact | null;
  metadata?: unknown | null;
};

export type ServicePlaceItem = ServicePlaceBase & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type ServicePlaceSnapshot = ServicePlaceBase & {
  id?: string | null;
};

export type ServicePlaceSearchMode = "AUTO" | "ADDRESS" | "ORGANIZATION";

export type ServicePlaceSearchResultItem = ServicePlaceBase & {
  distanceKm?: number | null;
};
