import type {
  AuthMeResponse,
  GarageVehiclesResponse,
  ServiceEventsResponse,
  ServiceNodesResponse,
  TopServiceNodesResponse,
  VehicleDetailResponse,
  VehicleNodeTreeResponse,
  VehicleWishlistResponse,
} from "@mototwin/types";
import { createWebApiClient } from "@/lib/create-web-api-client";

const api = createWebApiClient({ redirectOn401: false });
const garageApi = createWebApiClient();

let sessionCache: AuthMeResponse | null = null;
let sessionInflight: Promise<AuthMeResponse> | null = null;

let garageInflight: Promise<GarageVehiclesResponse> | null = null;

const vehicleDetailInflight = new Map<string, Promise<VehicleDetailResponse>>();

type ServiceCatalogBundle = {
  top: TopServiceNodesResponse;
  catalog: ServiceNodesResponse;
};

let serviceCatalogCache: ServiceCatalogBundle | null = null;
let serviceCatalogInflight: Promise<ServiceCatalogBundle> | null = null;

/** Single in-flight / cached GET /api/auth/me for the browser tab. */
export function getWebSession(): Promise<AuthMeResponse> {
  if (sessionCache) {
    return Promise.resolve(sessionCache);
  }
  if (!sessionInflight) {
    sessionInflight = api
      .getAuthMe()
      .then((me) => {
        sessionCache = me;
        return me;
      })
      .finally(() => {
        sessionInflight = null;
      });
  }
  return sessionInflight;
}

export function clearWebSessionCache(): void {
  sessionCache = null;
  sessionInflight = null;
  garageInflight = null;
  vehicleDetailInflight.clear();
}

/** Dedupes concurrent GET /api/garage (expensive attention computation on server). */
export function getGarageVehiclesDeduped(): Promise<GarageVehiclesResponse> {
  if (!garageInflight) {
    garageInflight = api.getGarageVehicles().finally(() => {
      garageInflight = null;
    });
  }
  return garageInflight;
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
