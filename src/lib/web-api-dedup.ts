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
  // #region agent log
  fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run1",hypothesisId:"H3",location:"src/lib/web-api-dedup.ts:31",message:"getWebSession called",data:{hasCache:Boolean(sessionCache),hasInflight:Boolean(sessionInflight)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (sessionCache) {
    return Promise.resolve(sessionCache);
  }
  if (!sessionInflight) {
    sessionInflight = api
      .getAuthMe()
      .then((me) => {
        // #region agent log
        fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run1",hypothesisId:"H3",location:"src/lib/web-api-dedup.ts:41",message:"getWebSession api success",data:{userId:me.user?.id??null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        sessionCache = me;
        return me;
      })
      .catch((error) => {
        // #region agent log
        fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run1",hypothesisId:"H3",location:"src/lib/web-api-dedup.ts:46",message:"getWebSession api failed",data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        throw error;
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
  // #region agent log
  fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run1",hypothesisId:"H4",location:"src/lib/web-api-dedup.ts:62",message:"getGarageVehiclesDeduped called",data:{hasInflight:Boolean(garageInflight)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!garageInflight) {
    garageInflight = api
      .getGarageVehicles()
      .then((result) => {
        // #region agent log
        fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run1",hypothesisId:"H4",location:"src/lib/web-api-dedup.ts:69",message:"getGarageVehiclesDeduped success",data:{vehicles:(result.vehicles??[]).length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return result;
      })
      .catch((error) => {
        // #region agent log
        fetch("http://127.0.0.1:7691/ingest/26105bb6-0b1c-4ea6-81d5-5f2a1ba438cd",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"6800ea"},body:JSON.stringify({sessionId:"6800ea",runId:"run1",hypothesisId:"H4",location:"src/lib/web-api-dedup.ts:74",message:"getGarageVehiclesDeduped failed",data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        throw error;
      })
      .finally(() => {
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
