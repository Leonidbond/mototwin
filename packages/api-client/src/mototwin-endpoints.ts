import type {
  BrandItem,
  CreateVehicleInput,
  CreateServiceEventInput,
  GarageVehicleItem,
  ModelItem,
  ModelVariantItem,
  NodeTreeItem,
  ServiceEventItem,
  VehicleDetail,
  UpdateVehicleProfileInput,
  UpdateVehicleStateInput,
} from "@mototwin/types";
import type { ApiClient } from "./fetcher";

type GarageResponse = {
  vehicles: GarageVehicleItem[];
};

type VehicleDetailResponse = {
  vehicle: VehicleDetail | null;
};

type VehicleNodeTreeResponse = {
  nodeTree: NodeTreeItem[];
};

type ServiceEventsResponse = {
  serviceEvents: ServiceEventItem[];
};

type CreateServiceEventResponse = {
  serviceEvent: ServiceEventItem;
};

type UpdateVehicleStateResponse = {
  vehicle: {
    id: string;
    odometer: number;
    engineHours: number | null;
    updatedAt: string;
  };
};

type UpdateVehicleProfileResponse = {
  vehicle: VehicleDetail;
};

type BrandsResponse = {
  brands: BrandItem[];
};

type ModelsResponse = {
  models: ModelItem[];
};

type ModelVariantsResponse = {
  variants: ModelVariantItem[];
};

type CreateVehicleResponse = {
  vehicle: GarageVehicleItem;
};

export function createMotoTwinEndpoints(client: ApiClient) {
  return {
    getGarage() {
      return client.request<GarageResponse>("/api/garage");
    },
    getVehicleDetail(vehicleId: string) {
      return client.request<VehicleDetailResponse>(`/api/vehicles/${vehicleId}`);
    },
    getVehicleNodeTree(vehicleId: string) {
      return client.request<VehicleNodeTreeResponse>(
        `/api/vehicles/${vehicleId}/node-tree`
      );
    },
    getVehicleServiceEvents(vehicleId: string) {
      return client.request<ServiceEventsResponse>(
        `/api/vehicles/${vehicleId}/service-events`
      );
    },
    createVehicleServiceEvent(vehicleId: string, input: CreateServiceEventInput) {
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
      return client.request<ModelVariantsResponse>(`/api/model-variants?${search.toString()}`);
    },
    createVehicle(input: CreateVehicleInput) {
      return client.request<CreateVehicleResponse>("/api/vehicles", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
  };
}
