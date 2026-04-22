import type { PartWishlistItem } from "./part-wishlist";
import type { PartSkuViewModel } from "./part-catalog";
import type { PartRecommendationViewModel } from "./part-recommendation";
import type { AddServiceKitToWishlistResult, ServiceKitViewModel } from "./service-kit";
import type { ServiceEventItem } from "./service-event";
import type {
  BrandItem,
  GarageVehicleItem,
  ModelItem,
  ModelVariantItem,
  UpdateVehicleProfileResult,
  VehicleTrashInfo,
  VehicleDetail,
} from "./vehicle";
import type { UserSettings } from "./user-settings";
import type { MvpServiceNodeGroup, NodeTreeItem, TopServiceNodeItem } from "./node";

/** Backend often returns `{ error: string }` on 4xx/5xx. */
export type MotoTwinApiErrorBody = {
  error?: string;
};

export type GarageVehiclesResponse = {
  vehicles: GarageVehicleItem[];
};

export type VehicleDetailResponse = {
  vehicle: VehicleDetail | null;
};

export type VehicleNodeTreeResponse = {
  nodeTree: NodeTreeItem[];
};

export type MvpServiceNodesResponse = {
  groups: MvpServiceNodeGroup[];
};

export type TopServiceNodesResponse = {
  nodes: TopServiceNodeItem[];
};

export type ServiceEventsResponse = {
  serviceEvents: ServiceEventItem[];
};

export type CreateServiceEventResponse = {
  serviceEvent: ServiceEventItem;
};

export type UpdateServiceEventResponse = {
  serviceEvent: ServiceEventItem;
};

export type DeleteServiceEventResponse = {
  deleted: true;
  eventId: string;
  affectedNodeId: string;
};

export type UpdateVehicleStateResponse = {
  vehicle: {
    id: string;
    odometer: number;
    engineHours: number | null;
    updatedAt: string;
  };
};

export type UpdateVehicleProfileResponse = UpdateVehicleProfileResult;

export type BrandsResponse = {
  brands: BrandItem[];
};

export type ModelsResponse = {
  models: ModelItem[];
};

export type ModelVariantsResponse = {
  variants: ModelVariantItem[];
};

export type CreateVehicleResponse = {
  vehicle: GarageVehicleItem;
};

export type VehicleWishlistResponse = {
  items: PartWishlistItem[];
};

export type CreateWishlistItemResponse = {
  item: PartWishlistItem;
};

export type UpdateWishlistItemResponse = {
  item: PartWishlistItem;
};

export type PartSkusResponse = {
  skus: PartSkuViewModel[];
};

export type PartSkuDetailResponse = {
  sku: PartSkuViewModel;
};

export type PartRecommendationsResponse = {
  recommendations: PartRecommendationViewModel[];
};

export type ServiceKitsResponse = {
  kits: ServiceKitViewModel[];
};

export type AddServiceKitToWishlistResponse = {
  result: AddServiceKitToWishlistResult;
};

export type ProfileResponse = {
  profile: {
    displayName: string;
    email: string;
    createdAt: string | null;
    garageTitle: string;
  };
};

export type UserSettingsResponse = {
  settings: UserSettings;
};

export type VehicleTrashListResponse = {
  vehicles: Array<GarageVehicleItem & VehicleTrashInfo>;
};

export type VehicleTrashMutationResponse = {
  vehicle: GarageVehicleItem & VehicleTrashInfo;
};

export type VehicleTrashDeleteResponse = {
  deleted: true;
  vehicleId: string;
};
