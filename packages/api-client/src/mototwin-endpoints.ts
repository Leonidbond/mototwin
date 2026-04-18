import type {
  BrandsResponse,
  CreateServiceEventInput,
  CreateServiceEventResponse,
  CreateVehicleInput,
  CreateVehicleResponse,
  GarageVehiclesResponse,
  ModelVariantsResponse,
  ModelsResponse,
  ServiceEventsResponse,
  UpdateVehicleProfileInput,
  UpdateVehicleProfileResponse,
  UpdateVehicleStateInput,
  UpdateVehicleStateResponse,
  VehicleDetailResponse,
  VehicleNodeTreeResponse,
} from "@mototwin/types";
import type { ApiClient } from "./fetcher";

/**
 * Typed MotoTwin HTTP API (paths match Next route handlers under `/api/*`).
 * Use {@link createApiClient} with `baseUrl: ""` on web (same origin) or full origin in Expo.
 */
export function createMotoTwinEndpoints(client: ApiClient) {
  return {
    getGarageVehicles() {
      return client.request<GarageVehiclesResponse>("/api/garage");
    },

    getVehicleDetail(vehicleId: string) {
      return client.request<VehicleDetailResponse>(`/api/vehicles/${vehicleId}`);
    },

    getNodeTree(vehicleId: string) {
      return client.request<VehicleNodeTreeResponse>(
        `/api/vehicles/${vehicleId}/node-tree`
      );
    },

    getServiceEvents(vehicleId: string) {
      return client.request<ServiceEventsResponse>(
        `/api/vehicles/${vehicleId}/service-events`
      );
    },

    createServiceEvent(vehicleId: string, input: CreateServiceEventInput) {
      return client.request<CreateServiceEventResponse>(
        `/api/vehicles/${vehicleId}/service-events`,
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      );
    },

    updateVehicleState(vehicleId: string, input: UpdateVehicleStateInput) {
      return client.request<UpdateVehicleStateResponse>(
        `/api/vehicles/${vehicleId}/state`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        }
      );
    },

    updateVehicleProfile(vehicleId: string, input: UpdateVehicleProfileInput) {
      return client.request<UpdateVehicleProfileResponse>(
        `/api/vehicles/${vehicleId}/profile`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        }
      );
    },

    getBrands() {
      return client.request<BrandsResponse>("/api/brands");
    },

    getModels(brandId: string) {
      const search = new URLSearchParams({ brandId });
      return client.request<ModelsResponse>(`/api/models?${search.toString()}`);
    },

    getModelVariants(modelId: string) {
      const search = new URLSearchParams({ modelId });
      return client.request<ModelVariantsResponse>(
        `/api/model-variants?${search.toString()}`
      );
    },

    createVehicle(input: CreateVehicleInput) {
      return client.request<CreateVehicleResponse>("/api/vehicles", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
  };
}
