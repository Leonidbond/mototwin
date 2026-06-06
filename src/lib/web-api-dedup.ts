import type {
  AuthMeResponse,
  AuthSessionStateResponse,
  GarageVehiclesResponse,
  ServiceEventsResponse,
  ServiceNodesResponse,
  TopServiceNodesResponse,
  VehicleDetailResponse,
  VehicleNodeTreeResponse,
  VehicleWishlistResponse,
} from "@mototwin/types";
import { createWebApiClient } from "@/lib/create-web-api-client";

const authProbeApi = createWebApiClient({ redirectOn401: false, profile: "authProbe" });
const api = createWebApiClient({ redirectOn401: false, profile: "default" });
const garageApi = createWebApiClient({ profile: "heavyRead" });

const SESSION_CACHE_TTL_MS = 60_000;
const SESSION_STATE_CACHE_TTL_MS = 15_000;

let sessionCache:
  | {
      value: AuthMeResponse;
      expiresAt: number;
    }
  | null = null;
let sessionInflight: Promise<AuthMeResponse> | null = null;
let sessionStateCache:
  | {
      value: AuthSessionStateResponse;
      expiresAt: number;
    }
  | null = null;
let sessionStateInflight: Promise<AuthSessionStateResponse> | null = null;

const garageInflightByKey = new Map<string, Promise<GarageVehiclesResponse>>();

const vehicleDetailInflight = new Map<string, Promise<VehicleDetailResponse>>();

type ServiceCatalogBundle = {
  top: TopServiceNodesResponse;
  catalog: ServiceNodesResponse;
};

let serviceCatalogCache: ServiceCatalogBundle | null = null;
let serviceCatalogInflight: Promise<ServiceCatalogBundle> | null = null;

/** Single in-flight / cached GET /api/auth/me for the browser tab. */
export function getWebSession(): Promise<AuthMeResponse> {
  if (sessionCache && sessionCache.expiresAt > Date.now()) {
    return Promise.resolve(sessionCache.value);
  }
  if (!sessionInflight) {
    sessionInflight = api
      .getAuthMe()
      .then((me) => {
        sessionCache = {
          value: me,
          expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
        };
        return me;
      })
      .finally(() => {
        sessionInflight = null;
      });
  }
  return sessionInflight;
}

/** Fast auth check for guards and non-blocking route transitions. */
export function getWebSessionState(): Promise<AuthSessionStateResponse> {
  if (sessionStateCache && sessionStateCache.expiresAt > Date.now()) {
    return Promise.resolve(sessionStateCache.value);
  }
  if (!sessionStateInflight) {
    sessionStateInflight = authProbeApi
      .getAuthSessionState()
      .then((state) => {
        sessionStateCache = {
          value: state,
          expiresAt: Date.now() + SESSION_STATE_CACHE_TTL_MS,
        };
        return state;
      })
      .finally(() => {
        sessionStateInflight = null;
      });
  }
  return sessionStateInflight;
}

export function clearWebSessionCache(): void {
  sessionCache = null;
  sessionStateCache = null;
  sessionInflight = null;
  sessionStateInflight = null;
  garageInflightByKey.clear();
  vehicleDetailInflight.clear();
}

export function invalidateWebSessionCache(): void {
  sessionCache = null;
  sessionStateCache = null;
}

/** Dedupes concurrent GET /api/garage (expensive attention computation on server). */
export function getGarageVehiclesDeduped(options?: {
  includeAttention?: boolean;
}): Promise<GarageVehiclesResponse> {
  const includeAttention = options?.includeAttention !== false;
  const key = includeAttention ? "with-attention" : "without-attention";
  const existing = garageInflightByKey.get(key);
  if (existing) {
    return existing;
  }
  const request = garageApi
    .getGarageVehicles({ includeAttention })
    .finally(() => {
      garageInflightByKey.delete(key);
    });
  garageInflightByKey.set(key, request);
  return request;
}

export function getVehicleDetailDeduped(vehicleId: string): Promise<VehicleDetailResponse> {
  const existing = vehicleDetailInflight.get(vehicleId);
  if (existing) {
    return existing;
  }
  const request = api.getVehicleDetail(vehicleId).finally(() => {
    vehicleDetailInflight.delete(vehicleId);
  });
  vehicleDetailInflight.set(vehicleId, request);
  return request;
}

/** Static service catalog — safe to reuse for the lifetime of the tab. */
export function getServiceCatalogCached(): Promise<ServiceCatalogBundle> {
  if (serviceCatalogCache) {
    return Promise.resolve(serviceCatalogCache);
  }
  if (!serviceCatalogInflight) {
    serviceCatalogInflight = Promise.all([
      api.getTopServiceNodes(),
      api.getServiceNodes(),
    ])
      .then(([top, catalog]) => {
        serviceCatalogCache = { top, catalog };
        return serviceCatalogCache;
      })
      .finally(() => {
        serviceCatalogInflight = null;
      });
  }
  return serviceCatalogInflight;
}

export type VehicleDashboardBootstrap = {
  detail: VehicleDetailResponse;
  serviceEvents: ServiceEventsResponse;
  expenses: Awaited<ReturnType<typeof api.getExpenses>>;
  nodeTree: VehicleNodeTreeResponse;
  wishlist: VehicleWishlistResponse;
  catalog: ServiceCatalogBundle;
};

/** Parallel first paint for vehicle dashboard (dedupes detail + catalog). */
export function loadVehicleDashboardBootstrap(
  vehicleId: string
): Promise<VehicleDashboardBootstrap> {
  const year = new Date().getFullYear();
  return Promise.all([
    getVehicleDetailDeduped(vehicleId),
    api.getServiceEvents(vehicleId),
    api.getExpenses({ vehicleId, year }),
    api.getNodeTree(vehicleId),
    api.getVehicleWishlist(vehicleId),
    getServiceCatalogCached(),
  ]).then(([detail, serviceEvents, expenses, nodeTree, wishlist, catalog]) => ({
    detail,
    serviceEvents,
    expenses,
    nodeTree,
    wishlist,
    catalog,
  }));
}
