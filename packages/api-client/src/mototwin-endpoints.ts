import type {
  AddServiceKitToWishlistPayload,
  AddServiceKitToWishlistResponse,
  CreateExpenseFromShoppingListInput,
  CreateExpenseFromShoppingListResponse,
  CreateExpenseItemInput,
  CreateExpenseItemResponse,
  CreatePartWishlistItemInput,
  CreateServiceEventInput,
  CreateServiceEventResponse,
  DeleteServiceEventResponse,
  CreateVehicleInput,
  CreateVehicleResponse,
  CreateMotorcycleCatalogRequestInput,
  CreateMotorcycleCatalogRequestResponse,
  MotorcycleCatalogRequestsResponse,
  CreateWishlistItemResponse,
  DeleteExpenseItemResponse,
  GarageVehiclesResponse,
  MotorcycleBrandsResponse,
  MotorcycleGenerationsResponse,
  MotorcycleModelFamiliesResponse,
  MotorcycleVariantsResponse,
  PartRecommendationsResponse,
  PartSkuDetailResponse,
  PartSkusResponse,
  PartSkuSearchFilters,
  ProfileResponse,
  SubmitFeedbackPayload,
  ExpensesResponse,
  ExpenseNodeSummaryResponse,
  MarkExpenseInstalledInput,
  MarkExpenseInstalledResponse,
  NotificationMutationResponse,
  NotificationRecalculateResponse,
  NotificationSettingsResponse,
  NotificationsListResponse,
  NotificationSnoozePayload,
  ServiceBundleTemplatesResponse,
  CreateUserServiceEventFormTemplateBody,
  CreateUserServiceEventFormTemplateResponse,
  UserServiceEventFormTemplatesResponse,
  ServiceEventsResponse,
  ServiceKitsResponse,
  InstallableForServiceEventResponse,
  UninstalledExpensesResponse,
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
  UpdateNotificationSettingsPayload,
  UpdateVehicleNotificationSettingsPayload,
  UsageUpdatePayload,
  UsageUpdateResponse,
  PushSubscriptionDeleteResponse,
  PushSubscriptionResponse,
  PushSubscriptionTestResponse,
  UpsertPushSubscriptionPayload,
  VehicleNotificationSettingsResponse,
  UpdateVehicleStateInput,
  UpdateVehicleStateResponse,
  UpdateWishlistItemResponse,
  VehicleDetailResponse,
  TopServiceNodesResponse,
  SubscriptionCurrentResponse,
  UpdateSubscriptionPlanInput,
  UpdateSubscriptionPlanResponse,
  VehicleNodeTreeResponse,
  ServiceNodesResponse,
  ServicePlacesSearchResponse,
  CreateServicePlaceInput,
  CreateServicePlaceResponse,
  VehicleWishlistResponse,
  PartMasterDuplicatesResponse,
  CreatePartMasterInput,
  CreatePartMasterResponse,
  EnsurePartMasterSkuInput,
  EnsurePartMasterSkuResponse,
  CreateFitmentReportInput,
  CreateFitmentReportResponse,
  CreateFitmentEvidenceInput,
  CreateFitmentEvidenceResponse,
  PartCompatibilityReportResponse,
  PartMasterPrefillResponse,
  AuthMeResponse,
  AuthSessionStateResponse,
  AuthLoginResponse,
  AuthLoginInput,
  AuthRegisterInput,
  AuthRefreshInput,
  AuthRefreshResponse,
  MobileOAuthInput,
  ForgotPasswordInput,
  ForgotPasswordResponse,
  ResetPasswordInput,
  ResetPasswordResponse,
  DeleteAccountInput,
  DeleteAccountResponse,
} from "@mototwin/types";
import type { ApiClient } from "./fetcher";

/**
 * Typed MotoTwin HTTP API (paths match Next route handlers under `/api/*`).
 * Use {@link createApiClient} with `baseUrl: ""` on web (same origin) or full origin in Expo.
 */
export function createMotoTwinEndpoints(client: ApiClient) {
  return {
    getAuthMe() {
      return client.request<AuthMeResponse>("/api/auth/me");
    },

    getAuthSessionState() {
      return client.request<AuthSessionStateResponse>("/api/auth/session-state");
    },

    getSubscriptionCurrent() {
      return client.request<SubscriptionCurrentResponse>("/api/subscription/current");
    },

    updateSubscriptionPlan(input: UpdateSubscriptionPlanInput) {
      return client.request<UpdateSubscriptionPlanResponse>("/api/subscription/plan", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },

    login(input: AuthLoginInput) {
      return client.request<AuthLoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    register(input: AuthRegisterInput) {
      return client.request<AuthLoginResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    logout(refreshToken?: string) {
      return client.request<{ ok: boolean }>("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
    },

    refreshAuth(input: AuthRefreshInput) {
      return client.request<AuthRefreshResponse>("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    loginWithMobileOAuth(input: MobileOAuthInput) {
      return client.request<AuthLoginResponse>("/api/auth/oauth/mobile", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    forgotPassword(input: ForgotPasswordInput) {
      return client.request<ForgotPasswordResponse>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    resetPassword(input: ResetPasswordInput) {
      return client.request<ResetPasswordResponse>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    deleteAccount(input: DeleteAccountInput) {
      return client.request<DeleteAccountResponse>("/api/account", {
        method: "DELETE",
        body: JSON.stringify(input),
      });
    },

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

    getNotificationSettings() {
      return client.request<NotificationSettingsResponse>("/api/notification-settings");
    },

    updateNotificationSettings(input: UpdateNotificationSettingsPayload) {
      return client.request<NotificationSettingsResponse>("/api/notification-settings", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },

    getVehicleNotificationSettings(vehicleId: string) {
      return client.request<VehicleNotificationSettingsResponse>(
        `/api/vehicles/${encodeURIComponent(vehicleId)}/notification-settings`
      );
    },

    updateVehicleNotificationSettings(
      vehicleId: string,
      input: UpdateVehicleNotificationSettingsPayload
    ) {
      return client.request<VehicleNotificationSettingsResponse>(
        `/api/vehicles/${encodeURIComponent(vehicleId)}/notification-settings`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        }
      );
    },

    getNotifications(params?: {
      status?: string;
      severity?: string;
      limit?: number;
      includeResolved?: boolean;
    }) {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.severity) q.set("severity", params.severity);
      if (typeof params?.limit === "number") q.set("limit", String(params.limit));
      if (params?.includeResolved) q.set("includeResolved", "1");
      const qs = q.toString();
      return client.request<NotificationsListResponse>(`/api/notifications${qs ? `?${qs}` : ""}`);
    },

    markNotificationRead(notificationId: string) {
      return client.request<NotificationMutationResponse>(
        `/api/notifications/${encodeURIComponent(notificationId)}/read`,
        { method: "PATCH" }
      );
    },

    markNotificationSeen(notificationId: string) {
      return client.request<NotificationMutationResponse>(
        `/api/notifications/${encodeURIComponent(notificationId)}/seen`,
        { method: "PATCH" }
      );
    },

    snoozeNotification(notificationId: string, input: NotificationSnoozePayload) {
      return client.request<NotificationMutationResponse>(
        `/api/notifications/${encodeURIComponent(notificationId)}/snooze`,
        { method: "PATCH", body: JSON.stringify(input) }
      );
    },

    dismissNotification(notificationId: string) {
      return client.request<NotificationMutationResponse>(
        `/api/notifications/${encodeURIComponent(notificationId)}/dismiss`,
        { method: "PATCH" }
      );
    },

    recalculateNotifications() {
      return client.request<NotificationRecalculateResponse>("/api/notifications/recalculate", {
        method: "POST",
      });
    },

    updateVehicleUsage(vehicleId: string, input: UsageUpdatePayload) {
      return client.request<UsageUpdateResponse>(
        `/api/vehicles/${encodeURIComponent(vehicleId)}/usage-update`,
        { method: "POST", body: JSON.stringify(input) }
      );
    },

    upsertPushSubscription(input: UpsertPushSubscriptionPayload) {
      return client.request<PushSubscriptionResponse>("/api/push-subscriptions", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    deletePushSubscription(id: string) {
      return client.request<PushSubscriptionDeleteResponse>(
        `/api/push-subscriptions/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },

    testPushSubscriptions() {
      return client.request<PushSubscriptionTestResponse>("/api/push-subscriptions/test", {
        method: "POST",
      });
    },

    getGarageVehicles(params?: { includeAttention?: boolean }) {
      const query = new URLSearchParams();
      if (params?.includeAttention === false) {
        query.set("includeAttention", "0");
      }
      const qs = query.toString();
      return client.request<GarageVehiclesResponse>(`/api/garage${qs ? `?${qs}` : ""}`);
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

    getServiceNodes() {
      return client.request<ServiceNodesResponse>("/api/nodes/service");
    },

    searchServicePlaces(params: {
      query: string;
      mode?: "AUTO" | "ADDRESS" | "ORGANIZATION";
      latitude?: number;
      longitude?: number;
    }) {
      const q = new URLSearchParams({ query: params.query.trim() });
      if (params.mode) q.set("mode", params.mode);
      if (Number.isFinite(params.latitude)) q.set("latitude", String(params.latitude));
      if (Number.isFinite(params.longitude)) q.set("longitude", String(params.longitude));
      return client.request<ServicePlacesSearchResponse>(`/api/service-places/search?${q.toString()}`);
    },

    createServicePlace(input: CreateServicePlaceInput) {
      return client.request<CreateServicePlaceResponse>("/api/service-places", {
        method: "POST",
        body: JSON.stringify(input),
      });
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

    getExpenseNodeSummary(params: { vehicleId: string; year: number }) {
      const q = new URLSearchParams({
        vehicleId: params.vehicleId.trim(),
        year: String(params.year),
      });
      return client.request<ExpenseNodeSummaryResponse>(`/api/expenses/node-summary?${q.toString()}`);
    },

    /**
     * @deprecated UI окна сервисного события теперь использует
     * {@link createMotoTwinEndpoints | getInstallableForServiceEvent}, который
     * сводит wishlist + uninstalled expenses в один список. Endpoint оставлен
     * только для обратной совместимости / прямых сценариев расходов.
     */
    getUninstalledExpenses(params: { vehicleId: string; nodeId?: string }) {
      const q = new URLSearchParams({ vehicleId: params.vehicleId.trim() });
      if (params.nodeId?.trim()) {
        q.set("nodeId", params.nodeId.trim());
      }
      return client.request<UninstalledExpensesResponse>(`/api/expenses/uninstalled?${q.toString()}`);
    },

    /**
     * Сводный пикер «Готово к установке» для окна создания/редактирования
     * сервисного события: активный wishlist + uninstalled standalone расходы,
     * с дедупликацией по `expense.shoppingListItemId == wishlist.id`.
     */
    getInstallableForServiceEvent(vehicleId: string, params: { nodeId?: string } = {}) {
      const q = new URLSearchParams();
      if (params.nodeId?.trim()) {
        q.set("nodeId", params.nodeId.trim());
      }
      const qs = q.toString();
      return client.request<InstallableForServiceEventResponse>(
        `/api/vehicles/${encodeURIComponent(vehicleId)}/installable${qs ? `?${qs}` : ""}`
      );
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

    markExpenseInstalled(expenseId: string, input: MarkExpenseInstalledInput) {
      return client.request<MarkExpenseInstalledResponse>(
        `/api/expenses/${encodeURIComponent(expenseId)}/mark-installed`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        }
      );
    },

    createExpenseFromShoppingListItem(
      itemId: string,
      input: CreateExpenseFromShoppingListInput
    ) {
      return client.request<CreateExpenseFromShoppingListResponse>(
        `/api/shopping-list/${encodeURIComponent(itemId)}/create-expense`,
        {
          method: "POST",
          body: JSON.stringify(input),
        }
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

    getMotorcycleBrands() {
      return client.request<MotorcycleBrandsResponse>("/api/motorcycle-brands");
    },

    getServiceBundleTemplates() {
      return client.request<ServiceBundleTemplatesResponse>("/api/service-bundle-templates");
    },

    getUserServiceEventFormTemplates() {
      return client.request<UserServiceEventFormTemplatesResponse>("/api/user-service-event-templates");
    },

    createUserServiceEventFormTemplate(input: CreateUserServiceEventFormTemplateBody) {
      return client.request<CreateUserServiceEventFormTemplateResponse>(
        "/api/user-service-event-templates",
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      );
    },

    getMotorcycleModelFamilies(motorcycleBrandId: string) {
      const search = new URLSearchParams({ motorcycleBrandId });
      return client.request<MotorcycleModelFamiliesResponse>(
        `/api/motorcycle-model-families?${search.toString()}`
      );
    },

    getMotorcycleVariants(motorcycleModelFamilyId: string) {
      const search = new URLSearchParams({ motorcycleModelFamilyId });
      return client.request<MotorcycleVariantsResponse>(
        `/api/motorcycle-variants?${search.toString()}`
      );
    },

    getMotorcycleGenerations(motorcycleVariantId: string) {
      const search = new URLSearchParams({ motorcycleVariantId });
      return client.request<MotorcycleGenerationsResponse>(
        `/api/motorcycle-generations?${search.toString()}`
      );
    },

    createVehicle(input: CreateVehicleInput) {
      return client.request<CreateVehicleResponse>("/api/vehicles", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    createMotorcycleCatalogRequest(input: CreateMotorcycleCatalogRequestInput) {
      return client.request<CreateMotorcycleCatalogRequestResponse>(
        "/api/motorcycle-catalog-requests",
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      );
    },

    getMotorcycleCatalogRequests() {
      return client.request<MotorcycleCatalogRequestsResponse>(
        "/api/motorcycle-catalog-requests"
      );
    },

    getPartCompatibilityReport(
      vehicleId: string,
      params: { partMasterId: string; nodeId: string }
    ) {
      const q = new URLSearchParams({
        partMasterId: params.partMasterId.trim(),
        nodeId: params.nodeId.trim(),
      });
      return client.request<PartCompatibilityReportResponse>(
        `/api/vehicles/${encodeURIComponent(vehicleId)}/part-compatibility-report?${q.toString()}`
      );
    },

    getPartMaster(partMasterId: string, params?: { nodeId?: string }) {
      const q = new URLSearchParams();
      if (params?.nodeId?.trim()) {
        q.set("nodeId", params.nodeId.trim());
      }
      const qs = q.toString();
      return client.request<PartMasterPrefillResponse>(
        `/api/part-masters/${encodeURIComponent(partMasterId)}${qs ? `?${qs}` : ""}`
      );
    },

    checkPartMasterDuplicates(params: { brandName: string; sku: string }) {
      const q = new URLSearchParams({
        brandName: params.brandName.trim(),
        sku: params.sku.trim(),
      });
      return client.request<PartMasterDuplicatesResponse>(
        `/api/part-masters/duplicates?${q.toString()}`
      );
    },

    createPartMaster(input: CreatePartMasterInput) {
      return client.request<CreatePartMasterResponse>("/api/part-masters", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    ensurePartMasterSku(input: EnsurePartMasterSkuInput) {
      return client.request<EnsurePartMasterSkuResponse>("/api/part-masters/ensure-sku", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    createFitmentReport(vehicleId: string, input: CreateFitmentReportInput) {
      return client.request<CreateFitmentReportResponse>(
        `/api/vehicles/${encodeURIComponent(vehicleId)}/fitment-reports`,
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      );
    },

    createFitmentEvidence(input: CreateFitmentEvidenceInput) {
      return client.request<CreateFitmentEvidenceResponse>("/api/fitment/evidence", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    submitFeedback(input: SubmitFeedbackPayload) {
      return client.request<{ id: string; createdAt: string }>("/api/feedback", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
  };
}
