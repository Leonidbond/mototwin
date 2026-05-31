import type { PartWishlistItem, PartWishlistItemStatus } from "./part-wishlist";
import type { PartSkuViewModel } from "./part-catalog";
import type { PartRecommendationViewModel } from "./part-recommendation";
import type { AddServiceKitToWishlistResult, ServiceKitViewModel } from "./service-kit";
import type { ServiceEventItem } from "./service-event";
import type {
  ServicePlaceItem,
  ServicePlaceSearchMode,
  ServicePlaceSearchResultItem,
  ServicePlaceSnapshot,
} from "./service-place";
import type {
  CreateExpenseItemResponse,
  CreateExpenseFromShoppingListResponse,
  DeleteExpenseItemResponse,
  ExpenseNodeSummaryResponse,
  ExpensesResponse,
  MarkExpenseInstalledResponse,
  UninstalledExpensesResponse,
  UpdateExpenseItemResponse,
} from "./expense-item";
import type {
  GarageVehicleItem,
  MotorcycleBrandPickerItem,
  MotorcycleGenerationPickerItem,
  MotorcycleModelFamilyPickerItem,
  MotorcycleVariantPickerItem,
  UpdateVehicleProfileResult,
  VehicleTrashInfo,
  VehicleDetail,
} from "./vehicle";
import type { UserSettings } from "./user-settings";
import type { NodeTreeItem, TopServiceNodeItem } from "./node";
import type { ServiceBundleTemplateWire } from "./service-bundle-template";
import type { AddServiceEventFormValues } from "./forms";
import type { ServiceEventMode } from "./service-event";
import type {
  NotificationsListResponse,
  NotificationItemWire,
  NotificationSnoozePayload,
  PushSubscriptionWire,
  UpsertPushSubscriptionPayload,
  UsageUpdatePayload,
  UserNotificationSettingsPatch,
  UserNotificationSettingsWire,
  VehicleNotificationSettingsPatch,
  VehicleNotificationSettingsWire,
} from "./notification";
import type {
  SubscriptionCurrentResponse,
  SubscriptionPlan,
  UpdateSubscriptionPlanInput,
  UpdateSubscriptionPlanResponse,
} from "./subscription";

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


export type TopServiceNodesResponse = {
  nodes: TopServiceNodeItem[];
};

export type ServiceNodeItem = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  level: number;
  displayOrder: number;
};

export type ServiceNodesResponse = {
  nodes: ServiceNodeItem[];
};

export type ServicePlacesSearchResponse = {
  places: ServicePlaceSearchResultItem[];
  meta: {
    query: string;
    mode: ServicePlaceSearchMode;
    source: "geosuggest" | "geocoder" | "manual";
  };
  warning?: string;
};

export type CreateServicePlaceInput = {
  provider: string;
  providerPlaceId?: string | null;
  type: "ORGANIZATION" | "ADDRESS" | "CUSTOM";
  title: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  contact?: {
    phone?: string | null;
    url?: string | null;
  } | null;
  metadata?: unknown | null;
};

export type CreateServicePlaceResponse = {
  place: ServicePlaceItem;
  snapshot: ServicePlaceSnapshot;
};

export type ServiceEventsResponse = {
  serviceEvents: ServiceEventItem[];
  meta?: {
    visibleLimit: number | null;
    hiddenCount: number;
    plan: SubscriptionPlan;
  };
};

export type CreateServiceEventResponse = {
  serviceEvent: ServiceEventItem;
  suggestFitmentReport?: {
    serviceEventId: string;
    suggestions: Array<{
      nodeId: string;
      skuId: string | null;
      partMasterId: string | null;
      label: string;
    }>;
  } | null;
};

export type UpdateServiceEventResponse = {
  serviceEvent: ServiceEventItem;
};

export type DeleteServiceEventResponse = {
  deleted: true;
  eventId: string;
  /** Anchor node id (для обратной совместимости вызывающих); фактически статусы пересчитаны для всех `items[].nodeId`. */
  affectedNodeId: string;
  /** Все nodeId, чьи статусы пересчитаны после удаления (включая anchor). */
  affectedNodeIds?: string[];
};

export type {
  CreateExpenseItemResponse,
  CreateExpenseFromShoppingListResponse,
  DeleteExpenseItemResponse,
  ExpensesResponse,
  ExpenseNodeSummaryResponse,
  MarkExpenseInstalledResponse,
  UninstalledExpensesResponse,
  UpdateExpenseItemResponse,
};

/**
 * Источник записи в едином пикере «Готово к установке» внутри окна сервисного
 * события. `wishlist+expense` — wishlist-позиция, к которой уже привязан
 * stand-alone `ExpenseItem` (через `shoppingListItemId`).
 */
export type InstallableEntrySource = "wishlist" | "expense" | "wishlist+expense";

export type InstallableForServiceEventEntry = {
  /** Уникальный ключ строки внутри списка (используется как React key и в Set выбора). */
  key: string;
  source: InstallableEntrySource;
  wishlistItemId: string | null;
  expenseItemId: string | null;
  title: string;
  partName: string | null;
  partSku: string | null;
  nodeId: string | null;
  nodeName: string | null;
  vendor: string | null;
  quantity: number | null;
  amount: number | null;
  currency: string | null;
  wishlistStatus: PartWishlistItemStatus | null;
  /** True, если уже есть оплаченная сумма (`amount > 0` + `currency`). */
  isPaid: boolean;
  purchasedAt: string | null;
  expenseDate: string | null;
};

export type InstallableForServiceEventResponse = {
  items: InstallableForServiceEventEntry[];
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

export type MotorcycleBrandsResponse = {
  brands: MotorcycleBrandPickerItem[];
};

/**
 * @deprecated Renamed to {@link MotorcycleBrandsResponse}; kept as an alias while UI
 * surfaces are migrated. The wire shape is identical.
 */
export type BrandsResponse = MotorcycleBrandsResponse;

export type ServiceBundleTemplatesResponse = {
  templates: ServiceBundleTemplateWire[];
};

/** User-saved «add service event» form template (per account). */
export type UserServiceEventFormTemplateWire = {
  id: string;
  title: string;
  mode: ServiceEventMode;
  updatedAt: string;
  form: AddServiceEventFormValues;
  /** Показывать синтетический комплект в подборе деталей. */
  includeInPartPicker: boolean;
};

export type UserServiceEventFormTemplatesResponse = {
  templates: UserServiceEventFormTemplateWire[];
};

export type CreateUserServiceEventFormTemplateBody = {
  /** Optional name fragment; final title always includes quick/detailed mode. */
  baseTitle?: string | null;
  formSnapshot: AddServiceEventFormValues;
  /** When false, комплект не мержится в GET /api/parts/service-kits. По умолчанию true. */
  includeInPartPicker?: boolean;
};

export type CreateUserServiceEventFormTemplateResponse = {
  template: UserServiceEventFormTemplateWire;
};

export type MotorcycleModelFamiliesResponse = {
  families: MotorcycleModelFamilyPickerItem[];
};

export type MotorcycleVariantsResponse = {
  variants: MotorcycleVariantPickerItem[];
};

export type MotorcycleGenerationsResponse = {
  generations: MotorcycleGenerationPickerItem[];
};

/** @deprecated Renamed to {@link MotorcycleModelFamiliesResponse}. */
export type ModelsResponse = MotorcycleModelFamiliesResponse;

/** @deprecated Renamed to {@link MotorcycleVariantsResponse}. */
export type ModelVariantsResponse = MotorcycleVariantsResponse;

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

export type NotificationSettingsResponse = {
  settings: UserNotificationSettingsWire;
};

export type VehicleNotificationSettingsResponse = {
  settings: VehicleNotificationSettingsWire;
};

export type UpdateNotificationSettingsPayload = UserNotificationSettingsPatch;
export type UpdateVehicleNotificationSettingsPayload = VehicleNotificationSettingsPatch;

export type {
  NotificationsListResponse,
  NotificationItemWire,
  NotificationSnoozePayload,
  PushSubscriptionWire,
  UpsertPushSubscriptionPayload,
  UsageUpdatePayload,
};

export type NotificationMutationResponse = {
  notification: NotificationItemWire;
};

export type NotificationRecalculateResponse = {
  createdCount: number;
  notifications: NotificationItemWire[];
};

export type PushSubscriptionResponse = {
  subscription: PushSubscriptionWire;
};

export type PushSubscriptionDeleteResponse = {
  deleted: true;
  id: string;
};

export type PushSubscriptionTestResponse = {
  ok: true;
  testedSubscriptionIds: string[];
};

export type UsageUpdateResponse = {
  ok: true;
  vehicle: {
    id: string;
    odometer: number;
    engineHours: number | null;
    updatedAt: string;
  };
  resolvedNotifications: number;
};

export type {
  SubscriptionCurrentResponse,
  UpdateSubscriptionPlanInput,
  UpdateSubscriptionPlanResponse,
};
