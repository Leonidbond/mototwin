import type {
  AddServiceKitToWishlistPayload,
  AddServiceKitToWishlistResponse,
  BrandsResponse,
  CreateExpenseItemInput,
  CreateExpenseItemResponse,
  CreatePartWishlistItemInput,
  CreateServiceEventInput,
  CreateServiceEventResponse,
  DeleteServiceEventResponse,
  CreateVehicleInput,
  CreateVehicleResponse,
  CreateWishlistItemResponse,
  DeleteExpenseItemResponse,
  GarageVehiclesResponse,
  ModelVariantsResponse,
  ModelsResponse,
  PartRecommendationsResponse,
  PartSkuDetailResponse,
  PartSkusResponse,
  PartSkuSearchFilters,
  ProfileResponse,
  ExpensesResponse,
  ServiceEventsResponse,
  ServiceKitsResponse,
  VehicleTrashDeleteResponse,
  VehicleTrashListResponse,
  VehicleTrashMutationResponse,
  UserSettingsPayload,
  UserSettingsResponse,
  UpdatePartWishlistItemInput,
  UpdateExpenseItemInput,
  UpdateExpenseItemResponse,
  UpdateVehicleProfileInput,
  UpdateVehicleProfileResponse,
  UpdateServiceEventInput,
  UpdateServiceEventResponse,
  UpdateVehicleStateInput,
  UpdateVehicleStateResponse,
  UpdateWishlistItemResponse,
  VehicleDetailResponse,
  TopServiceNodesResponse,
  VehicleNodeTreeResponse,
  VehicleWishlistResponse,
} from "@mototwin/types";
import type { ApiClient } from "./fetcher";

/**
 * Typed MotoTwin HTTP API (paths match Next route handlers under `/api/*`).
 * Use {@link createApiClient} with `baseUrl: ""` on web (same origin) or full origin in Expo.
 */
export function createMotoTwinEndpoints(client: ApiClient) {
  return {
    getProfile() {
      return client.request<ProfileResponse>("/api/profile");
    },

    getUserSettings() {
      return client.request<UserSettingsResponse>("/api/user-settings");
    },

    updateUserSettings(input: UserSettingsPayload) {
      return client.request<UserSettingsResponse>("/api/user-settings", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },

    getGarageVehicles() {
      return client.request<GarageVehiclesResponse>("/api/garage");
    },

    getTrashedVehicles() {
      return client.request<VehicleTrashListResponse>("/api/vehicles/trash");
    },

    moveVehicleToTrash(vehicleId: string) {
      return client.request<VehicleTrashMutationResponse>(`/api/vehicles/${vehicleId}/trash`, {
        method: "POST",
      });
    },

    restoreVehicleFromTrash(vehicleId: string) {
      return client.request<VehicleTrashMutationResponse>(`/api/vehicles/${vehicleId}/restore`, {
        method: "POST",
      });
    },

    permanentlyDeleteVehicle(vehicleId: string) {
      return client.request<VehicleTrashDeleteResponse>(`/api/vehicles/${vehicleId}/trash`, {
        method: "DELETE",
      });
    },

    getVehicleDetail(vehicleId: string) {
      return client.request<VehicleDetailResponse>(`/api/vehicles/${vehicleId}`);
    },

    getNodeTree(vehicleId: string) {
      return client.request<VehicleNodeTreeResponse>(
        `/api/vehicles/${vehicleId}/node-tree`
      );
    },

    getTopServiceNodes() {
      return client.request<TopServiceNodesResponse>("/api/nodes/top");
    },

    getPartSkus(filters: PartSkuSearchFilters = {}) {
      const q = new URLSearchParams();
      if (filters.nodeId) {
        q.set("nodeId", filters.nodeId);
      }
      if (filters.search) {
        q.set("search", filters.search);
      }
      if (filters.activeOnly === false) {
        q.set("isActive", "false");
      }
      const qs = q.toString();
      return client.request<PartSkusResponse>(`/api/parts/skus${qs ? `?${qs}` : ""}`);
    },

    getPartSku(skuId: string) {
      return client.request<PartSkuDetailResponse>(
        `/api/parts/skus/${encodeURIComponent(skuId)}`
      );
    },

    getRecommendedSkusForNode(vehicleId: string, nodeId: string) {
      const q = new URLSearchParams({
        vehicleId: vehicleId.trim(),
        nodeId: nodeId.trim(),
      });
      return client.request<PartRecommendationsResponse>(
        `/api/parts/recommended-skus?${q.toString()}`
      );
    },

    getServiceKits(params?: { nodeId?: string; vehicleId?: string }) {
      const q = new URLSearchParams();
      if (params?.nodeId?.trim()) {
        q.set("nodeId", params.nodeId.trim());
      }
      if (params?.vehicleId?.trim()) {
        q.set("vehicleId", params.vehicleId.trim());
      }
      const qs = q.toString();
      return client.request<ServiceKitsResponse>(`/api/parts/service-kits${qs ? `?${qs}` : ""}`);
    },

    addServiceKitToWishlist(vehicleId: string, input: AddServiceKitToWishlistPayload) {
      return client.request<AddServiceKitToWishlistResponse>(
        `/api/vehicles/${vehicleId}/wishlist/kits`,
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      );
    },

    getServiceEvents(vehicleId: string) {
      return client.request<ServiceEventsResponse>(
        `/api/vehicles/${vehicleId}/service-events`
      );
    },

    getExpenses(params: { year?: number; vehicleId?: string } = {}) {
      const q = new URLSearchParams();
      if (params.year) {
        q.set("year", String(params.year));
      }
      if (params.vehicleId?.trim()) {
        q.set("vehicleId", params.vehicleId.trim());
      }
      const qs = q.toString();
      return client.request<ExpensesResponse>(`/api/expenses${qs ? `?${qs}` : ""}`);
    },

    createExpense(input: CreateExpenseItemInput) {
      return client.request<CreateExpenseItemResponse>("/api/expenses", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    updateExpense(expenseId: string, input: UpdateExpenseItemInput) {
      return client.request<UpdateExpenseItemResponse>(
        `/api/expenses/${encodeURIComponent(expenseId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        }
      );
    },

    deleteExpense(expenseId: string) {
      return client.request<DeleteExpenseItemResponse>(
        `/api/expenses/${encodeURIComponent(expenseId)}`,
        { method: "DELETE" }
      );
    },

    getVehicleWishlist(vehicleId: string) {
      return client.request<VehicleWishlistResponse>(
        `/api/vehicles/${vehicleId}/wishlist`
      );
    },

    createWishlistItem(vehicleId: string, input: CreatePartWishlistItemInput) {
      return client.request<CreateWishlistItemResponse>(
        `/api/vehicles/${vehicleId}/wishlist`,
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      );
    },

    updateWishlistItem(
      vehicleId: string,
      itemId: string,
      input: UpdatePartWishlistItemInput
    ) {
      return client.request<UpdateWishlistItemResponse>(
        `/api/vehicles/${vehicleId}/wishlist/${itemId}`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        }
      );
    },

    deleteWishlistItem(vehicleId: string, itemId: string) {
      return client.request<{ ok: boolean }>(
        `/api/vehicles/${vehicleId}/wishlist/${itemId}`,
        { method: "DELETE" }
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

    updateServiceEvent(vehicleId: string, eventId: string, input: UpdateServiceEventInput) {
      return client.request<UpdateServiceEventResponse>(
        `/api/vehicles/${vehicleId}/service-events/${eventId}`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        }
      );
    },

    deleteServiceEvent(vehicleId: string, eventId: string) {
      return client.request<DeleteServiceEventResponse>(
        `/api/vehicles/${vehicleId}/service-events/${eventId}`,
        { method: "DELETE" }
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
        `/api/vehicles/${vehicleId}`,
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
